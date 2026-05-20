import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Download, CheckCircle, XCircle, AlertTriangle, Lock } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

export default function ComplianceReports() {
  const [reportType, setReportType] = useState("overview");

  const { data: parcels = [], isLoading: l1 } = useQuery({
    queryKey: ["parcels-compliance-report"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });
  const { data: disputes = [], isLoading: l2 } = useQuery({
    queryKey: ["disputes-compliance-report"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 500),
  });
  const { data: alerts = [], isLoading: l3 } = useQuery({
    queryKey: ["alerts-compliance-report"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 500),
  });
  const { data: logs = [], isLoading: l4 } = useQuery({
    queryKey: ["logs-compliance-report"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });

  if (l1 || l2 || l3 || l4) return <LoadingSpinner />;

  // Parcel status breakdown
  const parcelByStatus = ["pending", "approved", "rejected", "disputed", "transferred"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: parcels.filter(p => p.status === s).length,
  }));

  // Dispute by type
  const disputeByType = ["boundary", "ownership", "fraud", "encroachment", "documentation", "other"].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: disputes.filter(d => d.dispute_type === t).length,
  })).filter(x => x.value > 0);

  // Fraud alerts by severity
  const alertBySeverity = ["critical", "high", "medium", "low"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: alerts.filter(a => a.severity === s).length,
    fill: s === "critical" ? "#ef4444" : s === "high" ? "#f97316" : s === "medium" ? "#f59e0b" : "#6b7280",
  }));

  const frozenCount = parcels.filter(p => p.frozen).length;
  const fraudFlagged = parcels.filter(p => p.fraud_flagged).length;
  const approvalRate = parcels.length > 0 ? ((parcels.filter(p => p.status === "approved").length / parcels.length) * 100).toFixed(1) : 0;
  const rejectionRate = parcels.length > 0 ? ((parcels.filter(p => p.status === "rejected").length / parcels.length) * 100).toFixed(1) : 0;

  const handleExportReport = () => {
    const lines = [
      `LANDSECURE COMPLIANCE REPORT`,
      `Generated: ${format(new Date(), "MMMM d, yyyy HH:mm")}`,
      ``,
      `=== PARCEL SUMMARY ===`,
      `Total Parcels: ${parcels.length}`,
      `Approval Rate: ${approvalRate}%`,
      `Rejection Rate: ${rejectionRate}%`,
      `Frozen Parcels: ${frozenCount}`,
      `Fraud Flagged: ${fraudFlagged}`,
      ``,
      `=== PARCEL STATUS BREAKDOWN ===`,
      ...parcelByStatus.map(x => `${x.name}: ${x.value}`),
      ``,
      `=== DISPUTES ===`,
      `Total Disputes: ${disputes.length}`,
      `Open: ${disputes.filter(d => d.status === "open").length}`,
      `Escalated: ${disputes.filter(d => d.status === "escalated").length}`,
      `Resolved: ${disputes.filter(d => d.status === "resolved").length}`,
      ``,
      `=== FRAUD ALERTS ===`,
      `Total Alerts: ${alerts.length}`,
      `Open: ${alerts.filter(a => a.status === "open").length}`,
      `Critical: ${alerts.filter(a => a.severity === "critical").length}`,
      `Resolved: ${alerts.filter(a => a.status === "resolved").length}`,
      ``,
      `=== SYSTEM ACTIVITY ===`,
      `Total Audit Entries: ${logs.length}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Regulatory oversight metrics and analysis</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportReport}>
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Approval Rate", value: `${approvalRate}%`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Rejection Rate", value: `${rejectionRate}%`, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Fraud Flagged", value: fraudFlagged, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Frozen Parcels", value: frozenCount, icon: Lock, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parcel Status Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Parcel Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={parcelByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                  {parcelByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fraud alerts by severity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fraud Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertBySeverity}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {alertBySeverity.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Disputes by type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Disputes by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={disputeByType} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total Parcels Registered", value: parcels.length },
                { label: "Approved Parcels", value: parcels.filter(p => p.status === "approved").length },
                { label: "Pending Review", value: parcels.filter(p => p.status === "pending").length },
                { label: "Total Disputes Filed", value: disputes.length },
                { label: "Escalated Disputes", value: disputes.filter(d => d.status === "escalated").length },
                { label: "Total Fraud Alerts", value: alerts.length },
                { label: "Confirmed Fraud Cases", value: alerts.filter(a => a.resolution === "confirmed_fraud").length },
                { label: "Total Audit Events", value: logs.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-bold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}