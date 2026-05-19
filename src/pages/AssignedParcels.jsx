import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import LandDetailModal from "../components/land/LandDetailModal";
import { useOutletContext } from "react-router-dom";

export default function AssignedParcels() {
  const { user } = useOutletContext();
  const [viewParcel, setViewParcel] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["assigned-parcels"],
    queryFn: () => base44.entities.LandParcel.filter({ verification_status: "unverified" }, "-created_date", 200),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assigned Parcels</h1>
        <p className="text-sm text-muted-foreground mt-1">Parcels needing field verification</p>
      </div>

      {parcels.length === 0 ? (
        <EmptyState icon={MapPin} title="No parcels" description="No unverified parcels at the moment" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parcels.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewParcel(p)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold">{p.parcel_number}</p>
                  <StatusBadge status={p.verification_status} />
                </div>
                <p className="text-xs text-muted-foreground">{p.owner_name}</p>
                <p className="text-xs text-muted-foreground">{p.address}</p>
                {p.latitude && p.longitude && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-2">
                    GPS: {p.latitude}, {p.longitude}
                  </p>
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