import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import LandDetailModal from "../components/land/LandDetailModal";
import { useOutletContext } from "react-router-dom";

export default function MyClaims() {
  const { user } = useOutletContext();
  const [viewParcel, setViewParcel] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["my-claims", user?.email],
    queryFn: () => base44.entities.LandParcel.filter({ owner_email: user?.email }, "-created_date", 200),
    enabled: !!user?.email,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Land Claims</h1>
        <p className="text-sm text-muted-foreground mt-1">Parcels registered under your name</p>
      </div>

      {parcels.length === 0 ? (
        <EmptyState icon={FileText} title="No claims" description="You don't have any land claims yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parcels.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewParcel(p)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold">{p.parcel_number}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-muted-foreground">{p.address}</p>
                {p.size_hectares && <p className="text-xs text-muted-foreground mt-1">{p.size_hectares} hectares</p>}
                <div className="mt-3">
                  <StatusBadge status={p.verification_status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewParcel && <LandDetailModal parcel={viewParcel} onClose={() => setViewParcel(null)} user={user} />}
    </div>
  );
}