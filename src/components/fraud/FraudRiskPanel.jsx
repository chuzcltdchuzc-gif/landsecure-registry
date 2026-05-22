import React, { useMemo } from "react";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RISK_COLORS = {
  none: "bg-gray-100 text-gray-600 border-gray-200",
  low: "bg-yellow-100 text-yellow-700 border-yellow-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

/**
 * FraudRiskPanel — client-side automated fraud risk scoring.
 * Props:
 *   parcel: LandParcel record
 *   allParcels: full list of LandParcel records for cross-checks
 *   allAlerts: existing FraudAlert records
 *   ownershipHistory: OwnershipHistory records
 *   disputes: Dispute records
 */
export default function FraudRiskPanel({ parcel, allParcels = [], allAlerts = [], ownershipHistory = [], disputes = [] }) {
  const { score, level, reasons } = useMemo(() => {
    const reasons = [];
    let score = 0;

    // HIGH RISK checks
    // 1. Duplicate parcel number
    const dupNumber = allParcels.filter(p => p.id !== parcel.id && p.parcel_number === parcel.parcel_number);
    if (dupNumber.length > 0) {
      reasons.push({ severity: "high", text: `Duplicate parcel number found (${dupNumber.length} other record${dupNumber.length > 1 ? "s" : ""})` });
      score += 40;
    }

    // 2. Same owner with nearby coordinates (possible duplicate ownership claim)
    const dupOwner = allParcels.filter(p =>
      p.id !== parcel.id &&
      p.owner_name?.toLowerCase() === parcel.owner_name?.toLowerCase() &&
      p.latitude && parcel.latitude &&
      Math.abs(p.latitude - parcel.latitude) < 0.01 &&
      Math.abs(p.longitude - parcel.longitude) < 0.01
    );
    if (dupOwner.length > 0) {
      reasons.push({ severity: "high", text: `Same owner with nearby parcel coordinates (possible duplicate claim)` });
      score += 35;
    }

    // 3. Duplicate survey plan URL
    if (parcel.survey_plan_url) {
      const dupSurvey = allParcels.filter(p => p.id !== parcel.id && p.survey_plan_url === parcel.survey_plan_url);
      if (dupSurvey.length > 0) {
        reasons.push({ severity: "high", text: `Survey plan document shared with another parcel record` });
        score += 30;
      }
    }

    // 4. Existing fraud alert
    const existingAlerts = allAlerts.filter(a => a.parcel_id === parcel.id && a.status !== "dismissed");
    if (existingAlerts.length > 0) {
      const criticalAlerts = existingAlerts.filter(a => a.severity === "critical" || a.severity === "high");
      if (criticalAlerts.length > 0) {
        reasons.push({ severity: "high", text: `${criticalAlerts.length} active high/critical fraud alert${criticalAlerts.length > 1 ? "s" : ""} on this parcel` });
        score += 35;
      } else {
        reasons.push({ severity: "medium", text: `${existingAlerts.length} open fraud alert${existingAlerts.length > 1 ? "s" : ""} on this parcel` });
        score += 20;
      }
    }

    // MEDIUM RISK checks
    // 5. Multiple ownership transfers
    const transfers = ownershipHistory.filter(o => o.parcel_id === parcel.id);
    if (transfers.length >= 3) {
      reasons.push({ severity: "medium", text: `${transfers.length} ownership transfers recorded (unusual frequency)` });
      score += 15;
    }

    // 6. Multiple disputes
    const parcelDisputes = disputes.filter(d => d.parcel_id === parcel.id);
    if (parcelDisputes.length >= 2) {
      reasons.push({ severity: "medium", text: `${parcelDisputes.length} disputes filed against this parcel` });
      score += 15;
    }

    // 7. Spatial conflict
    if (parcel.spatial_validation_status === "overlap_warning" || parcel.spatial_validation_status === "duplicate_warning") {
      reasons.push({ severity: "medium", text: `Spatial conflict: ${parcel.spatial_validation_status.replace(/_/g, " ")}` });
      score += 20;
    }

    // LOW RISK checks
    // 8. Missing metadata
    const missingFields = [];
    if (!parcel.latitude || !parcel.longitude) missingFields.push("GPS coordinates");
    if (!parcel.survey_plan_url) missingFields.push("survey plan");
    if (!parcel.size_hectares) missingFields.push("parcel size");
    if (missingFields.length >= 2) {
      reasons.push({ severity: "low", text: `Missing: ${missingFields.join(", ")}` });
      score += 5;
    }

    // 9. Unverified with no photos
    if (parcel.verification_status === "unverified" && (!parcel.photos || parcel.photos.length === 0)) {
      reasons.push({ severity: "low", text: "Unverified parcel with no photos submitted" });
      score += 5;
    }

    score = Math.min(score, 100);
    const level = score >= 60 ? "high" : score >= 30 ? "medium" : score >= 10 ? "low" : "none";

    return { score, level, reasons };
  }, [parcel, allParcels, allAlerts, ownershipHistory, disputes]);

  if (level === "none" && reasons.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">No fraud risk indicators detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${level === "high" ? "border-red-300 bg-red-50/30" : level === "medium" ? "border-orange-200 bg-orange-50/20" : "border-yellow-200 bg-yellow-50/20"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${level === "high" ? "text-red-600" : level === "medium" ? "text-orange-600" : "text-yellow-600"}`} />
          Fraud Risk Analysis
          <Badge className={`${RISK_COLORS[level]} ml-auto text-[10px]`}>
            Score: {score}/100 — {level.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {reasons.map((r, i) => (
          <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded-md ${
            r.severity === "high" ? "bg-red-100 text-red-800" :
            r.severity === "medium" ? "bg-orange-100 text-orange-800" :
            "bg-yellow-100 text-yellow-800"
          }`}>
            <TrendingUp className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>{r.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}