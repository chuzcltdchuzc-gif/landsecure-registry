import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Search, Shield, CheckCircle2, AlertTriangle, XCircle,
  MapPin, FileText, Lock, Eye, Clock, BarChart2, QrCode,
  TrendingUp, History, AlertCircle, Info
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

// ── Certificate validity config ─────────────────────────────────────────────
const CERT_VALIDITY_CONFIG = {
  VALID:           { label: "VALID",          color: "bg-green-100 text-green-800 border-green-300",  dot: "bg-green-500" },
  PENDING_RELEASE: { label: "PENDING RELEASE",color: "bg-amber-100 text-amber-800 border-amber-300",  dot: "bg-amber-500" },
  UNDER_REVIEW:    { label: "UNDER REVIEW",   color: "bg-amber-100 text-amber-800 border-amber-300",  dot: "bg-amber-500" },
  DISPUTED:        { label: "DISPUTED",       color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-500"   },
  FROZEN:          { label: "FROZEN",         color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-500"   },
  REVOKED:         { label: "REVOKED",        color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-500"   },
  SUPERSEDED:      { label: "SUPERSEDED",     color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-500"   },
};

const PARCEL_STATUS_CONFIG = {
  approved:        { label: "ACTIVE",         color: "bg-green-100 text-green-800 border-green-300"  },
  approved_locked: { label: "ACTIVE",         color: "bg-green-100 text-green-800 border-green-300"  },
  pending:         { label: "PENDING",        color: "bg-amber-100 text-amber-800 border-amber-300"  },
  disputed:        { label: "DISPUTED",       color: "bg-red-100 text-red-800 border-red-300"        },
  frozen:          { label: "FROZEN",         color: "bg-red-100 text-red-800 border-red-300"        },
  rejected:        { label: "REVOKED",        color: "bg-red-100 text-red-800 border-red-300"        },
  archived:        { label: "SUPERSEDED",     color: "bg-red-100 text-red-800 border-red-300"        },
  transferred:     { label: "TRANSFERRED",    color: "bg-purple-100 text-purple-800 border-purple-300"},
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ configMap, statusKey, fallback }) {
  const cfg = configMap[statusKey] || { label: fallback || statusKey, color: "bg-gray-100 text-gray-700 border-gray-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${cfg.color}`}>
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value, highlight, mono }) {
  return (
    <div className={`flex items-start justify-between py-2.5 border-b border-border last:border-0 ${highlight ? "bg-amber-50/60 -mx-4 px-4" : ""}`}>
      <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0 w-44">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function ParcelMap({ parcel }) {
  let center = [LGA_CENTER.lat, LGA_CENTER.lng];
  let polygon = null;
  if (parcel.latitude && parcel.longitude) center = [parcel.latitude, parcel.longitude];
  if (parcel.parcel_boundary) {
    try {
      const geo = JSON.parse(parcel.parcel_boundary);
      const coords = geo?.geometry?.coordinates || geo?.coordinates;
      if (coords?.[0]) {
        polygon = coords[0].map(([lng, lat]) => [lat, lng]);
        if (polygon.length) center = polygon[0];
      }
    } catch { /* ignore */ }
  }
  return (
    <MapContainer center={center} zoom={15} className="w-full h-56 rounded-lg z-0" scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {polygon && <Polygon positions={polygon} color="#15803d" fillOpacity={0.25} />}
      <Marker position={center}><Popup>{parcel.parcel_number}</Popup></Marker>
    </MapContainer>
  );
}

function ConfidenceScoreMeter({ score, rating }) {
  const color = score >= 95 ? "text-green-700" : score >= 70 ? "text-amber-700" : "text-red-700";
  const barColor = score >= 95 ? "bg-green-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
  const bgColor = score >= 95 ? "bg-green-50 border-green-200" : score >= 70 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-semibold text-foreground">Registry Confidence</span>
        </div>
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{rating}</p>
    </div>
  );
}

function CertValidityBanner({ parcel, isQrMode }) {
  const cfg = CERT_VALIDITY_CONFIG[parcel.certificate_validity_status] || CERT_VALIDITY_CONFIG.UNDER_REVIEW;
  const isGreen = parcel.certificate_validity_status === "VALID";
  const isRed = ["DISPUTED", "FROZEN", "REVOKED", "SUPERSEDED"].includes(parcel.certificate_validity_status);
  const bannerBg = isGreen ? "bg-green-600" : isRed ? "bg-red-600" : "bg-amber-500";

  return (
    <div className={`rounded-xl overflow-hidden border-2 ${isGreen ? "border-green-300" : isRed ? "border-red-300" : "border-amber-300"}`}>
      <div className={`${bannerBg} text-white px-5 py-3 flex items-center gap-3`}>
        {isGreen ? <CheckCircle2 className="w-5 h-5" /> : isRed ? <XCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            {isQrMode ? "Certificate Verification Result" : "✓ Verified Registry Record"}
          </p>
          <p className="text-lg font-bold">{cfg.label} CERTIFICATE</p>
        </div>
      </div>
      <div className="bg-white px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Parcel Number</span>
          <p className="font-mono font-bold text-foreground">{parcel.parcel_number}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Registry Status</span>
          <div className="mt-0.5">
            <StatusPill configMap={PARCEL_STATUS_CONFIG} statusKey={parcel.status} fallback="UNKNOWN" />
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Certificate</span>
          <div className="mt-0.5">
            <StatusPill configMap={CERT_VALIDITY_CONFIG} statusKey={parcel.certificate_validity_status} />
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Certificate Version</span>
          <p className="font-semibold">{parcel.certificate_version || "V1"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Ward</span>
          <p className="font-medium">{parcel.ward || parcel.ward_code || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Community</span>
          <p className="font-medium">{parcel.community || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Property Type</span>
          <p className="font-medium">{PROPERTY_TYPE_LABELS[parcel.property_type] || parcel.property_type || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Registered</span>
          <p className="font-medium">{parcel.registration_date || parcel.approval_date || "—"}</p>
        </div>
        {parcel.updated_date && (
          <div>
            <span className="text-muted-foreground text-xs">Last Updated</span>
            <p className="font-medium">{new Date(parcel.updated_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground text-xs">Verification Timestamp</span>
          <p className="font-mono text-xs font-medium">
            {parcel.verified_at ? new Date(parcel.verified_at).toLocaleString("en-GB") : new Date().toLocaleString("en-GB")}
          </p>
        </div>
      </div>
      {parcel.certificate_validity_status === "SUPERSEDED" && (
        <div className="bg-red-50 border-t border-red-200 px-5 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-800 font-medium">This certificate has been superseded by a newer registry version.</p>
        </div>
      )}
    </div>
  );
}

function BuyerDueDiligencePanel({ parcel }) {
  const rows = [
    {
      label: "Survey Status",
      value: parcel.survey_completed
        ? "Completed"
        : parcel.verification_status === "field_verified" ? "Field Verified" : "Pending",
      ok: parcel.survey_completed || parcel.verification_status === "survey_verified" || parcel.verification_status === "fully_verified",
    },
    {
      label: "Community Validation",
      value: parcel.community_confirmed ? "Confirmed" : "Pending",
      ok: parcel.community_confirmed,
    },
    {
      label: "Dispute Status",
      value: parcel.has_active_dispute ? "Active Dispute" : "None",
      ok: !parcel.has_active_dispute,
      warn: parcel.has_active_dispute,
    },
    {
      label: "Certificate Status",
      value: parcel.certificate_validity_label || parcel.certificate_validity_status || "—",
      ok: parcel.certificate_validity_status === "VALID",
      warn: ["PENDING_RELEASE", "UNDER_REVIEW"].includes(parcel.certificate_validity_status),
    },
    {
      label: "Ownership History",
      value: parcel.ownership_history_label || "Not Available",
      ok: parcel.ownership_history_available,
      neutral: true,
    },
    {
      label: "Encumbrance",
      value: ENCUMBRANCE_LABELS[parcel.encumbrance_status] || "None",
      ok: !parcel.encumbrance_status || parcel.encumbrance_status === "none",
      warn: parcel.encumbrance_status && parcel.encumbrance_status !== "none",
    },
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
          <BarChart2 className="w-4 h-4 text-blue-700" /> Buyer Due Diligence Summary
        </CardTitle>
        <p className="text-xs text-blue-700 mt-0.5">Read-only public confidence indicators. No personal data disclosed.</p>
      </CardHeader>
      <CardContent className="-mt-2">
        {rows.map(({ label, value, ok, warn, neutral }) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-blue-100 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground text-right">{value}</span>
              {neutral ? null : ok
                ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                : warn
                  ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  : <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OwnershipHistoryIndicator({ parcel }) {
  const count = parcel.ownership_version_count || 0;
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <History className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Ownership History</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {count > 1
            ? `Multiple Registered Ownership Events (${count} records)`
            : count === 1
              ? "Ownership record available"
              : "No historical transfers recorded"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 italic">Owner names and transfer details are not disclosed publicly.</p>
      </div>
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${count > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
        {count > 0 ? "Available" : "Not Available"}
      </span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PublicVerify() {
  const urlParam = new URLSearchParams(window.location.search).get("parcel_id") || "";
  const isQrMode = !!urlParam;

  const [input, setInput] = useState(urlParam);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlParam) handleSearch(urlParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (forceInput) => {
    const q = (forceInput || input).trim().toUpperCase();
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

  const parcel = result?.parcel;
  const verifiedAt = parcel?.verified_at ? new Date(parcel.verified_at) : new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Land Parcel Verification Portal</h1>
            <p className="text-sm text-muted-foreground">{LGA_NAME}, {STATE_NAME} — Official Government Land Registry</p>
          </div>
          {isQrMode && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              <QrCode className="w-3.5 h-3.5" /> QR Verification
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Search Box */}
        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {isQrMode ? "QR Certificate Verification" : "Public Parcel Verification"}
              </h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Enter a parcel number to verify its registration, certificate validity, and registry status.
                This is a read-only public service — no personal owner data is disclosed.
              </p>
            </div>
            <div className="flex gap-3 max-w-xl mx-auto">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. IMO-EHM-UME-RES-000001"
                className="text-base font-mono h-12"
                autoFocus={!isQrMode}
              />
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !input.trim()}
                className="h-12 px-6 bg-green-700 hover:bg-green-800 gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Format: <span className="font-mono font-semibold">STATE-LGA-WARD-TYPE-NUMBER</span>
              &nbsp;·&nbsp; Example: <span className="font-mono">IMO-EHM-UME-RES-000001</span>
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

        {/* ── RESULT SECTIONS ── */}
        {parcel && (
          <div className="space-y-6">

            {/* SECTION 1+3: Verification Result Card / QR Banner */}
            <CertValidityBanner parcel={parcel} isQrMode={isQrMode} />

            {/* SECTION 5: Registry Confidence Score */}
            <ConfidenceScoreMeter
              score={parcel.registry_confidence_score ?? 0}
              rating={parcel.registry_confidence_rating ?? "—"}
            />

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
                  {parcel.size_sqm && <InfoRow label="Size" value={`${Number(parcel.size_sqm).toLocaleString()} sqm`} />}
                </CardContent>
              </Card>

              {/* Registration Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-700" /> Registration Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <InfoRow label="Ownership Type" value={parcel.ownership_label || parcel.ownership_type} />
                  <InfoRow label="Registration Date" value={parcel.registration_date || parcel.approval_date} />
                  <InfoRow label="Survey Status" value={VERIFICATION_LABELS[parcel.verification_status]} />
                  <InfoRow
                    label="Encumbrance"
                    value={ENCUMBRANCE_LABELS[parcel.encumbrance_status] || parcel.encumbrance_status || "None"}
                    highlight={parcel.encumbrance_status && parcel.encumbrance_status !== "none"}
                  />
                  <InfoRow label="GIS Validation" value={parcel.spatial_validation_status?.replace(/_/g, " ")} />
                  {/* SECTION 8: Certificate Version */}
                  <InfoRow label="Certificate Version" value={parcel.certificate_version || "V1"} />
                </CardContent>
              </Card>
            </div>

            {/* SECTION 7: Buyer Due Diligence Panel */}
            <BuyerDueDiligencePanel parcel={parcel} />

            {/* SECTION 4: Ownership History Indicator */}
            <OwnershipHistoryIndicator parcel={parcel} />

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
                  National ID, financial data, consent records, and family beneficiary information are strictly protected
                  and never disclosed through this portal. For certified copies, contact the {LGA_NAME} Land Registry Office.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Info Cards (shown before first search) */}
        {!searched && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { IconComp: Shield,       title: "Government Verified",   desc: "All data sourced directly from the official Ehime Mbano LGA land registry database." },
              { IconComp: Eye,          title: "Privacy Protected",     desc: "Owner personal data, NIN, and financial information are never disclosed through this portal." },
              { IconComp: CheckCircle2, title: "Certificate Validity",  desc: "Instantly verify certificate status, registry confidence, and ownership history availability." },
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

      {/* SECTION 9: Public Trust Footer */}
      <div className="border-t border-border bg-white mt-10">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-foreground">Aquasavannah Land Registry Platform</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Verification generated: {verifiedAt.toLocaleString("en-GB")}
            </p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
            <p>This record is maintained within the Aquasavannah Land Registry Platform.</p>
            <p>Information displayed on this page is limited to public verification data only.</p>
            <p>Personal information of landowners is protected and never displayed publicly.</p>
            <p className="mt-2">
              © {new Date().getFullYear()} {LGA_NAME}, {STATE_NAME} — Land Administration Authority &nbsp;·&nbsp;
              For queries: Land Registry Office, Ehime Mbano LGA Secretariat
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}