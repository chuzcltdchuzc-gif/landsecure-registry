import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Shield, CheckCircle, XCircle, HelpCircle, Eye } from "lucide-react";

export default function CommunityValidatorPortal() {
  const { user } = useOutletContext() || {};
  const { toast } = useToast();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null); // 'confirm' | 'reject' | 'clarify'
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.LandVaultParcel.filter({ community_validation_status: "pending" }).then(r => setParcels(r || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAction = async () => {
    if (!action || !selected) return;
    setSaving(true);
    const statusMap = { confirm: "confirmed", reject: "rejected", clarify: "clarification_requested" };
    await base44.entities.LandVaultParcel.update(selected.id, {
      community_validation_status: statusMap[action],
      community_validator_name: user?.full_name,
      community_validator_notes: notes,
      community_validation_date: new Date().toISOString(),
      ...(action === "confirm" ? { verification_status: "community_validated" } : {}),
    });
    toast({ title: `Parcel ${action === "confirm" ? "confirmed" : action === "reject" ? "rejected" : "clarification requested"}` });
    setSelected(null);
    setAction(null);
    setNotes("");
    load();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Community Validator Portal</h1>
          <p className="text-sm text-muted-foreground">{parcels.length} parcels awaiting community validation</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[["Pending Review", parcels.length, "text-amber-600"], ["Role", user?.role?.replace(/_/g, " ") || "—", "text-purple-600"], ["Read Only", "Cannot Edit", "text-muted-foreground"]].map(([l, v, c]) => (
          <Card key={l} className="border-0 shadow-sm"><CardContent className="p-3"><p className={`font-bold text-sm ${c}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : parcels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No parcels pending community validation</div>
      ) : (
        <div className="space-y-2">
          {parcels.map(p => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold">{p.parcel_number || "Draft"}</p>
                  <p className="text-xs text-muted-foreground">{p.community} · {p.village} · {p.ward}</p>
                  <p className="text-xs text-muted-foreground">{p.family_name || p.owner_name} · {p.ownership_type}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelected(p)}>
                  <Eye className="w-4 h-4 mr-1" />Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAction(null); setNotes(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Parcel — {selected?.parcel_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg">
                {[["Community", selected.community], ["Village", selected.village], ["Ward", selected.ward],
                  ["Family", selected.family_name || selected.owner_name], ["Ownership", selected.ownership_type],
                  ["Land Use", selected.land_use], ["GPS", selected.gps_lat ? `${selected.gps_lat}, ${selected.gps_lng}` : "Not captured"],
                  ["Survey Status", selected.survey_status]].map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v || "—"}</span></div>
                ))}
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                You may only confirm, reject, or request clarification. You cannot edit parcel records.
              </p>
              <div><Label>Notes / Reason</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add validation notes..." /></div>
              <div className="grid grid-cols-3 gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setAction("confirm"); handleAction(); }} disabled={saving}>
                  <CheckCircle className="w-4 h-4 mr-1" />Confirm
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setAction("clarify"); handleAction(); }} disabled={saving}>
                  <HelpCircle className="w-4 h-4 mr-1" />Clarify
                </Button>
                <Button variant="destructive" onClick={() => { setAction("reject"); handleAction(); }} disabled={saving}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}