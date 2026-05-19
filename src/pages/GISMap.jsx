import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useOutletContext } from "react-router-dom";

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
            <div style={{ height: "calc(100vh - 240px)", minHeight: "400px" }}>
              <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableParcels.map((parcel) => (
                  <Marker
                    key={parcel.id}
                    position={[parcel.latitude, parcel.longitude]}
                    eventHandlers={{ click: () => setSelectedParcel(parcel) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{parcel.parcel_number}</p>
                        <p className="text-xs">{parcel.owner_name}</p>
                        <p className="text-xs text-gray-500">{parcel.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
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