import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Search, CheckCircle2, AlertTriangle, XCircle, MapPin, Loader2, QrCode } from "lucide-react";

const CERT_STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-700", icon: AlertTriangle },
  HELD: { label: "Certificate Held", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  ACTIVE: { label: "Active", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  RELEASED: { label: "Released", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const VERIFY_STATUS_CONFIG = {
  unverified: { label: "Not Yet Verified", color: "bg-red-100 text-red-700", icon: XCircle },
  field_verified: { label: "Field Verified", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  survey_verified: { label: "Survey Verified", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  community_validated: { label: "Community Validated", color: "bg-teal-100 text-teal-700", icon: CheckCircle2 },
  fully_verified: { label: "Fully Verified", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

export default function LandVaultPublicVerify() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Check for QR param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    if (p) { setQuery(p); handleSearch(p); }
  }, []);

  const handleSearch = async (overrideQuery) => {
    const q = (overrideQuery || query).trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const parcels = await base44.asServiceRole?.entities?.LandVaultParcel?.filter({ parcel_number: q })
        .catch(() => null);
      // Public endpoint — use backend function if available, else do limited lookup
      const res = await base44.functions.invoke("publicParcelLookup", { parcel_number: q }).catch(() => null);
      if (res?.data?.found) {
        setResult({ found: true, parcel: res.data.parcel });
      } else {
        setResult({ found: false });
      }
    } catch {
      setError("Verification service unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const parcel = result?.parcel;
  const certCfg = CERT_STATUS_CONFIG[parcel?.certificate_status] || CERT_STATUS_CONFIG.PENDING;
  const verifyCfg = VERIFY_STATUS_CONFIG[parcel?.verification_status] || VERIFY_STATUS_CONFIG.unverified;
  const CertIcon = certCfg.icon;
  const VerifyIcon = verifyCfg.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Aquasavannah LandVault</h1>
            <p className="text-xs text-muted-foreground">Public Parcel Verification Portal</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <QrCode className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h2 className="font-bold text-lg">Verify a Land Parcel</h2>
              <p className="text-sm text-muted-foreground">Enter a LandVault parcel number to verify its documentation status</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="ASV-EHM-WARD-000001"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="font-mono text-sm"
              />
              <Button onClick={() => handleSearch()} disabled={loading || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700 px-5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">This portal shows documentation status only. Owner names, beneficiaries, evidence files, and payment data are never publicly disclosed.</p>
          </CardContent>
        </Card>

        {/* Not Found */}
        {result?.found === false && (
          <Card className="border-0 shadow-sm border-red-200">
            <CardContent className="p-6 text-center space-y-2">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h3 className="font-semibold">Parcel Not Found</h3>
              <p className="text-sm text-muted-foreground">No LandVault record found for <span className="font-mono">{query}</span>. Please verify the parcel number and try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        {/* Result */}
        {result?.found && parcel && (
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Parcel Number</p>
                    <h2 className="font-bold text-lg font-mono">{parcel.parcel_number}</h2>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${certCfg.color}`}>
                    <CertIcon className="w-3 h-3" />{certCfg.label}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification Status */}
                <div className={`flex items-center gap-2 p-3 rounded-xl ${verifyCfg.color}`}>
                  <VerifyIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{verifyCfg.label}</span>
                </div>

                {/* Public Details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                  <DetailRow label="Community" value={parcel.community} />
                  <DetailRow label="Village" value={parcel.village} />
                  <DetailRow label="Ward" value={parcel.ward} />
                  <DetailRow label="LGA" value={parcel.lga} />
                  <DetailRow label="State" value={parcel.state} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Survey</p>
                  <DetailRow label="Survey Date" value={parcel.survey_date} />
                  <DetailRow label="Surveyor Licence" value={parcel.surveyor_licence} />
                  <DetailRow label="Land Use" value={parcel.land_use?.replace(/_/g," ")} />
                  <DetailRow label="Ownership Type" value={parcel.ownership_type} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentation</p>
                  <DetailRow label="Registered" value={parcel.created_date ? new Date(parcel.created_date).toLocaleDateString("en-NG") : null} />
                  <DetailRow label="Community Validated" value={parcel.community_confirmed ? "Yes" : "No"} />
                  <DetailRow label="Survey Completed" value={parcel.survey_completed ? "Yes" : "Pending"} />
                  <DetailRow label="Protected in Registry" value={parcel.protected_in_registry ? "Yes" : "No"} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 bg-amber-50">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-semibold text-amber-800">Important Notice</p>
                <p className="text-xs text-amber-700">This record is issued by Aquasavannah LandVault, a private land documentation platform. It is not a government Certificate of Occupancy or statutory title document. It documents family land evidence and survey information for protection and verification purposes.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Ehime Mbano LGA, Imo State, Nigeria</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Aquasavannah LandVault — Protecting Family Land for Generations</p>
        </div>
      </div>
    </div>
  );
}