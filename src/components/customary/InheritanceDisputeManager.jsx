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
import { AlertTriangle, Plus, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const DISPUTE_TYPES = [
  { value: "beneficiary_allocation", label: "Beneficiary Allocation" },
  { value: "share_percentage", label: "Share Percentage" },
  { value: "boundary", label: "Boundary Dispute" },
  { value: "lineage", label: "Lineage Dispute" },
  { value: "successor", label: "Successor Dispute" },
  { value: "asset_ownership", label: "Asset Ownership" },
  { value: "witness_objection", label: "Witness Objection" },
  { value: "community_objection", label: "Community Objection" },
  { value: "traditional_authority_objection", label: "Traditional Authority Objection" },
];

const STATUS_COLORS = {
  open: "bg-red-100 text-red-700",
  under_investigation: "bg-amber-100 text-amber-700",
  mediation: "bg-blue-100 text-blue-700",
  hearing: "bg-purple-100 text-purple-700",
  resolved: "bg-emerald-100 text-emerald-700",
  appealed: "bg-orange-100 text-orange-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function InheritanceDisputeManager({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [progressId, setProgressId] = useState(null);
  const [progressStatus, setProgressStatus] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const qc = useQueryClient();

  const { data: disputes = [] } = useQuery({
    queryKey: ["inheritance-disputes", caseData?.id, familyOwnership?.id],
    queryFn: () => {
      const filter = { is_deleted: false };
      if (caseData?.id) filter.inheritance_case_id = caseData.id;
      else if (familyOwnership?.id) filter.family_ownership_id = familyOwnership.id;
      return base44.entities.InheritanceDispute.filter(filter, "-created_date", 50);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const count = disputes.length;
      const caseNum = `IDISP-${String(count + 1).padStart(4, "0")}-${new Date().getFullYear()}`;
      const rec = await base44.entities.InheritanceDispute.create({
        ...data,
        case_number: caseNum,
        inheritance_case_id: caseData?.id,
        family_ownership_id: familyOwnership?.id,
        parcel_id: caseData?.parcel_id,
        parcel_number: caseData?.parcel_number,
        filed_by: user?.email,
        filed_by_name: user?.full_name,
        status: "open",
        timeline: JSON.stringify([{ date: new Date().toISOString(), action: "Dispute filed", by: user?.full_name }]),
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "INHERITANCE_DISPUTE_FILED",
        entity_type: "InheritanceDispute",
        details: `Case ${caseNum}: ${data.dispute_type} filed by ${data.complainant_name}`,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inheritance-disputes"] }); setShowForm(false); toast.success("Dispute recorded"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes, currentTimeline }) => {
      const timeline = JSON.parse(currentTimeline || "[]");
      timeline.push({ date: new Date().toISOString(), action: `Status changed to ${status}`, by: user?.full_name, notes });
      const upd = { status, timeline: JSON.stringify(timeline) };
      if (status === "resolved") { upd.resolution_notes = notes; upd.resolved_date = format(new Date(), "yyyy-MM-dd"); }
      const rec = await base44.entities.InheritanceDispute.update(id, upd);
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: `INHERITANCE_DISPUTE_${status.toUpperCase()}`,
        entity_type: "InheritanceDispute",
        details: notes,
      });
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inheritance-disputes"] }); setProgressId(null); setProgressNotes(""); toast.success("Status updated"); },
  });

  const canManage = ["surveyor_general", "compliance_officer", "super_admin"].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Inheritance Disputes ({disputes.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> File Dispute
        </Button>
      </div>

      {disputes.length === 0 ? (
        <Card><CardContent className="py-10 text-center"><AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No disputes filed</p></CardContent></Card>
      ) : (
        disputes.map(d => (
          <Card key={d.id} className={`border-l-4 ${d.status === "resolved" || d.status === "closed" ? "border-l-emerald-400" : d.status === "open" ? "border-l-red-400" : "border-l-amber-400"}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{d.case_number}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[d.status]}`}>{d.status?.replace(/_/g, " ")}</Badge>
                    <Badge className={`text-[10px] ${PRIORITY_COLORS[d.priority]}`}>{d.priority}</Badge>
                  </div>
                  <p className="text-xs font-medium capitalize">{d.dispute_type?.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">Complainant: {d.complainant_name}{d.respondent_name ? ` vs ${d.respondent_name}` : ""}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                  {expanded === d.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {expanded === d.id && (
                <div className="pt-2 border-t space-y-3">
                  <div className="bg-muted/30 rounded p-2 text-xs">{d.description}</div>
                  {d.resolution_notes && <div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800"><span className="font-semibold">Resolution:</span> {d.resolution_notes}</div>}
                  {/* Timeline */}
                  {d.timeline && (() => {
                    try {
                      const tl = JSON.parse(d.timeline);
                      return (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-muted-foreground">Case Timeline</p>
                          {tl.map((ev, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px]">
                              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div><span className="font-medium">{ev.action}</span><span className="text-muted-foreground ml-1">— {ev.by} · {ev.date ? format(new Date(ev.date), "MMM d, yyyy") : ""}</span>{ev.notes && <p className="text-muted-foreground">{ev.notes}</p>}</div>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  {canManage && !["resolved", "closed"].includes(d.status) && (
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { s: "under_investigation", label: "Investigate" },
                        { s: "mediation", label: "Mediation" },
                        { s: "hearing", label: "Hearing" },
                        { s: "resolved", label: "Resolve" },
                        { s: "closed", label: "Close" },
                      ].map(opt => (
                        <Button key={opt.s} size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setProgressId({ id: d.id, timeline: d.timeline }); setProgressStatus(opt.s); }}>
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showForm && <DisputeForm onSubmit={saveMutation.mutate} onClose={() => setShowForm(false)} isLoading={saveMutation.isPending} />}

      {progressId && (
        <Dialog open onOpenChange={() => { setProgressId(null); setProgressNotes(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Update Dispute Status → {progressStatus?.replace(/_/g, " ")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea rows={3} value={progressNotes} onChange={e => setProgressNotes(e.target.value)} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setProgressId(null); setProgressNotes(""); }}>Cancel</Button>
                <Button size="sm" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: progressId.id, status: progressStatus, notes: progressNotes, currentTimeline: progressId.timeline })}>Confirm</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DisputeForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({ dispute_type: "", complainant_name: "", complainant_email: "", complainant_relationship: "", respondent_name: "", description: "", priority: "medium" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>File Inheritance Dispute</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Dispute Type *</Label>
            <Select value={form.dispute_type} onValueChange={v => set("dispute_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{DISPUTE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Complainant Name *</Label><Input value={form.complainant_name} onChange={e => set("complainant_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Relationship</Label><Input value={form.complainant_relationship} onChange={e => set("complainant_relationship", e.target.value)} placeholder="Son, Daughter, etc." /></div>
            <div className="space-y-1"><Label className="text-xs">Complainant Email</Label><Input type="email" value={form.complainant_email} onChange={e => set("complainant_email", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Respondent Name</Label><Input value={form.respondent_name} onChange={e => set("respondent_name", e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={form.priority} onValueChange={v => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Description *</Label><Textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detailed description of the dispute..." /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.dispute_type || !form.complainant_name || !form.description} onClick={() => onSubmit(form)}>
              {isLoading ? "Filing..." : "File Dispute"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}