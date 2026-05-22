/**
 * Priority 1 — Parcel Polygon Editor
 * Polygon drawing, editing, visualization with area/perimeter calculation.
 * Uses react-leaflet. Drawing done via click-to-add-vertex approach (no external draw plugin needed).
 */
import React, { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, CheckCircle, XCircle, MapPin, AlertTriangle } from "lucide-react";
import {
  polygonAreaSqm,
  polygonPerimeterMeters,
  hasSelfIntersection,
  validateParcel,
  parseGeoJSON,
  outerRing,
} from "@/lib/spatialValidation";
import { toast } from "sonner";

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/** Captures map clicks to add vertices */
function DrawingHandler({ drawing, onAddVertex }) {
  useMapEvents({
    click(e) {
      if (!drawing) return;
      onAddVertex([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

/**
 * @param {string|null} value - current GeoJSON string
 * @param {function} onChange - called with (geojsonStr, areaSqm, perimeterM)
 * @param {Array} allParcels - for conflict detection
 * @param {object} parcel - current parcel (id, parcel_number)
 * @param {boolean} readOnly
 */
export default function ParcelPolygonEditor({ value, onChange, allParcels = [], parcel = {}, readOnly = false }) {
  const [drawing, setDrawing] = useState(false);
  const [vertices, setVertices] = useState([]); // [[lng, lat], ...]
  const [validation, setValidation] = useState(null);

  // Load existing polygon
  useEffect(() => {
    if (value) {
      const geom = parseGeoJSON(value);
      const ring = outerRing(geom);
      if (ring.length >= 3) {
        // Close ring: last coord = first coord in GeoJSON, strip it for editing
        setVertices(ring[ring.length - 1][0] === ring[0][0] ? ring.slice(0, -1) : ring);
      }
    }
  }, []);

  const startDrawing = () => {
    setVertices([]);
    setDrawing(true);
    setValidation(null);
    toast.info("Click on the map to add polygon vertices. Click 'Finish' when done.");
  };

  const addVertex = useCallback((lngLat) => {
    setVertices((prev) => [...prev, lngLat]);
  }, []);

  const removeLastVertex = () => setVertices((v) => v.slice(0, -1));

  const finishDrawing = () => {
    if (vertices.length < 3) {
      toast.error("A polygon needs at least 3 points");
      return;
    }
    setDrawing(false);
    // Close ring
    const closedRing = [...vertices, vertices[0]];
    const geojson = { type: "Polygon", coordinates: [closedRing] };
    const geojsonStr = JSON.stringify(geojson);
    const areaSqm = polygonAreaSqm(closedRing);
    const perimeterM = polygonPerimeterMeters(closedRing);

    // Validate
    const mockParcel = { ...parcel, parcel_boundary: geojsonStr };
    const result = validateParcel(mockParcel, allParcels);
    setValidation({ ...result, areaSqm, perimeterM });

    if (result.status === "conflict_blocked" || result.status === "invalid_geometry") {
      toast.error("Spatial validation failed — see issues below");
    } else if (result.status === "overlap_warning" || result.status === "duplicate_warning") {
      toast.warning("Polygon saved with spatial warnings");
    } else {
      toast.success(`Polygon saved — ${(areaSqm / 10000).toFixed(4)} ha, ${perimeterM.toFixed(0)} m perimeter`);
    }

    onChange(geojsonStr, areaSqm, perimeterM, result.status, result.issues);
  };

  const clearPolygon = () => {
    setVertices([]);
    setValidation(null);
    onChange(null, null, null, "not_validated", []);
    toast.info("Polygon cleared");
  };

  // Map center: first vertex or Nigeria default
  const center = vertices.length > 0
    ? [vertices[0][1], vertices[0][0]]
    : [9.082, 8.6753];

  const leafletPositions = vertices.map(([lng, lat]) => [lat, lng]);

  const statusColor = {
    valid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    overlap_warning: "bg-amber-100 text-amber-700 border-amber-200",
    duplicate_warning: "bg-orange-100 text-orange-700 border-orange-200",
    invalid_geometry: "bg-red-100 text-red-700 border-red-200",
    conflict_blocked: "bg-red-100 text-red-700 border-red-200",
    not_validated: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center">
          {!drawing ? (
            <Button type="button" size="sm" variant="outline" onClick={startDrawing} className="gap-2">
              <Pencil className="w-3.5 h-3.5" /> {vertices.length > 0 ? "Redraw Polygon" : "Draw Polygon"}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" onClick={finishDrawing} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-3.5 h-3.5" /> Finish ({vertices.length} pts)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={removeLastVertex} disabled={vertices.length === 0}>
                Undo Last
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setDrawing(false); setVertices([]); }}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            </>
          )}
          {vertices.length > 0 && !drawing && (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={clearPolygon}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
          {drawing && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Click map to add vertices
            </span>
          )}
        </div>
      )}

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: "320px" }}>
        <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawingHandler drawing={drawing} onAddVertex={addVertex} />

          {/* Completed or in-progress polygon */}
          {leafletPositions.length >= 3 && (
            <Polygon
              positions={leafletPositions}
              pathOptions={{
                color: validation?.status === "valid" ? "#16a34a"
                  : validation?.status?.includes("warning") ? "#d97706"
                  : validation?.status === "conflict_blocked" || validation?.status === "invalid_geometry" ? "#dc2626"
                  : "#3b82f6",
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          )}

          {/* Vertex markers while drawing */}
          {drawing && leafletPositions.map((pos, i) => (
            <Marker key={i} position={pos}>
              <Popup>Vertex {i + 1}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Calculated metrics */}
      {validation && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={statusColor[validation.status] || statusColor.not_validated}>
              {validation.status?.replace(/_/g, " ")}
            </Badge>
            {validation.areaSqm > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Area: {(validation.areaSqm / 10000).toFixed(4)} ha
              </Badge>
            )}
            {validation.perimeterM > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                Perimeter: {validation.perimeterM.toFixed(0)} m
              </Badge>
            )}
          </div>

          {validation.issues?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-3 space-y-1">
                {validation.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                    {issue}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {vertices.length > 0 && !validation && (
        <p className="text-xs text-muted-foreground">
          {vertices.length} vertices defined. {drawing ? "Continue clicking to add more points." : "Click 'Redraw Polygon' to modify."}
        </p>
      )}
    </div>
  );
}