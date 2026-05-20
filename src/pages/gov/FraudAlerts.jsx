import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Plus, Search, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { toast } from "sonner";

const SEVERITY_COLORS = {
  low: "bg-gray-50 border-gray-200",
  medium: "bg-amber-50 border-amber-200",
  high: "bg-orange-50 border-orange-200",
  critical: "bg-red-50 border-red-200",
};

export default function FraudAlerts() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [showCreate, setShowCreate] = useState(false);
  const [viewAlert, setViewAlert] = useState(null);
  const [form, setForm] = useState({ parcel_id: "", parcel_number: "", alert_type: "", severity: "medium", description: "" });
  const [updateNotes, setUpdateNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["fraud-alerts-page"],
    queryFn: () => base44.entities.FraudAlert.list("-created_date", 200),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["parcels-for-fraud"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner text="Loading fraud alerts..." />;

  const filtered = alerts.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchSearch = !search || a.parcel_number?.includes(search) || a.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (!form.parcel_id || !form.alert_type || !form.description) return;
    setSaving(true);
    await base44.entities.FraudAlert.create({
      ...form,
      flagged_by: user.email,
      flagged_by_name: user.full_name,
      status: "open",
    });
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: `Flagged fraud alert on parcel: ${form.parcel_number || form.parcel_id}`,
      entity_type: "FraudAlert",
      details: form.description,
    });
    qc.invalidateQueries({ queryKey: ["fraud-alerts-page"] });
    setShowCreate(false);
    setForm({ parcel_id: "", parcel_number: "", alert_type: "", severity: "medium", description: "" });
    setSaving(false);
    toast.success("Fraud alert created");
  };

  const handleStatusUpdate = async (alert, newStatus) => {
    setSaving(true);
    await base44.entities.FraudAlert.update(alert.id, {
      status: newStatus,
      assigned_to: user.email,
      investigation_notes: updateNotes || alert.investigation_notes,
      ...(newStatus === "resolved" || newStatus === "dismissed" ? {
        resolved_by: user.email,
        resolved_date: new Date().toISOString().split("T")[0],
      } : {}),
    });
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: `Updated fraud alert status to ${newStatus}: ${alert.parcel_number || alert.parcel_id}`,
      entity_type: "FraudAlert",
      entity_id: alert.id,
    });
    qc.invalidateQueries({ queryKey: ["fraud-alerts-page"] });
    setViewAlert(null);
    setUpdateNotes("");
    setSaving(false);
    toast.success("Alert updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-primary" /> Fraud Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and investigate suspicious land activity</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Flag Alert
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {["open", "under_investigation", "escalated", "resolved"].map(s => (
          <Card key={s} className={`cursor-pointer border-2 ${statusFilter === s ? "border-primary" : "border-transparent"}`}
            onClick={() => setStatusFilter(s)}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{alerts.filter(a => a.status === s).length}</p>
              <p className="text-xs text-muted-foreground capitalize">{s.replace(/_/g, " ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["open", "under_investigation", "escalated", "resolved", "dismissed"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(alert => (
          <Card key={alert.id} className={`border ${SEVERITY_COLORS[alert.severity] || ""}`}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">Parcel: {alert.parcel_number || alert.parcel_id}</p>
                  <StatusBadge status={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-1">{alert.alert_type?.replace(/_/g, " ")}</p>
                <p className="text-xs text-foreground mt-1 line-clamp-2">{alert.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Flagged by {alert.flagged_by_name || alert.flagged_by} · {format(new Date(alert.created_date), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setViewAlert(alert)} className="flex-shrink-0">
                <Eye className="w-3.5 h-3.5 mr-1" /> Investigate
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No fraud alerts found</CardContent></Card>
        )}
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Flag Fraud Alert</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.parcel_id} onValueChange={val => {
              const p = parcels.find(p => p.id === val);
              setForm(f => ({ ...f, parcel_id: val, parcel_number: p?.parcel_number || "" }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select parcel..." /></SelectTrigger>
              <SelectContent>{parcels.map(p => <SelectItem key={p.id} value={p.id}>{p.parcel_number} — {p.owner_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.alert_type} onValueChange={val => setForm(f => ({ ...f, alert_type: val }))}>
              <SelectTrigger><SelectValue placeholder="Alert type..." /></SelectTrigger>
              <SelectContent>
                {["duplicate_registration", "forged_document", "boundary_manipulation", "ownership_fraud", "suspicious_transfer", "other"].map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.severity} onValueChange={val => setForm(f => ({ ...f, severity: val }))}>
              <SelectTrigger><SelectValue placeholder="Severity..." /></SelectTrigger>
              <SelectContent>
                {["low", "medium", "high", "critical"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Description of suspicious activity..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.parcel_id || !form.alert_type || !form.description || saving}>
              {saving ? "Saving..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investigate Dialog */}
      <Dialog open={!!viewAlert} onOpenChange={() => { setViewAlert(null); setUpdateNotes(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Investigation: {viewAlert?.parcel_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted-foreground">Type</p><p className="capitalize">{viewAlert?.alert_type?.replace(/_/g, " ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Severity</p><StatusBadge status={viewAlert?.severity} /></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewAlert?.status} /></div>
              <div><p className="text-xs text-muted-foreground">Flagged by</p><p>{viewAlert?.flagged_by_name || viewAlert?.flagged_by}</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="bg-muted/40 p-3 rounded-lg text-xs">{viewAlert?.description}</p></div>
            {viewAlert?.investigation_notes && (
              <div><p className="text-xs text-muted-foreground mb-1">Previous Notes</p><p className="bg-muted/40 p-3 rounded-lg text-xs">{viewAlert.investigation_notes}</p></div>
            )}
            <Textarea placeholder="Add investigation notes..." value={updateNotes} onChange={e => setUpdateNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(viewAlert, "under_investigation")} disabled={saving}>Investigate</Button>
            <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(viewAlert, "escalated")} disabled={saving}
              className="border-orange-300 text-orange-700 hover:bg-orange-50">Escalate</Button>
            <Button size="sm" onClick={() => handleStatusUpdate(viewAlert, "resolved")} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700">Resolve</Button>
            <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(viewAlert, "dismissed")} disabled={saving}
              className="text-gray-500">Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}