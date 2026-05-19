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
import { format } from "date-fns";

export default function MySubmissions() {
  const { user } = useOutletContext();
  const [viewParcel, setViewParcel] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["my-submissions", user?.email],
    queryFn: () => base44.entities.LandParcel.filter({ registered_by: user?.email }, "-created_date", 200),
    enabled: !!user?.email,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">{parcels.length} land parcels submitted</p>
      </div>

      {parcels.length === 0 ? (
        <EmptyState icon={MapPin} title="No submissions" description="You haven't submitted any land registrations yet" />
      ) : (
        <div className="space-y-3">
          {parcels.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewParcel(p)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.parcel_number}</p>
                    <p className="text-xs text-muted-foreground">{p.owner_name} — {p.address}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(p.created_date), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
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