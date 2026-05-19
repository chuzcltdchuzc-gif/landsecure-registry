import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, Shield, AlertTriangle, FileText, Users, History } from "lucide-react";
import StatCard from "../shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import StatusBadge from "../shared/StatusBadge";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(210, 75%, 45%)", "hsl(145, 50%, 42%)", "hsl(35, 85%, 55%)", "hsl(0, 72%, 51%)", "hsl(280, 55%, 55%)"];

export default function SurveyorGeneralDashboard({ user }) {
  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["all-parcels"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 200),
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["all-disputes"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 100),
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recent-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 5),
  });

  if (isLoading) return <LoadingSpinner />;

  const pending = parcels.filter(p => p.status === "pending").length;
  const approved = parcels.filter(p => p.status === "approved").length;
  const rejected = parcels.filter(p => p.status === "rejected").length;
  const disputed = parcels.filter(p => p.status === "disputed").length;
  const openDisputes = disputes.filter(d => d.status === "open" || d.status === "under_review").length;

  const statusData = [
    { name: "Pending", value: pending },
    { name: "Approved", value: approved },
    { name: "Rejected", value: rejected },
    { name: "Disputed", value: disputed },
  ].filter(d => d.value > 0);

  const landUseData = Object.entries(
    parcels.reduce((acc, p) => {
      const key = p.land_use || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surveyor General Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">System overview and pending approvals</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Parcels" value={parcels.length} icon={MapPin} color="blue" />
        <StatCard title="Pending Approvals" value={pending} icon={Shield} color="orange" />
        <StatCard title="Open Disputes" value={openDisputes} icon={AlertTriangle} color="red" />
        <StatCard title="Approved" value={approved} icon={FileText} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parcel Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Land Use Types</CardTitle>
          </CardHeader>
          <CardContent>
            {landUseData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={landUseData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(210, 75%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <Link to="/approvals" className="text-xs text-primary font-medium hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parcels.filter(p => p.status === "pending").slice(0, 5).map(p => (
                <Link key={p.id} to="/approvals" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.parcel_number}</p>
                    <p className="text-xs text-muted-foreground">{p.owner_name} — {p.address}</p>
                  </div>
                  <StatusBadge status="pending" />
                </Link>
              ))}
              {pending === 0 && <p className="text-sm text-muted-foreground">No pending approvals</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Audit Logs</CardTitle>
            <Link to="/audit-logs" className="text-xs text-primary font-medium hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted">
                  <History className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.user_name || log.user_email}</p>
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}