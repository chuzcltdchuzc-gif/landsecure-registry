import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Activity, Map, CheckCircle2, Clock, AlertTriangle, Lock,
  Camera, FileText, Upload, TrendingUp, Download, Users,
  BarChart2, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { format, subDays, startOfDay, isAfter, subMonths } from "date-fns";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";

function StatBox({ label, value, icon: IconComp, color, bg }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <IconComp className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PilotDashboard() {
  const [exporting, setExporting] = useState(false);

  const { data: parcels = [], isLoading: lp } = useQuery({
    queryKey: ["pilot-parcels"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 2000),
  });
  const { data: disputes = [], isLoading: ld } = useQuery({
    queryKey: ["pilot-disputes"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 500),
  });
  const { data: alerts = [], isLoading: la } = useQuery({
    queryKey: ["pilot-alerts"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 500),
  });
  const { data: freezes = [] } = useQuery({
    queryKey: ["pilot-freezes"],
    queryFn: () => base44.entities.ParcelFreeze.list("-created_date", 500),
  });
  const { data: fieldReports = [] } = useQuery({
    queryKey: ["pilot-field-reports"],
    queryFn: () => base44.entities.FieldReport.list("-created_date", 1000),
  });
  const { data: surveyDocs = [] } = useQuery({
    queryKey: ["pilot-survey-docs"],
    queryFn: () => base44.entities.SurveyDocument.list("-created_date", 1000),
  });
  const { data: imports = [] } = useQuery({
    queryKey: ["pilot-imports"],
    queryFn: () => base44.entities.ImportHistory.list("-created_date", 100),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["pilot-users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });
  const { data: inheritanceCases = [] } = useQuery({
    queryKey: ["pilot-inheritance"],
    queryFn: () => base44.entities.InheritanceCase.filter({ is_deleted: false }, "-created_date", 500),
  });
  const { data: familyOwnerships = [] } = useQuery({
    queryKey: ["pilot-family"],
    queryFn: () => base44.entities.FamilyOwnership.list("-created_date", 500),
  });

  if (lp || ld || la) return <LoadingSpinner text="Loading Pilot Operations Dashboard..." />;

  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = subDays(now, 7);
  const monthAgo = subMonths(now, 1);

  // Core metrics
  const totalParcels = parcels.length;
  const approvedParcels = parcels.filter(p => p.status === "approved" || p.status === "approved_locked").length;
  const pendingApprovals = parcels.filter(p => p.status === "pending").length;
  const pendingDisputes = disputes.filter(d => d.status === "open" || d.status === "under_review").length;
  const openAlerts = alerts.filter(a => a.status === "open" || a.status === "under_investigation").length;
  const activeFreezes = freezes.filter(f => f.status === "active").length;
  const totalImported = imports.reduce((s, i) => s + (i.records_imported || 0), 0);

  // Upload stats
  const dailyUploads = parcels.filter(p => isAfter(new Date(p.created_date), today)).length;
  const weeklyUploads = parcels.filter(p => isAfter(new Date(p.created_date), weekAgo)).length;
  const monthlyUploads = parcels.filter(p => isAfter(new Date(p.created_date), monthAgo)).length;

  // GPS quality metrics from field reports
  const reportsWithGPS = fieldReports.filter(r => r.gps_accuracy != null);
  const avgGPSAccuracy = reportsWithGPS.length > 0
    ? (reportsWithGPS.reduce((s, r) => s + r.gps_accuracy, 0) / reportsWithGPS.length).toFixed(1)
    : "N/A";
  const highQualityGPS = reportsWithGPS.filter(r => r.gps_accuracy <= 5).length;

  // Approval turnaround
  const approvedWithDates = parcels.filter(p => p.approval_date && p.created_date && (p.status === "approved" || p.status === "approved_locked"));
  const avgTurnaround = approvedWithDates.length > 0
    ? Math.round(approvedWithDates.reduce((s, p) => {
        const days = (new Date(p.approval_date) - new Date(p.created_date)) / (1000 * 60 * 60 * 24);
        return s + days;
      }, 0) / approvedWithDates.length)
    : "N/A";

  // Build daily upload chart (last 14 days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(now, 13 - i);
    const label = format(d, "MMM d");
    const dayStart = startOfDay(d);
    const dayEnd = startOfDay(subDays(d, -1));
    return {
      date: label,
      parcels: parcels.filter(p => {
        const cd = new Date(p.created_date);
        return cd >= dayStart && cd < dayEnd;
      }).length,
      reports: fieldReports.filter(r => {
        const cd = new Date(r.created_date);
        return cd >= dayStart && cd < dayEnd;
      }).length,
    };
  });

  // Status breakdown
  const statusBreakdown = [
    { name: "Pending", count: parcels.filter(p => p.status === "pending").length },
    { name: "Approved", count: approvedParcels },
    { name: "Rejected", count: parcels.filter(p => p.status === "rejected").length },
    { name: "Disputed", count: parcels.filter(p => p.status === "disputed").length },
    { name: "Frozen", count: parcels.filter(p => p.status === "frozen").length },
  ].filter(s => s.count > 0);

  // CSV export
  const exportCSV = () => {
    setExporting(true);
    const headers = ["Parcel Number", "Owner", "Address", "State", "LGA", "Status", "Verification", "Land Use", "Size (ha)", "Registered By", "Created Date"];
    const rows = parcels.map(p => [
      p.parcel_number, p.owner_name, p.address, p.state, p.lga,
      p.status, p.verification_status, p.land_use, p.size_hectares,
      p.registered_by, format(new Date(p.created_date), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot_parcels_${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Pilot Operations Control Centre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of the LGA pilot deployment
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={exporting} className="gap-2 flex-shrink-0">
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Parcels" value={totalParcels} icon={Map} color="text-blue-600" bg="bg-blue-50" />
        <StatBox label="Approved" value={approvedParcels} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatBox label="Pending Approval" value={pendingApprovals} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatBox label="Open Disputes" value={pendingDisputes} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Fraud Alerts" value={openAlerts} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        <StatBox label="Frozen Parcels" value={activeFreezes} icon={Lock} color="text-purple-600" bg="bg-purple-50" />
        <StatBox label="Field Reports" value={fieldReports.length} icon={Camera} color="text-blue-600" bg="bg-blue-50" />
        <StatBox label="Survey Docs" value={surveyDocs.length} icon={FileText} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      {/* Inheritance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Family Parcels" value={familyOwnerships.length} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
        <StatBox label="Inheritance Cases" value={inheritanceCases.length} icon={BarChart2} color="text-blue-600" bg="bg-blue-50" />
        <StatBox label="Pending Inheritance" value={inheritanceCases.filter(c => ["submitted","surveyor_review","compliance_review","surveyor_general_review"].includes(c.status)).length} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatBox label="Approved Inheritances" value={inheritanceCases.filter(c => c.status === "approved").length} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Upload Velocity */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{dailyUploads}</p>
            <p className="text-xs text-muted-foreground">Today's Uploads</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{weeklyUploads}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{monthlyUploads}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Daily Activity (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last14Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="parcels" stroke="hsl(var(--chart-1))" name="Parcels" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reports" stroke="hsl(var(--chart-2))" name="Field Reports" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Parcel Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusBreakdown}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quality & Operations Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">GPS Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Reports with GPS</p>
              <p className="text-sm font-semibold">{reportsWithGPS.length}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Avg GPS Accuracy</p>
              <p className="text-sm font-semibold">{avgGPSAccuracy}{avgGPSAccuracy !== "N/A" ? "m" : ""}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">High Quality (≤5m)</p>
              <p className="text-sm font-semibold text-emerald-600">{highQualityGPS}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Approval Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Approval Rate</p>
              <p className="text-sm font-semibold">
                {totalParcels > 0 ? Math.round((approvedParcels / totalParcels) * 100) : 0}%
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Avg Turnaround</p>
              <p className="text-sm font-semibold">{avgTurnaround}{avgTurnaround !== "N/A" ? " days" : ""}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Locked Records</p>
              <p className="text-sm font-semibold">{parcels.filter(p => p.status === "approved_locked").length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Import Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Import Runs</p>
              <p className="text-sm font-semibold">{imports.length}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Total Imported</p>
              <p className="text-sm font-semibold text-emerald-600">{totalImported}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Failed Records</p>
              <p className="text-sm font-semibold text-red-600">{imports.reduce((s, i) => s + (i.records_failed || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pilot Readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pilot Readiness Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Parcel Volume", check: totalParcels >= 10, note: `${totalParcels} parcels registered` },
              { label: "Approval Workflow", check: approvedParcels > 0, note: `${approvedParcels} approved` },
              { label: "Field Coverage", check: fieldReports.length > 0, note: `${fieldReports.length} field reports` },
              { label: "Document Management", check: surveyDocs.length > 0, note: `${surveyDocs.length} documents` },
              { label: "Fraud Monitoring", check: true, note: `${alerts.length} total alerts tracked` },
              { label: "Dispute Handling", check: true, note: `${disputes.length} total disputes` },
            ].map(item => (
              <div key={item.label} className={`flex items-start gap-2 p-3 rounded-lg border ${item.check ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                {item.check
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}