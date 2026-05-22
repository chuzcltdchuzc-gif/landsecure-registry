import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GitBranch, CheckCircle2, Clock, AlertTriangle, Award, Map } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

function Stat({ label, value, icon: Icon, color, bg }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InheritanceDashboardStats({ cases, familyOwnerships, parcels }) {
  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["all-beneficiaries-stats"],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ is_deleted: false }, "-created_date", 1000),
  });

  const activeBeneficiaries = beneficiaries.filter(b => b.status === "active").length;
  const deceasedBeneficiaries = beneficiaries.filter(b => b.status === "deceased").length;
  const pendingCases = cases.filter(c => ["submitted", "surveyor_review", "compliance_review", "surveyor_general_review"].includes(c.status)).length;
  const approvedCases = cases.filter(c => c.status === "approved").length;
  const rejectedCases = cases.filter(c => c.status === "rejected").length;
  const draftCases = cases.filter(c => c.status === "draft").length;
  const certifiedCases = cases.filter(c => c.certificate_generated).length;
  const disputedFamilies = familyOwnerships.filter(f => f.status === "disputed").length;

  // Case type breakdown
  const caseTypes = ["succession", "partition", "allocation", "transfer", "dispute_resolution", "subdivision"];
  const caseTypeData = caseTypes.map(t => ({
    name: t.replace(/_/g, " "),
    count: cases.filter(c => c.case_type === t).length,
  })).filter(d => d.count > 0);

  // Status breakdown for pie
  const statusData = [
    { name: "Draft", value: draftCases },
    { name: "Pending", value: pendingCases },
    { name: "Approved", value: approvedCases },
    { name: "Rejected", value: rejectedCases },
  ].filter(d => d.value > 0);

  // LGA breakdown
  const lgaCounts = {};
  familyOwnerships.forEach(fo => {
    if (fo.lga) lgaCounts[fo.lga] = (lgaCounts[fo.lga] || 0) + 1;
  });
  const lgaData = Object.entries(lgaCounts).map(([lga, count]) => ({ lga, count })).slice(0, 8);

  // Community breakdown
  const communityCounts = {};
  familyOwnerships.forEach(fo => {
    if (fo.community) communityCounts[fo.community] = (communityCounts[fo.community] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Family Parcels" value={familyOwnerships.length} icon={Map} color="text-blue-600" bg="bg-blue-50" />
        <Stat label="Active Beneficiaries" value={activeBeneficiaries} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
        <Stat label="Pending Cases" value={pendingCases} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <Stat label="Approved Cases" value={approvedCases} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Draft Cases" value={draftCases} icon={GitBranch} color="text-gray-600" bg="bg-gray-50" />
        <Stat label="Rejected Cases" value={rejectedCases} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        <Stat label="Certificates Issued" value={certifiedCases} icon={Award} color="text-purple-600" bg="bg-purple-50" />
        <Stat label="Disputed Families" value={disputedFamilies} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {caseTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Cases by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={caseTypeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Case Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {lgaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Family Records by LGA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={lgaData}>
                <XAxis dataKey="lga" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Beneficiary breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Beneficiary Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active", count: activeBeneficiaries, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Deceased", count: deceasedBeneficiaries, color: "text-gray-600", bg: "bg-gray-50" },
              { label: "Missing", count: beneficiaries.filter(b => b.status === "missing").length, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Disputed", count: beneficiaries.filter(b => b.status === "disputed").length, color: "text-red-700", bg: "bg-red-50" },
              { label: "Transferred", count: beneficiaries.filter(b => b.status === "transferred").length, color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Under Verification", count: beneficiaries.filter(b => b.status === "under_verification").length, color: "text-purple-700", bg: "bg-purple-50" },
              { label: "Minor", count: beneficiaries.filter(b => b.status === "minor").length, color: "text-orange-700", bg: "bg-orange-50" },
              { label: "Total", count: beneficiaries.length, color: "text-foreground", bg: "bg-muted" },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-lg ${item.bg} text-center`}>
                <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}