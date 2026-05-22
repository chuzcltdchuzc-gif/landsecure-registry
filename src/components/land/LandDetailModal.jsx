import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "../shared/StatusBadge";
import FraudRiskPanel from "../fraud/FraudRiskPanel";
import ParcelRevisionRequest from "./ParcelRevisionRequest";
import { MapPin, User, Ruler, FileText, Calendar, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

export default function LandDetailModal({ parcel, onClose }) {
  const { data: allParcels = [] } = useQuery({
    queryKey: ["all-parcels-risk"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 1000),
    enabled: !!parcel,
  });
  const { data: allAlerts = [] } = useQuery({
    queryKey: ["all-alerts-risk"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 500),
    enabled: !!parcel,
  });
  const { data: ownershipHistory = [] } = useQuery({
    queryKey: ["ownership-risk"],
    queryFn: () => base44.entities.OwnershipHistory.filter({ parcel_id: parcel?.id }, "-created_date", 50),
    enabled: !!parcel?.id,
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["disputes-risk"],
    queryFn: () => base44.entities.Dispute.filter({ parcel_id: parcel?.id }, "-created_date", 50),
    enabled: !!parcel?.id,
  });

  if (!parcel) return null;

  return (
    <Dialog open={!!parcel} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {parcel.parcel_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={parcel.status} />
            <StatusBadge status={parcel.verification_status} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="Owner" value={parcel.owner_name} />
            <InfoItem icon={Ruler} label="Size" value={parcel.size_hectares ? `${parcel.size_hectares} ha` : "N/A"} />
            <InfoItem icon={MapPin} label="Address" value={parcel.address} />
            <InfoItem icon={FileText} label="Land Use" value={parcel.land_use?.replace(/_/g, " ") || "N/A"} />
            {parcel.state && <InfoItem icon={MapPin} label="State" value={parcel.state} />}
            {parcel.lga && <InfoItem icon={MapPin} label="LGA" value={parcel.lga} />}
          </div>

          {(parcel.latitude && parcel.longitude) && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">GPS Coordinates</p>
              <p className="text-sm font-mono">{parcel.latitude}, {parcel.longitude}</p>
            </div>
          )}

          {parcel.photos?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Photos</p>
              <div className="flex gap-2 overflow-x-auto">
                {parcel.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                ))}
              </div>
            </div>
          )}

          {parcel.approval_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Approved: {format(new Date(parcel.approval_date), "MMM d, yyyy")}
            </div>
          )}

          {parcel.notes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{parcel.notes}</p>
            </div>
          )}

          {/* Spatial validation summary */}
          {parcel.spatial_validation_status && parcel.spatial_validation_status !== "not_validated" && (
            <div className={`p-3 rounded-lg border text-xs ${
              parcel.spatial_validation_status === "valid"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Spatial Validation: {parcel.spatial_validation_status.replace(/_/g, " ")}
              </p>
              {parcel.spatial_conflict_notes && (
                <p className="mt-1 opacity-80">
                  {(() => { try { return JSON.parse(parcel.spatial_conflict_notes).join(" · "); } catch { return parcel.spatial_conflict_notes; } })()}
                </p>
              )}
              {parcel.boundary_area && (
                <p className="mt-1 opacity-80">
                  Area: {(parcel.boundary_area / 10000).toFixed(4)} ha · Perimeter: {parcel.boundary_perimeter?.toFixed(0)} m
                </p>
              )}
            </div>
          )}

          <FraudRiskPanel
            parcel={parcel}
            allParcels={allParcels}
            allAlerts={allAlerts}
            ownershipHistory={ownershipHistory}
            disputes={disputes}
          />

          <ParcelRevisionRequest parcel={parcel} user={null} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}