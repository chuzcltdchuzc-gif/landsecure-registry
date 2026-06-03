import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, CheckCircle2, Users, Building2, BarChart2, Info } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10b981","#f59e0b","#ef4444","#6366f1","#8b5cf6"];

export default function GovernmentObserver() {
  const { data: parcels = [] } = useQuery({ queryKey: ["lv-obs-parcels"], queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 500) });
  const { data: leads = [] } = useQuery({ queryKey: ["lv-obs-leads"], queryFn: () => base44.entities.CommunityLead.list("-created_date", 500) });
  const { data: surveys = [] } = useQuery({ queryKey: ["lv-obs-surveys"], queryFn: () => base44.entities.SurveyAssignment.list("-created_date", 200) });

  const surveysCompleted = surveys.filter(s => s.status === "completed").length;
  const verifiedParcels = parcels.filter(p => ["community_validated","fully_verified"].includes(p.verification_status)).length;
  const communities = [...new Set(parcels.map(p => p.community).filter(Boolean))];

  const ownershipData = ["individual","family","community","trust","institutional"].map(type => ({
    name: type, value: parcels.filter(p => p.ownership_type === type).length
  })).filter(d => d.value > 0);

  const verificationData = ["unverified","field_verified","survey_verified","community_validated","fully_verified"].map(v => ({
    name: v.replace(/_/g," "), value: parcels.filter(p => p.verification_status === v).length
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Government Observer Portal</h1>
          <p className="text-sm text-muted-foreground">Read-only statistics — Aquasavannah LandVault, Ehime Mbano Pilot</p>
        </div>
      </div>

      <Card className="border border-blue-200 bg-blue-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">This portal provides read-only aggregate statistics. No personal data, evidence files, payment records, or owner information is accessible through this portal. This is a private land documentation platform. Government endorsement is optional and may occur through future integration modules.</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Parcels Documented", value: parcels.length, icon: MapPin, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Communities Covered", value: communities.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Community Leads", value: leads.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Surveys Completed", value: surveysCompleted, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Verified Parcels", value: verifiedParcels, icon: Shield, color: "text-green-600", bg: "bg-green-50" },
          { label: "Certificates Issued", value: parcels.filter(p => p.status === "certificate_issued").length, icon: BarChart2, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-sm">Ownership Types</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ownershipData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {ownershipData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-sm">Verification Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={verificationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {verificationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{fontSize: "11px"}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Community Coverage */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Community Coverage</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {communities.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
            {communities.map(c => (
              <Badge key={c} className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-medium">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Aquasavannah LandVault is a private land documentation platform. This portal is provided for government awareness purposes only.
        Platform data is not legally binding. Integration with government registries is available as an optional module.
      </p>
    </div>
  );
}