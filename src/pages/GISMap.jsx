import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import { parseGeoJSON, outerRing } from "@/lib/spatialValidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useOutletContext } from "react-router-dom";
import FamilyLineageOverlay from "@/components/gis/FamilyLineageOverlay";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";

// Fix default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function GISMap() {
  const { user } = useOutletContext();
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showLineageOverlay, setShowLineageOverlay] = useState(false);

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["gis-parcels"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  const mappableParcels = parcels.filter((p) => p.latitude && p.longitude);

  // Default center (Nigeria)
  const center = mappableParcels.length > 0
    ? [mappableParcels[0].latitude, mappableParcels[0].longitude]
    : [9.082, 8.6753];

  if (isLoading) return <LoadingSpinner text="Loading map data..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GIS Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Geographic view of all registered land parcels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div style={{ height: "calc(100vh - 240px)", minHeight: "400px" }} className="relative">
              <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {parcels.map((parcel) => {
                  const geom = parseGeoJSON(parcel.parcel_boundary);
                  const ring = outerRing(geom);
                  const hasPolygon = ring.length >= 3;
                  const polygonPositions = hasPolygon ? ring.map(([lng, lat]) => [lat, lng]) : [];

                  const conflictColor = {
                    valid: "#16a34a",
                    overlap_warning: "#d97706",
                    duplicate_warning: "#ea580c",
                    invalid_geometry: "#dc2626",
                    conflict_blocked: "#dc2626",
                  }[parcel.spatial_validation_status] || "#3b82f6";

                  return (
                    <React.Fragment key={parcel.id}>
                      {hasPolygon && (
                        <Polygon
                          positions={polygonPositions}
                          pathOptions={{ color: conflictColor, fillOpacity: 0.12, weight: 2 }}
                          eventHandlers={{ click: () => setSelectedParcel(parcel) }}
                        />
                      )}
                      {parcel.latitude && parcel.longitude && (
                        <Marker
                          position={[parcel.latitude, parcel.longitude]}
                          eventHandlers={{ click: () => setSelectedParcel(parcel) }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">{parcel.parcel_number}</p>
                              <p className="text-xs">{parcel.owner_name}</p>
                              <p className="text-xs text-gray-500">{parcel.address}</p>
                              {parcel.spatial_validation_status && parcel.spatial_validation_status !== "not_validated" && (
                                <p className="text-xs font-medium mt-1" style={{ color: conflictColor }}>
                                  ⬡ {parcel.spatial_validation_status.replace(/_/g, " ")}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                    </React.Fragment>
                  );
                })}
              </MapContainer>
              {/* Family Lineage Overlay — appears when a parcel is selected and overlay is toggled */}
              {showLineageOverlay && selectedParcel && (
                <FamilyLineageOverlay
                  parcel={selectedParcel}
                  onClose={() => setShowLineageOverlay(false)}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedParcel ? "Selected Parcel" : "Parcel Info"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedParcel ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Parcel Number</p>
                    <p className="text-sm font-semibold">{selectedParcel.parcel_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="text-sm">{selectedParcel.owner_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">{selectedParcel.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <StatusBadge status={selectedParcel.status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Coordinates</p>
                    <p className="text-xs font-mono">{selectedParcel.latitude}, {selectedParcel.longitude}</p>
                  </div>
                  {selectedParcel.size_hectares && (
                    <div>
                      <p className="text-xs text-muted-foreground">Size</p>
                      <p className="text-sm">{selectedParcel.size_hectares} hectares</p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={showLineageOverlay ? "default" : "outline"}
                    className="w-full gap-1.5 mt-2"
                    onClick={() => setShowLineageOverlay(v => !v)}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    {showLineageOverlay ? "Hide" : "Show"} Family Lineage
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Click a marker to see parcel details</p>
                  <p className="text-xs text-muted-foreground mt-2">{mappableParcels.length} parcels on map</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}