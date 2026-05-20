import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Lock, Unlock, Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ParcelFreeze() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [showLiftDialog, setShowLiftDialog] = useState(null);
  const [freezeForm, setFreezeForm] = useState({ parcel_id: "", parcel_number: "", freeze_reason: "", notes: "" });
  const [liftNotes, setLiftNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: freezes = [], isLoading } = useQuery({
    queryKey: ["parcel-freezes-page"],
    queryFn: () => base44.entities.ParcelFreeze.list("-created_date", 200),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["parcels-for-freeze"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner text="Loading freeze records..." />;

  const activeFreezes = freezes.filter(f => f.status === "active");
  const filtered = activeFreezes.filter(f =>
    !search || f.parcel_number?.includes(search) || f.parcel_id?.includes(search)
  );

  const handleFreeze = async () => {
    if (!freezeForm.parcel_id || !freezeForm.freeze_reason) return;
    setSaving(true);
    await base44.entities.ParcelFreeze.create({
      ...freezeForm,
      frozen_by: user.email,
      frozen_by_name: user.full_name,
      status: "active",
    });
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: `Froze parcel: ${freezeForm.parcel_number || freezeForm.parcel_id}`,
      entity_type: "ParcelFreeze",
      details: `Reason: ${freezeForm.freeze_reason}`,
    });
    qc.invalidateQueries({ queryKey: ["parcel-freezes-page"] });
    setShowFreezeDialog(false);
    setFreezeForm({ parcel_id: "", parcel_number: "", freeze_reason: "", notes: "" });
    setSaving(false);
    toast.success("Parcel frozen successfully");
  };

  const handleLift = async () => {
    if (!showLiftDialog) return;
    setSaving(true);
    await base44.entities.ParcelFreeze.update(showLiftDialog.id, {
      status: "lifted",
      lifted_by: user.email,
      lifted_at: new Date().toISOString(),
      lift_notes: liftNotes,
    });
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: `Lifted freeze on parcel: ${showLiftDialog.parcel_number || showLiftDialog.parcel_id}`,
      entity_type: "ParcelFreeze",
      entity_id: showLiftDialog.id,
      details: liftNotes,
    });
    qc.invalidateQueries({ queryKey: ["parcel-freezes-page"] });
    setShowLiftDialog(null);
    setLiftNotes("");
    setSaving(false);
    toast.success("Freeze lifted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" /> Parcel Freeze Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Freeze or lift parcels under investigation or legal hold</p>
        </div>
        <Button onClick={() => setShowFreezeDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Freeze Parcel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-700">{activeFreezes.length}</p>
              <p className="text-xs text-orange-600">Active Freezes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Unlock className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{freezes.filter(f => f.status === "lifted").length}</p>
              <p className="text-xs text-emerald-600">Lifted Freezes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by parcel number or ID..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Active Freezes ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.map(freeze => (
            <div key={freeze.id} className="flex items-center justify-between px-6 py-4 border-b border-border last:border-0 hover:bg-muted/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <p className="text-sm font-semibold">Parcel: {freeze.parcel_number || freeze.parcel_id}</p>
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{freeze.freeze_reason?.replace(/_/g, " ")}</p>
                {freeze.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{freeze.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Frozen by {freeze.frozen_by_name || freeze.frozen_by} · {format(new Date(freeze.created_date), "MMM d, yyyy")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowLiftDialog(freeze)}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-shrink-0 ml-4">
                <Unlock className="w-3.5 h-3.5 mr-1" /> Lift Freeze
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No active parcel freezes</p>
          )}
        </CardContent>
      </Card>

      {/* Freeze Dialog */}
      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Freeze a Parcel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={freezeForm.parcel_id} onValueChange={val => {
              const p = parcels.find(p => p.id === val);
              setFreezeForm(f => ({ ...f, parcel_id: val, parcel_number: p?.parcel_number || "" }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select parcel..." /></SelectTrigger>
              <SelectContent>
                {parcels.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.parcel_number} — {p.owner_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={freezeForm.freeze_reason} onValueChange={val => setFreezeForm(f => ({ ...f, freeze_reason: val }))}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {["fraud_investigation", "court_order", "dispute_escalation", "compliance_review", "system_recovery", "other"].map(r => (
                  <SelectItem key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Additional notes..." value={freezeForm.notes} onChange={e => setFreezeForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeDialog(false)}>Cancel</Button>
            <Button onClick={handleFreeze} disabled={!freezeForm.parcel_id || !freezeForm.freeze_reason || saving}
              className="bg-orange-600 hover:bg-orange-700">
              {saving ? "Freezing..." : "Confirm Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Dialog */}
      <Dialog open={!!showLiftDialog} onOpenChange={() => { setShowLiftDialog(null); setLiftNotes(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lift Freeze</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Lifting freeze on parcel <strong>{showLiftDialog?.parcel_number}</strong>. Please provide a reason.
          </p>
          <Textarea placeholder="Reason for lifting freeze..." value={liftNotes} onChange={e => setLiftNotes(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLiftDialog(null); setLiftNotes(""); }}>Cancel</Button>
            <Button onClick={handleLift} disabled={!liftNotes || saving}>
              {saving ? "Lifting..." : "Confirm Lift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}