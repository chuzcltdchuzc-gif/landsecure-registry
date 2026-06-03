import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, HelpCircle, ChevronRight, Shield } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

export default function CommunityValidatorQueue() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();
  const [notes, setNotes] = useState({});

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["lv-validation-queue"],
    queryFn: () => base44.entities.LandVaultParcel.filter({ community_validation_status: "pending" }),
  });

  const validate = useMutation({
    mutationFn: ({ id, status, note }) => base44.entities.LandVaultParcel.update(id, {
      community_validation_status: status,
      community_validator_name: user?.full_name,
      community_validator_notes: note || "",
      community_validation_date: new Date().toISOString(),
      verification_status: status === "confirmed" ? "community_validated" : undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-validation-queue"] }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Validation Queue</h1>
        <p className="text-sm text-muted-foreground">Parcels awaiting community confirmation</p>
      </div>

      <Card className="border border-blue-200 bg-blue-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">As a community validator, you can confirm, reject, or request clarification. You cannot edit parcel records or survey data.</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{parcels.length} parcels pending validation</p>
      </div>

      {isLoading && <p className="text-center text-sm text-muted-foreground py-6">Loading…</p>}
      {!isLoading && parcels.length === 0 && (
        <Card className="border-dashed border-2"><CardContent className="py-10 text-center text-sm text-muted-foreground">No parcels awaiting validation.</CardContent></Card>
      )}

      <div className="space-y-4">
        {parcels.map(p => (
          <Card key={p.id} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-mono">{p.parcel_number || "Draft"}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.family_name || p.owner_name} · {p.community}, {p.village}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="text-[10px] px-2 py-0 rounded-full bg-gray-100 text-gray-700">{p.ownership_type}</Badge>
                    <Badge className="text-[10px] px-2 py-0 rounded-full bg-gray-100 text-gray-700">{p.land_use}</Badge>
                  </div>
                </div>
                <Link to={`/lv/parcels/${p.id}`}><Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Validation Notes</p>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Add validation notes (optional)…"
                  value={notes[p.id] || ""}
                  onChange={e => setNotes(n => ({...n, [p.id]: e.target.value}))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs"
                  onClick={() => validate.mutate({ id: p.id, status: "confirmed", note: notes[p.id] })}>
                  <CheckCircle2 className="w-3 h-3" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => validate.mutate({ id: p.id, status: "clarification_requested", note: notes[p.id] })}>
                  <HelpCircle className="w-3 h-3" /> Clarify
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => validate.mutate({ id: p.id, status: "rejected", note: notes[p.id] })}>
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}