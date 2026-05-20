import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Map, FileSearch, Shield, CheckCircle, Clock, AlertOctagon } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default function ComplianceDashboard({ user }) {
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["fraud-alerts-compliance"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 100),
  });
  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["all-parcels-compliance"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 100),
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["all-disputes-compliance"],
    queryFn: () => base44.entities.Dispute.list("-created_date", 50),
  });

  if (loadingAlerts || loadingParcels) return <LoadingSpinner />;

  const openAlerts = alerts.filter(a => a.status === "open").length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const frozenParcels = parcels.filter(p => p.frozen).length;
  const escalatedDisputes = disputes.filter(d => d.status === "escalated").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoring, fraud detection, and regulatory compliance</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 border border-indigo-200">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-700">Compliance Officer</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Alerts" value={openAlerts} icon={AlertTriangle} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard title="Critical Alerts" value={criticalAlerts} icon={AlertOctagon} color="text-red-600" bgColor="bg-red-50" />
        <StatCard title="Frozen Parcels" value={frozenParcels} icon={Map} color="text-orange-600" bgColor="bg-orange-50" />
        <StatCard title="Escalated Disputes" value={escalatedDisputes} icon={Clock} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent fraud alerts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Recent Fraud Alerts
            </CardTitle>
            <Link to="/governance/fraud-alerts" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No fraud alerts</p>
            ) : alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 border-b border-border pb-2 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === "critical" ? "bg-red-500" :
                  alert.severity === "high" ? "bg-orange-500" :
                  alert.severity === "medium" ? "bg-amber-400" : "bg-gray-300"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{alert.alert_type?.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-muted-foreground">Parcel: {alert.parcel_number} · {format(new Date(alert.created_date), "MMM d")}</p>
                </div>
                <StatusBadge status={alert.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick compliance actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Compliance Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Fraud Alerts", icon: AlertTriangle, path: "/governance/fraud-alerts", color: "text-red-600", bg: "bg-red-50" },
                { label: "Compliance Reports", icon: FileSearch, path: "/governance/compliance-reports", color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "All Parcels", icon: Map, path: "/lands", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Audit Trail", icon: CheckCircle, path: "/governance/audit", color: "text-purple-600", bg: "bg-purple-50" },
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

      {/* Escalated disputes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-purple-500" />
            Escalated Disputes Requiring Review
          </CardTitle>
          <Link to="/disputes" className="text-xs text-primary hover:underline">View all disputes</Link>
        </CardHeader>
        <CardContent>
          {escalatedDisputes === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No escalated disputes</p>
          ) : (
            <div className="space-y-2">
              {disputes.filter(d => d.status === "escalated").slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-xs font-medium">{d.complainant_name}</p>
                    <p className="text-[10px] text-muted-foreground">Parcel: {d.parcel_number} · {d.dispute_type?.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}