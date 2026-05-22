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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  deceased: "bg-gray-100 text-gray-600",
  missing: "bg-amber-100 text-amber-700",
  transferred: "bg-blue-100 text-blue-700",
  disputed: "bg-red-100 text-red-700",
  under_verification: "bg-purple-100 text-purple-700",
  minor: "bg-orange-100 text-orange-700",
};

const RELATIONSHIPS = ["son", "daughter", "grandson", "granddaughter", "nephew", "niece", "brother", "sister", "cousin", "spouse", "other"];

function emptyForm(foId, parcelId, parcelNumber) {
  return {
    family_ownership_id: foId,
    parcel_id: parcelId,
    parcel_number: parcelNumber,
    full_name: "",
    relationship: "son",
    percentage_share: "",
    parent_beneficiary_id: "",
    inheritance_rank: "",
    generation_level: "",
    family_branch: "",
    status: "active",
    national_id: "",
    phone: "",
    address: "",
    date_added: new Date().toISOString().split("T")[0],
    date_of_death: "",
    notes: "",
  };
}

export default function BeneficiaryManager({ familyOwnership, caseData, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries-fo", familyOwnership?.id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ family_ownership_id: familyOwnership.id, is_deleted: false }, "inheritance_rank", 100),
    enabled: !!familyOwnership?.id,
  });

  const totalShare = beneficiaries.reduce((s, b) => s + (b.percentage_share || 0), 0);
  const shareValid = Math.abs(totalShare - 100) < 0.01;

  // Detect duplicates
  const nameCount = {};
  beneficiaries.forEach(b => { nameCount[b.full_name] = (nameCount[b.full_name] || 0) + 1; });
  const duplicateNames = new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1));

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setForm(emptyForm(familyOwnership?.id, familyOwnership?.parcel_id, familyOwnership?.parcel_number));
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({ ...b });
    setEditingId(b.id);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name) throw new Error("Full name is required");
      if (!form.percentage_share) throw new Error("Percentage share is required");

      // Check for circular chain
      if (form.parent_beneficiary_id && form.parent_beneficiary_id === editingId) {
        throw new Error("A beneficiary cannot be their own parent");
      }

      const data = {
        ...form,
        percentage_share: parseFloat(form.percentage_share) || 0,
        inheritance_rank: parseInt(form.inheritance_rank) || null,
        generation_level: parseInt(form.generation_level) || null,
        parent_beneficiary_id: form.parent_beneficiary_id || null,
        is_deleted: false,
      };

      let result;
      if (editingId) {
        result = await base44.entities.FamilyBeneficiary.update(editingId, data);
      } else {
        result = await base44.entities.FamilyBeneficiary.create(data);
      }

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: editingId ? `Updated beneficiary ${form.full_name}` : `Added beneficiary ${form.full_name}`,
        entity_type: "FamilyBeneficiary",
        entity_id: result.id,
        details: `Case: ${caseData?.case_reference}, Share: ${data.percentage_share}%`,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries-fo", familyOwnership?.id] });
      setShowForm(false);
      toast.success(editingId ? "Beneficiary updated" : "Beneficiary added");
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (b) => {
      await base44.entities.FamilyBeneficiary.update(b.id, { is_deleted: true });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Removed beneficiary ${b.full_name} (soft delete)`,
        entity_type: "FamilyBeneficiary",
        entity_id: b.id,
        details: `Case: ${caseData?.case_reference}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries-fo", familyOwnership?.id] });
      toast.success("Beneficiary removed");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, date_of_death }) => {
      const updates = { status };
      if (date_of_death) updates.date_of_death = date_of_death;
      await base44.entities.FamilyBeneficiary.update(id, updates);
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Updated beneficiary status to ${status}`,
        entity_type: "FamilyBeneficiary",
        entity_id: id,
        details: `Case: ${caseData?.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["beneficiaries-fo", familyOwnership?.id] }),
  });

  // Render tree recursively
  const renderTree = (parentId, depth) => {
    const children = beneficiaries.filter(b => (b.parent_beneficiary_id || null) === parentId);
    if (children.length === 0) return null;
    return (
      <div className={`space-y-2 ${depth > 0 ? "ml-6 border-l-2 border-emerald-100 pl-3 mt-2" : ""}`}>
        {children.map(b => (
          <div key={b.id}>
            <BeneficiaryRow
              b={b}
              isDuplicate={duplicateNames.has(b.full_name)}
              onEdit={() => openEdit(b)}
              onDelete={() => softDeleteMutation.mutate(b)}
              onStatusChange={(status, dod) => updateStatusMutation.mutate({ id: b.id, status, date_of_death: dod })}
              allBeneficiaries={beneficiaries}
            />
            {renderTree(b.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const rootBeneficiaries = beneficiaries.filter(b => !b.parent_beneficiary_id);
  const hasTree = beneficiaries.some(b => b.parent_beneficiary_id);

  return (
    <div className="space-y-4">
      {/* Share summary */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
        shareValid ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        {shareValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        Total Allocated: <strong>{totalShare.toFixed(1)}%</strong>
        {!shareValid && " — shares must total 100%"}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Beneficiaries ({beneficiaries.length})
        </p>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Beneficiary
        </Button>
      </div>

      {beneficiaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No beneficiaries added yet</p>
          </CardContent>
        </Card>
      ) : hasTree ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-emerald-600" /> Inheritance Tree
          </p>
          {renderTree(null, 0)}
        </div>
      ) : (
        <div className="space-y-2">
          {beneficiaries.map(b => (
            <BeneficiaryRow
              key={b.id}
              b={b}
              isDuplicate={duplicateNames.has(b.full_name)}
              onEdit={() => openEdit(b)}
              onDelete={() => softDeleteMutation.mutate(b)}
              onStatusChange={(status, dod) => updateStatusMutation.mutate({ id: b.id, status, date_of_death: dod })}
              allBeneficiaries={beneficiaries}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showForm && form && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setField("full_name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select value={form.relationship} onValueChange={v => setField("relationship", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Share % *</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={form.percentage_share} onChange={e => setField("percentage_share", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inheritance Rank</Label>
                  <Input type="number" min="1" placeholder="e.g. 1" value={form.inheritance_rank} onChange={e => setField("inheritance_rank", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Generation Level</Label>
                  <Input type="number" min="1" placeholder="e.g. 2" value={form.generation_level} onChange={e => setField("generation_level", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Family Branch</Label>
                  <Input placeholder="e.g. Adeola Branch" value={form.family_branch} onChange={e => setField("family_branch", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parent Beneficiary (Successor of)</Label>
                  <Select value={form.parent_beneficiary_id || ""} onValueChange={v => setField("parent_beneficiary_id", v || null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None (root)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None (root level)</SelectItem>
                      {beneficiaries.filter(b => b.id !== editingId).map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">National ID</Label>
                  <Input placeholder="NIN / Passport" value={form.national_id} onChange={e => setField("national_id", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="+234..." value={form.phone} onChange={e => setField("phone", e.target.value)} />
                </div>
                {form.status === "deceased" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Date of Death</Label>
                    <Input type="date" value={form.date_of_death} onChange={e => setField("date_of_death", e.target.value)} />
                  </div>
                )}
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Address</Label>
                  <Input placeholder="Residential address" value={form.address} onChange={e => setField("address", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={e => setField("notes", e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Beneficiary"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BeneficiaryRow({ b, isDuplicate, onEdit, onDelete, onStatusChange, allBeneficiaries }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [dod, setDod] = useState("");

  return (
    <div className={`p-3 bg-white rounded-lg border space-y-1 ${isDuplicate ? "border-amber-300" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{b.full_name}</span>
          <span className="text-xs text-muted-foreground capitalize">({b.relationship})</span>
          <Badge className={`text-[10px] ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"}`}>
            {b.status?.replace(/_/g, " ")}
          </Badge>
          {b.verification_status === "verified" && (
            <Badge className="text-[10px] bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Verified</Badge>
          )}
          {isDuplicate && <Badge className="text-[10px] bg-amber-100 text-amber-700">Duplicate Name</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-primary">{b.percentage_share}%</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Edit2 className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        {b.inheritance_rank && <span>Rank #{b.inheritance_rank}</span>}
        {b.generation_level && <span>Gen {b.generation_level}</span>}
        {b.family_branch && <span>[{b.family_branch}]</span>}
        {b.national_id && <span>ID: {b.national_id}</span>}
        {b.phone && <span>{b.phone}</span>}
        {b.date_of_death && <span>d. {format(new Date(b.date_of_death), "MMM d, yyyy")}</span>}
        {b.parent_beneficiary_id && (
          <span className="text-emerald-600">
            ↑ {allBeneficiaries.find(p => p.id === b.parent_beneficiary_id)?.full_name}
          </span>
        )}
      </div>
      {b.notes && <p className="text-[10px] text-muted-foreground italic">{b.notes}</p>}

      {/* Quick status change */}
      <div className="flex gap-1 pt-1">
        {["active", "deceased", "missing", "disputed", "under_verification"].map(s => (
          b.status !== s && (
            <button
              key={s}
              onClick={() => {
                if (s === "deceased") { setShowStatusMenu(true); return; }
                onStatusChange(s, null);
              }}
              className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-muted capitalize"
            >
              → {s.replace(/_/g, " ")}
            </button>
          )
        ))}
      </div>
      {showStatusMenu && (
        <div className="flex items-center gap-2 pt-1">
          <Input type="date" className="h-7 text-xs w-36" value={dod} onChange={e => setDod(e.target.value)} />
          <Button size="sm" className="h-7 text-xs" onClick={() => { onStatusChange("deceased", dod); setShowStatusMenu(false); }}>
            Mark Deceased
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowStatusMenu(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}