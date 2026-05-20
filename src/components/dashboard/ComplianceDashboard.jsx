import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ShieldCheck, AlertTriangle, Lock, FileText, Eye,
  TrendingUp, Scale, Map, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });
  const { data: disputes = [], isLoading: loadingDisputes } = useQuery({
    queryKey: ["disputes-compliance"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 200),
  });

  if (loadingAlerts || loadingFreezes || loadingParcels || loadingDisputes) {
    return <LoadingSpinner text="Loading compliance dashboard..." />;
  }

  // Key metrics
  const totalParcels = parcels.length;
  const approvedParcels = parcels.filter(p => p.status === "approved").length;
  const approvalRate = totalParcels > 0 ? Math.round((approvedParcels / totalParcels) * 100) : 0;

  const openAlerts = alerts.filter(a => a.status === "open");
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const myAlerts = alerts.filter(a => a.assigned_to === user?.email);
  const activeFreezes = freezes.filter(f => f.status === "active");

  const pendingDisputes = disputes.filter(d => d.status === "open" || d.status === "under_review");
  const escalatedDisputes = disputes.filter(d => d.status === "escalated");

  // Fraud alerts by type for bar chart
  const alertTypeData = alerts.reduce((acc, a) => {
    const label = (a.alert_type || "other").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const alertChartData = Object.entries(alertTypeData)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Dispute priority breakdown
  const disputePriorityData = ["critical", "high", "medium", "low"].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    count: disputes.filter(d => d.priority === p).length,
  })).filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Compliance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Regulatory oversight — land registrations, pending disputes, and fraud monitoring
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registrations"
          value={totalParcels}
          icon={Map}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          title="Pending Disputes"
          value={pendingDisputes.length}
          icon={Scale}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          title="Open Fraud Alerts"
          value={openAlerts.length}
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          title="Approval Rate"
          value={`${approvalRate}%`}
          icon={ShieldCheck}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Critical Alerts" value={criticalAlerts.length} icon={TrendingUp} color="text-red-700" bg="bg-red-100" />
        <StatCard title="Escalated Disputes" value={escalatedDisputes.length} icon={ClipboardList} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Active Freezes" value={activeFreezes.length} icon={Lock} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Assigned to Me" value={myAlerts.length} icon={Eye} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Fraud Alerts by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={alertChartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No fraud alerts recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Scale className="w-4 h-4" /> Disputes by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disputePriorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={disputePriorityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No disputes recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Disputes & Open Alerts lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Pending Disputes</CardTitle>
            <Link to="/disputes" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDisputes.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.complainant_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{d.dispute_type?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <StatusBadge status={d.priority} />
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
            {pendingDisputes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending disputes</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Open Fraud Alerts</CardTitle>
            <Link to="/gov/fraud-alerts" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {openAlerts.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Parcel: {a.parcel_number || a.parcel_id}</p>
                  <p className="text-xs text-muted-foreground capitalize">{a.alert_type?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <StatusBadge status={a.severity} />
                  <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_date), "MMM d")}</span>
                </div>
              </div>
            ))}
            {openAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No open fraud alerts</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registration overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Land Registration Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Pending", value: parcels.filter(p => p.status === "pending").length, color: "text-amber-600" },
              { label: "Approved", value: approvedParcels, color: "text-emerald-600" },
              { label: "Rejected", value: parcels.filter(p => p.status === "rejected").length, color: "text-red-600" },
              { label: "Disputed", value: parcels.filter(p => p.status === "disputed").length, color: "text-orange-600" },
            ].map(item => (
              <div key={item.label} className="text-center p-4 bg-muted/40 rounded-lg">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pending Approvals", path: "/gov/pending-approvals", icon: ClipboardList, color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Fraud Alerts", path: "/gov/fraud-alerts", icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-200" },
          { label: "Freeze Parcels", path: "/gov/parcel-freeze", icon: Lock, color: "bg-orange-50 text-orange-700 border-orange-200" },
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
    </div>
  );
}