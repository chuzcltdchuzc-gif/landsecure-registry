import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, MapPin, Plus, ClipboardList, Camera, Calendar, Wifi, WifiOff, ChevronRight
} from "lucide-react";

const STATUS_COLORS = {
  NEW_LEAD: "bg-gray-100 text-gray-700",
  COMMUNITY_CONTACTED: "bg-blue-100 text-blue-700",
  FAMILY_CONTACTED: "bg-indigo-100 text-indigo-700",
  CONSENT_RECEIVED: "bg-purple-100 text-purple-700",
  SURVEY_SCHEDULED: "bg-yellow-100 text-yellow-800",
  SURVEY_IN_PROGRESS: "bg-orange-100 text-orange-700",
  SURVEY_COMPLETED: "bg-emerald-100 text-emerald-700",
  DOCUMENTATION_COMPLETE: "bg-teal-100 text-teal-700",
  CERTIFICATE_READY: "bg-green-100 text-green-700",
  CERTIFICATE_ISSUED: "bg-green-200 text-green-900",
};

export default function FieldAgentDashboard() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ["lv-leads-agent", user?.email],
    queryFn: () => base44.entities.CommunityLead.filter({ field_agent_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcels-agent", user?.email],
    queryFn: () => base44.entities.LandVaultParcel.filter({ field_agent_email: user?.email }),
    enabled: !!user?.email,
  });

  const pendingSurveys = leads.filter(l => l.status === "SURVEY_SCHEDULED").length;
  const completedSurveys = leads.filter(l => l.status === "SURVEY_COMPLETED" || l.status === "DOCUMENTATION_COMPLETE" || l.status === "CERTIFICATE_ISSUED").length;
  const recentLeads = [...leads].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  const quickActions = [
    { label: "New Lead", icon: Plus, path: "/lv/leads/new", color: "bg-emerald-500 hover:bg-emerald-600" },
    { label: "My Leads", icon: ClipboardList, path: "/lv/leads", color: "bg-blue-500 hover:bg-blue-600" },
    { label: "New Parcel", icon: MapPin, path: "/lv/parcels/new", color: "bg-violet-500 hover:bg-violet-600" },
    { label: "Evidence", icon: Camera, path: "/lv/evidence", color: "bg-orange-500 hover:bg-orange-600" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Field Operations</h1>
          <p className="text-sm text-muted-foreground">Welcome, {user?.full_name || "Agent"}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "My Leads", value: leads.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Parcels", value: parcels.length, icon: MapPin, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Pending Survey", value: pendingSurveys, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Completed", value: completedSurveys, icon: ClipboardList, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.path}>
            <button className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white font-semibold text-sm transition-all shadow-sm ${a.color}`}>
              <a.icon className="w-5 h-5" />
              {a.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Recent Leads</h2>
          <Link to="/lv/leads" className="text-xs text-primary font-medium">View All</Link>
        </div>
        <div className="space-y-2">
          {recentLeads.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No leads yet. Tap "New Lead" to get started.
              </CardContent>
            </Card>
          )}
          {recentLeads.map(lead => (
            <Link key={lead.id} to={`/lv/leads/${lead.id}`}>
              <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{lead.family_name || lead.community}</p>
                    <p className="text-xs text-muted-foreground">{lead.village}, {lead.community}</p>
                    <Badge className={`mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}>
                      {lead.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}