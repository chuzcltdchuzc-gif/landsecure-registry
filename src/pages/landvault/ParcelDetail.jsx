import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, Camera, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

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

  const updateParcel = useMutation({
    mutationFn: (data) => base44.entities.LandVaultParcel.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-parcel-detail", id] }),
  });

  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!parcel) return <div className="text-center py-10 text-sm text-muted-foreground">Parcel not found.</div>;

  const risk = RISK_CONFIG[parcel.risk_level] || RISK_CONFIG.HIGH;
  const RiskIcon = risk.icon;
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-mono">{parcel.parcel_number || "Draft Parcel"}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${risk.color}`}>
              <RiskIcon className="w-3 h-3 mr-1 inline" />{parcel.risk_level} RISK
            </Badge>
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${CERT_STATUS[parcel.certificate_status] || ""}`}>
              CERT: {parcel.certificate_status}
            </Badge>
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${PAYMENT_STATUS[parcel.payment_status] || ""}`}>
              {parcel.payment_status}
            </Badge>
          </div>
        </div>
        <Link to={`/lv/parcels/${id}/edit`}>
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
      </div>

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
          {parcel.gps_lat && <Row label="GPS" value={`${parcel.gps_lat?.toFixed(5)}, ${parcel.gps_lng?.toFixed(5)}`} />}
        </CardContent>
      </Card>

      {/* Ownership */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ownership</CardTitle></CardHeader>
        <CardContent>
          <Row label="Type" value={parcel.ownership_type} />
          <Row label="Land Use" value={parcel.land_use} />
          <Row label="Owner / Family" value={parcel.owner_name || parcel.family_name} />
          <Row label="Representative" value={parcel.family_representative} />
          <Row label="Founder" value={parcel.founder_name} />
          <Row label="Verification" value={parcel.verification_status?.replace(/_/g," ")} />
          {parcel.ownership_confidence_score !== undefined && <Row label="Confidence Score" value={`${parcel.ownership_confidence_score}/100`} />}
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

      {/* Evidence */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Evidence Vault ({evidence.length})</CardTitle>
            <Link to={`/lv/evidence/new?parcel_id=${id}`}>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1"><Camera className="w-3 h-3" />Add</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 && <p className="text-xs text-muted-foreground">No evidence uploaded yet.</p>}
          <div className="space-y-1">
            {evidence.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                <Shield className="w-3 h-3 text-violet-500" />
                <span className="text-xs font-medium flex-1">{e.evidence_type?.replace(/_/g," ")}</span>
                <span className="text-[10px] text-muted-foreground">{e.file_name || "Uploaded"}</span>
              </div>
            ))}
          </div>
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

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={`/lv/evidence/new?parcel_id=${id}`}>
          <Button variant="outline" className="w-full gap-2 text-sm"><Camera className="w-4 h-4" />Add Evidence</Button>
        </Link>
        <Link to={`/lv/certificates/${id}`}>
          <Button className="w-full gap-2 text-sm bg-violet-600 hover:bg-violet-700"><FileText className="w-4 h-4" />Certificates</Button>
        </Link>
      </div>
    </div>
  );
}