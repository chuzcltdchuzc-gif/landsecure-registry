import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, CheckCircle2, PieChart } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-emerald-100 text-emerald-700",
  disputed: "bg-red-100 text-red-700",
  reallocated: "bg-amber-100 text-amber-700",
  transferred: "bg-blue-100 text-blue-700",
};

export default function PlotAllocationManager({ caseId, familyOwnershipId, parcelId, parcelNumber, beneficiaries, parcelSizeHa, user, readOnly = false }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ beneficiary_id: "", planned_plot_number: "", area_sqm: "", allocation_percentage: "", notes: "" });

  const { data: allocations = [] } = useQuery({
    queryKey: ["plot-allocations", caseId],
    queryFn: () => base44.entities.PlotAllocation.filter({ inheritance_case_id: caseId, is_deleted: false }, "-created_date", 100),
    enabled: !!caseId,
  });

  const totalAllocated = allocations
    .filter((a) => a.allocation_status !== "reallocated")
    .reduce((s, a) => s + (a.allocation_percentage || 0), 0);
  const remaining = 100 - totalAllocated;
  const isOver = totalAllocated > 100.01;

  const activeBens = (beneficiaries || []).filter((b) => !b.is_deleted);

  const selectedBen = activeBens.find((b) => b.id === form.beneficiary_id);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (isOver || totalAllocated + parseFloat(form.allocation_percentage || 0) > 100.01) {
        throw new Error("Allocation would exceed 100%");
      }
      const dup = allocations.find(
        (a) => a.beneficiary_id === form.beneficiary_id && a.allocation_status !== "reallocated" && !a.is_deleted
      );
      if (dup) throw new Error("This beneficiary already has an active allocation");

      const plotDup = allocations.find(
        (a) => a.planned_plot_number === form.planned_plot_number && !a.is_deleted
      );
      if (plotDup) throw new Error(`Plot number ${form.planned_plot_number} already allocated`);

      const alloc = await base44.entities.PlotAllocation.create({
        inheritance_case_id: caseId,
        family_ownership_id: familyOwnershipId,
        parcel_id: parcelId,
        parcel_number: parcelNumber,
        beneficiary_id: form.beneficiary_id,
        beneficiary_name: selectedBen?.full_name || "",
        planned_plot_number: form.planned_plot_number,
        area_sqm: parseFloat(form.area_sqm) || 0,
        allocation_percentage: parseFloat(form.allocation_percentage) || 0,
        notes: form.notes,
        allocation_status: "draft",
        allocated_by: user?.email,
        is_deleted: false,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Allocated plot ${form.planned_plot_number} to ${selectedBen?.full_name}`,
        entity_type: "PlotAllocation",
        entity_id: alloc.id,
        details: `${form.allocation_percentage}% of parcel ${parcelNumber}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseId] });
      toast.success("Plot allocated");
      setForm({ beneficiary_id: "", planned_plot_number: "", area_sqm: "", allocation_percentage: "", notes: "" });
      setAdding(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async (allocId) => {
      await base44.entities.PlotAllocation.update(allocId, { allocation_status: "confirmed" });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "Confirmed plot allocation", entity_type: "PlotAllocation", entity_id: allocId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (allocId) => base44.entities.PlotAllocation.update(allocId, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Plot Allocations ({allocations.length})</span>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(!adding)}>
            <Plus className="w-3.5 h-3.5" /> Allocate
          </Button>
        )}
      </div>

      {/* Share bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Allocated: <strong className={isOver ? "text-red-600" : "text-foreground"}>{totalAllocated.toFixed(1)}%</strong></span>
          <span>Remaining: <strong>{remaining.toFixed(1)}%</strong></span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : totalAllocated >= 100 ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${Math.min(totalAllocated, 100)}%` }}
          />
        </div>
        {isOver && (
          <p className="text-[10px] text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Over-allocated by {(totalAllocated - 100).toFixed(1)}%
          </p>
        )}
      </div>

      {adding && (
        <div className="p-3 border border-border rounded-lg space-y-2 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Beneficiary *</Label>
              <Select value={form.beneficiary_id} onValueChange={(v) => setForm(f => ({ ...f, beneficiary_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                <SelectContent>
                  {activeBens.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.full_name} ({b.relationship})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Plot Number *</Label>
              <Input placeholder="e.g. Plot A1" value={form.planned_plot_number} onChange={(e) => setForm(f => ({ ...f, planned_plot_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Area (sqm)</Label>
              <Input type="number" min="0" placeholder="0" value={form.area_sqm} onChange={(e) => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Allocation % *</Label>
              <Input type="number" min="0" max="100" step="0.1" placeholder="0" value={form.allocation_percentage} onChange={(e) => setForm(f => ({ ...f, allocation_percentage: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => addMutation.mutate()} disabled={!form.beneficiary_id || !form.planned_plot_number || !form.allocation_percentage || addMutation.isPending}>
              {addMutation.isPending ? "Saving..." : "Save Allocation"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {allocations.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-2 p-2.5 bg-card rounded-lg border border-border">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold font-mono">{a.planned_plot_number}</span>
                <span className="text-xs text-foreground">{a.beneficiary_name}</span>
                <Badge className={`text-[9px] py-0 px-1.5 ${STATUS_COLORS[a.allocation_status] || ""}`}>
                  {a.allocation_status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="font-semibold text-primary">{a.allocation_percentage}%</span>
                {a.area_sqm > 0 && <span>{a.area_sqm.toLocaleString()} sqm</span>}
                {parcelSizeHa && a.allocation_percentage > 0 && (
                  <span>≈ {(parcelSizeHa * a.allocation_percentage / 100).toFixed(3)} ha</span>
                )}
              </div>
              {a.notes && <p className="text-[10px] text-muted-foreground">{a.notes}</p>}
            </div>
            {!readOnly && (
              <div className="flex gap-1 flex-shrink-0">
                {a.allocation_status === "draft" && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 px-1.5" onClick={() => confirmMutation.mutate(a.id)}>
                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirm
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {allocations.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No plot allocations yet</p>
        )}
      </div>
    </div>
  );
}