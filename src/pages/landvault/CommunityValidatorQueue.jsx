/**
 * PHASE 7 — Community Validation Workflow (upgraded)
 * Now records validation_timeline and sends permanent immutable events.
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, HelpCircle, ChevronRight, Shield, Clock } from "lucide-react";
import { useOutletContext } from "react-router-dom";

const CONF_COLOR = {
  confirmed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  clarification_requested: "bg-yellow-100 text-yellow-800",
  pending: "bg-gray-100 text-gray-600",
};

export default function CommunityValidatorQueue() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();
  const [notes, setNotes] = useState({});

  const { data: pendingParcels = [], isLoading: loadingPending } = useQuery({
    queryKey: ["lv-validation-queue-pending"],
    queryFn: () => base44.entities.LandVaultParcel.filter({ community_validation_status: "pending" }),
  });

  const { data: recentParcels = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["lv-validation-queue-recent"],
    queryFn: () => base44.entities.LandVaultParcel.list("-community_validation_date", 50),
  });

  const validate = useMutation({
    mutationFn: async ({ id, status, note, currentTimeline }) => {
      // Build append-only timeline event
      let timeline = [];
      try { timeline = currentTimeline ? JSON.parse(currentTimeline) : []; } catch {}
      timeline.push({
        timestamp: new Date().toISOString(),
        action: status,
        actor_email: user?.email || "validator",
        actor_name: user?.full_name || "Community Validator",
        notes: note || "",
      });

      return base44.entities.LandVaultParcel.update(id, {
        community_validation_status: status,
        community_validator_name: user?.full_name || "Community Validator",
        community_validator_notes: note || "",
        community_validation_date: new Date().toISOString(),
        community_confirmed: status === "confirmed",
        community_confirmed_by: user?.email,
        community_confirmed_at: status === "confirmed" ? new Date().toISOString() : undefined,
        verification_status: status === "confirmed" ? "community_validated" : undefined,
        validation_timeline: JSON.stringify(timeline),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lv-validation-queue-pending"] });
      qc.invalidateQueries({ queryKey: ["lv-validation-queue-recent"] });
    },
  });

  const reviewed = recentParcels.filter(p => p.community_validation_status !== "pending");

  const ParcelCard = ({ p }) => {
    let timeline = [];
    try { timeline = p.validation_timeline ? JSON.parse(p.validation_timeline) : []; } catch {}

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-mono">{p.parcel_number || "Draft"}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.family_name || p.owner_name} · {p.community}{p.village ? `, ${p.village}` : ""}
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className="text-[10px] px-2 py-0 rounded-full bg-gray-100 text-gray-700">{p.ownership_type}</Badge>
                {p.land_use && <Badge className="text-[10px] px-2 py-0 rounded-full bg-gray-100 text-gray-700">{p.land_use}</Badge>}
                {p.consent_confidence && (
                  <Badge className={`text-[10px] px-2 py-0 rounded-full ${p.consent_confidence === "HIGH" ? "bg-emerald-100 text-emerald-700" : p.consent_confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    Consent: {p.consent_confidence}
                  </Badge>
                )}
                {p.community_validation_status !== "pending" && (
                  <Badge className={`text-[10px] px-2 py-0 rounded-full ${CONF_COLOR[p.community_validation_status]}`}>
                    {p.community_validation_status.replace(/_/g," ")}
                  </Badge>
                )}
              </div>
            </div>
            <Link to={`/lv/parcels/${p.id}`}><Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button></Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Evidence summary */}
          <div className="text-xs text-muted-foreground">
            {p.consent_verbal && <span className="mr-2">✓ Verbal consent</span>}
            {p.consent_signature_captured && <span className="mr-2">✓ Signature</span>}
            {p.consent_witness_name && <span className="mr-2">✓ Witness: {p.consent_witness_name}</span>}
          </div>

          {/* Validation form — only for pending */}
          {p.community_validation_status === "pending" && (
            <>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Validation notes (optional) — permanently recorded…"
                value={notes[p.id] || ""}
                onChange={e => setNotes(n => ({...n, [p.id]: e.target.value}))}
              />
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs"
                  disabled={validate.isPending}
                  onClick={() => validate.mutate({ id: p.id, status: "confirmed", note: notes[p.id], currentTimeline: p.validation_timeline })}>
                  <CheckCircle2 className="w-3 h-3" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled={validate.isPending}
                  onClick={() => validate.mutate({ id: p.id, status: "clarification_requested", note: notes[p.id], currentTimeline: p.validation_timeline })}>
                  <HelpCircle className="w-3 h-3" /> Clarify
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600 border-red-300 hover:bg-red-50"
                  disabled={validate.isPending}
                  onClick={() => validate.mutate({ id: p.id, status: "rejected", note: notes[p.id], currentTimeline: p.validation_timeline })}>
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </div>
            </>
          )}

          {/* Validation timeline */}
          {timeline.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />Validation Timeline
              </p>
              <div className="space-y-1.5">
                {timeline.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold">{ev.action?.replace(/_/g," ")} — {ev.actor_name}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.timestamp ? new Date(ev.timestamp).toLocaleString("en-NG") : ""}</p>
                      {ev.notes && <p className="text-[10px] text-muted-foreground">"{ev.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Validation Queue</h1>
        <p className="text-sm text-muted-foreground">Community confirmation with permanent immutable timeline</p>
      </div>

      <Card className="border border-blue-200 bg-blue-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">Every validation action is permanently recorded in an immutable timeline. You cannot edit or delete past entries.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="pending">Pending ({pendingParcels.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {loadingPending && <p className="text-center text-sm text-muted-foreground py-6">Loading…</p>}
          {!loadingPending && pendingParcels.length === 0 && (
            <Card className="border-dashed border-2"><CardContent className="py-10 text-center text-sm text-muted-foreground">No parcels awaiting validation.</CardContent></Card>
          )}
          {pendingParcels.map(p => <ParcelCard key={p.id} p={p} />)}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4 mt-4">
          {loadingRecent && <p className="text-center text-sm text-muted-foreground py-6">Loading…</p>}
          {reviewed.map(p => <ParcelCard key={p.id} p={p} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}