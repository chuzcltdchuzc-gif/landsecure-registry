/**
 * Priority 3 — Revision Request for Approved/Locked Parcels
 * Provides a workflow for requesting changes to immutable approved parcels.
 */
import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Clock, CheckCircle, XCircle, Lock } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ParcelRevisionRequest({ parcel, user }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ revision_type: "", justification: "" });
  const queryClient = useQueryClient();

  const { data: revisions = [] } = useQuery({
    queryKey: ["revisions", parcel?.id],
    queryFn: () => base44.entities.ParcelRevision.filter({ parcel_id: parcel?.id }, "-created_date", 20),
    enabled: !!parcel?.id,
  });

  const isLocked = parcel?.status === "approved_locked" || parcel?.status === "approved";
  const pendingRevision = revisions.find((r) => r.status === "pending");

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ParcelRevision.create({
        parcel_id: parcel.id,
        parcel_number: parcel.parcel_number,
        requested_by: user?.email,
        requested_by_name: user?.full_name,
        revision_type: form.revision_type,
        justification: form.justification,
        status: "pending",
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Submitted revision request for approved parcel ${parcel.parcel_number}`,
        entity_type: "LandParcel",
        entity_id: parcel.id,
        details: `Revision type: ${form.revision_type}. Justification: ${form.justification}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions", parcel?.id] });
      setOpen(false);
      setForm({ revision_type: "", justification: "" });
      toast.success("Revision request submitted — awaiting admin review");
    },
  });

  if (!isLocked) return null;

  return (
    <div className="space-y-3">
      {/* Lock indicator */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-800">Approved — Immutable Record</p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            This parcel is approved and locked. Modifications require a formal revision request.
          </p>
        </div>
        {!pendingRevision && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100 gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Request Revision
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-primary" />
                  Request Parcel Revision
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium">{parcel.parcel_number}</p>
                  <p className="text-xs text-muted-foreground">{parcel.owner_name} — {parcel.address}</p>
                </div>

                <div>
                  <Label>Revision Type *</Label>
                  <Select value={form.revision_type} onValueChange={(v) => setForm((f) => ({ ...f, revision_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select revision type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boundary_correction">Boundary Correction</SelectItem>
                      <SelectItem value="ownership_update">Ownership Update</SelectItem>
                      <SelectItem value="address_correction">Address Correction</SelectItem>
                      <SelectItem value="land_use_change">Land Use Change</SelectItem>
                      <SelectItem value="documentation_update">Documentation Update</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Justification *</Label>
                  <Textarea
                    placeholder="Provide a detailed reason for the revision request..."
                    value={form.justification}
                    onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
                    rows={4}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => submitMutation.mutate()}
                  disabled={!form.revision_type || !form.justification.trim() || submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Revision Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending revision notice */}
      {pendingRevision && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Revision Request Pending</p>
            <p className="text-[10px] text-blue-700 mt-0.5">
              {pendingRevision.revision_type?.replace(/_/g, " ")} — submitted{" "}
              {format(new Date(pendingRevision.created_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      )}

      {/* Revision history */}
      {revisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revision History</p>
          {revisions.map((r) => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium capitalize">{r.revision_type?.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{r.justification}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(r.created_date), "MMM d, yyyy")} by {r.requested_by_name || r.requested_by}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.review_notes && (
                  <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                    <span className="font-medium">Review: </span>{r.review_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}