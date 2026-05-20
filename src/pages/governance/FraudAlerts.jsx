import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Search, Plus, Lock, Unlock } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const severityColors = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function FraudAlerts() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ parcel_id: "", parcel_number: "", alert_type: "", severity: "medium", description: "" });
  const [saving, setSaving] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["fraud-alerts"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 200),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["parcels-for-fraud"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 200),
  });

  if (isLoading) return <LoadingSpinner />;

  const filtered = alerts.filter(a => {
    const matchSearch = !search || a.parcel_number?.toLowerCase().includes(search.toLowerCase()) || a.alert_type?.includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleUpdateAlert = async (newStatus) => {
    if (!selected) return;
    setSaving(true);
    const updates = {
      status: newStatus,
      investigation_notes: investigationNotes || selected.investigation_notes,
      assigned_to: user?.email,
    };
    if (newStatus === "resolved" || newStatus === "dismissed") {
      updates.resolved_by = user?.email;
      updates.resolved_date = new Date().toISOString().split("T")[0];
      updates.resolution = resolution || "pending_review";
    }
    await base44.entities.FraudAlert.update(selected.id, updates);
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: `Updated fraud alert to ${newStatus}`,
      entity_type: "FraudAlert",
      entity_id: selected.id,
      details: investigationNotes,
    });
    queryClient.invalidateQueries({ queryKey: ["fraud-alerts"] });
    setSelected(null);
    setSaving(false);
    toast.success("Alert updated");
  };

  const handleFreezeParcel = async (alert) => {
    const parcel = parcels.find(p => p.id === alert.parcel_id || p.parcel_number === alert.parcel_number);
    if (!parcel) { toast.error("Parcel not found"); return; }
    const isFrozen = parcel.frozen;
    await base44.entities.LandParcel.update(parcel.id, {
      frozen: !isFrozen,
      frozen_by: !isFrozen ? user?.email : "",
      frozen_reason: !isFrozen ? `Fraud investigation: ${alert.alert_type}` : "",
      frozen_at: !isFrozen ? new Date().toISOString() : "",
      fraud_flagged: !isFrozen,
    });
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: !isFrozen ? `Froze parcel: ${parcel.parcel_number}` : `Unfroze parcel: ${parcel.parcel_number}`,
      entity_type: "LandParcel",
      entity_id: parcel.id,
      details: `Fraud alert: ${alert.id}`,
    });
    queryClient.invalidateQueries({ queryKey: ["parcels-for-fraud"] });
    toast.success(isFrozen ? "Parcel unfrozen" : "Parcel frozen successfully");
  };

  const handleCreateAlert = async () => {
    if (!newAlert.parcel_id || !newAlert.alert_type || !newAlert.description) return;
    setSaving(true);
    await base44.entities.FraudAlert.create({
      ...newAlert,
      flagged_by: user?.email,
      flagged_by_name: user?.full_name,
      status: "open",
    });
    await base44.entities.LandParcel.update(newAlert.parcel_id, { fraud_flagged: true });
    queryClient.invalidateQueries({ queryKey: ["fraud-alerts"] });
    setCreateOpen(false);
    setNewAlert({ parcel_id: "", parcel_number: "", alert_type: "", severity: "medium", description: "" });
    setSaving(false);
    toast.success("Fraud alert created");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fraud Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">Investigate and manage suspicious activity reports</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Alert
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by parcel or type..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_investigation">Under Investigation</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No fraud alerts" description="No alerts match your current filter" />
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const parcel = parcels.find(p => p.id === alert.parcel_id || p.parcel_number === alert.parcel_number);
            return (
              <Card key={alert.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(alert); setInvestigationNotes(alert.investigation_notes || ""); setResolution(alert.resolution || ""); }}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`px-2 py-1 rounded text-[10px] font-bold border flex-shrink-0 ${severityColors[alert.severity]}`}>
                    {alert.severity?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{alert.alert_type?.replace(/_/g, " ")}</p>
                      <StatusBadge status={alert.status} />
                      {parcel?.frozen && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">🔒 Frozen</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Parcel: {alert.parcel_number} · {format(new Date(alert.created_date), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0 text-xs gap-1"
                    onClick={e => { e.stopPropagation(); handleFreezeParcel(alert); }}
                  >
                    {parcel?.frozen ? <><Unlock className="w-3 h-3" /> Unfreeze</> : <><Lock className="w-3 h-3" /> Freeze</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Investigation dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Investigate Alert</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-semibold">{selected.alert_type?.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">Parcel: {selected.parcel_number}</p>
                <p className="text-xs">{selected.description}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Investigation Notes</label>
                <Textarea className="mt-1" rows={3} value={investigationNotes} onChange={e => setInvestigationNotes(e.target.value)} placeholder="Add notes..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resolution (if closing)</label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed_fraud">Confirmed Fraud</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => handleUpdateAlert("under_investigation")} disabled={saving}>Mark Under Investigation</Button>
            <Button variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => handleUpdateAlert("resolved")} disabled={saving}>Resolve</Button>
            <Button variant="outline" className="text-gray-500" onClick={() => handleUpdateAlert("dismissed")} disabled={saving}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create alert dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Fraud Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newAlert.parcel_id} onValueChange={v => {
              const p = parcels.find(p => p.id === v);
              setNewAlert({ ...newAlert, parcel_id: v, parcel_number: p?.parcel_number || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select parcel..." /></SelectTrigger>
              <SelectContent>
                {parcels.map(p => <SelectItem key={p.id} value={p.id}>{p.parcel_number} — {p.owner_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newAlert.alert_type} onValueChange={v => setNewAlert({ ...newAlert, alert_type: v })}>
              <SelectTrigger><SelectValue placeholder="Alert type..." /></SelectTrigger>
              <SelectContent>
                {["duplicate_registration", "forged_document", "boundary_manipulation", "ownership_fraud", "suspicious_transfer", "identity_theft", "other"].map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newAlert.severity} onValueChange={v => setNewAlert({ ...newAlert, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Describe the suspicious activity..." value={newAlert.description} onChange={e => setNewAlert({ ...newAlert, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={saving || !newAlert.parcel_id || !newAlert.alert_type || !newAlert.description} onClick={handleCreateAlert}>
              {saving ? "Creating..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}