import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Shield, MapPin, CheckCircle, FileText, Users, TrendingUp, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function GovernmentObserverPortal() {
  const { user } = useOutletContext() || {};
  const [parcels, setParcels] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.LandVaultParcel.list("-created_date", 500),
      base44.entities.CommunityLead.list("-created_date", 500),
    ]).then(([p, l]) => { setParcels(p || []); setLeads(l || []); }).finally(() => setLoading(false));
  }, []);

  const communities = [...new Set(parcels.map(p => p.community).filter(Boolean))];
  const wards = [...new Set(parcels.map(p => p.ward).filter(Boolean))];
  const verifiedCount = parcels.filter(p => ["community_validated","fully_verified","survey_verified"].includes(p.verification_status)).length;
  const surveyed = parcels.filter(p => p.survey_status === "completed").length;
  const certIssued = parcels.filter(p => p.certificate_status === "RELEASED").length;

  const riskData = ["LOW","MEDIUM","HIGH"].map(r => ({ name: r, value: parcels.filter(p => p.risk_level === r).length }));
  const ownershipData = ["individual","family","community","trust","institutional"].map(o => ({ name: o, value: parcels.filter(p => p.ownership_type === o).length })).filter(d => d.value > 0);
  const statusData = ["draft","submitted","survey_complete","certificate_issued"].map(s => ({ name: s.replace(/_/g," "), value: parcels.filter(p => p.status === s).length }));

  const statCards = [
    { label: "Communities Covered", value: communities.length, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Parcels", value: parcels.length, icon: Shield, color: "text-green-600", bg: "bg-green-50" },
    { label: "Surveys Completed", value: surveyed, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Certificates Issued", value: certIssued, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Wards Covered", value: wards.length, icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Community Validated", value: verifiedCount, icon: Users, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Total Leads", value: leads.length, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Lead Conversion", value: `${leads.length ? Math.round(certIssued/leads.length*100) : 0}%`, icon: BarChart2, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Eye className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Government Observer Portal</h1>
          <p className="text-sm text-muted-foreground">Read-only · Aquasavannah LandVault · Ehime Mbano LGA</p>
        </div>
        <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">OBSERVER ACCESS</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array(8).fill(0).map((_,i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Parcels by Risk Level</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                      {riskData.map((_, i) => <Cell key={i} fill={["#10b981","#f59e0b","#ef4444"][i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Parcels by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Community Coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {communities.map(c => (
                  <span key={c} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {c} ({parcels.filter(p => p.community === c).length})
                  </span>
                ))}
                {communities.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}