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
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CASE_TYPES = [
  { value: "succession", label: "Succession" },
  { value: "partition", label: "Partition" },
  { value: "allocation", label: "Allocation" },
  { value: "transfer", label: "Transfer" },
  { value: "dispute_resolution", label: "Dispute Resolution" },
  { value: "subdivision", label: "Subdivision" },
];

export default function InheritanceCaseDialog({ open, onClose, familyOwnerships, user, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    family_ownership_id: "",
    case_type: "succession",
    case_title: "",
    description: "",
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedFO = familyOwnerships.find(f => f.id === form.family_ownership_id);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.family_ownership_id || !form.case_type) throw new Error("Please select a family record and case type");

      const ref = `IC-${selectedFO?.parcel_number || "UNK"}-${Date.now().toString(36).toUpperCase()}`;

      const created = await base44.entities.InheritanceCase.create({
        family_ownership_id: form.family_ownership_id,
        parcel_id: selectedFO?.parcel_id,
        parcel_number: selectedFO?.parcel_number,
        family_name: selectedFO?.family_name,
        case_reference: ref,
        case_title: form.case_title || `${selectedFO?.family_name} — ${form.case_type.replace(/_/g, " ")}`,
        case_type: form.case_type,
        description: form.description,
        status: "draft",
        initiated_by: user?.email,
        initiated_by_name: user?.full_name,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Created inheritance case ${ref}`,
        entity_type: "InheritanceCase",
        entity_id: created.id,
        details: `Type: ${form.case_type}, Family: ${selectedFO?.family_name}`,
      });

      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      toast.success("Inheritance case created");
      onCreated?.(data);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            New Inheritance Case
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Family Record *</Label>
            <Select value={form.family_ownership_id} onValueChange={v => setField("family_ownership_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select family record..." />
              </SelectTrigger>
              <SelectContent>
                {familyOwnerships.map(fo => (
                  <SelectItem key={fo.id} value={fo.id}>
                    {fo.family_name} — Parcel #{fo.parcel_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFO && (
              <p className="text-xs text-muted-foreground pl-1">
                Family Head: {selectedFO.family_head} · {selectedFO.community || selectedFO.lga}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Case Type *</Label>
            <Select value={form.case_type} onValueChange={v => setField("case_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Case Title</Label>
            <Input
              placeholder="Optional descriptive title..."
              value={form.case_title}
              onChange={e => setField("case_title", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Describe the inheritance matter, customary context, relevant background..."
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.family_ownership_id}
          >
            {createMutation.isPending ? "Creating..." : "Create Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}