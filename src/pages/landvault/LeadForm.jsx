import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Loader2, Navigation } from "lucide-react";

const STATUSES = [
  "NEW_LEAD","COMMUNITY_CONTACTED","FAMILY_CONTACTED","CONSENT_RECEIVED",
  "SURVEY_SCHEDULED","SURVEY_IN_PROGRESS","SURVEY_COMPLETED",
  "DOCUMENTATION_COMPLETE","CERTIFICATE_READY","CERTIFICATE_ISSUED"
];

const LEADER_ROLES = ["village_head","kindred_head","community_chairman","traditional_ruler","other"];

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [user, setUser] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [form, setForm] = useState({
    community: "", village: "", ward: "", lga: "Ehime Mbano", state: "Imo",
    family_name: "", family_representative: "", family_representative_phone: "",
    community_leader_name: "", community_leader_phone: "", community_leader_role: "village_head",
    estimated_plots: "", status: "NEW_LEAD", notes: "", visit_date: "",
    gps_lat: "", gps_lng: "",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: existing } = useQuery({
    queryKey: ["lv-lead", id],
    queryFn: () => base44.entities.CommunityLead.filter({ id }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.[0]) {
      const l = existing[0];
      setForm({
        community: l.community || "", village: l.village || "", ward: l.ward || "",
        lga: l.lga || "Ehime Mbano", state: l.state || "Imo",
        family_name: l.family_name || "", family_representative: l.family_representative || "",
        family_representative_phone: l.family_representative_phone || "",
        community_leader_name: l.community_leader_name || "",
        community_leader_phone: l.community_leader_phone || "",
        community_leader_role: l.community_leader_role || "village_head",
        estimated_plots: l.estimated_plots || "", status: l.status || "NEW_LEAD",
        notes: l.notes || "", visit_date: l.visit_date || "",
        gps_lat: l.gps_lat || "", gps_lng: l.gps_lng || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) return base44.entities.CommunityLead.update(id, data);
      // Generate lead number
      const existing_leads = await base44.entities.CommunityLead.list("-created_date", 1);
      const nextNum = String((existing_leads.length || 0) + 1).padStart(6, "0");
      return base44.entities.CommunityLead.create({ ...data, lead_number: `LEAD-EHM-${nextNum}` });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["lv-leads"] });
      navigate(`/lv/leads/${isEdit ? id : result.id}`);
    },
  });

  const captureGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      estimated_plots: form.estimated_plots ? Number(form.estimated_plots) : undefined,
      gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
      gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
      field_agent_email: user?.email,
      field_agent_name: user?.full_name,
      device_id: navigator.userAgent?.slice(0, 100),
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? "Edit Lead" : "New Community Lead"}</h1>
          <p className="text-sm text-muted-foreground">Capture community and family details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> Location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Community *</Label><Input value={form.community} onChange={e => set("community", e.target.value)} required /></div>
              <div><Label className="text-xs">Village</Label><Input value={form.village} onChange={e => set("village", e.target.value)} /></div>
              <div><Label className="text-xs">Ward</Label><Input value={form.ward} onChange={e => set("ward", e.target.value)} /></div>
              <div><Label className="text-xs">LGA</Label><Input value={form.lga} onChange={e => set("lga", e.target.value)} /></div>
              <div><Label className="text-xs">State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} /></div>
              <div><Label className="text-xs">Visit Date</Label><Input type="date" value={form.visit_date} onChange={e => set("visit_date", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-2 text-xs">
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                Capture GPS
              </Button>
              {form.gps_lat && <span className="text-xs text-muted-foreground font-mono">{Number(form.gps_lat).toFixed(5)}, {Number(form.gps_lng).toFixed(5)}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Community Leader</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Leader Name</Label><Input value={form.community_leader_name} onChange={e => set("community_leader_name", e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.community_leader_phone} onChange={e => set("community_leader_phone", e.target.value)} /></div>
              <div className="col-span-2">
                <Label className="text-xs">Role</Label>
                <Select value={form.community_leader_role} onValueChange={v => set("community_leader_role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEADER_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Family Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Family Name</Label><Input value={form.family_name} onChange={e => set("family_name", e.target.value)} /></div>
              <div><Label className="text-xs">Est. Plots</Label><Input type="number" value={form.estimated_plots} onChange={e => set("estimated_plots", e.target.value)} /></div>
              <div><Label className="text-xs">Representative</Label><Input value={form.family_representative} onChange={e => set("family_representative", e.target.value)} /></div>
              <div><Label className="text-xs">Rep Phone</Label><Input value={form.family_representative_phone} onChange={e => set("family_representative_phone", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Status & Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Lead Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Field observations…" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</> : isEdit ? "Update Lead" : "Create Lead"}
        </Button>
      </form>
    </div>
  );
}