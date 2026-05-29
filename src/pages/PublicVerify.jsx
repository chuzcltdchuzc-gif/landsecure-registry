import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Search, Shield, CheckCircle2, AlertTriangle, XCircle,
  MapPin, FileText, Lock, Eye, Clock, BarChart2
} from "lucide-react";
import {
  PROPERTY_TYPE_LABELS, STATUS_LABELS, VERIFICATION_LABELS,
  ENCUMBRANCE_LABELS, LGA_CENTER, LGA_NAME, STATE_NAME
} from "@/lib/ehimeMbanoData";

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function StatusBadgeComp({ status }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    approved_locked: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    disputed: "bg-orange-100 text-orange-800 border-orange-300",
    frozen: "bg-blue-100 text-blue-800 border-blue-300",
    transferred: "bg-purple-100 text-purple-800 border-purple-300",
    archived: "bg-gray-100 text-gray-800 border-gray-300",
  };
  const icons = {
    approved: <CheckCircle2 className="w-3 h-3" />,
    approved_locked: <Lock className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
    disputed: <AlertTriangle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    frozen: <Lock className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {icons[status]}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function VerificationBadge({ status }) {
  const colors = {
    fully_verified: "bg-green-100 text-green-800",
    survey_verified: "bg-blue-100 text-blue-800",
    field_verified: "bg-yellow-100 text-yellow-800",
    unverified: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
      {status === "fully_verified" || status === "survey_verified"
        ? <CheckCircle2 className="w-3 h-3" />
        : <Clock className="w-3 h-3" />}
      {VERIFICATION_LABELS[status] || status}
    </span>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className={`flex items-start justify-between py-3 border-b border-border last:border-0 ${highlight ? "bg-green-50 -mx-4 px-4 rounded" : ""}`}>
      <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

function ParcelMap({ parcel }) {
  let center = [LGA_CENTER.lat, LGA_CENTER.lng];
  let polygon = null;

  if (parcel.latitude && parcel.longitude) {
    center = [parcel.latitude, parcel.longitude];
  }

  if (parcel.parcel_boundary) {
    try {
      const geo = JSON.parse(parcel.parcel_boundary);
      const coords = geo?.geometry?.coordinates || geo?.coordinates;
      if (coords && coords[0]) {
        polygon = coords[0].map(([lng, lat]) => [lat, lng]);
        if (polygon.length > 0) center = polygon[0];
      }
    } catch { /* ignore */ }
  }

  return (
    <MapContainer
      center={center}
      zoom={15}
      className="w-full h-56 rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {polygon && <Polygon positions={polygon} color="#1d4ed8" fillOpacity={0.25} />}
      <Marker position={center}>
        <Popup>{parcel.parcel_number}</Popup>
      </Marker>
    </MapContainer>
  );
}

export default function PublicVerify() {
  // Auto-fill from URL param: /verify?parcel_id=IMO-EHM-UME-RES-000001
  const urlParam = new URLSearchParams(window.location.search).get("parcel_id") || "";
  const [input, setInput] = useState(urlParam);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Auto-search if parcel_id was in URL
  useEffect(() => {
    if (urlParam) handleSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    const q = input.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSearched(false);
    try {
      const res = await base44.functions.invoke("publicParcelLookup", { parcel_number: q });
      setResult(res.data);
      setSearched(true);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const parcel = result?.parcel;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Land Parcel Verification</h1>
            <p className="text-sm text-muted-foreground">{LGA_NAME}, {STATE_NAME} — Official Land Registry</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Search Box */}
        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Public Parcel Lookup</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Enter a parcel number to verify its registration status, survey status, and encumbrance.
                This is a read-only public service — no personal owner data is shown.
              </p>
            </div>

            <div className="flex gap-3 max-w-xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. IMO-EHM-UME-RES-000001"
                className="text-base font-mono h-12"
                autoFocus
              />
              <Button onClick={handleSearch} disabled={loading || !input.trim()} className="h-12 px-6 bg-green-700 hover:bg-green-800 gap-2">
                <Search className="w-4 h-4" />
                {loading ? "Searching…" : "Verify"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Format: <span className="font-mono font-semibold">STATE-LGA-WARD-TYPE-NUMBER</span> &nbsp;·&nbsp; Example: <span className="font-mono">IMO-EHM-UME-RES-000001</span>
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Not Found */}
        {searched && result && !result.found && (
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="py-10 text-center">
              <XCircle className="w-14 h-14 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-orange-900 mb-2">Parcel Not Found</h3>
              <p className="text-orange-700 text-sm">
                No registered parcel with number <span className="font-mono font-bold">{result.parcel_number}</span> was found in the {LGA_NAME} registry.
              </p>
              <p className="text-orange-600 text-xs mt-3">
                If you believe this is an error, please contact the Land Registry Office at {LGA_NAME}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Found — Public Result */}
        {parcel && (
          <div className="space-y-6">

            {/* Status Header */}
            <Card className={`border-2 ${parcel.status === "approved" || parcel.status === "approved_locked" ? "border-green-300 bg-green-50" : "border-yellow-300 bg-yellow-50"}`}>
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Parcel Number</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">{parcel.parcel_number}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <StatusBadgeComp status={parcel.status} />
                    <VerificationBadge status={parcel.verification_status} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Location & Classification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-700" /> Location & Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <InfoRow label="State" value={parcel.state || STATE_NAME} />
                  <InfoRow label="LGA" value={parcel.lga || LGA_NAME} />
                  <InfoRow label="Ward" value={parcel.ward || parcel.ward_code} />
                  <InfoRow label="Community" value={parcel.community} />
                  <InfoRow label="Property Type" value={PROPERTY_TYPE_LABELS[parcel.property_type] || parcel.property_type} />
                  <InfoRow label="Land Use" value={parcel.land_use?.replace(/_/g, " ")} />
                  <InfoRow label="Address" value={parcel.address} />
                </CardContent>
              </Card>

              {/* Registration & Ownership */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-green-700" /> Registration Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <InfoRow label="Size" value={parcel.size_sqm ? `${parcel.size_sqm.toLocaleString()} sqm` : parcel.size_hectares ? `${parcel.size_hectares} ha` : null} />
                  <InfoRow label="Ownership Type" value={parcel.ownership_label || parcel.ownership_type} />
                  <InfoRow label="Registration Date" value={parcel.registration_date || parcel.approval_date} />
                  <InfoRow label="Survey Status" value={VERIFICATION_LABELS[parcel.verification_status]} />
                  <InfoRow
                    label="Encumbrance"
                    value={ENCUMBRANCE_LABELS[parcel.encumbrance_status] || parcel.encumbrance_status}
                    highlight={parcel.encumbrance_status && parcel.encumbrance_status !== "none"}
                  />
                  <InfoRow label="GIS Validation" value={parcel.spatial_validation_status?.replace(/_/g, " ")} />
                </CardContent>
              </Card>
            </div>

            {/* GIS Map */}
            {(parcel.latitude || parcel.parcel_boundary) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-700" /> GIS Map Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ParcelMap parcel={parcel} />
                </CardContent>
              </Card>
            )}

            {/* Privacy Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Data Privacy Notice</p>
                <p className="text-xs text-blue-700">
                  This public verification service shows only non-personal registration data. Owner identity, contact details,
                  National ID, financial data, and family beneficiary information are strictly protected and not disclosed through this portal.
                  For certified copies, contact the {LGA_NAME} Land Registry Office.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards (shown before search) */}
        {!searched && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { IconComp: Shield, title: "Government Verified", desc: "All data from the official Ehime Mbano LGA land registry database." },
              { IconComp: Eye, title: "Privacy Protected", desc: "Owner personal data is never disclosed through this public portal." },
              { IconComp: CheckCircle2, title: "Instant Verification", desc: "Verify any registered parcel in seconds using its official parcel number." },
            ].map(({ IconComp, title, desc }) => (
              <div key={title} className="p-5 bg-white rounded-xl border border-border shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <IconComp className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-white mt-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {LGA_NAME}, {STATE_NAME} — Land Administration Authority
          </p>
          <p className="text-xs text-muted-foreground">For queries: Land Registry Office, Ehime Mbano LGA Secretariat</p>
        </div>
      </div>
    </div>
  );
}