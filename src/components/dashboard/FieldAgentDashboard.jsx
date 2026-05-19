import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Camera, MapPin, ClipboardList, CheckCircle } from "lucide-react";
import StatCard from "../shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import StatusBadge from "../shared/StatusBadge";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Link } from "react-router-dom";

export default function FieldAgentDashboard({ user }) {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["agent-reports", user?.email],
    queryFn: () => base44.entities.FieldReport.filter({ agent_email: user?.email }, "-created_date", 100),
    enabled: !!user?.email,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Field Agent Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your field reports and inspections</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reports" value={reports.length} icon={ClipboardList} color="blue" />
        <StatCard title="Draft" value={reports.filter(r => r.status === "draft").length} icon={Camera} color="orange" />
        <StatCard title="Submitted" value={reports.filter(r => r.status === "submitted").length} icon={MapPin} color="purple" />
        <StatCard title="Reviewed" value={reports.filter(r => r.status === "reviewed").length} icon={CheckCircle} color="green" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Reports</CardTitle>
          <Link to="/field-reports" className="text-xs text-primary font-medium hover:underline">View All</Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.slice(0, 8).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium">{r.report_type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Parcel: {r.parcel_number || r.parcel_id}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}