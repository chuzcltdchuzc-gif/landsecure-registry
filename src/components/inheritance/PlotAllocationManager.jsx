import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Map, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-emerald-100 text-emerald-700",
  disputed: "bg-red-100 text-red-700",
  reallocated: "bg-amber-100 text-amber-700",
  transferred: "bg-blue-100 text-blue-700",
};

export default function PlotAllocationManager({ caseData, familyOwnership, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(null);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries-fo", familyOwnership?.id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ family_ownership_id: familyOwnership.id, is_deleted: false }, "inheritance_rank", 100),
    enabled: !!familyOwnership?.id,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["plot-allocations", caseData.id],
    queryFn: () => base44.entities.PlotAllocation.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });

  const totalAllocated = allocations.reduce((s, a) => s + (a.allocation_percentage || 0), 0);
  const allocationValid = Math.abs(totalAllocated - 100) < 0.01 || allocations.length === 0;

  const openAdd = () => {
    setForm({
      inheritance_case_id: caseData.id,
      family_ownership_id: caseData.family_ownership_id,
      parcel_id: caseData.parcel_id,
      parcel_number: caseData.parcel_number,
      beneficiary_id: "",
      beneficiary_name: "",
      planned_plot_number: "",
      area_sqm: "",
      allocation_percentage: "",
      notes: "",
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.beneficiary_id || !form.planned_plot_number || !form.allocation_percentage) {
        throw new Error("Beneficiary, plot number and percentage are required");
      }
      const pct = parseFloat(form.allocation_percentage);
      if (totalAllocated + pct > 100.01) {
        throw new Error(`Adding ${pct}% would exceed 100% (currently ${totalAllocated.toFixed(1)}%)`);
      }
      // Check duplicate plot number
      if (allocations.some(a => a.planned_plot_number === form.planned_plot_number)) {
        throw new Error(`Plot number "${form.planned_plot_number}" is already allocated`);
      }
      const selected = beneficiaries.find(b => b.id === form.beneficiary_id);

      const created = await base44.entities.PlotAllocation.create({
        ...form,
        beneficiary_name: selected?.full_name || form.beneficiary_name,
        allocation_percentage: pct,
        area_sqm: parseFloat(form.area_sqm) || null,
        allocation_status: "draft",
        allocated_by: user?.email,
        is_deleted: false,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Allocated Plot ${form.planned_plot_number} to ${selected?.full_name}`,
        entity_type: "PlotAllocation",
        entity_id: created.id,
        details: `Case: ${caseData.case_reference}, ${pct}%`,
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseData.id] });
      setShowForm(false);
      toast.success("Plot allocated");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.PlotAllocation.update(id, { allocation_status: status });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Updated plot allocation status to ${status}`,
        entity_type: "PlotAllocation",
        entity_id: id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseData.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PlotAllocation.update(id, { is_deleted: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plot-allocations", caseData.id] }),
  });

  const canAllocate = user?.role === "surveyor_general" || user?.role === "compliance_officer" || user?.role === "super_admin" || user?.role === "surveyor";

  return (
    <div className="space-y-4">
      {/* Allocation progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total Allocated</span>
          <span className={totalAllocated > 100 ? "text-red-600 font-bold" : totalAllocated === 100 ? "text-emerald-600 font-bold" : ""}>
            {totalAllocated.toFixed(1)}% / 100%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalAllocated > 100 ? "bg-red-500" : totalAllocated === 100 ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${Math.min(totalAllocated, 100)}%` }}
          />
        </div>
        {totalAllocated > 0 && !allocationValid && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Allocations do not total 100%
          </p>
        )}
        {totalAllocated === 100 && (
          <p className="text-xs text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> All shares fully allocated
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Plot Allocations ({allocations.length})</p>
        {canAllocate && totalAllocated < 100 && (
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Allocate Plot
          </Button>
        )}
      </div>

      {allocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No plots allocated yet</p>
            <p className="text-xs text-muted-foreground mt-1">Allocate plots to beneficiaries for this inheritance case</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allocations.map(a => (
            <div key={a.id} className="p-3 bg-white rounded-lg border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold text-primary">{a.planned_plot_number}</span>
                    <span className="text-sm font-semibold">{a.beneficiary_name}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[a.allocation_status] || "bg-gray-100"}`}>
                      {a.allocation_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-foreground">{a.allocation_percentage}%</span>
                    {a.area_sqm && <span>{a.area_sqm.toLocaleString()} sqm</span>}
                    {a.notes && <span className="italic">{a.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canAllocate && a.allocation_status === "draft" && (
                    <Button size="sm" variant="outline" className="h-6 text-xs text-emerald-700 border-emerald-200" onClick={() => updateStatusMutation.mutate({ id: a.id, status: "confirmed" })}>
                      Confirm
                    </Button>
                  )}
                  {canAllocate && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && form && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Map className="w-4 h-4" /> Allocate Plot
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Beneficiary *</Label>
                <Select value={form.beneficiary_id} onValueChange={v => setField("beneficiary_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select beneficiary..." /></SelectTrigger>
                  <SelectContent>
                    {beneficiaries.filter(b => b.status === "active").map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.full_name} ({b.percentage_share}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Plot Number *</Label>
                  <Input placeholder="e.g. Plot A, Sub-Parcel 1A" value={form.planned_plot_number} onChange={e => setField("planned_plot_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Allocation % *</Label>
                  <Input type="number" min="0" max={100 - totalAllocated + 0.01} step="0.1" placeholder={`Max: ${(100 - totalAllocated).toFixed(1)}%`} value={form.allocation_percentage} onChange={e => setField("allocation_percentage", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Area (sqm)</Label>
                  <Input type="number" min="0" placeholder="Optional" value={form.area_sqm} onChange={e => setField("area_sqm", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input placeholder="Optional notes" value={form.notes} onChange={e => setField("notes", e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Remaining: {(100 - totalAllocated).toFixed(1)}% available
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Allocating..." : "Allocate Plot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}