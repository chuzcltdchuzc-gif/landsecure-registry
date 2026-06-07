import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Camera, FileText, CheckCircle2, AlertTriangle, XCircle, Download, Loader2 } from "lucide-react";
import EvidenceSealPanel from "@/components/landvault/EvidenceSealPanel";
import DisputeReadinessPanel from "@/components/landvault/DisputeReadinessPanel";
import OwnershipStructurePanel from "@/components/landvault/OwnershipStructurePanel";
import EvidenceDetail from "./EvidenceDetail";

const RISK_CONFIG = {
  LOW: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  MEDIUM: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  HIGH: { color: "bg-red-100 text-red-700", icon: XCircle },
};

const CERT_STATUS = {
  PENDING: "bg-gray-100 text-gray-700",
  HELD: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-blue-100 text-blue-700",
  RELEASED: "bg-emerald-100 text-emerald-700",
};

const PAYMENT_STATUS = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  HELD: "bg-orange-100 text-orange-700",
  UNPAID: "bg-red-100 text-red-700",
};

const SURVEY_STATUSES = ["not_assigned","assigned","in_progress","completed","rejected"];
const PARCEL_STATUSES = ["draft","submitted","survey_assigned","survey_in_progress","survey_complete","documentation_complete","certificate_ready","certificate_issued"];

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%] break-all">{value}</span>
    </div>
  );
}

