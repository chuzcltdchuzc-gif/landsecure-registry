import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, FileText, Map, Shield, Users, GitBranch, Landmark, Printer
} from "lucide-react";
import { format, subMonths } from "date-fns";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

function ReportCard({ title, icon: Icon, description, color, bg, onExport, exporting }) {
  return (
    <Card className={`border-2 border-${color}-200 ${bg}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={onExport} disabled={exporting}>
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Generating…" : "Download CSV Report"}
        </Button>
      </CardContent>
    </Card>
  );
}

function printReport(title, rows, headers) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PilotReports() {
  const [exporting, setExporting] = useState({});

  const { data: parcels = [], isLoading } = useQuery({ queryKey: ["rep-parcels"], queryFn: () => base44.entities.LandParcel.list("-created_date", 2000) });
  const { data: disputes = [] } = useQuery({ queryKey: ["rep-disputes"], queryFn: () => base44.entities.Dispute.list("-created_date", 500) });
  const { data: alerts = [] } = useQuery({ queryKey: ["rep-alerts"], queryFn: () => base44.entities.FraudAlert.list("-created_date", 500) });
  const { data: fieldReports = [] } = useQuery({ queryKey: ["rep-reports"], queryFn: () => base44.entities.FieldReport.list("-created_date", 1000) });
  const { data: familyOwnerships = [] } = useQuery({ queryKey: ["rep-family"], queryFn: () => base44.entities.FamilyOwnership.list("-created_date", 500) });
  const { data: inheritanceCases = [] } = useQuery({ queryKey: ["rep-cases"], queryFn: () => base44.entities.InheritanceCase.filter({ is_deleted: false }, "-created_date", 500) });
  const { data: communityValidations = [] } = useQuery({ queryKey: ["rep-cv"], queryFn: () => base44.entities.CommunityValidation.filter({ is_deleted: false }, "-created_date", 500) });
  const { data: beneficiaries = [] } = useQuery({ queryKey: ["rep-bens"], queryFn: () => base44.entities.FamilyBeneficiary.filter({ is_deleted: false }, "-created_date", 1000) });

  if (isLoading) return <LoadingSpinner text="Loading report data…" />;

  const now = new Date();
  const approved = parcels.filter(p => ["approved", "approved_locked"].includes(p.status)).length;
  const pending = parcels.filter(p => p.status === "pending").length;

  const doExport = async (id, fn) => {
    setExporting(e => ({ ...e, [id]: true }));
    try { fn(); } finally {
      setTimeout(() => setExporting(e => ({ ...e, [id]: false })), 1000);
    }
  };

  const exportPilotSummary = () => {
    const headers = ["Metric", "Value", "Details"];
    const rows = [
      ["Report Title", "Greenfield LGA Pilot Summary Report", ""],
      ["Report Date", format(now, "MMMM d, yyyy"), ""],
      ["LGA", "Greenfield Local Government", "Rivers State"],
      ["", "", ""],
      ["LAND REGISTRY OVERVIEW", "", ""],
      ["Total Parcels", parcels.length, "All registered parcels"],
      ["Approved Parcels", approved, `${parcels.length > 0 ? Math.round(approved / parcels.length * 100) : 0}% approval rate`],
      ["Pending Approval", pending, "Awaiting review"],
      ["Disputed Parcels", parcels.filter(p => p.status === "disputed").length, "Under dispute investigation"],
      ["Frozen Parcels", parcels.filter(p => p.status === "frozen").length, "Administratively frozen"],
      ["", "", ""],
      ["FIELD OPERATIONS", "", ""],
      ["Field Reports", fieldReports.length, "GPS-verified site inspections"],
      ["Submitted Reports", fieldReports.filter(r => r.status === "submitted").length, "Awaiting review"],
      ["Reviewed Reports", fieldReports.filter(r => r.status === "reviewed").length, "Completed reviews"],
      ["", "", ""],
      ["FAMILY & INHERITANCE", "", ""],
      ["Family Ownership Records", familyOwnerships.length, "Registered family parcels"],
      ["Total Beneficiaries", beneficiaries.length, "Registered inheritance beneficiaries"],
      ["Inheritance Cases", inheritanceCases.length, "Active/completed cases"],
      ["Approved Inheritance Cases", inheritanceCases.filter(c => c.status === "approved").length, ""],
      ["", "", ""],
      ["DISPUTES & FRAUD", "", ""],
      ["Total Disputes", disputes.length, "All dispute records"],
      ["Open Disputes", disputes.filter(d => d.status === "open").length, "Pending investigation"],
      ["Resolved Disputes", disputes.filter(d => d.status === "resolved").length, "Successfully resolved"],
      ["Fraud Alerts", alerts.length, "System-flagged alerts"],
      ["High Risk Alerts", alerts.filter(a => a.risk_level === "high").length, "Critical review required"],
      ["", "", ""],
      ["COMMUNITY GOVERNANCE", "", ""],
      ["Community Validations", communityValidations.length, "Community-endorsed records"],
      ["Approved Validations", communityValidations.filter(v => v.status === "approved").length, ""],
    ];
    printReport("Greenfield LGA Pilot Summary Report", rows, headers);
  };

  const exportLandRegistry = () => {
    const headers = ["Parcel Number", "Owner", "Land Use", "Status", "LGA", "Address", "Size (ha)", "Verification", "Approval Date", "Fraud Risk", "Registered By"];
    const rows = parcels.map(p => [
      p.parcel_number, p.owner_name, p.land_use, p.status, p.lga,
      p.address, p.size_hectares, p.verification_status,
      p.approval_date || "", p.fraud_risk_level, p.registered_by,
    ]);
    printReport("Land Registry Report", rows, headers);
  };

  const exportFraudReport = () => {
    const headers = ["Alert Type", "Parcel Number", "Risk Level", "Risk Score", "Description", "Status", "Assigned To"];
    const rows = alerts.map(a => [
      a.alert_type || "unknown", a.parcel_number || "", a.risk_level || "",
      a.risk_score || "", a.description || "", a.status || "", a.assigned_to || "",
    ]);
    printReport("Fraud Monitoring Report", rows, headers);
  };

  const exportCommunityReport = () => {
    const headers = ["Community", "Village", "LGA", "Ward", "Family Representative", "Community Elder", "Traditional Ruler", "Status", "Validation Date"];
    const rows = communityValidations.map(v => [
      v.community_name, v.village_name, v.lga, v.ward,
      v.family_representative, v.community_elder, v.traditional_ruler,
      v.status, v.validation_date,
    ]);
    printReport("Community Validation Report", rows, headers);
  };

  const exportInheritanceReport = () => {
    const headers = ["Case Reference", "Family Name", "Case Type", "Parcel Number", "Status", "Initiated By", "Surveyor Notes", "Compliance Notes", "Final Approved By", "Approved Date"];
    const rows = inheritanceCases.map(c => [
      c.case_reference, c.family_name, c.case_type, c.parcel_number,
      c.status, c.initiated_by_name, c.surveyor_notes || "",
      c.compliance_notes || "", c.final_approved_by || "", c.final_approved_date || "",
    ]);
    printReport("Inheritance Management Report", rows, headers);
  };

  const reports = [
    {
      id: "pilot", title: "Pilot Summary Report", icon: Map, color: "blue", bg: "bg-blue-50/50",
      description: "Complete overview of all registry metrics, KPIs, and pilot readiness indicators",
      fn: exportPilotSummary,
    },
    {
      id: "land", title: "Land Registry Report", icon: FileText, color: "emerald", bg: "bg-emerald-50/50",
      description: `All ${parcels.length} registered parcels with ownership, status, and verification data`,
      fn: exportLandRegistry,
    },
    {
      id: "fraud", title: "Fraud Monitoring Report", icon: Shield, color: "red", bg: "bg-red-50/50",
      description: `${alerts.length} fraud alerts with risk scores, types, and resolution status`,
      fn: exportFraudReport,
    },
    {
      id: "community", title: "Community Validation Report", icon: Landmark, color: "teal", bg: "bg-teal-50/50",
      description: `${communityValidations.length} community validations with elder and traditional authority records`,
      fn: exportCommunityReport,
    },
    {
      id: "inheritance", title: "Inheritance Management Report", icon: GitBranch, color: "purple", bg: "bg-purple-50/50",
      description: `${inheritanceCases.length} inheritance cases with full workflow stage documentation`,
      fn: exportInheritanceReport,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Pilot Reports</h1>
          <Badge className="bg-primary/10 text-primary border-primary/20">Presentation Ready</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Export presentation-ready reports for investor meetings, government stakeholder reviews, and pilot planning sessions.
        </p>
      </div>

      {/* Summary stats */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current Dataset Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Total Parcels", value: parcels.length },
              { label: "Approved", value: approved },
              { label: "Family Records", value: familyOwnerships.length },
              { label: "Inheritance Cases", value: inheritanceCases.length },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <ReportCard
            key={r.id}
            title={r.title}
            icon={r.icon}
            description={r.description}
            color={r.color}
            bg={r.bg}
            onExport={() => doExport(r.id, r.fn)}
            exporting={!!exporting[r.id]}
          />
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">📋 Presentation Tips</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-700">
            <p>• Open CSV files in Excel or Google Sheets for formatted tables</p>
            <p>• Pilot Summary is ideal for opening board/investor presentations</p>
            <p>• Land Registry Report shows full parcel-level data for due diligence</p>
            <p>• Fraud Monitoring shows the AI detection capability to government</p>
            <p>• Community Validation demonstrates customary law digitisation</p>
            <p>• Inheritance Report is most impactful for traditional authority audiences</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}