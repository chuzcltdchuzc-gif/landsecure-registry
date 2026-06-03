import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, ChevronRight, Shield, QrCode } from "lucide-react";

const riskBadge = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

const statusBadge = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  survey_assigned: "bg-indigo-100 text-indigo-700",
  survey_in_progress: "bg-amber-100 text-amber-700",
  survey_complete: "bg-emerald-100 text-emerald-700",
  documentation_complete: "bg-green-100 text-green-700",
  certificate_ready: "bg-purple-100 text-purple-700",
  certificate_issued: "bg-teal-100 text-teal-700",
  disputed: "bg-red-100 text-red-700",
};

export default function ParcelRegistry() {
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterOwnership, setFilterOwnership] = useState("all");

  useEffect(() => {
    base44.entities.LandVaultParcel.list("-created_date", 300).then(r => setParcels(r || [])).finally(() => setLoading(false));
  }, []);

  const filtered = parcels.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || (p.parcel_number || "").toLowerCase().includes(q) || (p.community || "").toLowerCase().includes(q) || (p.family_name || "").toLowerCase().includes(q) || (p.ward || "").toLowerCase().includes(q);
    const matchS = filterStatus === "all" || p.status === filterStatus;
    const matchR = filterRisk === "all" || p.risk_level === filterRisk;
    const matchO = filterOwnership === "all" || p.ownership_type === filterOwnership;
    return matchQ && matchS && matchR && matchO;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Parcel Registry</h1>
          <p className="text-sm text-muted-foreground">{parcels.length} parcels documented</p>
        </div>
        <Button asChild size="sm">
          <Link to="/landvault/parcels/new"><Plus className="w-4 h-4 mr-1" />New Parcel</Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total", val: parcels.length },
          { label: "Survey Done", val: parcels.filter(p => p.survey_status === "completed").length },
          { label: "Certs Issued", val: parcels.filter(p => p.certificate_status === "RELEASED").length },
          { label: "Low Risk", val: parcels.filter(p => p.risk_level === "LOW").length },
          { label: "Med Risk", val: parcels.filter(p => p.risk_level === "MEDIUM").length },
          { label: "High Risk", val: parcels.filter(p => p.risk_level === "HIGH").length },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{s.val}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search parcel, community, family..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["draft","submitted","survey_assigned","survey_in_progress","survey_complete","documentation_complete","certificate_ready","certificate_issued"].map(s =>
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="LOW">Low Risk</SelectItem>
            <SelectItem value="MEDIUM">Medium Risk</SelectItem>
            <SelectItem value="HIGH">High Risk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOwnership} onValueChange={setFilterOwnership}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ownership" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ownership</SelectItem>
            {["individual","family","community","trust","institutional"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No parcels found</div>}
          {filtered.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/landvault/parcels/${p.id}`)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-sm font-semibold">{p.parcel_number || "Draft"}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {(p.status || "").replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskBadge[p.risk_level] || "bg-gray-100 text-gray-600"}`}>
                      {p.risk_level || "HIGH"} RISK
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.community} · {p.village} · {p.ward} · {p.ownership_type}</p>
                  <p className="text-xs text-muted-foreground">{p.family_name || p.owner_name} · {p.land_use}</p>
                </div>
                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="text-xs font-semibold">{p.certificate_status}</p>
                  <p className="text-xs text-muted-foreground">₦{(p.outstanding_balance || 0).toLocaleString()} due</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}