import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, Lock, FileText, Eye, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default function ComplianceDashboard({ user }) {
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["fraud-alerts-compliance"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 100),
  });
  const { data: freezes = [], isLoading: loadingFreezes } = useQuery({
    queryKey: ["parcel-freezes-compliance"],
    queryFn: () => base44.entities.ParcelFreeze.list("-created_date", 100),
  });
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["parcels-compliance"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 300),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: () => base44.entities.ComplianceReport.list("-created_date", 50),
  });

  if (loadingAlerts || loadingFreezes || loadingParcels) return <LoadingSpinner text="Loading compliance dashboard..." />;

  const openAlerts = alerts.filter(a => a.status === "open");
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const activeFreezes = freezes.filter(f => f.status === "active");
  const myAlerts = alerts.filter(a => a.assigned_to === user?.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Compliance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Regulatory oversight, fraud monitoring, and audit operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Fraud Alerts" value={openAlerts.length} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Critical Severity" value={criticalAlerts.length} icon={TrendingUp} color="text-red-700" bg="bg-red-100" />
        <StatCard title="Active Freezes" value={activeFreezes.length} icon={Lock} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Assigned to Me" value={myAlerts.length} icon={Eye} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Fraud Alerts", path: "/gov/fraud-alerts", icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-200" },
          { label: "Freeze Parcels", path: "/gov/parcel-freeze", icon: Lock, color: "bg-orange-50 text-orange-700 border-orange-200" },
          { label: "All Parcels", path: "/lands", icon: Eye, color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Reports", path: "/gov/compliance-reports", icon: FileText, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        ].map(action => (
          <Link key={action.path} to={action.path}>
            <Card className={`border cursor-pointer hover:shadow-md transition-shadow ${action.color}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <action.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fraud Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Fraud Alerts</CardTitle>
            <Link to="/gov/fraud-alerts" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {openAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Parcel: {alert.parcel_number || alert.parcel_id}</p>
                  <p className="text-xs text-muted-foreground capitalize">{alert.alert_type?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <StatusBadge status={alert.severity} />
                </div>
              </div>
            ))}
            {openAlerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No open fraud alerts</p>}
          </CardContent>
        </Card>

        {/* Active Freezes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Active Parcel Freezes</CardTitle>
            <Link to="/gov/parcel-freeze" className="text-xs text-primary hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeFreezes.slice(0, 5).map(freeze => (
              <div key={freeze.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Parcel: {freeze.parcel_number || freeze.parcel_id}</p>
                  <p className="text-xs text-muted-foreground capitalize">{freeze.freeze_reason?.replace(/_/g, " ")}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                  {format(new Date(freeze.created_date), "MMM d")}
                </span>
              </div>
            ))}
            {activeFreezes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active freezes</p>}
          </CardContent>
        </Card>
      </div>

      {/* Parcel Approval Overview */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Parcel Approval Overview (Read-Only)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {["pending", "approved", "rejected", "disputed"].map(status => (
              <div key={status} className="text-center p-3 bg-muted/40 rounded-lg">
                <p className="text-2xl font-bold">{parcels.filter(p => p.status === status).length}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}