import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Crown, HeartCrack, AlertTriangle, ShieldCheck, CheckCircle2,
  Clock, TrendingUp, Download, Activity, FileText, BarChart2,
  RefreshCw, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, isAfter } from "date-fns";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatBox({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomaryGovernanceDashboard() {
  const [exporting, setExporting] = useState(false);

  const { data: inheritanceCases = [], isLoading: lc } = useQuery({
    queryKey: ["cgd-inheritance-cases"],
    queryFn: () => base44.entities.InheritanceCase.filter({ is_deleted: false }, "-created_date", 1000),
  });
  const { data: communityValidations = [] } = useQuery({
    queryKey: ["cgd-community-validations"],
    queryFn: () => base44.entities.CommunityValidation.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: tradValidations = [] } = useQuery({
    queryKey: ["cgd-trad-validations"],
    queryFn: () => base44.entities.TraditionalAuthorityValidation.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: deathVerifs = [] } = useQuery({
    queryKey: ["cgd-death-verifs"],
    queryFn: () => base44.entities.DeathVerification.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: inheritanceDisputes = [] } = useQuery({
    queryKey: ["cgd-inheritance-disputes"],
    queryFn: () => base44.entities.InheritanceDispute.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: consents = [] } = useQuery({
    queryKey: ["cgd-consents"],
    queryFn: () => base44.entities.CommunityConsent.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: resolutions = [] } = useQuery({
    queryKey: ["cgd-resolutions"],
    queryFn: () => base44.entities.FamilyMeetingResolution.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["cgd-audit"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });
  const { data: familyOwnerships = [] } = useQuery({
    queryKey: ["cgd-family"],
    queryFn: () => base44.entities.FamilyOwnership.list("-created_date", 500),
  });

  // Derived metrics
  const pendingCommunityReviews = communityValidations.filter(v =>
    ["submitted", "community_review", "village_head_validation", "traditional_authority_validation"].includes(v.status)
  ).length;

  const pendingTradAuthReviews = tradValidations.filter(v => v.validation_status === "pending").length;
  const pendingDeathVerifs = deathVerifs.filter(v => v.verification_status === "pending").length;
  const activeDisputes = inheritanceDisputes.filter(d => !["resolved", "closed"].includes(d.status)).length;
  const pendingConsents = consents.filter(c => c.status === "pending").length;
  const approvedCases = inheritanceCases.filter(c => c.status === "approved").length;

  // Avg processing time (draft → approved)
  const completedCases = inheritanceCases.filter(c => c.status === "approved" && c.final_approved_date && c.created_date);
  const avgProcessingDays = completedCases.length > 0
    ? Math.round(completedCases.reduce((s, c) => {
        return s + (new Date(c.final_approved_date) - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
      }, 0) / completedCases.length)
    : null;

  // Bottleneck analysis — cases stuck more than 7 days in a stage
  const sevenDaysAgo = subDays(new Date(), 7);
  const bottleneckedCases = inheritanceCases.filter(c =>
    !["approved", "rejected", "withdrawn", "draft"].includes(c.status) &&
    !isAfter(new Date(c.updated_date || c.created_date), sevenDaysAgo)
  );

  // Audit exceptions (recent unusual actions)
  const auditExceptions = auditLogs.filter(l =>
    isAfter(new Date(l.created_date), subDays(new Date(), 30)) &&
    (l.action?.includes("REJECT") || l.action?.includes("ESCALAT") || l.action?.includes("DISPUTE"))
  );

  // Case type distribution
  const caseTypeDist = Object.entries(
    inheritanceCases.reduce((acc, c) => { acc[c.case_type || "unknown"] = (acc[c.case_type || "unknown"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // Stage distribution
  const stageDist = [
    { name: "Draft", value: inheritanceCases.filter(c => c.status === "draft").length },
    { name: "Submitted", value: inheritanceCases.filter(c => c.status === "submitted").length },
    { name: "Surveyor", value: inheritanceCases.filter(c => c.status === "surveyor_review").length },
    { name: "Compliance", value: inheritanceCases.filter(c => c.status === "compliance_review").length },
    { name: "SG Review", value: inheritanceCases.filter(c => c.status === "surveyor_general_review").length },
    { name: "Approved", value: approvedCases },
    { name: "Rejected", value: inheritanceCases.filter(c => c.status === "rejected").length },
  ].filter(s => s.value > 0);

  const exportCSV = () => {
    setExporting(true);
    const rows = [
      ["Metric", "Value"],
      ["Total Inheritance Cases", inheritanceCases.length],
      ["Approved Cases", approvedCases],
      ["Active Disputes", activeDisputes],
      ["Pending Community Reviews", pendingCommunityReviews],
      ["Pending Traditional Authority Reviews", pendingTradAuthReviews],
      ["Pending Death Verifications", pendingDeathVerifs],
      ["Pending Consents", pendingConsents],
      ["Bottlenecked Cases (>7d)", bottleneckedCases.length],
      ["Audit Exceptions (30d)", auditExceptions.length],
      ["Avg Processing Days", avgProcessingDays ?? "N/A"],
      ["Family Records", familyOwnerships.length],
      ["Resolutions Recorded", resolutions.length],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customary_governance_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    toast.info("Use browser Print (Ctrl+P) to save as PDF");
    window.print();
  };

  if (lc) return <div className="py-16 text-center text-sm text-muted-foreground">Loading governance dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Customary Governance Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">LGA Pilot Deployment — Customary Land Governance Overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={exporting} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Pending Workflow Actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending Actions</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatBox label="Community Reviews" value={pendingCommunityReviews} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatBox label="Trad. Authority Reviews" value={pendingTradAuthReviews} icon={Crown} color="text-amber-600" bg="bg-amber-50" />
          <StatBox label="Death Verifications" value={pendingDeathVerifs} icon={HeartCrack} color="text-red-600" bg="bg-red-50" />
          <StatBox label="Active Disputes" value={activeDisputes} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
          <StatBox label="Pending Consents" value={pendingConsents} icon={ShieldCheck} color="text-purple-600" bg="bg-purple-50" />
          <StatBox label="Bottlenecked Cases" value={bottleneckedCases.length} icon={Clock} color="text-red-600" bg="bg-red-50" sub=">7 days stalled" />
        </div>
      </div>

      {/* Outcomes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Outcomes</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Approved Inheritances" value={approvedCases} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
          <StatBox label="Family Records" value={familyOwnerships.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatBox label="Resolutions Adopted" value={resolutions.filter(r => r.status === "adopted").length} icon={FileText} color="text-indigo-600" bg="bg-indigo-50" />
          <StatBox
            label="Avg Processing Time"
            value={avgProcessingDays !== null ? `${avgProcessingDays}d` : "N/A"}
            icon={TrendingUp}
            color="text-blue-600"
            bg="bg-blue-50"
            sub={completedCases.length > 0 ? `from ${completedCases.length} completed cases` : "no completed cases"}
          />
        </div>
      </div>

      {/* Audit */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Audit & Compliance</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Audit Exceptions (30d)" value={auditExceptions.length} icon={AlertCircle} color="text-red-600" bg="bg-red-50" sub="Rejections, escalations, disputes" />
          <StatBox label="Trad. Validations" value={tradValidations.length} icon={Crown} color="text-amber-600" bg="bg-amber-50" />
          <StatBox label="Community Validations" value={communityValidations.filter(v => v.status === "approved").length} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" sub="approved" />
          <StatBox label="Total Consents" value={consents.filter(c => c.status === "granted").length} icon={ShieldCheck} color="text-purple-600" bg="bg-purple-50" sub="granted" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Case Pipeline Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageDist}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Case Types</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={caseTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9}>
                  {caseTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck table */}
      {bottleneckedCases.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <Clock className="w-4 h-4" /> Workflow Bottlenecks ({bottleneckedCases.length} cases stalled &gt;7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bottleneckedCases.slice(0, 10).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-primary">{c.case_reference}</span>
                    <span className="text-muted-foreground ml-2">{c.family_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-amber-100 text-amber-700 capitalize">{c.status?.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground">
                      {Math.floor((new Date() - new Date(c.updated_date || c.created_date)) / (1000 * 60 * 60 * 24))}d stalled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent audit exceptions */}
      {auditExceptions.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-4 h-4" /> Recent Audit Exceptions (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {auditExceptions.slice(0, 8).map(l => (
                <div key={l.id} className="flex items-start gap-2 text-xs py-1 border-b last:border-0">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{l.action?.replace(/_/g, " ")}</span>
                    {l.details && <span className="text-muted-foreground ml-1.5 truncate">{l.details}</span>}
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">{l.created_date ? format(new Date(l.created_date), "MMM d") : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}