export default function ParcelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["lv-parcel-detail", id],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id }),
  });
  const parcel = parcels[0];

  const { data: evidence = [] } = useQuery({
    queryKey: ["lv-evidence-parcel", id],
    queryFn: () => base44.entities.EvidenceVault.filter({ parcel_id: id }),
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["lv-payments-parcel", id],
    queryFn: () => base44.entities.LandVaultPayment.filter({ parcel_id: id }),
    enabled: !!id,
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ["lv-surveys-parcel", id],
    queryFn: () => base44.entities.SurveyAssignment.filter({ parcel_id: id }),
    enabled: !!id,
  });

  const { data: duplicates = [] } = useQuery({
    queryKey: ["lv-duplicates-parcel", id],
    queryFn: () => base44.entities.DuplicateAlert.filter({ source_parcel_id: id }),
    enabled: !!id,
  });

  const updateParcel = useMutation({
    mutationFn: (data) => base44.entities.LandVaultParcel.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-parcel-detail", id] }),
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReport(null);
    const res = await base44.functions.invoke("lvEvidenceReport", { parcel_id: id });
    if (res?.data?.report) setReport(res.data.report);
    setGeneratingReport(false);
  };

  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!parcel) return <div className="text-center py-10 text-sm text-muted-foreground">Parcel not found.</div>;

  const risk = RISK_CONFIG[parcel.risk_level] || RISK_CONFIG.HIGH;
  const RiskIcon = risk.icon;
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const openDuplicates = duplicates.filter(d => d.status === "open").length;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-mono">{parcel.parcel_number || "Draft Parcel"}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${risk.color}`}>
              <RiskIcon className="w-3 h-3 mr-1 inline" />{parcel.risk_level || "HIGH"} RISK
            </Badge>
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${CERT_STATUS[parcel.certificate_status] || ""}`}>
              CERT: {parcel.certificate_status}
            </Badge>
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${PAYMENT_STATUS[parcel.payment_status] || ""}`}>
              {parcel.payment_status}
            </Badge>
            {parcel.duplicate_flag && (
              <Badge className="text-[10px] px-2 py-0 rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />DUPLICATE FLAG
              </Badge>
            )}
            {parcel.evidence_sealed && (
              <Badge className="text-[10px] px-2 py-0 rounded-full bg-emerald-100 text-emerald-700">
                SEALED
              </Badge>
            )}
          </div>
        </div>
        <Link to={`/lv/parcels/${id}/edit`}>
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
      </div>

      {/* Evidence Seal Panel — PHASE 3 */}
      <EvidenceSealPanel parcel={parcel} onSealed={() => qc.invalidateQueries({ queryKey: ["lv-parcel-detail", id] })} />

      {/* Duplicate warning */}
      {openDuplicates > 0 && (
        <Card className="border border-red-300 bg-red-50 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-800 font-medium">{openDuplicates} open duplicate alert(s). Parcel cannot reach VERIFIED until resolved.</p>
            <Link to="/lv/duplicates" className="ml-auto shrink-0">
              <Button size="sm" variant="outline" className="text-xs h-6 border-red-300 text-red-700">Review</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Status Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Parcel Status</p>
            <Select value={parcel.status} onValueChange={v => updateParcel.mutate({ status: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PARCEL_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Survey Status</p>
            <Select value={parcel.survey_status || "not_assigned"} onValueChange={v => updateParcel.mutate({ survey_status: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{SURVEY_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="readiness" className="text-xs">Readiness</TabsTrigger>
          <TabsTrigger value="report" className="text-xs">Report</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Location */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Location</CardTitle></CardHeader>
            <CardContent>
              <Row label="Community" value={parcel.community} />
              <Row label="Village" value={parcel.village} />
              <Row label="Ward" value={parcel.ward} />
              <Row label="LGA" value={parcel.lga} />
              <Row label="State" value={parcel.state} />
              <Row label="Size" value={parcel.size_sqm ? `${parcel.size_sqm.toLocaleString()} m²` : null} />
              {parcel.gps_lat && <Row label="GPS Confidence" value={parcel.gps_confidence} />}
              {parcel.gps_inside_lga !== undefined && <Row label="GPS Inside LGA" value={parcel.gps_inside_lga ? "Yes ✓" : "No ⚠"} />}
            </CardContent>
          </Card>

          {/* PHASE 4+5 — Ownership & Representative */}
          <OwnershipStructurePanel parcel={parcel} />

          {/* Consent Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Consent Summary</CardTitle></CardHeader>
            <CardContent>
              <Row label="Verbal Consent" value={parcel.consent_verbal ? "Yes ✓" : "Not recorded"} />
              <Row label="Audio" value={parcel.consent_audio_captured ? "Captured" : parcel.consent_audio_declined ? "Declined" : "—"} />
              <Row label="Signature" value={parcel.consent_signature_captured ? "Captured" : parcel.consent_signature_declined ? "Declined" : "—"} />
              <Row label="Photo" value={parcel.consent_photo_captured ? "Captured" : parcel.consent_photo_declined ? "Declined" : "—"} />
              <Row label="Witness" value={parcel.consent_witness_name || "—"} />
              <Row label="Witness Role" value={parcel.consent_witness_role?.replace(/_/g," ")} />
              {parcel.consent_strength_score !== undefined && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground mb-1">Consent Strength</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(parcel.consent_strength_score||0) >= 80 ? "bg-emerald-500" : (parcel.consent_strength_score||0) >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${parcel.consent_strength_score || 0}%` }} />
                    </div>
                    <span className="text-xs font-bold">{parcel.consent_strength_score}/100</span>
                    {parcel.consent_confidence && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${parcel.consent_confidence === "HIGH" ? "bg-emerald-100 text-emerald-700" : parcel.consent_confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {parcel.consent_confidence}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <Link to={`/lv/consent/${id}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                    <Shield className="w-3 h-3" />Capture / Update Consent
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Survey */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Survey</CardTitle></CardHeader>
            <CardContent>
              <Row label="Surveyor" value={parcel.surveyor_name} />
              <Row label="Licence" value={parcel.surveyor_licence} />
              <Row label="Date Surveyed" value={parcel.survey_date} />
              <Row label="Assignments" value={surveys.length > 0 ? `${surveys.length} assignment(s)` : null} />
              {parcel.survey_plan_url && (
                <a href={parcel.survey_plan_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View Survey Plan</a>
              )}
            </CardContent>
          </Card>

          {/* Community Validation */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Community Validation</CardTitle></CardHeader>
            <CardContent>
              <Row label="Status" value={parcel.community_validation_status?.replace(/_/g," ")} />
              <Row label="Validator" value={parcel.community_validator_name} />
              <Row label="Date" value={parcel.community_validation_date?.slice(0,10)} />
              {parcel.community_validator_notes && <p className="text-xs text-muted-foreground mt-1">{parcel.community_validator_notes}</p>}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Payments</CardTitle>
                <Link to={`/lv/payments/new?parcel_id=${id}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7">Record Payment</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Row label="Total Fee" value={parcel.total_fee ? `₦${parcel.total_fee?.toLocaleString()}` : null} />
              <Row label="Amount Paid" value={totalPaid > 0 ? `₦${totalPaid.toLocaleString()}` : null} />
              <Row label="Outstanding" value={parcel.outstanding_balance ? `₦${parcel.outstanding_balance?.toLocaleString()}` : null} />
              <Row label="Status" value={parcel.payment_status} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link to={`/lv/evidence/new?parcel_id=${id}`}>
              <Button variant="outline" className="w-full gap-2 text-sm"><Camera className="w-4 h-4" />Add Evidence</Button>
            </Link>
            <Link to={`/lv/consent/${id}`}>
              <Button className="w-full gap-2 text-sm bg-violet-600 hover:bg-violet-700"><Shield className="w-4 h-4" />Consent</Button>
            </Link>
          </div>
        </TabsContent>

        {/* EVIDENCE TAB — PHASE 2+3 */}
        <TabsContent value="evidence" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{evidence.length} evidence item(s)</p>
            <Link to={`/lv/evidence/new?parcel_id=${id}`}>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1"><Camera className="w-3 h-3" />Add</Button>
            </Link>
          </div>
          {evidence.length === 0 ? (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-xs text-muted-foreground">No evidence uploaded yet.</CardContent></Card>
          ) : (
            <EvidenceDetail parcelId={id} />
          )}
        </TabsContent>

        {/* DISPUTE READINESS TAB — PHASE 8 */}
        <TabsContent value="readiness" className="mt-4 space-y-4">
          <DisputeReadinessPanel parcel={parcel} evidenceCount={evidence.length} openDuplicates={openDuplicates} />

          {/* GPS Trust */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">GPS Trust — Phase 6</CardTitle></CardHeader>
            <CardContent>
              <Row label="GPS Confidence" value={parcel.gps_confidence} />
              <Row label="GPS Confidence Score" value={parcel.gps_confidence_score !== undefined ? `${parcel.gps_confidence_score}/100` : null} />
              <Row label="GPS Trust Status" value={parcel.gps_trust_status} />
              <Row label="Inside LGA" value={parcel.gps_inside_lga !== undefined ? (parcel.gps_inside_lga ? "Yes ✓" : "No ⚠") : null} />
              <Row label="Accuracy" value={parcel.gps_accuracy_m !== undefined ? `±${parcel.gps_accuracy_m}m` : null} />
              {parcel.gps_spoofing_flag && (
                <div className="flex items-center gap-2 py-2 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs font-semibold">GPS SPOOFING FLAG RAISED</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate status */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Duplicate Check Status</CardTitle></CardHeader>
            <CardContent>
              <Row label="Duplicate Flag" value={parcel.duplicate_flag ? "FLAGGED ⚠" : "Clean ✓"} />
              <Row label="Type" value={parcel.duplicate_type !== "none" ? parcel.duplicate_type?.replace(/_/g," ") : null} />
              <Row label="Open Alerts" value={openDuplicates > 0 ? `${openDuplicates} open` : "None"} />
              <Row label="Reviewed" value={parcel.duplicate_reviewed ? `Yes — ${parcel.duplicate_review_outcome?.replace(/_/g," ")}` : "Not yet reviewed"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* BANK/LAWYER REPORT TAB — PHASE 9 */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Land Evidence Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Generate a structured evidence report suitable for bank due diligence and legal review. All private data excluded.</p>
              <Button onClick={handleGenerateReport} disabled={generatingReport} className="gap-2 text-sm">
                {generatingReport ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><Download className="w-4 h-4" />Generate Evidence Report</>}
              </Button>
            </CardContent>
          </Card>

          {report && (
            <div className="space-y-3">
              {/* Disclaimer */}
              <Card className="border border-amber-200 bg-amber-50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-amber-800">{report.disclaimer}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Report ID: {report.report_id}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Row label="Parcel Number" value={report.parcel?.parcel_number} />
                  <Row label="Status" value={report.parcel?.status?.replace(/_/g," ")} />
                  <Row label="Verification" value={report.parcel?.verification_status?.replace(/_/g," ")} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Location</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Community" value={report.location?.community} />
                  <Row label="Ward" value={report.location?.ward} />
                  <Row label="LGA" value={report.location?.lga} />
                  <Row label="State" value={report.location?.state} />
                  <Row label="Size" value={report.location?.size_sqm ? `${report.location.size_sqm.toLocaleString()} m²` : null} />
                  <Row label="GPS Confidence" value={report.location?.gps_confidence} />
                  <Row label="GPS Inside LGA" value={report.location?.gps_inside_lga !== undefined ? (report.location.gps_inside_lga ? "Yes ✓" : "No ⚠") : null} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ownership & Authority</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Ownership Type" value={report.ownership?.ownership_type} />
                  <Row label="Family Name" value={report.ownership?.family_name} />
                  <Row label="Ownership Confidence" value={report.ownership?.ownership_confidence_score !== undefined ? `${report.ownership.ownership_confidence_score}/100` : null} />
                  <Row label="Representative Capacity" value={report.representative_authority?.representative_capacity} />
                  <Row label="Authority Basis" value={report.representative_authority?.authority_basis} />
                  <Row label="Relationship to Land" value={report.representative_authority?.relationship_to_land} />
                  <Row label="Authority Doc on File" value={report.representative_authority?.authority_document_present ? "Yes" : "No"} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Consent Summary</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Verbal Consent" value={report.consent?.verbal_consent ? "Yes" : "No"} />
                  <Row label="Consent Strength" value={`${report.consent?.consent_strength_score || 0}/100`} />
                  <Row label="Consent Confidence" value={report.consent?.consent_confidence} />
                  <Row label="Witness Recorded" value={report.consent?.witness_name_recorded ? "Yes" : "No"} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Evidence Package</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Total Items" value={report.evidence_package?.total_items} />
                  <Row label="Seal Status" value={report.evidence_package?.seal_status} />
                  <Row label="Seal ID" value={report.evidence_package?.seal_id} />
                  <Row label="Community Validation" value={report.community_validation?.status?.replace(/_/g," ")} />
                  <Row label="Duplicate Alerts" value={report.duplicate_check?.all_resolved ? "All Resolved ✓" : `${report.duplicate_check?.open_alerts} open`} />
                </CardContent>
              </Card>

              <Card className={`border shadow-sm ${report.dispute_readiness?.score >= 80 ? "border-emerald-200 bg-emerald-50" : report.dispute_readiness?.score >= 50 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-black">{report.dispute_readiness?.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                  <p className="text-sm font-bold">{report.dispute_readiness?.category}</p>
                  <p className="text-xs text-muted-foreground">Dispute Prevention Index</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}