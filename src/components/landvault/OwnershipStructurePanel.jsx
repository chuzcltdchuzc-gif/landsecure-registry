/**
 * PHASE 4+5 — Ownership Structure & Representative Authority Panel
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

const OWNERSHIP_LABELS = {
  individual: "Individual Ownership",
  family: "Family Ownership",
  joint: "Joint Ownership",
  community: "Community Ownership",
  trust: "Trust Ownership",
  corporate: "Corporate Ownership",
  government: "Government Ownership",
  institutional: "Institutional Ownership",
};

const OWNERSHIP_COLORS = {
  individual: "bg-blue-100 text-blue-700",
  family: "bg-violet-100 text-violet-700",
  joint: "bg-teal-100 text-teal-700",
  community: "bg-emerald-100 text-emerald-700",
  trust: "bg-amber-100 text-amber-700",
  corporate: "bg-gray-100 text-gray-700",
  government: "bg-red-100 text-red-700",
  institutional: "bg-indigo-100 text-indigo-700",
};

const AUTHORITY_CONFIDENCE = {
  HIGH: { color: "text-emerald-600", icon: CheckCircle2 },
  MEDIUM: { color: "text-yellow-600", icon: AlertTriangle },
  LOW: { color: "text-red-600", icon: AlertTriangle },
};

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function OwnershipStructurePanel({ parcel }) {
  if (!parcel) return null;

  const ownershipLabel = OWNERSHIP_LABELS[parcel.ownership_type] || parcel.ownership_type;
  const ownershipColor = OWNERSHIP_COLORS[parcel.ownership_type] || "bg-gray-100 text-gray-700";
  const authConf = AUTHORITY_CONFIDENCE[parcel.authority_confidence] || AUTHORITY_CONFIDENCE.MEDIUM;
  const AuthIcon = authConf.icon;

  const isFamily = ["family","community","trust","joint","institutional"].includes(parcel.ownership_type);

  return (
    <div className="space-y-3">
      {/* PHASE 4 — Ownership Structure */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" /> Ownership Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${ownershipColor}`}>
            {ownershipLabel}
          </div>
          {!isFamily ? (
            <Row label="Owner Name" value={parcel.owner_name} />
          ) : (
            <>
              <Row label="Family Name" value={parcel.family_name} />
              <Row label="Principal Representative" value={parcel.family_representative} />
              {parcel.family_secondary_representative && <Row label="Secondary Representative" value={parcel.family_secondary_representative} />}
              <Row label="Founding Ancestor" value={parcel.founder_name} />
              {parcel.inheritance_notes && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Inheritance Notes</p>
                  <p className="text-xs text-foreground">{parcel.inheritance_notes}</p>
                </div>
              )}
              {parcel.customary_ownership_notes && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Customary Tenure</p>
                  <p className="text-xs text-foreground">{parcel.customary_ownership_notes}</p>
                </div>
              )}
            </>
          )}
          <Row label="Land Use" value={parcel.land_use?.replace(/_/g," ")} />
          {parcel.ownership_confidence_score !== undefined && (
            <div className="pt-1">
              <p className="text-[10px] text-muted-foreground mb-1">Ownership Confidence</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${parcel.ownership_confidence_score || 0}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{parcel.ownership_confidence_score}/100</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PHASE 5 — Representative Authority */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Representative Authority
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {parcel.representative_name ? (
            <>
              <Row label="Representative" value={parcel.representative_name} />
              {parcel.representative_capacity && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                  {parcel.representative_capacity}
                </div>
              )}
              <Row label="Relationship to Land" value={parcel.relationship_to_land} />
              <Row label="Authority Basis" value={parcel.authority_basis} />
              <Row label="Authority Document" value={parcel.authority_document_url ? "On File" : "Not uploaded"} />
              {parcel.authority_confidence && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${authConf.color}`}>
                  <AuthIcon className="w-3.5 h-3.5" />
                  Authority Confidence: {parcel.authority_confidence}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Representative capacity not yet recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}