/**
 * PHASE 8 — Dispute Readiness Module
 * Displays a 0-100 score and category based on evidence, consent, GPS, validation, duplicates.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Shield } from "lucide-react";

function computeDisputeReadiness(parcel, evidenceCount, openDuplicates) {
  let score = 0;
  const items = [];

  const add = (pts, label, met) => {
    if (met) { score += pts; items.push({ label, met: true, pts }); }
    else items.push({ label, met: false, pts });
  };

  add(15, "Verbal consent recorded", !!parcel.consent_verbal);
  add(15, "Consent strength ≥ 80", (parcel.consent_strength_score || 0) >= 80);
  add(10, "Signature or thumb impression", !!parcel.consent_signature_captured);
  add(10, "Witness recorded", !!parcel.consent_witness_name);
  add(15, "Community validation confirmed", parcel.community_validation_status === "confirmed");
  add(10, "Evidence items ≥ 3", evidenceCount >= 3);
  add(10, "No open duplicate alerts", openDuplicates === 0);
  add(8, "GPS confidence HIGH", parcel.gps_confidence === "HIGH");
  add(7, "GPS inside LGA", parcel.gps_inside_lga === true);
  add(10, "Representative capacity documented", !!(parcel.representative_capacity && parcel.authority_basis));

  const category = score >= 80 ? "HIGH CONFIDENCE" : score >= 50 ? "MODERATE RISK" : "LOW RISK";
  const color = score >= 80 ? "emerald" : score >= 50 ? "yellow" : "red";
  return { score, category, items, color };
}

export default function DisputeReadinessPanel({ parcel, evidenceCount = 0, openDuplicates = 0 }) {
  if (!parcel) return null;
  const { score, category, items, color } = computeDisputeReadiness(parcel, evidenceCount, openDuplicates);

  const barColor = color === "emerald" ? "bg-emerald-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500";
  const textColor = color === "emerald" ? "text-emerald-700" : color === "yellow" ? "text-yellow-700" : "text-red-700";
  const bgColor = color === "emerald" ? "bg-emerald-50 border-emerald-200" : color === "yellow" ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <Card className={`border shadow-sm ${bgColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> Dispute Readiness Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-black ${textColor}`}>{score}<span className="text-base font-normal text-muted-foreground">/100</span></div>
          <div>
            <p className={`text-xs font-bold ${textColor}`}>{category}</p>
            <p className="text-[10px] text-muted-foreground">Dispute Prevention Index</p>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.met
                ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                : <XCircle className="w-3 h-3 text-red-400 shrink-0" />
              }
              <span className={`text-xs ${item.met ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">+{item.pts}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}