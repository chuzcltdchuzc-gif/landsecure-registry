import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, FileText, Clock, CheckCircle } from "lucide-react";
import StatCard from "../shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import StatusBadge from "../shared/StatusBadge";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Link } from "react-router-dom";

export default function SurveyorDashboard({ user }) {
  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["surveyor-parcels", user?.email],
    queryFn: () => base44.entities.LandParcel.filter({ registered_by: user?.email }, "-created_date", 100),
    enabled: !!user?.email,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["surveyor-docs", user?.email],
    queryFn: () => base44.entities.SurveyDocument.filter({ surveyor_email: user?.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surveyor Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your land registrations and survey documents</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Registered Parcels" value={parcels.length} icon={MapPin} color="blue" />
        <StatCard title="Pending" value={parcels.filter(p => p.status === "pending").length} icon={Clock} color="orange" />
        <StatCard title="Approved" value={parcels.filter(p => p.status === "approved").length} icon={CheckCircle} color="green" />
        <StatCard title="Documents" value={docs.length} icon={FileText} color="purple" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Submissions</CardTitle>
          <Link to="/my-submissions" className="text-xs text-primary font-medium hover:underline">View All</Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {parcels.slice(0, 8).map(p => (
              <Link key={p.id} to={`/my-submissions`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium">{p.parcel_number}</p>
                  <p className="text-xs text-muted-foreground">{p.owner_name} — {p.address}</p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
            {parcels.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}