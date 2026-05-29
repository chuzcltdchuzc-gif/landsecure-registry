import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, MapPin, FileText, Shield, Plus, ExternalLink, Eye
} from "lucide-react";
import {
  PROPERTY_TYPE_LABELS, STATUS_LABELS, VERIFICATION_LABELS,
  WARDS, PROPERTY_TYPES, LGA_NAME, STATE_NAME
} from "@/lib/ehimeMbanoData";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  approved_locked: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  disputed: "bg-orange-100 text-orange-800",
  frozen: "bg-blue-100 text-blue-800",
  transferred: "bg-purple-100 text-purple-800",
  archived: "bg-gray-100 text-gray-700",
};

const VERIF_COLORS = {
  fully_verified: "bg-green-100 text-green-800",
  survey_verified: "bg-blue-100 text-blue-800",
  field_verified: "bg-yellow-100 text-yellow-800",
  unverified: "bg-gray-100 text-gray-600",
};

const ALLOWED_ROLES = ["super_admin", "surveyor_general", "compliance_officer", "surveyor", "field_agent"];

export default function EhimeParcels() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["ehime-parcels"],
    queryFn: () => base44.entities.LandParcel.filter({ tenant_id: "EHM-001" }, "-created_date", 500),
    staleTime: 60_000,
  });

  const filtered = parcels.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.parcel_number?.toLowerCase().includes(q) || p.community?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q);
    const matchWard = wardFilter === "all" || p.ward_code === wardFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchType = typeFilter === "all" || p.property_type === typeFilter;
    return matchSearch && matchWard && matchStatus && matchType;
  });

  const canCreate = ["super_admin", "surveyor_general", "compliance_officer", "surveyor"].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Land Parcel Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">{LGA_NAME} · {STATE_NAME} — {parcels.length} parcels registered</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => navigate("/ehime/register")} className="gap-2 bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4" /> Register Parcel
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Parcels", value: parcels.length, color: "text-foreground" },
          { label: "Approved", value: parcels.filter(p => p.status === "approved" || p.status === "approved_locked").length, color: "text-green-700" },
          { label: "Pending", value: parcels.filter(p => p.status === "pending").length, color: "text-yellow-700" },
          { label: "Disputed", value: parcels.filter(p => p.status === "disputed").length, color: "text-red-700" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search parcel number, community..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={wardFilter} onValueChange={setWardFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ward" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {WARDS.map(w => <SelectItem key={w.code} value={w.code}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROPERTY_TYPES.map(pt => <SelectItem key={pt.code} value={pt.code}>{pt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading parcels…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No parcels found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(parcel => (
            <Card key={parcel.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-foreground">{parcel.parcel_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[parcel.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[parcel.status] || parcel.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${VERIF_COLORS[parcel.verification_status] || "bg-gray-100"}`}>
                        {VERIFICATION_LABELS[parcel.verification_status]}
                      </span>
                      {parcel.property_type && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          {PROPERTY_TYPE_LABELS[parcel.property_type] || parcel.property_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {parcel.ward && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{parcel.ward}</span>}
                      {parcel.community && <span>{parcel.community}</span>}
                      {parcel.size_sqm && <span>{parcel.size_sqm.toLocaleString()} sqm</span>}
                      {parcel.registration_date && <span>Reg: {parcel.registration_date}</span>}
                    </div>
                    {/* Owner info — only shown to authorised staff */}
                    {ALLOWED_ROLES.includes(user?.role) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {parcel.owner_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => window.open(`/verify?parcel_id=${parcel.parcel_number}`, "_blank")}
                      className="gap-1 text-xs"
                    >
                      <ExternalLink className="w-3 h-3" /> Public View
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => navigate(`/ehime/parcel/${parcel.id}`)}
                      className="gap-1 text-xs"
                    >
                      <Eye className="w-3 h-3" /> Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}