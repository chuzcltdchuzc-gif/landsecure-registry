import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Users, Building2, Scale } from "lucide-react";

const ROLE_LABELS = {
  FAMILY_HEAD: "Family Head", KINDRED_HEAD: "Kindred Head", VILLAGE_CHAIRMAN: "Village Chairman",
  TRADITIONAL_RULER: "Traditional Ruler", COMMUNITY_DEVELOPMENT_UNION: "CDU",
  LAND_COMMITTEE_MEMBER: "Land Committee", RELIGIOUS_LEADER: "Religious Leader",
  SURVEYOR_WITNESS: "Surveyor Witness", COMMUNITY_WITNESS: "Community Witness",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLARIFICATION_REQUIRED: "bg-blue-100 text-blue-700",
};

export default function CommunityAttestationPanel({ parcelId }) {
  const { data: attestations = [] } = useQuery({
    queryKey: ["parcel-attestations", parcelId],
    queryFn: () => base44.entities.CommunityAttestation.filter({ parcel_id: parcelId }),
    enabled: !!parcelId,
  });

  if (!parcelId) return null;

  const supporting = attestations.filter(a => a.consensus_contribution === "SUPPORTING");
  const neutral = attestations.filter(a => a.consensus_contribution === "NEUTRAL");
  const conflicting = attestations.filter(a => a.consensus_contribution === "CONFLICTING");
  const approved = attestations.filter(a => a.verification_status === "APPROVED");

  const total = attestations.length;
  const consensusPct = total > 0 ? Math.round((supporting.length / total) * 100) : 0;
  const consensusLevel = consensusPct >= 80 ? "Strong Consensus" : consensusPct >= 60 ? "Moderate Consensus" : consensusPct >= 40 ? "Weak Consensus" : "Mixed Opinions";
  const consensusColor = consensusPct >= 80 ? "bg-emerald-500" : consensusPct >= 60 ? "bg-blue-500" : consensusPct >= 40 ? "bg-yellow-500" : "bg-red-500";
  const totalImpact = approved.reduce((s, a) => s + (a.confidence_impact || 0), 0);
  const cappedImpact = Math.min(totalImpact, 15);

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Scale className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800">Attestations are evidence only. They do not determine ownership.</p>
        </CardContent>
      </Card>

      {/* Consensus Panel */}
      {total > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" />Community Consensus</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {/* Consensus Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Consensus</span>
                <span className="font-bold">{consensusPct}% — {consensusLevel}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className={`h-full rounded-l-full ${consensusColor}`} style={{ width: `${consensusPct}%` }} />
                <div className="h-full bg-gray-300" style={{ width: `${neutral.length ? Math.round((neutral.length / total) * 100) : 0}%` }} />
                <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${conflicting.length ? Math.round((conflicting.length / total) * 100) : 0}%` }} />
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${consensusColor}`} />Supporting ({supporting.length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />Neutral ({neutral.length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Conflicting ({conflicting.length})</span>
              </div>
            </div>

            {/* Confidence Impact */}
            <div className="bg-emerald-50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-700">Confidence Contribution</p>
              <p>Approved attestations contribute <span className="font-bold">+{cappedImpact} points</span> to evidence confidence (max 15).</p>
              {totalImpact > 15 && <p className="text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Actual impact capped from {totalImpact} to 15.</p>}
            </div>

            {/* Conflict Warning */}
            {conflicting.length > 0 && supporting.length > 0 && (
              <Card className="border border-red-300 bg-red-50">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-semibold">Conflicting Statements Detected</p>
                    <p>{supporting.length} supporting and {conflicting.length} conflicting attestations exist for this parcel. Manual review recommended.</p>
                    <p className="text-[10px] mt-1">All evidence is preserved. No attestation is deleted.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attestations List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Community Attestations ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No community attestations yet. Community knowledge awaits preservation.</p>
          ) : (
            <div className="space-y-2">
              {attestations.map(a => (
                <div key={a.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/30 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{a.attestor_name}</span>
                      <Badge className="text-[9px]">{ROLE_LABELS[a.attestor_role] || a.attestor_role}</Badge>
                      {a.special_badge !== "NONE" && <Badge className="text-[9px] bg-violet-100 text-violet-700">{a.special_badge?.replace(/_/g, " ")}</Badge>}
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{a.attestation_statement}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{a.created_date ? new Date(a.created_date).toLocaleDateString() : "—"}</span>
                      <span>·</span>
                      <span>{a.consensus_contribution}</span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <Badge className={`text-[9px] ${STATUS_COLORS[a.verification_status] || ""}`}>{a.verification_status}</Badge>
                    {a.verification_status === "APPROVED" && <p className="text-[10px] text-emerald-700 font-bold mt-1">+{a.confidence_impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}