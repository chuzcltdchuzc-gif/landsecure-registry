import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  FileText, Download, Filter, Search, ChevronDown, ChevronUp,
  Calendar, User, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "parcel_audit", label: "Parcel Audit Report" },
  { value: "ownership_history", label: "Ownership History Report" },
  { value: "approval_history", label: "Approval History Report" },
  { value: "fraud_investigation", label: "Fraud Investigation Report" },
  { value: "dispute_history", label: "Dispute History Report" },
  { value: "full_audit_log", label: "Full Audit Log" },
];

function exportToCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditReports() {
  const [reportType, setReportType] = useState("full_audit_log");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["audit-reports-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["audit-reports-parcels"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 1000),
  });
  const { data: ownershipHistory = [] } = useQuery({
    queryKey: ["audit-ownership"],
    queryFn: () => base44.entities.OwnershipHistory.list("-created_date", 500),
  });
  const { data: fraudAlerts = [] } = useQuery({
    queryKey: ["audit-fraud"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 500),
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["audit-disputes"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 500),
  });

  if (loadingLogs || loadingParcels) return <LoadingSpinner text="Loading audit data..." />;

  const applyDateFilter = (items, dateField = "created_date") =>
    items.filter(item => {
      const d = new Date(item[dateField]);
      if (dateFrom && isBefore(d, parseISO(dateFrom))) return false;
      if (dateTo && isAfter(d, parseISO(dateTo + "T23:59:59"))) return false;
      return true;
    });

  const applySearch = (items, fields) =>
    items.filter(item =>
      !search || fields.some(f => item[f]?.toLowerCase?.().includes(search.toLowerCase()))
    );

  // Build current report data
  let reportData = [];
  let reportHeaders = [];
  let reportRows = [];
  let reportTitle = "";

  if (reportType === "full_audit_log") {
    reportTitle = "Full Audit Log";
    let data = applyDateFilter(auditLogs);
    data = applySearch(data, ["user_email", "action", "entity_type", "details"]);
    reportData = data;
    reportHeaders = ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "Details"];
    reportRows = data.map(l => [
      format(new Date(l.created_date), "yyyy-MM-dd HH:mm:ss"),
      l.user_email, l.action, l.entity_type, l.entity_id, l.details,
    ]);
  } else if (reportType === "parcel_audit") {
    reportTitle = "Parcel Audit Report";
    let data = applyDateFilter(parcels);
    data = applySearch(data, ["parcel_number", "owner_name", "address", "status"]);
    reportData = data;
    reportHeaders = ["Parcel Number", "Owner", "Address", "State", "LGA", "Status", "Verification", "Registered By", "Approved By", "Approval Date", "Created Date"];
    reportRows = data.map(p => [
      p.parcel_number, p.owner_name, p.address, p.state, p.lga,
      p.status, p.verification_status, p.registered_by, p.approved_by,
      p.approval_date, format(new Date(p.created_date), "yyyy-MM-dd"),
    ]);
  } else if (reportType === "ownership_history") {
    reportTitle = "Ownership History Report";
    let data = applyDateFilter(ownershipHistory, "transfer_date");
    data = applySearch(data, ["parcel_number", "from_owner", "to_owner"]);
    reportData = data;
    reportHeaders = ["Parcel Number", "From Owner", "To Owner", "Transfer Type", "Transfer Date", "Status", "Approved By", "Notes"];
    reportRows = data.map(o => [
      o.parcel_number, o.from_owner, o.to_owner, o.transfer_type,
      o.transfer_date, o.status, o.approved_by, o.notes,
    ]);
  } else if (reportType === "approval_history") {
    reportTitle = "Approval History Report";
    let data = applyDateFilter(parcels.filter(p => p.approved_by || p.approval_date));
    data = applySearch(data, ["parcel_number", "owner_name", "approved_by"]);
    reportData = data;
    reportHeaders = ["Parcel Number", "Owner", "Status", "Approved By", "Approval Date", "Rejection Reason", "Created Date"];
    reportRows = data.map(p => [
      p.parcel_number, p.owner_name, p.status,
      p.approved_by, p.approval_date, p.rejection_reason,
      format(new Date(p.created_date), "yyyy-MM-dd"),
    ]);
  } else if (reportType === "fraud_investigation") {
    reportTitle = "Fraud Investigation Report";
    let data = applyDateFilter(fraudAlerts);
    data = applySearch(data, ["parcel_number", "alert_type", "description", "flagged_by"]);
    reportData = data;
    reportHeaders = ["Parcel Number", "Alert Type", "Severity", "Status", "Flagged By", "Description", "Assigned To", "Resolved By", "Resolved Date"];
    reportRows = data.map(a => [
      a.parcel_number, a.alert_type, a.severity, a.status,
      a.flagged_by, a.description, a.assigned_to, a.resolved_by, a.resolved_date,
    ]);
  } else if (reportType === "dispute_history") {
    reportTitle = "Dispute History Report";
    let data = applyDateFilter(disputes);
    data = applySearch(data, ["parcel_number", "complainant_name", "dispute_type"]);
    reportData = data;
    reportHeaders = ["Parcel Number", "Complainant", "Dispute Type", "Priority", "Status", "Assigned To", "Resolution Notes", "Resolved Date", "Created Date"];
    reportRows = data.map(d => [
      d.parcel_number, d.complainant_name, d.dispute_type,
      d.priority, d.status, d.assigned_to, d.resolution_notes,
      d.resolved_date, format(new Date(d.created_date), "yyyy-MM-dd"),
    ]);
  }

  const handleExportCSV = () => {
    if (reportRows.length === 0) { toast.error("No data to export"); return; }
    exportToCSV(`${reportType}_${format(new Date(), "yyyy-MM-dd")}.csv`, reportHeaders, reportRows);
    toast.success(`Exported ${reportRows.length} records`);
  };

  const handleExportPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Audit & Legal Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate exportable reports for legal auditability and compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPrint} className="gap-2">
            <FileText className="w-4 h-4" /> Print
          </Button>
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" /> Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div>
              <Input type="date" placeholder="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Input type="date" placeholder="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{reportTitle}</h2>
        <span className="text-sm text-muted-foreground">{reportData.length} records</span>
      </div>

      {/* Report Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {reportHeaders.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.slice(0, 100).map((row, ri) => (
                <tr key={ri} className="border-b border-border hover:bg-muted/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground max-w-xs truncate" title={cell ?? ""}>
                      {cell ?? <span className="text-muted-foreground italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={reportHeaders.length} className="text-center py-12 text-muted-foreground">
                    No records match the current filters
                  </td>
                </tr>
              )}
              {reportRows.length > 100 && (
                <tr>
                  <td colSpan={reportHeaders.length} className="text-center py-3 text-xs text-muted-foreground bg-muted/20">
                    Showing first 100 of {reportRows.length} records. Export CSV for full dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}