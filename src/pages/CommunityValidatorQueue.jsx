import React from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, CheckCircle2, Clock, MapPin, Users, Lock } from "lucide-react";
import ConsentBadge from "@/components/consent/ConsentBadge";

const ALLOWED_ROLES = ["super_admin", "surveyor_general", "compliance_officer", "community_validator"];

export default function CommunityValidatorQueue() {
  const { user } = useOutletContext();
  const qc = useQueryClient();

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["community-confirmation-queue"],
    queryFn: () => base44.entities.LandParcel.filter(
      { community_confirmation_pending: true, community_confirmed: false },
      "-created_date",
      100
    ),
  });

  const confirmMutation = useMutation({
    mutationFn: async (parcel) => {
      const existingTimeline = (() => {
        try { return JSON.parse(parcel.consent_timeline || "[]"); } catch { return []; }
      })();

      const confirmEntry = {
        event: "Community Confirmed",
        timestamp: new Date().toISOString(),
        agent_id: user?.email,
        gps: null,
        notes: `Confirmed by ${user?.full_name || user?.email}`,
      };
      const newTimeline = [...existingTimeline, confirmEntry];

      // Recalculate score with community confirmation bonus
      const baseScore = parcel.consent_strength_score || 0;
      const newScore = Math.min(baseScore + 10, 100);
      const newConfidence = newScore >= 80 ? "HIGH" : newScore >= 50 ? "MEDIUM" : "LOW";

      await base44.entities.LandParcel.update(parcel.id, {
        community_confirmed: true,
        community_confirmed_by: user?.email,
        community_confirmed_timestamp: new Date().toISOString(),
        community_confirmation_pending: false,
        consent_strength_score: newScore,
        consent_confidence: newConfidence,
        consent_timeline: JSON.stringify(newTimeline),
      });

      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user?.email,
        user_name: user?.full_name,
        action: "COMMUNITY_CONFIRMATION",
        entity_type: "LandParcel",
        entity_id: parcel.id,
        details: JSON.stringify({ parcel_number: parcel.parcel_number, new_score: newScore }),
      });
    },
    onSuccess: () => {
      toast.success("Community confirmation recorded");
      qc.invalidateQueries({ queryKey: ["community-confirmation-queue"] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!ALLOWED_ROLES.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Only community validators and administrators can access this queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Confirmation Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Parcels awaiting community validator confirmation</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 border gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" /> {parcels.length} Pending
        </Badge>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1 flex items-center gap-2"><Shield className="w-4 h-4" /> Role: Community Validator</p>
        <p>Review each parcel below. Tap <strong>"Confirm — I was present"</strong> only if you were physically present and witnessed the registration. This adds +10 to the consent score and seals your confirmation on the immutable timeline.</p>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-10">Loading queue…</p>}

      {!isLoading && parcels.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">Queue is clear</p>
          <p className="text-sm">No parcels are awaiting community confirmation.</p>
        </div>
      )}

      <div className="space-y-4">
        {parcels.map(parcel => (
          <Card key={parcel.id} className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span className="font-mono text-base">{parcel.parcel_number}</span>
                <ConsentBadge parcel={parcel} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /><span>{parcel.ward}, {parcel.community || parcel.lga}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5" /><span>{parcel.ownership_type} — {parcel.owner_name}</span></div>
                <div className="text-muted-foreground">Registered: {parcel.registration_date || new Date(parcel.created_date).toLocaleDateString("en-GB")}</div>
                {parcel.witness_name && (
                  <div className="text-muted-foreground">Witness: {parcel.witness_name} ({parcel.witness_role?.replace(/_/g, " ")})</div>
                )}
              </div>

              {/* Parcel summary only — no media shown to community_validator */}
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-slate-50 border">
                <p className="font-medium text-foreground mb-1">Consent Summary</p>
                <p>Verbal consent: {parcel.verbal_consent ? "Recorded" : "Not recorded"}</p>
                <p>Signature: {parcel.consent_signature ? "Obtained" : parcel.sign_declined ? "Declined" : "Not recorded"}</p>
                <p>Witness present: {parcel.witness_name ? `Yes — ${parcel.witness_role?.replace(/_/g, " ")}` : "No"}</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={() => confirmMutation.mutate(parcel)}
                  disabled={confirmMutation.isPending}
                  className="bg-green-700 hover:bg-green-800 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm — I was present and witnessed this registration
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}