import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, GitBranch, Users, FileText, UserCheck, Map,
  Award, CheckCircle2, XCircle, Clock, AlertTriangle, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import WitnessManager from "./WitnessManager";
import InheritanceDocManager from "./InheritanceDocManager";
import PlotAllocationManager from "./PlotAllocationManager";
import SubdivisionPlanner from "./SubdivisionPlanner";
import InheritanceCaseWorkflow from "./InheritanceCaseWorkflow";
import CertificateGenerator from "./CertificateGenerator";
import BeneficiaryManager from "./BeneficiaryManager";

const TABS = [
  { key: "overview", label: "Overview", icon: GitBranch },
  { key: "beneficiaries", label: "Beneficiaries", icon: Users },
  { key: "witnesses", label: "Witnesses", icon: UserCheck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "allocations", label: "Plot Allocation", icon: Map },
  { key: "subdivision", label: "Subdivision", icon: Map },
  { key: "certificate", label: "Certificate", icon: Award },
];

const WORKFLOW_ORDER = ["draft", "submitted", "surveyor_review", "compliance_review", "surveyor_general_review", "approved"];

const STAGE_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  surveyor_review: "Surveyor Review",
  compliance_review: "Compliance Review",
  surveyor_general_review: "SG Review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function InheritanceCaseDetail({ caseRecord, familyOwnership, user, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [caseData, setCaseData] = useState(caseRecord);
  const queryClient = useQueryClient();

  const { data: witnesses = [] } = useQuery({
    queryKey: ["witnesses", caseData.id],
    queryFn: () => base44.entities.InheritanceWitness.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["inheritance-docs", caseData.id],
    queryFn: () => base44.entities.InheritanceDocument.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });
  const { data: allocations = [] } = useQuery({
    queryKey: ["plot-allocations", caseData.id],
    queryFn: () => base44.entities.PlotAllocation.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });

  // Validation checks
  const validationWarnings = [];
  const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");
  if (witnesses.length === 0) validationWarnings.push("No witnesses added");
  else if (verifiedWitnesses.length < 2) validationWarnings.push(`Only ${verifiedWitnesses.length} verified witness(es) — minimum 2 required`);
  const activeDocuments = documents.filter(d => d.lifecycle_status === "active");
  if (activeDocuments.length === 0) validationWarnings.push("No supporting documents uploaded");
  if (allocations.length > 0) {
    const total = allocations.reduce((s, a) => s + (a.allocation_percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) validationWarnings.push(`Plot allocations total ${total.toFixed(1)}% — must equal 100%`);
  }

  const currentStageIndex = WORKFLOW_ORDER.indexOf(caseData.status);
  const isRejected = caseData.status === "rejected";
  const isApproved = caseData.status === "approved";
  const isTerminal = isRejected || caseData.status === "withdrawn";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono text-primary">
              {caseData.case_reference || `CASE-${caseData.id?.slice(-6).toUpperCase()}`}
            </h1>
            <Badge className={`text-xs capitalize ${
              isApproved ? "bg-emerald-100 text-emerald-700" :
              isRejected ? "bg-red-100 text-red-700" :
              isTerminal ? "bg-gray-100 text-gray-500" :
              "bg-amber-100 text-amber-700"
            }`}>
              {STAGE_LABELS[caseData.status] || caseData.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {caseData.case_title} · {familyOwnership?.family_name}
          </p>
        </div>
      </div>

      {/* Workflow progress */}
      <InheritanceCaseWorkflow
        caseData={caseData}
        setCaseData={setCaseData}
        user={user}
        validationWarnings={validationWarnings}
        witnesses={witnesses}
        documents={documents}
      />

      {/* Validation warnings banner */}
      {validationWarnings.length > 0 && !isApproved && !isTerminal && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Validation Warnings ({validationWarnings.length})
          </p>
          {validationWarnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 pl-5">• {w}</p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <CaseOverview caseData={caseData} familyOwnership={familyOwnership} />
      )}
      {activeTab === "beneficiaries" && (
        <BeneficiaryManager
          familyOwnership={familyOwnership}
          user={user}
          caseData={caseData}
        />
      )}
      {activeTab === "witnesses" && (
        <WitnessManager caseData={caseData} user={user} />
      )}
      {activeTab === "documents" && (
        <InheritanceDocManager caseData={caseData} user={user} />
      )}
      {activeTab === "allocations" && (
        <PlotAllocationManager caseData={caseData} familyOwnership={familyOwnership} user={user} />
      )}
      {activeTab === "subdivision" && (
        <SubdivisionPlanner caseData={caseData} familyOwnership={familyOwnership} user={user} />
      )}
      {activeTab === "certificate" && (
        <CertificateGenerator
          caseData={caseData}
          familyOwnership={familyOwnership}
          witnesses={witnesses}
          documents={documents}
          allocations={allocations}
          user={user}
          onCertGenerated={data => setCaseData(data)}
        />
      )}
    </div>
  );
}

