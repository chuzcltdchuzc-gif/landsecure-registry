import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin, Phone, User, Calendar, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUSES = [
  "NEW_LEAD","COMMUNITY_CONTACTED","FAMILY_CONTACTED","CONSENT_RECEIVED",
  "SURVEY_SCHEDULED","SURVEY_IN_PROGRESS","SURVEY_COMPLETED",
  "DOCUMENTATION_COMPLETE","CERTIFICATE_READY","CERTIFICATE_ISSUED"
];

const statusColor = {
  NEW_LEAD: "bg-gray-100 text-gray-700",
  COMMUNITY_CONTACTED: "bg-blue-100 text-blue-700",
  FAMILY_CONTACTED: "bg-indigo-100 text-indigo-700",
  CONSENT_RECEIVED: "bg-yellow-100 text-yellow-700",
  SURVEY_SCHEDULED: "bg-orange-100 text-orange-700",
  SURVEY_IN_PROGRESS: "bg-amber-100 text-amber-700",
  SURVEY_COMPLETED: "bg-emerald-100 text-emerald-700",
  DOCUMENTATION_COMPLETE: "bg-green-100 text-green-700",
  CERTIFICATE_READY: "bg-purple-100 text-purple-700",
  CERTIFICATE_ISSUED: "bg-teal-100 text-teal-700",
};

const EMPTY = {
  community: "", village: "", ward: "", lga: "Ehime Mbano", state: "Imo",
  community_leader_name: "", community_leader_phone: "", community_leader_role: "village_head",
  family_name: "", family_representative: "", family_representative_phone: "",
  estimated_plots: "", notes: "", visit_date: "", follow_up_date: "",
};

export default function LeadManagement() {
  const { user } = useOutletContext() || {};
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.CommunityLead.list("-created_date", 200).then(r => setLeads(r || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || (l.community || "").toLowerCase().includes(q) || (l.family_name || "").toLowerCase().includes(q) || (l.village || "").toLowerCase().includes(q);
    const matchS = filterStatus === "all" || l.status === filterStatus;
    return matchQ && matchS;
  });

  const handleSave = async () => {
    if (!form.community) { toast({ title: "Community is required", variant: "destructive" }); return; }
    setSaving(true);
    const gps = await new Promise(res => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null)) : res(null));
    await base44.entities.CommunityLead.create({
      ...form,
      estimated_plots: form.estimated_plots ? Number(form.estimated_plots) : undefined,
      field_agent_email: user?.email,
      field_agent_name: user?.full_name,
      status: "NEW_LEAD",
      gps_lat: gps?.lat,
      gps_lng: gps?.lng,
      device_id: navigator.userAgent.slice(0, 50),
    });
    toast({ title: "Lead created" });
    setShowForm(false);
    setForm(EMPTY);
    load();
    setSaving(false);
  };

  const updateStatus = async (lead, status) => {
    await base44.entities.CommunityLead.update(lead.id, { status });
    load();
  };

  const convRate = leads.length ? Math.round(leads.filter(l => ["CERTIFICATE_ISSUED", "CERTIFICATE_READY"].includes(l.status)).length / leads.length * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Lead Management</h1>
          <p className="text-sm text-muted-foreground">Community leads · {leads.length} total · {convRate}% conversion</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Lead</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", val: leads.length, color: "text-blue-600" },
          { label: "Conversion Rate", val: `${convRate}%`, color: "text-green-600" },
          { label: "Pending Surveys", val: leads.filter(l => l.status === "SURVEY_SCHEDULED").length, color: "text-orange-600" },
          { label: "Completed", val: leads.filter(l => l.status === "CERTIFICATE_ISSUED").length, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search community, family..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No leads found</div>}
          {filtered.map(l => (
            <Card key={l.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(l)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{l.family_name || "—"}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[l.status] || "bg-gray-100 text-gray-600"}`}>
                      {(l.status || "").replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.community} · {l.village} · {l.ward}</p>
                  <p className="text-xs text-muted-foreground">{l.community_leader_name} · {l.estimated_plots} plots estimated</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">{l.visit_date}</p>
                  <p className="text-xs text-muted-foreground">{l.field_agent_name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Community *</Label><Input value={form.community} onChange={e => setForm(f => ({...f, community: e.target.value}))} /></div>
              <div><Label>Village</Label><Input value={form.village} onChange={e => setForm(f => ({...f, village: e.target.value}))} /></div>
              <div><Label>Ward</Label><Input value={form.ward} onChange={e => setForm(f => ({...f, ward: e.target.value}))} /></div>
              <div><Label>LGA</Label><Input value={form.lga} onChange={e => setForm(f => ({...f, lga: e.target.value}))} /></div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">Community Leader</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.community_leader_name} onChange={e => setForm(f => ({...f, community_leader_name: e.target.value}))} /></div>
                <div><Label>Phone</Label><Input value={form.community_leader_phone} onChange={e => setForm(f => ({...f, community_leader_phone: e.target.value}))} /></div>
                <div className="col-span-2">
                  <Label>Role</Label>
                  <Select value={form.community_leader_role} onValueChange={v => setForm(f => ({...f, community_leader_role: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["village_head","kindred_head","community_chairman","traditional_ruler","other"].map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">Family</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Family Name</Label><Input value={form.family_name} onChange={e => setForm(f => ({...f, family_name: e.target.value}))} /></div>
                <div><Label>Representative</Label><Input value={form.family_representative} onChange={e => setForm(f => ({...f, family_representative: e.target.value}))} /></div>
                <div><Label>Rep Phone</Label><Input value={form.family_representative_phone} onChange={e => setForm(f => ({...f, family_representative_phone: e.target.value}))} /></div>
                <div><Label>Est. Plots</Label><Input type="number" value={form.estimated_plots} onChange={e => setForm(f => ({...f, estimated_plots: e.target.value}))} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Visit Date</Label><Input type="date" value={form.visit_date} onChange={e => setForm(f => ({...f, visit_date: e.target.value}))} /></div>
              <div><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({...f, follow_up_date: e.target.value}))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Create Lead"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.family_name || selected?.community} Lead</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Community:</span> {selected.community}</div>
                <div><span className="text-muted-foreground">Village:</span> {selected.village}</div>
                <div><span className="text-muted-foreground">Ward:</span> {selected.ward}</div>
                <div><span className="text-muted-foreground">Plots Est.:</span> {selected.estimated_plots}</div>
                <div><span className="text-muted-foreground">Leader:</span> {selected.community_leader_name}</div>
                <div><span className="text-muted-foreground">Agent:</span> {selected.field_agent_name}</div>
              </div>
              {selected.notes && <p className="text-sm bg-muted p-3 rounded-lg">{selected.notes}</p>}
              <div>
                <Label className="mb-2 block">Update Status</Label>
                <Select value={selected.status} onValueChange={v => { updateStatus(selected, v); setSelected(s => ({...s, status: v})); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button asChild className="w-full">
                <Link to={`/landvault/parcels/new?lead_id=${selected.id}`}>Register Parcel for This Lead</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}