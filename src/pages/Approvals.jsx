import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, MapPin, Eye } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import LandDetailModal from "../components/land/LandDetailModal";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";

export default function Approvals() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState({});
  const [showReject, setShowReject] = useState({});
  const [viewParcel, setViewParcel] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["pending-parcels"],
    queryFn: () => base44.entities.LandParcel.filter({ status: "pending" }, "-created_date", 200),
  });

  const approveMutation = useMutation({
    mutationFn: async (parcel) => {
      await base44.entities.LandParcel.update(parcel.id, {
        status: "approved",
        approved_by: user?.email,
        approval_date: new Date().toISOString().split("T")[0],
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Approved land parcel ${parcel.parcel_number}`,
        entity_type: "LandParcel",
        entity_id: parcel.id,
      });
      await base44.entities.Notification.create({
        user_email: parcel.owner_email || parcel.registered_by,
        title: "Land Parcel Approved",
        message: `Your land parcel ${parcel.parcel_number} has been approved.`,
        type: "approval",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-parcels"] });
      toast.success("Parcel approved successfully");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ parcel, reason }) => {
      await base44.entities.LandParcel.update(parcel.id, {
        status: "rejected",
        rejection_reason: reason,
        approved_by: user?.email,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Rejected land parcel ${parcel.parcel_number}`,
        entity_type: "LandParcel",
        entity_id: parcel.id,
        details: reason,
      });
      await base44.entities.Notification.create({
        user_email: parcel.owner_email || parcel.registered_by,
        title: "Land Parcel Rejected",
        message: `Your land parcel ${parcel.parcel_number} has been rejected. Reason: ${reason}`,
        type: "rejection",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-parcels"] });
      toast.success("Parcel rejected");
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">{parcels.length} parcels awaiting review</p>
      </div>

      {parcels.length === 0 ? (
        <EmptyState icon={CheckCircle} title="All caught up" description="No pending parcels to review" />
      ) : (
        <div className="space-y-4">
          {parcels.map((parcel) => (
            <Card key={parcel.id}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{parcel.parcel_number}</p>
                      <p className="text-sm text-muted-foreground">{parcel.owner_name} — {parcel.address}</p>
                      <div className="flex gap-2 mt-2">
                        <StatusBadge status={parcel.verification_status} />
                        {parcel.land_use && (
                          <span className="text-xs text-muted-foreground">{parcel.land_use.replace(/_/g, " ")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setViewParcel(parcel)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approveMutation.mutate(parcel)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowReject({ ...showReject, [parcel.id]: !showReject[parcel.id] })}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>

                {showReject[parcel.id] && (
                  <div className="mt-4 flex gap-2">
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={rejectionReason[parcel.id] || ""}
                      onChange={(e) => setRejectionReason({ ...rejectionReason, [parcel.id]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ parcel, reason: rejectionReason[parcel.id] || "No reason provided" })}
                      disabled={rejectMutation.isPending}
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewParcel && <LandDetailModal parcel={viewParcel} onClose={() => setViewParcel(null)} user={user} />}
    </div>
  );
}