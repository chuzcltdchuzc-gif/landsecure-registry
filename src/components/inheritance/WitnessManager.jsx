import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";

const WITNESS_ROLES = [
  { value: "family_witness", label: "Family Witness" },
  { value: "community_witness", label: "Community Witness" },
  { value: "traditional_ruler", label: "Traditional Ruler" },
  { value: "religious_witness", label: "Religious Witness" },
  { value: "government_witness", label: "Government Witness" },
];

const ROLE_COLORS = {
  family_witness: "bg-emerald-100 text-emerald-700",
  community_witness: "bg-blue-100 text-blue-700",
  traditional_ruler: "bg-purple-100 text-purple-700",
  religious_witness: "bg-amber-100 text-amber-700",
  government_witness: "bg-red-100 text-red-700",
};

const MIN_WITNESSES = 2;

function emptyWitness() {
  return { full_name: "", witness_role: "family_witness", phone: "", address: "", identification: "", witness_statement: "" };
}

export default function WitnessManager({ caseId, parcelId, user, readOnly = false }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyWitness());

  const { data: witnesses = [] } = useQuery({
    queryKey: ["witnesses", caseId],
    queryFn: () => base44.entities.InheritanceWitness.filter({ inheritance_case_id: caseId, is_deleted: false }, "-created_date", 50),
    enabled: !!caseId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const w = await base44.entities.InheritanceWitness.create({
        ...form,
        inheritance_case_id: caseId,
        parcel_id: parcelId,
        verification_status: "pending",
        is_deleted: false,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Added witness ${form.full_name} to inheritance case`,
        entity_type: "InheritanceWitness",
        entity_id: w.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["witnesses", caseId] });
      toast.success("Witness added");
      setForm(emptyWitness());
      setAdding(false);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (witnessId) => {
      await base44.entities.InheritanceWitness.update(witnessId, {
        verification_status: "verified",
        verified_by: user?.email,
        verified_date: new Date().toISOString(),
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: "Verified witness",
        entity_type: "InheritanceWitness",
        entity_id: witnessId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["witnesses", caseId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (witnessId) => base44.entities.InheritanceWitness.update(witnessId, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["witnesses", caseId] }),
  });

  const verifiedCount = witnesses.filter((w) => w.verification_status === "verified").length;
  const meetsMinimum = witnesses.length >= MIN_WITNESSES;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Witnesses ({witnesses.length})</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${meetsMinimum ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {verifiedCount} verified · min {MIN_WITNESSES} required
          </span>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(!adding)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        )}
      </div>

      {adding && (
        <div className="p-3 border border-border rounded-lg space-y-2 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input placeholder="Witness full name" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role *</Label>
              <Select value={form.witness_role} onValueChange={(v) => setForm(f => ({ ...f, witness_role: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WITNESS_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input placeholder="+234..." value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ID (NIN / Passport)</Label>
              <Input placeholder="Identification number" value={form.identification} onChange={(e) => setForm(f => ({ ...f, identification: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input placeholder="Witness address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Witness Statement</Label>
              <Textarea placeholder="Statement by the witness..." value={form.witness_statement} onChange={(e) => setForm(f => ({ ...f, witness_statement: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => addMutation.mutate()} disabled={!form.full_name || addMutation.isPending}>
              {addMutation.isPending ? "Saving..." : "Save Witness"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {witnesses.map((w) => (
          <div key={w.id} className="flex items-start justify-between gap-2 p-2.5 bg-card rounded-lg border border-border">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold">{w.full_name}</span>
                <Badge className={`text-[9px] py-0 px-1.5 ${ROLE_COLORS[w.witness_role] || "bg-gray-100"}`}>
                  {w.witness_role?.replace(/_/g, " ")}
                </Badge>
                {w.verification_status === "verified" ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> Pending
                  </span>
                )}
              </div>
              {w.phone && <p className="text-[10px] text-muted-foreground">{w.phone}</p>}
              {w.witness_statement && <p className="text-[10px] text-muted-foreground truncate">{w.witness_statement}</p>}
            </div>
            {!readOnly && (
              <div className="flex gap-1 flex-shrink-0">
                {w.verification_status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 px-1.5" onClick={() => verifyMutation.mutate(w.id)}>
                    Verify
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => deleteMutation.mutate(w.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {witnesses.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No witnesses added yet</p>
        )}
      </div>
    </div>
  );
}