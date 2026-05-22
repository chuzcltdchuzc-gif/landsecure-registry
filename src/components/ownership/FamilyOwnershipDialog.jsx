import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Users, Plus, Trash2, AlertCircle, CheckCircle2, TreePine,
} from "lucide-react";
import { toast } from "sonner";

const RELATIONSHIPS = [
  "son", "daughter", "grandson", "granddaughter", "nephew", "niece",
  "brother", "sister", "cousin", "spouse", "other",
];

const BENEFICIARY_STATUSES = ["active", "deceased", "transferred", "disputed", "minor"];

function emptyBeneficiary() {
  return {
    full_name: "",
    relationship: "son",
    percentage_share: "",
    allocated_plot: "",
    inheritance_rank: "",
    status: "active",
    notes: "",
  };
}

export default function FamilyOwnershipDialog({ parcel, user, open, onClose }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    family_name: "",
    family_head: "",
    family_representative: "",
    family_lineage: "patrilineal",
    family_notes: "",
    fruit_trees: "",
    buildings: "",
    boreholes: "",
    economic_trees: "",
    other_improvements: "",
  });

  const [beneficiaries, setBeneficiaries] = useState([emptyBeneficiary()]);

  const totalShare = beneficiaries.reduce(
    (sum, b) => sum + (parseFloat(b.percentage_share) || 0), 0
  );
  const shareValid = Math.abs(totalShare - 100) < 0.01;

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const updateBeneficiary = (idx, key, val) =>
    setBeneficiaries((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [key]: val } : b))
    );

  const addBeneficiary = () => setBeneficiaries((prev) => [...prev, emptyBeneficiary()]);
  const removeBeneficiary = (idx) =>
    setBeneficiaries((prev) => prev.filter((_, i) => i !== idx));

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Create FamilyOwnership record
      const fo = await base44.entities.FamilyOwnership.create({
        parcel_id: parcel.id,
        parcel_number: parcel.parcel_number,
        family_name: form.family_name,
        family_head: form.family_head,
        family_representative: form.family_representative,
        family_lineage: form.family_lineage,
        family_notes: form.family_notes,
        fruit_trees: parseFloat(form.fruit_trees) || 0,
        buildings: parseFloat(form.buildings) || 0,
        boreholes: parseFloat(form.boreholes) || 0,
        economic_trees: parseFloat(form.economic_trees) || 0,
        other_improvements: form.other_improvements,
        registered_by: user?.email,
        status: "active",
      });

      // 2. Create beneficiaries
      await Promise.all(
        beneficiaries.map((b, i) =>
          base44.entities.FamilyBeneficiary.create({
            family_ownership_id: fo.id,
            parcel_id: parcel.id,
            parcel_number: parcel.parcel_number,
            inheritance_rank: parseInt(b.inheritance_rank) || i + 1,
            full_name: b.full_name,
            relationship: b.relationship,
            percentage_share: parseFloat(b.percentage_share) || 0,
            allocated_plot: b.allocated_plot,
            status: b.status,
            notes: b.notes,
          })
        )
      );

      // 3. Create ownership history record
      await base44.entities.OwnershipHistory.create({
        parcel_id: parcel.id,
        parcel_number: parcel.parcel_number,
        from_owner: parcel.owner_name,
        to_owner: `${form.family_name} (Family Ownership)`,
        transfer_type: "customary_allocation",
        transfer_date: new Date().toISOString().split("T")[0],
        family_ownership_id: fo.id,
        status: "approved",
        notes: `Customary family land ownership registered. Family Head: ${form.family_head}`,
      });

      // 4. Audit log
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Registered Family Ownership for parcel ${parcel.parcel_number}`,
        entity_type: "FamilyOwnership",
        entity_id: fo.id,
        details: `Family: ${form.family_name}, ${beneficiaries.length} beneficiaries`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-ownership", parcel.id] });
      queryClient.invalidateQueries({ queryKey: ["family-beneficiaries"] });
      queryClient.invalidateQueries({ queryKey: ["ownership-risk"] });
      toast.success("Family ownership registered successfully");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.family_name || !form.family_head) {
      toast.error("Family Name and Family Head are required");
      return;
    }
    if (beneficiaries.some((b) => !b.full_name)) {
      toast.error("All beneficiaries must have a full name");
      return;
    }
    if (!shareValid) {
      toast.error(`Total shares must equal 100% (currently ${totalShare.toFixed(1)}%)`);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Register Family Ownership — {parcel.parcel_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Family Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Family Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Family Name *</Label>
                <Input placeholder="e.g. Adeyemi Family" value={form.family_name} onChange={(e) => setField("family_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Family Head *</Label>
                <Input placeholder="Full name of family head" value={form.family_head} onChange={(e) => setField("family_head", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Family Representative</Label>
                <Input placeholder="Appointed representative" value={form.family_representative} onChange={(e) => setField("family_representative", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Family Lineage</Label>
                <Select value={form.family_lineage} onValueChange={(v) => setField("family_lineage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patrilineal">Patrilineal</SelectItem>
                    <SelectItem value="matrilineal">Matrilineal</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Family Notes</Label>
                <Textarea placeholder="Customary agreements, traditions, or special notes..." value={form.family_notes} onChange={(e) => setField("family_notes", e.target.value)} rows={2} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Attached Assets */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-600" />
              Attached Assets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "fruit_trees", label: "Fruit Trees" },
                { key: "buildings", label: "Buildings" },
                { key: "boreholes", label: "Boreholes" },
                { key: "economic_trees", label: "Economic Trees" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4 space-y-1">
                <Label className="text-xs">Other Improvements</Label>
                <Input placeholder="Fences, ponds, processing structures..." value={form.other_improvements} onChange={(e) => setField("other_improvements", e.target.value)} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Beneficiaries */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Beneficiaries</h3>
              <Button size="sm" variant="outline" onClick={addBeneficiary} className="gap-1.5 h-7 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Beneficiary
              </Button>
            </div>

            {/* Share indicator */}
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
              shareValid
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              {shareValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              Total Shares: <strong>{totalShare.toFixed(1)}%</strong>
              {!shareValid && " — must equal 100%"}
            </div>

            <div className="space-y-3">
              {beneficiaries.map((b, idx) => (
                <div key={idx} className="p-3 border border-border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Beneficiary #{idx + 1}</span>
                    {beneficiaries.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeBeneficiary(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Full Name *</Label>
                      <Input placeholder="Full name" value={b.full_name} onChange={(e) => updateBeneficiary(idx, "full_name", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rank</Label>
                      <Input type="number" min="1" placeholder="1" value={b.inheritance_rank} onChange={(e) => updateBeneficiary(idx, "inheritance_rank", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Select value={b.relationship} onValueChange={(v) => updateBeneficiary(idx, "relationship", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Share %</Label>
                      <Input type="number" min="0" max="100" step="0.1" placeholder="0" value={b.percentage_share} onChange={(e) => updateBeneficiary(idx, "percentage_share", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={b.status} onValueChange={(v) => updateBeneficiary(idx, "status", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BENEFICIARY_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Allocated Plot</Label>
                      <Input placeholder="e.g. Plot A" value={b.allocated_plot} onChange={(e) => updateBeneficiary(idx, "allocated_plot", e.target.value)} />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input placeholder="Optional notes" value={b.notes} onChange={(e) => updateBeneficiary(idx, "notes", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="bg-primary text-primary-foreground"
          >
            {saveMutation.isPending ? "Registering..." : "Register Family Ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}