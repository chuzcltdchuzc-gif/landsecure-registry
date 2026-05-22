import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeartCrack, Plus, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  escalated: "bg-purple-100 text-purple-700",
};

export default function DeathVerificationPanel({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const qc = useQueryClient();

  const { data: verifications = [] } = useQuery({
    queryKey: ["death-verifications", caseData?.id],
    queryFn: () => base44.entities.DeathVerification.filter(
      { is_deleted: false, inheritance_case_id: caseData?.id },
      "-created_date", 20
    ),
    enabled: !!caseData?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const rec = await base44.entities.DeathVerification.create({
        ...data,
        inheritance_case_id: caseData?.id,
        family_ownership_id: familyOwnership?.id,
        parcel_id: caseData?.parcel_id,
        submitted_by: user?.email,
        submitted_by_name: user?.full_name,
        verification_status: "pending",
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "DEATH_VERIFICATION_SUBMITTED",
        entity_type: "DeathVerification",
        details: `Death verification for ${data.deceased_name} submitted`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["death-verifications"] }); setShowForm(false); toast.success("Death verification submitted"); },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const upd = { verification_status: status };
      if (status === "verified") { upd.verified_by = user?.email; upd.verified_date = new Date().toISOString(); }
      if (status === "rejected") upd.rejection_reason = reason;
      if (status === "escalated") upd.escalation_reason = reason;
      const rec = await base44.entities.DeathVerification.update(id, upd);
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: `DEATH_VERIFICATION_${status.toUpperCase()}`,
        entity_type: "DeathVerification",
        details: reason || `Status: ${status}`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["death-verifications"] }); toast.success("Verification updated"); },
  });

  const canVerify = ["surveyor_general", "compliance_officer", "super_admin"].includes(user?.role);
  const allVerified = verifications.length > 0 && verifications.every(v => v.verification_status === "verified");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HeartCrack className="w-4 h-4 text-red-500" /> Death Verifications ({verifications.length})
          </h3>
          {allVerified && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">All Verified</Badge>}
          {!allVerified && verifications.some(v => v.verification_status === "pending") && (
            <Badge className="text-[10px] bg-amber-100 text-amber-700">Pending Verification</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Verification
        </Button>
      </div>

      {verifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <HeartCrack className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No death verifications submitted</p>
            <p className="text-[11px] text-muted-foreground mt-1">Inheritance cannot proceed until death is verified</p>
          </CardContent>
        </Card>
      ) : (
        verifications.map(v => (
          <Card key={v.id} className={`border-l-4 ${v.verification_status === "verified" ? "border-l-emerald-400" : v.verification_status === "rejected" ? "border-l-red-400" : "border-l-amber-300"}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{v.deceased_name}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[v.verification_status]}`}>{v.verification_status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    DOD: {v.date_of_death ? format(new Date(v.date_of_death), "MMM d, yyyy") : "—"}
                    {v.place_of_death ? ` · ${v.place_of_death}` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                  {expanded === v.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {expanded === v.id && (
                <div className="pt-2 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ConfirmRow label="Family" confirmed={v.family_confirmation} by={v.family_confirmed_by} date={v.family_confirmation_date} />
                    <ConfirmRow label="Community" confirmed={v.community_confirmation} by={v.community_confirmed_by} date={v.community_confirmation_date} />
                    <ConfirmRow label="LG Authority" confirmed={v.lg_confirmation} by={v.lg_confirmed_by} date={v.lg_confirmation_date} />
                    <ConfirmRow label="Court" confirmed={v.court_confirmation} by={v.court_confirmed_by} date={v.court_confirmation_date} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {v.death_certificate_url && <a href={v.death_certificate_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs">Death Cert.</Button></a>}
                    {v.court_declaration_url && <a href={v.court_declaration_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs">Court Decl.</Button></a>}
                    {v.probate_url && <a href={v.probate_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs">Probate</Button></a>}
                  </div>
                  {v.rejection_reason && <div className="bg-red-50 rounded p-2 text-xs text-red-700"><span className="font-semibold">Rejection:</span> {v.rejection_reason}</div>}
                  {v.escalation_reason && <div className="bg-purple-50 rounded p-2 text-xs text-purple-700"><span className="font-semibold">Escalation:</span> {v.escalation_reason}</div>}
                  {canVerify && v.verification_status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => verifyMutation.mutate({ id: v.id, status: "verified" })}>Verify</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-purple-600 border-purple-200" onClick={() => { const r = prompt("Escalation reason?"); if (r) verifyMutation.mutate({ id: v.id, status: "escalated", reason: r }); }}>Escalate</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { const r = prompt("Rejection reason?"); if (r) verifyMutation.mutate({ id: v.id, status: "rejected", reason: r }); }}>Reject</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showForm && <DeathVerifForm onSubmit={saveMutation.mutate} onClose={() => setShowForm(false)} isLoading={saveMutation.isPending} />}
    </div>
  );
}

function ConfirmRow({ label, confirmed, by, date }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded ${confirmed ? "bg-emerald-50" : "bg-gray-50"}`}>
      {confirmed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      <div>
        <p className="text-[11px] font-medium">{label}</p>
        {by && <p className="text-[10px] text-muted-foreground">{by}</p>}
      </div>
    </div>
  );
}

function DeathVerifForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({ deceased_name: "", date_of_death: "", place_of_death: "", family_confirmation: false, family_confirmed_by: "", community_confirmation: false, community_confirmed_by: "", lg_confirmation: false, lg_confirmed_by: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Submit Death Verification</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Deceased Name *</Label><Input value={form.deceased_name} onChange={e => set("deceased_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Date of Death *</Label><Input type="date" value={form.date_of_death} onChange={e => set("date_of_death", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Place of Death</Label><Input value={form.place_of_death} onChange={e => set("place_of_death", e.target.value)} /></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Confirmation Sources</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.family_confirmation} onChange={e => set("family_confirmation", e.target.checked)} /><label className="text-xs">Family Confirmed</label></div>
            <div className="space-y-1"><Label className="text-xs">Confirmed By</Label><Input value={form.family_confirmed_by} onChange={e => set("family_confirmed_by", e.target.value)} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.community_confirmation} onChange={e => set("community_confirmation", e.target.checked)} /><label className="text-xs">Community Confirmed</label></div>
            <div className="space-y-1"><Label className="text-xs">Confirmed By</Label><Input value={form.community_confirmed_by} onChange={e => set("community_confirmed_by", e.target.value)} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.lg_confirmation} onChange={e => set("lg_confirmation", e.target.checked)} /><label className="text-xs">LG Confirmed</label></div>
            <div className="space-y-1"><Label className="text-xs">Confirmed By</Label><Input value={form.lg_confirmed_by} onChange={e => set("lg_confirmed_by", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.deceased_name || !form.date_of_death} onClick={() => onSubmit(form)}>
              {isLoading ? "Saving..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}