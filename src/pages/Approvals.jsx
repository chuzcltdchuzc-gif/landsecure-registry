import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MapPin, Eye, AlertTriangle, Lock, ShieldAlert } from "lucide-react";
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
      // Priority 2: Block approvals when spatial conflict exists
      const blockedStatuses = ["conflict_blocked", "invalid_geometry", "overlap_warning", "duplicate_warning"];
      if (blockedStatuses.includes(parcel.spatial_validation_status)) {
        throw new Error(`Cannot approve: spatial validation status is '${parcel.spatial_validation_status}'. Resolve conflicts first.`);
      }

      await base44.entities.LandParcel.update(parcel.id, {
        status: "approved_locked", // Priority 3: lock on approval
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
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <StatusBadge status={parcel.verification_status} />
                        {parcel.land_use && (
                          <span className="text-xs text-muted-foreground">{parcel.land_use.replace(/_/g, " ")}</span>
                        )}
                        {/* Spatial conflict indicator */}
                        {parcel.spatial_validation_status && parcel.spatial_validation_status !== "not_validated" && parcel.spatial_validation_status !== "valid" && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            {parcel.spatial_validation_status.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {parcel.spatial_validation_status === "valid" && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                            <CheckCircle className="w-3 h-3" /> Spatial OK
                          </Badge>
                        )}
                      </div>
                      {/* Spatial conflict warning */}
                      {["conflict_blocked","invalid_geometry","overlap_warning","duplicate_warning"].includes(parcel.spatial_validation_status) && (
                        <div className="flex items-center gap-1.5 mt-2 p-2 rounded bg-red-50 border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <p className="text-xs text-red-800">Spatial conflicts detected — approval blocked until resolved</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setViewParcel(parcel)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                      onClick={() => approveMutation.mutate(parcel)}
                      disabled={
                        approveMutation.isPending ||
                        ["conflict_blocked","invalid_geometry"].includes(parcel.spatial_validation_status)
                      }
                      title={["conflict_blocked","invalid_geometry"].includes(parcel.spatial_validation_status) ? "Blocked: resolve spatial conflicts first" : undefined}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve & Lock
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