function CaseOverview({ caseData, familyOwnership }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Case Information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Reference" value={caseData.case_reference} />
          <Row label="Type" value={caseData.case_type?.replace(/_/g, " ")} capitalize />
          <Row label="Status" value={STAGE_LABELS[caseData.status]} />
          <Row label="Initiated By" value={caseData.initiated_by_name || caseData.initiated_by} />
          <Row label="Created" value={caseData.created_date ? format(new Date(caseData.created_date), "MMM d, yyyy") : "—"} />
          {caseData.description && <div className="pt-2 text-xs text-muted-foreground border-t">{caseData.description}</div>}
          {caseData.rejection_reason && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-red-700">Rejection Reason:</p>
              <p className="text-xs text-red-600">{caseData.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {familyOwnership && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Family Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Family" value={familyOwnership.family_name} />
            <Row label="Head" value={familyOwnership.family_head} />
            {familyOwnership.parent_name && <Row label="Ancestor" value={familyOwnership.parent_name} />}
            {familyOwnership.clan_name && <Row label="Clan" value={familyOwnership.clan_name} />}
            {familyOwnership.village && <Row label="Village" value={familyOwnership.village} />}
            {familyOwnership.community && <Row label="Community" value={familyOwnership.community} />}
            {familyOwnership.lga && <Row label="LGA" value={familyOwnership.lga} />}
            {familyOwnership.state && <Row label="State" value={familyOwnership.state} />}
            {familyOwnership.family_lineage && <Row label="Lineage" value={familyOwnership.family_lineage} capitalize />}
          </CardContent>
        </Card>
      )}

      {/* Reviewer history */}
      {(caseData.surveyor_reviewer || caseData.compliance_reviewer || caseData.sg_reviewer) && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Review History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData.surveyor_reviewer && (
              <ReviewRow stage="Surveyor Review" reviewer={caseData.surveyor_reviewer} date={caseData.surveyor_review_date} notes={caseData.surveyor_notes} />
            )}
            {caseData.compliance_reviewer && (
              <ReviewRow stage="Compliance Review" reviewer={caseData.compliance_reviewer} date={caseData.compliance_review_date} notes={caseData.compliance_notes} />
            )}
            {caseData.sg_reviewer && (
              <ReviewRow stage="Surveyor General Review" reviewer={caseData.sg_reviewer} date={caseData.sg_review_date} notes={caseData.sg_notes} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, capitalize }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function ReviewRow({ stage, reviewer, date, notes }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{stage}</p>
        <p className="text-xs text-muted-foreground">
          {reviewer} · {date ? format(new Date(date), "MMM d, yyyy HH:mm") : ""}
        </p>
        {notes && <p className="text-xs text-muted-foreground mt-1 italic">{notes}</p>}
      </div>
    </div>
  );
}