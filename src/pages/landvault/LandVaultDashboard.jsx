import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, MapPin, FileText, CheckCircle, TrendingUp,
  DollarSign, AlertTriangle, Clock, Shield, Plus,
  ArrowRight, Activity
} from "lucide-react";

const fmt = (n) => (n || 0).toLocaleString();
const currency = (n) => `₦${fmt(n)}`;

export default function LandVaultDashboard() {
  const { user } = useOutletContext() || {};
  const [parcels, setParcels] = useState([]);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.LandVaultParcel.list("-created_date", 200),
      base44.entities.CommunityLead.list("-created_date", 200),
      base44.entities.LandVaultPayment.list("-created_date", 200),
    ]).then(([p, l, pay]) => {
      setParcels(p || []);
      setLeads(l || []);
      setPayments(pay || []);
    }).finally(() => setLoading(false));
  }, []);

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = parcels.reduce((s, p) => s + (p.outstanding_balance || 0), 0);
  const surveyed = parcels.filter(p => p.survey_status === "completed").length;
  const certs = parcels.filter(p => p.certificate_status === "RELEASED").length;
  const pending = leads.filter(l => !["CERTIFICATE_ISSUED", "DOCUMENTATION_COMPLETE"].includes(l.status)).length;

  const statCards = [
    { label: "Total Leads", value: fmt(leads.length), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Parcels Documented", value: fmt(parcels.length), icon: MapPin, color: "text-green-600", bg: "bg-green-50" },
    { label: "Surveys Completed", value: fmt(surveyed), icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Certificates Issued", value: fmt(certs), icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Revenue", value: currency(totalRevenue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Outstanding", value: currency(outstanding), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Pending Actions", value: fmt(pending), icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Communities", value: fmt(new Set(parcels.map(p => p.community).filter(Boolean)).size), icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  const recentLeads = leads.slice(0, 5);
  const recentParcels = parcels.slice(0, 5);

  const statusColor = {
    NEW_LEAD: "bg-gray-100 text-gray-700",
    COMMUNITY_CONTACTED: "bg-blue-100 text-blue-700",
    FAMILY_CONTACTED: "bg-indigo-100 text-indigo-700",
    CONSENT_RECEIVED: "bg-yellow-100 text-yellow-700",
    SURVEY_SCHEDULED: "bg-orange-100 text-orange-700",
    SURVEY_IN_PROGRESS: "bg-amber-100 text-amber-700",
    SURVEY_COMPLETED: "bg-emerald-100 text-emerald-700",
    DOCUMENTATION_COMPLETE: "bg-green-100 text-green-700",
    CERTIFICATE_READY: "bg-purple-100 text-purple-700",
    CERTIFICATE_ISSUED: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">LandVault Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Protecting Family Land for Generations · Ehime Mbano LGA</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/landvault/leads/new"><Plus className="w-4 h-4 mr-1" />New Lead</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/landvault/leads">View All <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No leads yet</p>}
            {recentLeads.map(l => (
              <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium">{l.family_name || l.community}</p>
                  <p className="text-xs text-muted-foreground">{l.community} · {l.village}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColor[l.status] || "bg-gray-100 text-gray-600"}`}>
                  {(l.status || "").replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Parcels</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/landvault/parcels">View All <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentParcels.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No parcels yet</p>}
            {recentParcels.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium font-mono">{p.parcel_number || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.community} · {p.ownership_type}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.risk_level === "LOW" ? "bg-green-100 text-green-700" :
                    p.risk_level === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{p.risk_level || "HIGH"}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}