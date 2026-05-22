import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  superseded: "bg-amber-100 text-amber-700",
};

function emptyChild() {
  return { plot_number: "", area_sqm: "", beneficiary_name: "", description: "" };
}

export default function SubdivisionPlanner({ caseId, parcelId, parcelNumber, familyOwnershipId, parcelSizeHa, user, readOnly = false }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", survey_reference: "", description: "", children: [emptyChild()] });

  const { data: plans = [] } = useQuery({
    queryKey: ["subdivision-plans", parcelId],
    queryFn: () => base44.entities.SubdivisionPlan.filter({ parent_parcel_id: parcelId, is_deleted: false }, "-created_date", 20),
    enabled: !!parcelId,
  });

  const addChild = () => setForm(f => ({ ...f, children: [...f.children, emptyChild()] }));
  const removeChild = (idx) => setForm(f => ({ ...f, children: f.children.filter((_, i) => i !== idx) }));
  const updateChild = (idx, key, val) => setForm(f => ({
    ...f,
    children: f.children.map((c, i) => i === idx ? { ...c, [key]: val } : c),
  }));

  const totalChildArea = form.children.reduce((s, c) => s + (parseFloat(c.area_sqm) || 0), 0);
  const parcelAreaSqm = parcelSizeHa ? parcelSizeHa * 10000 : null;
  const areaValid = parcelAreaSqm ? totalChildArea <= parcelAreaSqm + 1 : true;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Supersede existing draft plans
      const existing = plans.filter((p) => p.approval_status === "draft");
      await Promise.all(existing.map((p) =>
        base44.entities.SubdivisionPlan.update(p.id, { approval_status: "superseded" })
      ));
      const newVersion = (Math.max(0, ...plans.map((p) => p.subdivision_version || 0))) + 1;

      const plan = await base44.entities.SubdivisionPlan.create({
        inheritance_case_id: caseId,
        parent_parcel_id: parcelId,
        parent_parcel_number: parcelNumber,
        family_ownership_id: familyOwnershipId,
        title: form.title,
        survey_reference: form.survey_reference,
        description: form.description,
        child_parcels: JSON.stringify(form.children),
        total_child_parcels: form.children.length,
        total_allocated_area_sqm: totalChildArea,
        subdivision_version: newVersion,
        approval_status: "draft",
        created_by: user?.email,
        is_deleted: false,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Created subdivision plan v${newVersion} for parcel ${parcelNumber}`,
        entity_type: "SubdivisionPlan",
        entity_id: plan.id,
        details: `${form.children.length} child parcels, ${totalChildArea.toLocaleString()} sqm total`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subdivision-plans", parcelId] });
      toast.success("Subdivision plan saved");
      setForm({ title: "", survey_reference: "", description: "", children: [emptyChild()] });
      setCreating(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (planId) => {
      await base44.entities.SubdivisionPlan.update(planId, { approval_status: "submitted" });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "Submitted subdivision plan for approval", entity_type: "SubdivisionPlan", entity_id: planId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subdivision-plans", parcelId] });
      toast.success("Plan submitted for approval");
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Subdivision Plans ({plans.length})</span>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setCreating(!creating)}>
            <Plus className="w-3.5 h-3.5" /> New Plan
          </Button>
        )}
      </div>

      {creating && (
        <div className="p-3 border border-border rounded-lg space-y-3 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Plan Title *</Label>
              <Input placeholder="e.g. Family Partition Plan 2024" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Survey Reference</Label>
              <Input placeholder="Survey plan reference" value={form.survey_reference} onChange={(e) => setForm(f => ({ ...f, survey_reference: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Describe the subdivision intent..." rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Planned Child Parcels</Label>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={addChild}>
                <Plus className="w-3 h-3 mr-0.5" /> Add
              </Button>
            </div>
            {parcelAreaSqm && (
              <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${areaValid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {areaValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                Total child area: {totalChildArea.toLocaleString()} sqm / {parcelAreaSqm.toLocaleString()} sqm
              </div>
            )}
            {form.children.map((c, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end p-2 bg-card rounded border border-border">
                <div className="space-y-1">
                  <Label className="text-[10px]">Plot No.</Label>
                  <Input placeholder="A1" className="h-7 text-xs" value={c.plot_number} onChange={(e) => updateChild(idx, "plot_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Area (sqm)</Label>
                  <Input type="number" placeholder="0" className="h-7 text-xs" value={c.area_sqm} onChange={(e) => updateChild(idx, "area_sqm", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Beneficiary</Label>
                  <Input placeholder="Name" className="h-7 text-xs" value={c.beneficiary_name} onChange={(e) => updateChild(idx, "beneficiary_name", e.target.value)} />
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/50" onClick={() => removeChild(idx)} disabled={form.children.length === 1}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Draft Plan"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {plans.map((p) => {
          let children = [];
          try { children = JSON.parse(p.child_parcels || "[]"); } catch {}
          return (
            <div key={p.id} className="p-3 bg-card rounded-lg border border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{p.title}</span>
                    <Badge className={`text-[9px] py-0 px-1.5 ${STATUS_COLORS[p.approval_status] || ""}`}>
                      {p.approval_status}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">v{p.subdivision_version}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {p.total_child_parcels} parcels · {p.total_allocated_area_sqm?.toLocaleString()} sqm
                    {p.survey_reference && ` · Ref: ${p.survey_reference}`}
                  </p>
                  {p.created_date && <p className="text-[10px] text-muted-foreground">{format(new Date(p.created_date), "MMM d, yyyy")}</p>}
                </div>
                {!readOnly && p.approval_status === "draft" && (
                  <Button size="sm" className="h-6 text-[10px] text-xs" onClick={() => submitMutation.mutate(p.id)} disabled={submitMutation.isPending}>
                    Submit
                  </Button>
                )}
              </div>
              {children.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {children.map((c, i) => (
                    <div key={i} className="text-[10px] p-1.5 bg-muted rounded border border-border text-center">
                      <p className="font-semibold">{c.plot_number || `Plot ${i + 1}`}</p>
                      {c.area_sqm && <p className="text-muted-foreground">{parseFloat(c.area_sqm).toLocaleString()} sqm</p>}
                      {c.beneficiary_name && <p className="text-muted-foreground truncate">{c.beneficiary_name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {plans.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No subdivision plans created</p>
        )}
      </div>
    </div>
  );
}