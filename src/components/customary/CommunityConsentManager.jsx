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
import { ShieldCheck, Plus, ChevronDown, ChevronUp, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";

const CONSENT_TYPES = [
  { value: "individual", label: "Individual Consent" },
  { value: "family", label: "Family Consent" },
  { value: "community", label: "Community Consent" },
  { value: "traditional_authority", label: "Traditional Authority Consent" },
];

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  granted: "bg-emerald-100 text-emerald-700",
  revoked: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export default function CommunityConsentManager({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const qc = useQueryClient();

  const { data: consents = [] } = useQuery({
    queryKey: ["community-consents", caseData?.id],
    queryFn: () => base44.entities.CommunityConsent.filter(
      { is_deleted: false, inheritance_case_id: caseData?.id },
      "-created_date", 30
    ),
    enabled: !!caseData?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Build approval history
      const history = [{ date: new Date().toISOString(), event: "Consent submitted", by: user?.full_name }];
      const rec = await base44.entities.CommunityConsent.create({
        ...data,
        inheritance_case_id: caseData?.id,
        family_ownership_id: familyOwnership?.id,
        parcel_id: caseData?.parcel_id,
        parcel_number: caseData?.parcel_number,
        submitted_by: user?.email,
        submitted_by_name: user?.full_name,
        status: "pending",
        approval_history: JSON.stringify(history),
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "COMMUNITY_CONSENT_SUBMITTED",
        entity_type: "CommunityConsent",
        details: `${data.consent_type} consent from ${data.community_name}`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["community-consents"] }); setShowForm(false); toast.success("Consent recorded"); },
  });

  const updateConsent = useMutation({
    mutationFn: async ({ id, action, reason, currentHistory }) => {
      const history = JSON.parse(currentHistory || "[]");
      history.push({ date: new Date().toISOString(), event: action, by: user?.full_name, reason });
      const upd = {
        status: action === "grant" ? "granted" : action === "revoke" ? "revoked" : "pending",
        approval_history: JSON.stringify(history),
      };
      if (action === "grant") upd.date_granted = format(new Date(), "yyyy-MM-dd");
      if (action === "revoke") { upd.revoked_by = user?.email; upd.revocation_date = format(new Date(), "yyyy-MM-dd"); upd.revocation_reason = reason; }
      const rec = await base44.entities.CommunityConsent.update(id, upd);
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: `COMMUNITY_CONSENT_${action.toUpperCase()}ED`,
        entity_type: "CommunityConsent",
        details: reason || action,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["community-consents"] }); toast.success("Consent updated"); },
  });

  const canManage = ["surveyor_general", "compliance_officer", "super_admin"].includes(user?.role);

  // Auto-mark expired
  const processedConsents = consents.map(c => {
    if (c.status === "granted" && c.expiry_date && isPast(new Date(c.expiry_date))) {
      return { ...c, status: "expired" };
    }
    return c;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Community Consents ({processedConsents.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Consent
        </Button>
      </div>

      {processedConsents.length === 0 ? (
        <Card><CardContent className="py-10 text-center"><ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No community consents recorded</p></CardContent></Card>
      ) : (
        processedConsents.map(c => (
          <Card key={c.id} className={`border-l-4 ${c.status === "granted" ? "border-l-emerald-400" : c.status === "revoked" ? "border-l-red-400" : c.status === "expired" ? "border-l-gray-300" : "border-l-amber-300"}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.community_name}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                    <Badge className="text-[10px] bg-blue-50 text-blue-700 capitalize">{c.consent_type?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    {c.date_granted && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Granted: {format(new Date(c.date_granted), "MMM d, yyyy")}</span>}
                    {c.expiry_date && <span className={`flex items-center gap-1 ${c.status === "expired" ? "text-red-500" : ""}`}>Expires: {format(new Date(c.expiry_date), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {expanded === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {expanded === c.id && (
                <div className="pt-2 border-t space-y-2">
                  {c.consent_notes && <div className="bg-muted/30 rounded p-2 text-xs">{c.consent_notes}</div>}
                  {c.revocation_reason && <div className="bg-red-50 rounded p-2 text-xs text-red-700"><span className="font-semibold">Revocation:</span> {c.revocation_reason}</div>}
                  {c.approval_history && (() => {
                    try {
                      const hist = JSON.parse(c.approval_history);
                      return (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">Approval History</p>
                          {hist.map((h, i) => (
                            <div key={i} className="text-[11px] flex gap-2">
                              <span className="font-medium">{h.event}</span>
                              <span className="text-muted-foreground">— {h.by} · {h.date ? format(new Date(h.date), "MMM d, yyyy") : ""}</span>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  {canManage && c.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateConsent.mutate({ id: c.id, action: "grant", currentHistory: c.approval_history })}>Grant</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { const r = prompt("Revocation reason?"); if (r) updateConsent.mutate({ id: c.id, action: "revoke", reason: r, currentHistory: c.approval_history }); }}>Revoke</Button>
                    </div>
                  )}
                  {canManage && c.status === "granted" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { const r = prompt("Revocation reason?"); if (r) updateConsent.mutate({ id: c.id, action: "revoke", reason: r, currentHistory: c.approval_history }); }}>Revoke Consent</Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showForm && <ConsentForm onSubmit={saveMutation.mutate} onClose={() => setShowForm(false)} isLoading={saveMutation.isPending} />}
    </div>
  );
}

function ConsentForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({ community_name: "", consent_type: "", consent_notes: "", expiry_date: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Community Consent</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Community / Party Name *</Label><Input value={form.community_name} onChange={e => set("community_name", e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Consent Type *</Label>
            <Select value={form.consent_type} onValueChange={v => set("consent_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{CONSENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Expiry Date (optional)</Label><Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.consent_notes} onChange={e => set("consent_notes", e.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.community_name || !form.consent_type} onClick={() => onSubmit(form)}>
              {isLoading ? "Saving..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}