import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, FileText, AlertTriangle, Bell } from "lucide-react";
import StatCard from "../shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import StatusBadge from "../shared/StatusBadge";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function GeneralDashboard({ user }) {
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["my-parcels", user?.email],
    queryFn: () => base44.entities.LandParcel.filter({ owner_email: user?.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["my-disputes", user?.email],
    queryFn: () => base44.entities.Dispute.filter({ complainant_email: user?.email }, "-created_date", 10),
    enabled: !!user?.email,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, "-created_date", 5),
    enabled: !!user?.email,
  });

  if (loadingParcels) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.full_name || "User"}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's an overview of your land records</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Parcels" value={parcels.length} icon={MapPin} color="blue" />
        <StatCard title="Approved" value={parcels.filter(p => p.status === "approved").length} icon={FileText} color="green" />
        <StatCard title="Pending" value={parcels.filter(p => p.status === "pending").length} icon={FileText} color="orange" />
        <StatCard title="Disputes" value={disputes.length} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Land Records</CardTitle>
          </CardHeader>
          <CardContent>
            {parcels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No land records yet</p>
            ) : (
              <div className="space-y-3">
                {parcels.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/lands?parcel=${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div>
                      <p className="text-sm font-medium">{p.parcel_number}</p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <Bell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}