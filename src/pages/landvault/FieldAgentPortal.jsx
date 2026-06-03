import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Plus, ChevronRight, Wifi, WifiOff, Clock, CheckCircle, ArrowRight } from "lucide-react";

export default function FieldAgentPortal() {
  const { user } = useOutletContext() || {};
  const [leads, setLeads] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    Promise.all([
      base44.entities.CommunityLead.filter({ field_agent_email: user?.email }),
      base44.entities.LandVaultParcel.filter({ field_agent_email: user?.email }),
    ]).then(([l, p]) => { setLeads(l || []); setParcels(p || []); }).finally(() => setLoading(false));
  }, [user]);

  const workflow = [
    { step: "1", label: "Community Visit", desc: "Meet community leader", done: leads.some(l => l.status !== "NEW_LEAD"), link: "/landvault/leads" },
    { step: "2", label: "Create Lead", desc: "Capture community and family details", done: leads.length > 0, link: "/landvault/leads/new" },
    { step: "3", label: "Capture Parcel", desc: "Register parcel with GPS", done: parcels.length > 0, link: "/landvault/parcels/new" },
    { step: "4", label: "Schedule Survey", desc: "Submit for surveyor assignment", done: parcels.some(p => ["survey_assigned","survey_in_progress","survey_complete"].includes(p.status)), link: "/landvault/parcels" },
    { step: "5", label: "Upload Evidence", desc: "Consent, signatures, photos", done: false, link: "/landvault/parcels" },
  ];

  const myLeads = leads.filter(l => !["CERTIFICATE_ISSUED"].includes(l.status));
  const recentParcels = parcels.slice(0, 3);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Field Agent Portal</h1>
          <p className="text-sm text-muted-foreground">Welcome, {user?.full_name}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? "Online" : "Offline"}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[["My Leads", leads.length, "text-blue-600"], ["My Parcels", parcels.length, "text-green-600"], ["Pending", myLeads.length, "text-amber-600"]].map(([l, v, c]) => (
          <Card key={l} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-14 flex-col gap-1">
          <Link to="/landvault/leads">
            <Users className="w-5 h-5" />
            <span className="text-xs">Manage Leads</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1">
          <Link to="/landvault/parcels/new">
            <Plus className="w-5 h-5" />
            <span className="text-xs">New Parcel</span>
          </Link>
        </Button>
      </div>

      {/* Workflow guide */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Field Workflow</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {workflow.map((w) => (
            <Link key={w.step} to={w.link} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${w.done ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                {w.done ? <CheckCircle className="w-4 h-4" /> : w.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{w.label}</p>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* My recent parcels */}
      {recentParcels.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">My Recent Parcels</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/landvault/parcels">All <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentParcels.map(p => (
              <Link key={p.id} to={`/landvault/parcels/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-semibold truncate">{p.parcel_number || "Draft"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.community} · {p.family_name || p.owner_name}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${p.risk_level === "LOW" ? "bg-green-100 text-green-700" : p.risk_level === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                  {p.risk_level}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {!online && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <p className="font-semibold mb-1">You are offline</p>
          <p>Data entered will sync automatically when connectivity returns.</p>
        </div>
      )}
    </div>
  );
}