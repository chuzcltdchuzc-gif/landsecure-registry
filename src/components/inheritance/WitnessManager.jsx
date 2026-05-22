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
import { Plus, UserCheck, CheckCircle2, Clock, XCircle, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

const WITNESS_ROLES = [
  { value: "family_witness", label: "Family Witness" },
  { value: "community_witness", label: "Community Witness" },
  { value: "traditional_ruler", label: "Traditional Ruler" },
  { value: "religious_witness", label: "Religious Witness" },
  { value: "government_witness", label: "Government Witness" },
];

const ROLE_COLORS = {
  family_witness: "bg-blue-100 text-blue-700",
  community_witness: "bg-emerald-100 text-emerald-700",
  traditional_ruler: "bg-amber-100 text-amber-700",
  religious_witness: "bg-purple-100 text-purple-700",
  government_witness: "bg-red-100 text-red-700",
};

const VERIFY_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

function emptyForm(caseId, parcelId) {
  return { inheritance_case_id: caseId, parcel_id: parcelId, full_name: "", witness_role: "family_witness", phone: "", address: "", identification: "", witness_statement: "" };
}

export default function WitnessManager({ caseData, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: witnesses = [] } = useQuery({
    queryKey: ["witnesses", caseData.id],
    queryFn: () => base44.entities.InheritanceWitness.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });

  const verifiedCount = witnesses.filter(w => w.verification_status === "verified").length;
  const byRole = {};
  witnesses.forEach(w => { byRole[w.witness_role] = (byRole[w.witness_role] || 0) + 1; });

  const openAdd = () => { setForm(emptyForm(caseData.id, caseData.parcel_id)); setEditingId(null); setShowForm(true); };
  const openEdit = (w) => { setForm({ ...w }); setEditingId(w.id); setShowForm(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name || !form.witness_role) throw new Error("Name and role are required");
      let result;
      if (editingId) {
        result = await base44.entities.InheritanceWitness.update(editingId, form);
      } else {
        result = await base44.entities.InheritanceWitness.create({ ...form, verification_status: "pending", is_deleted: false });
      }
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: editingId ? `Updated witness ${form.full_name}` : `Added witness ${form.full_name}`,
        entity_type: "InheritanceWitness",
        entity_id: result.id,
        details: `Case: ${caseData.case_reference}, Role: ${form.witness_role}`,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["witnesses", caseData.id] });
      setShowForm(false);
      toast.success(editingId ? "Witness updated" : "Witness added");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.InheritanceWitness.update(id, {
        verification_status: status,
        verified_by: user?.email,
        verified_date: new Date().toISOString(),
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `${status === "verified" ? "Verified" : "Rejected"} witness`,
        entity_type: "InheritanceWitness",
        entity_id: id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["witnesses", caseData.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (w) => {
      await base44.entities.InheritanceWitness.update(w.id, { is_deleted: true });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Removed witness ${w.full_name}`,
        entity_type: "InheritanceWitness",
        entity_id: w.id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["witnesses", caseData.id] }),
  });

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
        verifiedCount >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        {verifiedCount >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        {verifiedCount} of {witnesses.length} witnesses verified
        {verifiedCount < 2 && " — minimum 2 verified required for approval"}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Witnesses ({witnesses.length})</p>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Witness
        </Button>
      </div>

      {witnesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No witnesses added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Minimum 2 verified witnesses required for approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {witnesses.map(w => (
            <div key={w.id} className="p-3 bg-white rounded-lg border border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{w.full_name}</span>
                    <Badge className={`text-[10px] ${ROLE_COLORS[w.witness_role] || "bg-gray-100"}`}>
                      {w.witness_role?.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={`text-[10px] ${VERIFY_COLORS[w.verification_status] || "bg-gray-50"}`}>
                      {w.verification_status === "verified" ? <><CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />Verified</> : w.verification_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    {w.phone && <span>{w.phone}</span>}
                    {w.identification && <span>ID: {w.identification}</span>}
                    {w.address && <span className="truncate max-w-[200px]">{w.address}</span>}
                  </div>
                  {w.witness_statement && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{w.witness_statement}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(w)}><Edit2 className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(w)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              {/* Verification actions */}
              {w.verification_status !== "verified" && (user?.role === "surveyor_general" || user?.role === "compliance_officer" || user?.role === "super_admin") && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-6 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => verifyMutation.mutate({ id: w.id, status: "verified" })}>
                    <CheckCircle2 className="w-3 h-3" /> Verify
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs text-red-600 border-red-200" onClick={() => verifyMutation.mutate({ id: w.id, status: "rejected" })}>
                    <XCircle className="w-3 h-3 mr-0.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && form && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Witness" : "Add Witness"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setField("full_name", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Witness Role *</Label>
                  <Select value={form.witness_role} onValueChange={v => setField("witness_role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WITNESS_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setField("phone", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Identification</Label>
                  <Input placeholder="NIN / Passport No." value={form.identification} onChange={e => setField("identification", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Address</Label>
                  <Input value={form.address} onChange={e => setField("address", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Witness Statement</Label>
                  <Textarea rows={3} value={form.witness_statement} onChange={e => setField("witness_statement", e.target.value)} placeholder="Statement attesting to this inheritance..." />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Witness"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}