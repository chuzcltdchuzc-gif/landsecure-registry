import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, MapPin, Filter, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import LandDetailModal from "../components/land/LandDetailModal";
import { useOutletContext } from "react-router-dom";

export default function LandRegistry() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [landUseFilter, setLandUseFilter] = useState("all");
  const [selectedParcel, setSelectedParcel] = useState(null);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["all-parcels-registry"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  const filtered = parcels.filter((p) => {
    const matchSearch =
      !search ||
      p.parcel_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchLandUse = landUseFilter === "all" || p.land_use === landUseFilter;
    return matchSearch && matchStatus && matchLandUse;
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Land Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and browse all land parcels</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by parcel number, owner, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={landUseFilter} onValueChange={setLandUseFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Land Use" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="agricultural">Agricultural</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="mixed_use">Mixed Use</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No parcels found" description="Try adjusting your search or filters" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((parcel) => (
            <Card key={parcel.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedParcel(parcel)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{parcel.parcel_number}</p>
                      <p className="text-[10px] text-muted-foreground">{parcel.land_use?.replace(/_/g, " ") || "N/A"}</p>
                    </div>
                  </div>
                  <StatusBadge status={parcel.status} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-foreground font-medium">{parcel.owner_name}</p>
                  <p className="text-xs text-muted-foreground">{parcel.address}</p>
                  {parcel.size_hectares && (
                    <p className="text-xs text-muted-foreground">{parcel.size_hectares} hectares</p>
                  )}
                  {parcel.state && (
                    <p className="text-xs text-muted-foreground">{parcel.state}{parcel.lga ? `, ${parcel.lga}` : ""}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <StatusBadge status={parcel.verification_status} />
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedParcel && (
        <LandDetailModal parcel={selectedParcel} onClose={() => setSelectedParcel(null)} user={user} />
      )}
    </div>
  );
}