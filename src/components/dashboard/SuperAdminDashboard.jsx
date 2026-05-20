import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Map, AlertTriangle, FileText, Shield, TrendingUp, Activity, AlertOctagon } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default function SuperAdminDashboard({ user }) {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["all-parcels-admin"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 200),
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["fraud-alerts-admin"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 50),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["audit-logs-admin"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 10),
  });

  if (loadingUsers || loadingParcels) return <LoadingSpinner />;

  const activeUsers = users.filter(u => u.status !== "suspended").length;
  const suspendedUsers = users.filter(u => u.status === "suspended").length;
  const frozenParcels = parcels.filter(p => p.frozen).length;
  const openAlerts = alerts.filter(a => a.status === "open").length;

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role || "general_user"] = (acc[u.role || "general_user"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide governance and oversight</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 border border-purple-200">
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">Super Admin</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={users.length} icon={Users} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Total Parcels" value={parcels.length} icon={Map} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard title="Frozen Parcels" value={frozenParcels} icon={AlertOctagon} color="text-orange-600" bgColor="bg-orange-50" />
        <StatCard title="Open Fraud Alerts" value={openAlerts} icon={AlertTriangle} color="text-red-600" bgColor="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: "super_admin", label: "Super Admins", color: "bg-purple-500" },
              { key: "compliance_officer", label: "Compliance Officers", color: "bg-indigo-500" },
              { key: "surveyor_general", label: "Surveyor Generals", color: "bg-blue-500" },
              { key: "surveyor", label: "Surveyors", color: "bg-emerald-500" },
              { key: "field_agent", label: "Field Agents", color: "bg-orange-500" },
              { key: "general_user", label: "General Users", color: "bg-gray-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-semibold">{roleCounts[key] || 0}</span>
              </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-red-500">Suspended</span>
              <span className="text-xs font-semibold text-red-500">{suspendedUsers}</span>
            </div>
          </CardContent>
        </Card>

        {/* Parcel status overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-500" />
              Parcel Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["pending", "approved", "rejected", "disputed", "transferred"].map((s) => {
              const count = parcels.filter(p => p.status === s).length;
              return (
                <div key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-xs font-semibold">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-orange-500 font-medium">🔒 Frozen</span>
              <span className="text-xs font-semibold text-orange-500">{frozenParcels}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent audit activity */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Link to="/governance/audit" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            ) : logs.slice(0, 5).map((log) => (
              <div key={log.id} className="text-xs border-b border-border pb-2 last:border-0">
                <p className="font-medium text-foreground truncate">{log.action}</p>
                <p className="text-muted-foreground">{log.user_name || log.user_email} · {format(new Date(log.created_date), "MMM d, h:mm a")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "User Management", icon: Users, path: "/governance/users", color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Fraud Alerts", icon: AlertTriangle, path: "/governance/fraud-alerts", color: "text-red-600", bg: "bg-red-50" },
              { label: "Global Audit Log", icon: FileText, path: "/governance/audit", color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Platform Settings", icon: Shield, path: "/governance/settings", color: "text-gray-600", bg: "bg-gray-50" },
            ].map(({ label, icon: Icon, path, color, bg }) => (
              <Link key={path} to={path} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-all text-center">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs font-medium text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}