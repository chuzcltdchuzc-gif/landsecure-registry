/**
 * PHASE 3 — Evidence Seal Panel
 * Displayed on ParcelDetail when evidence package is sealed or ready to seal.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Shield, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function EvidenceSealPanel({ parcel, onSealed }) {
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState("");

  if (!parcel) return null;

  const handleSeal = async () => {
    setSealing(true);
    setError("");
    const res = await base44.functions.invoke("lvEvidenceSeal", { parcel_id: parcel.id });
    if (res?.data?.status === "sealed" || res?.data?.status === "already_sealed") {
      if (onSealed) onSealed();
    } else {
      setError(res?.data?.error || "Seal failed.");
    }
    setSealing(false);
  };

  if (parcel.evidence_sealed) {
    return (
      <Card className="border border-emerald-300 bg-emerald-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-800">Evidence Package Sealed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Sealed {parcel.evidence_seal_timestamp ? new Date(parcel.evidence_seal_timestamp).toLocaleString("en-NG") : ""} · {parcel.evidence_count_at_seal || 0} items
              </p>
              {parcel.evidence_seal_id && (
                <p className="text-[10px] font-mono text-emerald-600 mt-1">Seal ID: {parcel.evidence_seal_id}</p>
              )}
              {parcel.evidence_seal_hash && (
                <p className="text-[10px] font-mono text-emerald-600 truncate">Hash: {parcel.evidence_seal_hash.slice(0,24)}…</p>
              )}
              <p className="text-xs text-emerald-700 mt-1 font-medium">No modification, deletion or overwrite is permitted.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-amber-200 bg-amber-50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Evidence Package Not Yet Sealed</p>
            <p className="text-xs text-amber-700 mt-0.5 mb-3">Seal this parcel's evidence to create an immutable cryptographic record. Once sealed, no evidence can be modified or deleted.</p>
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <Button size="sm" onClick={handleSeal} disabled={sealing} className="bg-amber-600 hover:bg-amber-700 gap-2 text-xs">
              {sealing ? <><Loader2 className="w-3 h-3 animate-spin" />Sealing…</> : <><Lock className="w-3 h-3" />Seal Evidence Package</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}