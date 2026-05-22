import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Layers, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  superseded: "bg-amber-100 text-amber-700",
};

export default function SubdivisionPlanner({ caseData, familyOwnership, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", survey_reference: "", child_parcels_text: "", notes: "" });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: plans = [] } = useQuery({
    queryKey: ["subdivision-plans", caseData.id],
    queryFn: () => base44.entities.SubdivisionPlan.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 20),
    enabled: !!caseData.id,
  });

  const canManage = user?.role === "surveyor_general" || user?.role === "compliance_officer" || user?.role === "super_admin" || user?.role === "surveyor";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title is required");

      let childParcels = [];
      try {
        if (form.child_parcels_text.trim()) {
          childParcels = form.child_parcels_text.split("\n").filter(Boolean).map((line, i) => ({
            plot_id: `${caseData.parcel_number}-${String.fromCharCode(65 + i)}`,
            description: line.trim(),
          }));
        }
      } catch (e) {
        throw new Error("Invalid child parcel definitions");
      }

      const version = plans.length + 1;
      // Supersede previous plans
      await Promise.all(plans.filter(p => p.approval_status === "draft" || p.approval_status === "submitted").map(p =>
        base44.entities.SubdivisionPlan.update(p.id, { approval_status: "superseded" })
      ));

      const created = await base44.entities.SubdivisionPlan.create({
        inheritance_case_id: caseData.id,
        parent_parcel_id: caseData.parcel_id,
        parent_parcel_number: caseData.parcel_number,
        family_ownership_id: caseData.family_ownership_id,
        title: form.title,
        description: form.description,
        survey_reference: form.survey_reference,
        child_parcels: JSON.stringify(childParcels),
        total_child_parcels: childParcels.length,
        subdivision_version: version,
        approval_status: "draft",
        notes: form.notes,
        created_by: user?.email,
        is_deleted: false,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Created subdivision plan v${version}: ${form.title}`,
        entity_type: "SubdivisionPlan",
        entity_id: created.id,
        details: `Case: ${caseData.case_reference}, ${childParcels.length} planned child parcels`,
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subdivision-plans", caseData.id] });
      setShowForm(false);
      setForm({ title: "", description: "", survey_reference: "", child_parcels_text: "", notes: "" });
      toast.success("Subdivision plan created (draft)");
    },
  });

  const advancePlanMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const updates = { approval_status: status };
      if (status === "approved") {
        updates.approved_by = user?.email;
        updates.approved_date = new Date().toISOString();
      }
      await base44.entities.SubdivisionPlan.update(id, updates);
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `${status} subdivision plan`,
        entity_type: "SubdivisionPlan",
        entity_id: id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subdivision-plans", caseData.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.SubdivisionPlan.update(id, { is_deleted: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subdivision-plans", caseData.id] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
        <AlertCircle className="w-3.5 h-3.5" />
        Subdivision plans are preparatory only — no actual parcels are created until final approval and execution.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Subdivision Plans ({plans.length})</p>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Plan
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No subdivision plans created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            let childParcels = [];
            try { childParcels = JSON.parse(plan.child_parcels || "[]"); } catch {}
            return (
              <div key={plan.id} className="p-4 bg-white rounded-lg border border-border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{plan.title}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[plan.approval_status] || "bg-gray-100"}`}>
                        {plan.approval_status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">v{plan.subdivision_version}</span>
                    </div>
                    {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    {plan.survey_reference && <p className="text-xs text-muted-foreground">Survey Ref: {plan.survey_reference}</p>}
                    <p className="text-xs text-muted-foreground">
                      Parent: #{plan.parent_parcel_number} · {plan.total_child_parcels || childParcels.length} planned child parcels
                    </p>
                    {plan.created_date && <p className="text-[10px] text-muted-foreground">{format(new Date(plan.created_date), "MMM d, yyyy")}</p>}
                  </div>
                  {canManage && plan.approval_status === "draft" && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {childParcels.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Planned Child Parcels:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {childParcels.map((cp, i) => (
                        <div key={i} className="text-xs p-2 bg-muted/30 rounded border border-border">
                          <span className="font-mono font-semibold text-primary">{cp.plot_id}</span>
                          <p className="text-muted-foreground text-[10px] mt-0.5">{cp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="flex gap-2">
                    {plan.approval_status === "draft" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advancePlanMutation.mutate({ id: plan.id, status: "submitted" })}>
                        Submit for Review
                      </Button>
                    )}
                    {plan.approval_status === "submitted" && (user?.role === "surveyor_general" || user?.role === "super_admin") && (
                      <>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => advancePlanMutation.mutate({ id: plan.id, status: "approved" })}>
                          <CheckCircle2 className="w-3 h-3" /> Approve Plan
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => advancePlanMutation.mutate({ id: plan.id, status: "rejected" })}>
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> New Subdivision Plan
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                This creates a preparatory plan only. Actual parcels will not be created until approved and executed.
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plan Title *</Label>
                <Input placeholder="e.g. Adeyemi Family Land Division v1" value={form.title} onChange={e => setField("title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Survey Reference</Label>
                <Input placeholder="Survey plan reference number" value={form.survey_reference} onChange={e => setField("survey_reference", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={form.description} onChange={e => setField("description", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Planned Child Parcels (one per line)</Label>
                <Textarea
                  rows={4}
                  placeholder="North portion — Akin's plot (approx 500 sqm)&#10;South portion — Tunde's plot (approx 400 sqm)&#10;East strip — Shared access road"
                  value={form.child_parcels_text}
                  onChange={e => setField("child_parcels_text", e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Each line = one planned child parcel. Will auto-assign plot IDs.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input placeholder="Additional notes" value={form.notes} onChange={e => setField("notes", e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Creating..." : "Create Draft Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}