import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  conditionally_approved: "bg-blue-100 text-blue-700",
};

export default function TraditionalAuthorityPanel({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const qc = useQueryClient();

  const { data: validations = [] } = useQuery({
    queryKey: ["trad-validations", caseData?.id],
    queryFn: () => base44.entities.TraditionalAuthorityValidation.filter(
      { is_deleted: false, inheritance_case_id: caseData?.id },
      "-created_date", 20
    ),
    enabled: !!caseData?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const rec = await base44.entities.TraditionalAuthorityValidation.create({
        ...data,
        inheritance_case_id: caseData?.id,
        family_ownership_id: familyOwnership?.id,
        parcel_id: caseData?.parcel_id,
        parcel_number: caseData?.parcel_number,
        submitted_by: user?.email,
        submitted_by_name: user?.full_name,
        validation_status: "pending",
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "TRAD_AUTHORITY_VALIDATION_SUBMITTED",
        entity_type: "TraditionalAuthorityValidation",
        details: `${data.traditional_ruler_name} (${data.traditional_institution}) submitted for case ${caseData?.case_reference}`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trad-validations"] }); setShowForm(false); toast.success("Traditional authority validation submitted"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, comments, conditions }) => {
      const rec = await base44.entities.TraditionalAuthorityValidation.update(id, {
        validation_status: status,
        validation_date: new Date().toISOString(),
        comments,
        conditions,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: `TRAD_AUTHORITY_VALIDATION_${status.toUpperCase()}`,
        entity_type: "TraditionalAuthorityValidation",
        details: `Status: ${status} — ${comments || ""}`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trad-validations"] }); toast.success("Validation status updated"); },
  });

  const canApprove = ["surveyor_general", "compliance_officer", "super_admin"].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-600" /> Traditional Authority Validations ({validations.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Validation
        </Button>
      </div>

      {validations.length === 0 ? (
        <Card><CardContent className="py-10 text-center"><Crown className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No traditional authority validations</p></CardContent></Card>
      ) : (
        validations.map(v => (
          <Card key={v.id} className={`border-l-4 ${v.validation_status === "approved" ? "border-l-emerald-400" : v.validation_status === "rejected" ? "border-l-red-400" : "border-l-amber-300"}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-sm font-semibold">{v.traditional_ruler_name}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[v.validation_status]}`}>{v.validation_status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-5">{v.title && `${v.title} — `}{v.traditional_institution}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                  {expanded === v.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {expanded === v.id && (
                <div className="pt-2 border-t space-y-3">
                  {v.validation_date && <p className="text-xs text-muted-foreground">Validated: {format(new Date(v.validation_date), "MMM d, yyyy HH:mm")}</p>}
                  {v.comments && <div className="bg-muted/30 rounded p-2 text-xs">{v.comments}</div>}
                  {v.conditions && <div className="bg-amber-50 rounded p-2 text-xs text-amber-800"><span className="font-semibold">Conditions:</span> {v.conditions}</div>}
                  <div className="flex gap-2 flex-wrap">
                    {v.digital_signature_url && <a href={v.digital_signature_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs">Signature</Button></a>}
                    {v.seal_url && <a href={v.seal_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs">Seal</Button></a>}
                  </div>
                  {canApprove && v.validation_status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus.mutate({ id: v.id, status: "approved", comments: "Approved by " + user?.full_name })}>Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700 border-amber-200" onClick={() => { const cond = prompt("Conditions?"); if (cond) updateStatus.mutate({ id: v.id, status: "conditionally_approved", conditions: cond, comments: "" }); }}>Conditional</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { const reason = prompt("Rejection reason?"); if (reason) updateStatus.mutate({ id: v.id, status: "rejected", comments: reason }); }}>Reject</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showForm && <TradValidationForm onSubmit={saveMutation.mutate} onClose={() => setShowForm(false)} isLoading={saveMutation.isPending} />}
    </div>
  );
}

function TradValidationForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({ traditional_institution: "", traditional_ruler_name: "", title: "", comments: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Traditional Authority Validation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Traditional Institution *</Label><Input value={form.traditional_institution} onChange={e => set("traditional_institution", e.target.value)} placeholder="e.g. Obi of Onitsha, Eze Nri" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Ruler Name *</Label><Input value={form.traditional_ruler_name} onChange={e => set("traditional_ruler_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="HRH, Chief, etc." /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Comments</Label><Textarea rows={3} value={form.comments} onChange={e => set("comments", e.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.traditional_ruler_name || !form.traditional_institution} onClick={() => onSubmit(form)}>
              {isLoading ? "Saving..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}