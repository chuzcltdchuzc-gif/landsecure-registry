import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, Map, ShieldAlert, BarChart3, Lock, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SuperAdminDashboard({ user }) {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["all-parcels-admin"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });
  const { data: freezes = [] } = useQuery({
    queryKey: ["parcel-freezes-admin"],
    queryFn: () => base44.entities.ParcelFreeze.list("-created_date", 100),
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["fraud-alerts-admin"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 100),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["audit-logs-admin"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 50),
  });

  if (loadingUsers || loadingParcels) return <LoadingSpinner text="Loading governance dashboard..." />;

  const roleBreakdown = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  const roleChartData = Object.entries(roleBreakdown).map(([role, count]) => ({
    name: role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    count,
  }));

  const parcelStatusData = ["pending", "approved", "rejected", "disputed"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: parcels.filter(p => p.status === s).length,
  }));

  const suspendedUsers = users.filter(u => u.account_status === "suspended").length;
  const activeFreezes = freezes.filter(f => f.status === "active").length;
  const openAlerts = alerts.filter(a => a.status === "open" || a.status === "under_investigation").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          Super Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Global platform oversight and governance controls</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={users.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Total Parcels" value={parcels.length} icon={Map} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Active Freezes" value={activeFreezes} icon={Lock} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Open Fraud Alerts" value={openAlerts} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Suspended Accounts" value={suspendedUsers} icon={Users} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Pending Parcels" value={parcels.filter(p => p.status === "pending").length} icon={Activity} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Approved Parcels" value={parcels.filter(p => p.status === "approved").length} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Disputed Parcels" value={parcels.filter(p => p.status === "disputed").length} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Users by Role</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roleChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Map className="w-4 h-4" /> Parcel Status Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={parcelStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                  {parcelStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Manage Users", path: "/gov/user-management", icon: Users, color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Freeze Parcels", path: "/gov/parcel-freeze", icon: Lock, color: "bg-orange-50 text-orange-700 border-orange-200" },
          { label: "Fraud Alerts", path: "/gov/fraud-alerts", icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-200" },
          { label: "Global Audit", path: "/gov/global-audit", icon: Activity, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent System Activity</CardTitle>
          <Link to="/gov/global-audit" className="text-xs text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.slice(0, 6).map(log => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.user_name || log.user_email}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_date), "MMM d, h:mm a")}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}