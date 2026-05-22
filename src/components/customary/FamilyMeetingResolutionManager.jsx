import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users, Plus, FileText, Award, ChevronDown, ChevronUp, AlertCircle,
  Calendar, MapPin, Hash, Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  adopted: "bg-emerald-100 text-emerald-700",
  amended: "bg-blue-100 text-blue-700",
  withdrawn: "bg-red-100 text-red-700",
  superseded: "bg-amber-100 text-amber-700",
};

export default function FamilyMeetingResolutionManager({ caseData, familyOwnership, user }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const qc = useQueryClient();

  const { data: resolutions = [] } = useQuery({
    queryKey: ["family-resolutions", caseData?.id, familyOwnership?.id],
    queryFn: () => {
      const filter = { is_deleted: false };
      if (caseData?.id) filter.inheritance_case_id = caseData.id;
      else if (familyOwnership?.id) filter.family_ownership_id = familyOwnership.id;
      return base44.entities.FamilyMeetingResolution.filter(filter, "-created_date", 50);
    },
  });

  const logAudit = (action, details) => base44.entities.AuditLog.create({
    user_email: user?.email, user_name: user?.full_name,
    action, entity_type: "FamilyMeetingResolution", details,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const count = resolutions.filter(r => r.family_ownership_id === (familyOwnership?.id || data.family_ownership_id)).length;
      const refNum = data.resolution_reference || `RES-${familyOwnership?.family_name?.slice(0, 4).toUpperCase() || "FAM"}-${String(count + 1).padStart(3, "0")}`;
      const rec = await base44.entities.FamilyMeetingResolution.create({
        ...data,
        resolution_reference: refNum,
        family_ownership_id: familyOwnership?.id,
        family_name: familyOwnership?.family_name || data.family_name,
        inheritance_case_id: caseData?.id,
        parcel_id: caseData?.parcel_id || familyOwnership?.parcel_id,
        parcel_number: caseData?.parcel_number || familyOwnership?.parcel_number,
        submitted_by: user?.email,
        submitted_by_name: user?.full_name,
        version_number: 1,
        status: "draft",
      });
      await logAudit("FAMILY_RESOLUTION_CREATED", `Resolution ${refNum} created`);
      return rec;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-resolutions"] }); setShowForm(false); toast.success("Resolution recorded"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const upd = { status };
      if (status === "withdrawn") upd.withdrawal_reason = reason;
      if (status === "amended") upd.amendment_reason = reason;
      const rec = await base44.entities.FamilyMeetingResolution.update(id, upd);
      await logAudit("FAMILY_RESOLUTION_STATUS_CHANGED", `Resolution ${id} → ${status}${reason ? ": " + reason : ""}`);
      return rec;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-resolutions"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Family Meeting Resolutions ({resolutions.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> New Resolution
        </Button>
      </div>

      {resolutions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No family meeting resolutions recorded</p>
          </CardContent>
        </Card>
      ) : (
        resolutions.map(r => (
          <Card key={r.id} className={`border-l-4 ${r.status === "adopted" ? "border-l-emerald-400" : r.status === "withdrawn" ? "border-l-red-400" : "border-l-gray-300"}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{r.resolution_reference}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                    {r.version_number > 1 && <Badge className="text-[10px] bg-blue-50 text-blue-700">v{r.version_number}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{r.meeting_purpose}</p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.meeting_date ? format(new Date(r.meeting_date), "MMM d, yyyy") : "—"}</span>
                    {r.meeting_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.meeting_location}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.number_of_attendees} attendees</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.certificate_url && (
                    <a href={r.certificate_url} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7"><Award className="w-3.5 h-3.5 text-emerald-600" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    {expanded === r.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {expanded === r.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Chairperson:</span> <span className="font-medium ml-1">{r.chairperson}</span></div>
                    {r.secretary && <div><span className="text-muted-foreground">Secretary:</span> <span className="font-medium ml-1">{r.secretary}</span></div>}
                  </div>
                  {r.resolution_summary && (
                    <div className="bg-muted/30 rounded p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Resolution Summary</p>
                      <p className="text-xs">{r.resolution_summary}</p>
                    </div>
                  )}
                  {r.meeting_minutes && (
                    <div className="bg-muted/30 rounded p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Meeting Minutes</p>
                      <p className="text-xs whitespace-pre-wrap">{r.meeting_minutes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {r.minutes_url && <a href={r.minutes_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs gap-1"><FileText className="w-3 h-3" />Minutes</Button></a>}
                    {r.attendance_sheet_url && <a href={r.attendance_sheet_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs gap-1"><FileText className="w-3 h-3" />Attendance</Button></a>}
                    {r.family_agreement_url && <a href={r.family_agreement_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs gap-1"><FileText className="w-3 h-3" />Agreement</Button></a>}
                  </div>
                  {r.status === "draft" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus.mutate({ id: r.id, status: "adopted" })}>Adopt Resolution</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { const reason = prompt("Withdrawal reason?"); if (reason) updateStatus.mutate({ id: r.id, status: "withdrawn", reason }); }}>Withdraw</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showForm && (
        <ResolutionForm
          onSubmit={saveMutation.mutate}
          onClose={() => setShowForm(false)}
          isLoading={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function ResolutionForm({ onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState({
    meeting_date: "", meeting_location: "", meeting_purpose: "",
    resolution_summary: "", chairperson: "", secretary: "",
    number_of_attendees: 0, meeting_minutes: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Family Meeting Resolution</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Meeting Date *</Label>
              <Input type="date" value={form.meeting_date} onChange={e => set("meeting_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Attendees</Label>
              <Input type="number" min="0" value={form.number_of_attendees} onChange={e => set("number_of_attendees", +e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meeting Location *</Label>
            <Input value={form.meeting_location} onChange={e => set("meeting_location", e.target.value)} placeholder="Village square, family house, etc." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meeting Purpose *</Label>
            <Input value={form.meeting_purpose} onChange={e => set("meeting_purpose", e.target.value)} placeholder="e.g. Family land inheritance distribution" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Chairperson *</Label>
              <Input value={form.chairperson} onChange={e => set("chairperson", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secretary</Label>
              <Input value={form.secretary} onChange={e => set("secretary", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Resolution Summary *</Label>
            <Textarea rows={3} value={form.resolution_summary} onChange={e => set("resolution_summary", e.target.value)} placeholder="Summary of decisions reached..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meeting Minutes</Label>
            <Textarea rows={5} value={form.meeting_minutes} onChange={e => set("meeting_minutes", e.target.value)} placeholder="Full minutes text..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isLoading || !form.meeting_date || !form.meeting_purpose || !form.chairperson || !form.resolution_summary} onClick={() => onSubmit(form)}>
              {isLoading ? "Saving..." : "Save Resolution"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}