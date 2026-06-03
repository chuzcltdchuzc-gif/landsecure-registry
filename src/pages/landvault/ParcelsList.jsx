import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, MapPin, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const RISK_COLORS = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-red-100 text-red-700",
};

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  survey_assigned: "bg-indigo-100 text-indigo-700",
  survey_in_progress: "bg-orange-100 text-orange-700",
  survey_complete: "bg-teal-100 text-teal-700",
  documentation_complete: "bg-cyan-100 text-cyan-700",
  certificate_ready: "bg-green-100 text-green-700",
  certificate_issued: "bg-emerald-200 text-emerald-900",
};

export default function ParcelsList() {
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("ALL");

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["lv-parcels"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 200),
  });

  const filtered = parcels.filter(p => {
    const matchSearch = !search ||
      p.parcel_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.community?.toLowerCase().includes(search.toLowerCase()) ||
      p.family_name?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === "ALL" || p.risk_level === filterRisk;
    return matchSearch && matchRisk;
  });

  const stats = {
    total: parcels.length,
    low: parcels.filter(p => p.risk_level === "LOW").length,
    medium: parcels.filter(p => p.risk_level === "MEDIUM").length,
    high: parcels.filter(p => p.risk_level === "HIGH").length,
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parcel Registry</h1>
          <p className="text-sm text-muted-foreground">All documented land parcels</p>
        </div>
        <Link to="/lv/parcels/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700"><Plus className="w-4 h-4" />New Parcel</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", icon: MapPin },
          { label: "Low Risk", value: stats.low, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Medium", value: stats.medium, color: "text-yellow-600", icon: AlertTriangle },
          { label: "High Risk", value: stats.high, color: "text-red-600", icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by parcel number, community, family…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["ALL","LOW","MEDIUM","HIGH"].map(r => (
            <button key={r} onClick={() => setFilterRisk(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterRisk === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && <p className="text-center py-8 text-sm text-muted-foreground">Loading parcels…</p>}
        {!isLoading && filtered.length === 0 && (
          <Card className="border-dashed border-2"><CardContent className="py-10 text-center text-sm text-muted-foreground">No parcels found.</CardContent></Card>
        )}
        {filtered.map(p => (
          <Link key={p.id} to={`/lv/parcels/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm font-mono">{p.parcel_number || "Draft"}</p>
                  <p className="text-xs text-muted-foreground">{p.family_name || p.owner_name || "—"} · {p.community}, {p.ward}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] px-2 py-0 rounded-full ${STATUS_COLORS[p.status] || ""}`}>{p.status?.replace(/_/g," ")}</Badge>
                    <Badge className={`text-[10px] px-2 py-0 rounded-full ${RISK_COLORS[p.risk_level] || ""}`}>{p.risk_level} RISK</Badge>
                    <Badge className="text-[10px] px-2 py-0 rounded-full bg-gray-100 text-gray-600">{p.ownership_type}</Badge>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}