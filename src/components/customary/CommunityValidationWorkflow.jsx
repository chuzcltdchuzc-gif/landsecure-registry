import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Clock, XCircle, Plus, ChevronDown, ChevronUp, ArrowRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "community_review", label: "Community Review" },
  { key: "village_head_validation", label: "Village Head" },
  { key: "traditional_authority_validation", label: "Traditional Authority" },
  { key: "compliance_review", label: "Compliance Review" },
  { key: "surveyor_general_review", label: "SG Review" },
  { key: "approved", label: "Approved" },
];

const STAGE_ORDER = STAGES.map(s => s.key);

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-700",
  community_review: "bg-cyan-100 text-cyan-700",
  village_head_validation: "bg-amber-100 text-amber-700",
  traditional_authority_validation: "bg-orange-100 text-orange-700",
  compliance_review: "bg-purple-100 text-purple-700",
  surveyor_general_review: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  clarification_requested: "bg-yellow-100 text-yellow-700",
};

export default function CommunityValidationWorkflow({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [reviewId, setReviewId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const qc = useQueryClient();

  const { data: validations = [] } = useQuery({
    queryKey: ["community-validations", caseData?.id],
    queryFn: () => base44.entities.CommunityValidation.filter(
      { is_deleted: false, inheritance_case_id: caseData?.id },
      "-created_date", 20
    ),
    enabled: !!caseData?.id,
  });

  const logAudit = (action, details) => base44.entities.AuditLog.create({
    user_email: user?.email, user_name: user?.full_name,
    action, entity_type: "CommunityValidation", details,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const rec = await base44.entities.CommunityValidation.create({
        ...data,
        inheritance_case_id: caseData?.id,
        family_ownership_id: familyOwnership?.id,
        parcel_id: caseData?.parcel_id,
        parcel_number: caseData?.parcel_number,
        submitted_by: user?.email,
        submitted_by_name: user?.full_name,
        status: "submitted",
      });
      await logAudit("COMMUNITY_VALIDATION_CREATED", `Validation for ${data.community_name}, ${data.lga}`);
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["community-validations"] }); setShowForm(false); toast.success("Community validation submitted"); },
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ id, action, notes, currentStatus }) => {
      const now = new Date().toISOString();
      let upd = {};
      if (action === "approve") {
        const idx = STAGE_ORDER.indexOf(currentStatus);
        const nextStage = STAGE_ORDER[idx + 1] || "approved";
        upd.status = nextStage;
        const stageMap = {
          submitted: { community_review_by: user?.email, community_review_date: now, community_review_notes: notes },
          community_review: { village_head_validated_by: user?.email, village_head_validation_date: now, village_head_notes: notes },
          village_head_validation: { trad_authority_validated_by: user?.email, trad_authority_validation_date: now, trad_authority_notes: notes },
          traditional_authority_validation: { compliance_reviewed_by: user?.email, compliance_review_date: now, compliance_notes: notes },
          compliance_review: { sg_reviewed_by: user?.email, sg_review_date: now, sg_notes: notes },
          surveyor_general_review: { final_approved_by: user?.email, final_approved_date: now },
        };
        upd = { ...upd, ...(stageMap[currentStatus] || {}) };
      } else if (action === "reject") {
        upd = { status: "rejected", rejection_reason: notes };
      } else if (action === "clarify") {
        upd = { status: "clarification_requested", clarification_request: notes };
      }
      const rec = await base44.entities.CommunityValidation.update(id, upd);
      await logAudit(`COMMUNITY_VALIDATION_${action.toUpperCase()}`, `Action: ${action} by ${user?.email} — ${notes}`);
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["community-validations"] }); setReviewId(null); setReviewNotes(""); toast.success("Action recorded"); },
  });

  const canActOnStage = (v) => {
    const role = user?.role;
    if (v.status === "submitted" && ["surveyor", "compliance_officer", "super_admin"].includes(role)) return true;
    if (v.status === "community_review" && ["surveyor", "compliance_officer", "super_admin"].includes(role)) return true;
    if (v.status === "village_head_validation" && ["surveyor", "compliance_officer", "super_admin"].includes(role)) return true;
    if (v.status === "traditional_authority_validation" && ["compliance_officer", "surveyor_general", "super_admin"].includes(role)) return true;
    if (v.status === "compliance_review" && ["compliance_officer", "super_admin"].includes(role)) return true;
    if (v.status === "surveyor_general_review" && ["surveyor_general", "super_admin"].includes(role)) return true;
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" /> Community Validation ({validations.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> New Validation
        </Button>
      </div>

      {validations.map(v => (
        <Card key={v.id} className={`border-l-4 ${v.status === "approved" ? "border-l-emerald-400" : v.status === "rejected" ? "border-l-red-400" : "border-l-blue-300"}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{v.community_name}</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[v.status] || "bg-gray-100 text-gray-600"}`}>{v.status?.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.village_name && `${v.village_name}, `}{v.ward && `${v.ward}, `}{v.lga}, {v.state}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                {expanded === v.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Pipeline progress */}
            <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
              {STAGES.map((s, i) => {
                const stageIdx = STAGE_ORDER.indexOf(v.status);
                const thisIdx = i;
                const done = thisIdx < stageIdx || v.status === "approved";
                const active = s.key === v.status;
                return (
                  <React.Fragment key={s.key}>
                    <div className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded text-center font-medium ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500"}`}>
                      {s.label}
                    </div>
                    {i < STAGES.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>

            {expanded === v.id && (
              <div className="pt-2 border-t space-y-2 text-xs">
                {v.family_representative && <Row label="Family Rep" value={v.family_representative} />}
                {v.community_elder && <Row label="Community Elder" value={v.community_elder} />}
                {v.village_head && <Row label="Village Head" value={v.village_head} />}
                {v.traditional_ruler && <Row label="Traditional Ruler" value={v.traditional_ruler} />}
                {v.validation_notes && <div className="bg-muted/30 rounded p-2 text-xs">{v.validation_notes}</div>}
                {v.rejection_reason && <div className="bg-red-50 rounded p-2 text-xs text-red-700"><span className="font-semibold">Rejected:</span> {v.rejection_reason}</div>}
                {v.clarification_request && <div className="bg-yellow-50 rounded p-2 text-xs text-amber-700"><span className="font-semibold">Clarification:</span> {v.clarification_request}</div>}
              </div>
            )}

            {canActOnStage(v) && !["approved", "rejected"].includes(v.status) && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { setReviewId({ id: v.id, status: v.status }); setReviewAction("approve"); }}>Advance</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setReviewId({ id: v.id, status: v.status }); setReviewAction("clarify"); }}>Request Clarification</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { setReviewId({ id: v.id, status: v.status }); setReviewAction("reject"); }}>Reject</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {validations.length === 0 && (
        <Card><CardContent className="py-10 text-center"><p className="text-xs text-muted-foreground">No community validations submitted</p></CardContent></Card>
      )}

      {showForm && <CommunityValidationForm onSubmit={createMutation.mutate} onClose={() => setShowForm(false)} isLoading={createMutation.isPending} />}

      {reviewId && (
        <Dialog open onOpenChange={() => { setReviewId(null); setReviewNotes(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="capitalize">{reviewAction} Community Validation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Notes {reviewAction === "reject" ? "(required)" : "(optional)"}</Label>
                <Textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder={reviewAction === "clarify" ? "What clarification is needed?" : reviewAction === "reject" ? "Reason for rejection..." : "Review notes..."} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setReviewId(null); setReviewNotes(""); }}>Cancel</Button>
                <Button size="sm" disabled={advanceMutation.isPending || (reviewAction === "reject" && !reviewNotes)}
                  onClick={() => advanceMutation.mutate({ id: reviewId.id, action: reviewAction, notes: reviewNotes, currentStatus: reviewId.status })}
                  className={reviewAction === "reject" ? "bg-red-600 hover:bg-red-700" : ""}>
                  {advanceMutation.isPending ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CommunityValidationForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({ community_name: "", village_name: "", ward: "", district: "", lga: "", state: "", validation_notes: "", family_representative: "", community_elder: "", village_head: "", ward_head: "", traditional_ruler: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Submit Community Validation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Community Name *</Label><Input value={form.community_name} onChange={e => set("community_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Village Name</Label><Input value={form.village_name} onChange={e => set("village_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Ward</Label><Input value={form.ward} onChange={e => set("ward", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">District</Label><Input value={form.district} onChange={e => set("district", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">LGA *</Label><Input value={form.lga} onChange={e => set("lga", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">State *</Label><Input value={form.state} onChange={e => set("state", e.target.value)} /></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground pt-1">Validation Actors</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Family Representative</Label><Input value={form.family_representative} onChange={e => set("family_representative", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Community Elder</Label><Input value={form.community_elder} onChange={e => set("community_elder", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Village Head</Label><Input value={form.village_head} onChange={e => set("village_head", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Ward Head</Label><Input value={form.ward_head} onChange={e => set("ward_head", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Traditional Ruler</Label><Input value={form.traditional_ruler} onChange={e => set("traditional_ruler", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.validation_notes} onChange={e => set("validation_notes", e.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.community_name || !form.lga || !form.state} onClick={() => onSubmit(form)}>
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return <div className="flex gap-2"><span className="text-muted-foreground w-28 flex-shrink-0">{label}:</span><span className="font-medium">{value}</span></div>;
}