import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Navigation, Loader2, MapPin } from "lucide-react";

const OWNERSHIP_TYPES = ["individual","family","community","trust","institutional"];
const LAND_USES = ["residential","commercial","agricultural","industrial","mixed_use","government"];

function computeRisk(form) {
  let score = 100;
  if (form.geojson_polygon) score -= 20;
  if (form.survey_status === "completed") score -= 20;
  if (form.community_validation_status === "confirmed") score -= 15;
  if (form.owner_name || form.family_name) score -= 10;
  if (form.gps_lat) score -= 10;
  score = Math.max(0, score);
  const level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : "HIGH";
  return { risk_score: score, risk_level: level };
}

export default function ParcelForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const [user, setUser] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lead_id: leadId || "",
    community: "", village: "", ward: "", lga: "Ehime Mbano", state: "Imo",
    ownership_type: "family", land_use: "residential",
    owner_name: "", owner_phone: "", owner_nin: "",
    family_name: "", family_representative: "", founder_name: "",
    inheritance_notes: "", family_history_notes: "",
    size_sqm: "", gps_lat: "", gps_lng: "",
    geojson_polygon: "", boundary_notes: "",
    total_fee: "", notes: "",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Pre-fill from lead
  const { data: leadData } = useQuery({
    queryKey: ["lv-lead-prefill", leadId],
    queryFn: () => base44.entities.CommunityLead.filter({ id: leadId }),
    enabled: !!leadId && !isEdit,
  });
  useEffect(() => {
    if (leadData?.[0]) {
      const l = leadData[0];
      setForm(f => ({
        ...f,
        community: l.community || f.community,
        village: l.village || f.village,
        ward: l.ward || f.ward,
        lga: l.lga || f.lga,
        state: l.state || f.state,
        family_name: l.family_name || f.family_name,
        family_representative: l.family_representative || f.family_representative,
      }));
    }
  }, [leadData]);

  const { data: existing } = useQuery({
    queryKey: ["lv-parcel", id],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id }),
    enabled: isEdit,
  });
  useEffect(() => {
    if (existing?.[0]) {
      const p = existing[0];
      setForm({
        lead_id: p.lead_id || "", community: p.community || "", village: p.village || "",
        ward: p.ward || "", lga: p.lga || "Ehime Mbano", state: p.state || "Imo",
        ownership_type: p.ownership_type || "family", land_use: p.land_use || "residential",
        owner_name: p.owner_name || "", owner_phone: p.owner_phone || "", owner_nin: p.owner_nin || "",
        family_name: p.family_name || "", family_representative: p.family_representative || "",
        founder_name: p.founder_name || "", inheritance_notes: p.inheritance_notes || "",
        family_history_notes: p.family_history_notes || "",
        size_sqm: p.size_sqm || "", gps_lat: p.gps_lat || "", gps_lng: p.gps_lng || "",
        geojson_polygon: p.geojson_polygon || "", boundary_notes: p.boundary_notes || "",
        total_fee: p.total_fee || "", notes: "",
      });
    }
  }, [existing]);

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setForm(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude })); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { risk_score, risk_level } = computeRisk(form);
    const payload = {
      ...form,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : undefined,
      size_hectares: form.size_sqm ? Number(form.size_sqm) / 10000 : undefined,
      gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
      gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
      total_fee: form.total_fee ? Number(form.total_fee) : undefined,
      outstanding_balance: form.total_fee ? Number(form.total_fee) : undefined,
      risk_score, risk_level,
      field_agent_email: user?.email,
      field_agent_name: user?.full_name,
      registered_by: user?.email,
      device_id: navigator.userAgent?.slice(0, 100),
    };

    try {
      if (isEdit) {
        await base44.entities.LandVaultParcel.update(id, payload);
        qc.invalidateQueries({ queryKey: ["lv-parcel", id] });
        navigate(`/lv/parcels/${id}`);
      } else {
        // Generate parcel number
        const allParcels = await base44.entities.LandVaultParcel.list("-created_date", 1);
        const seq = String((allParcels.length || 0) + 1).padStart(6, "0");
        const ward_code = (form.ward || "GEN").slice(0, 3).toUpperCase();
        payload.parcel_number = `ASV-EHM-${ward_code}-${seq}`;
        payload.status = "draft";
        const result = await base44.entities.LandVaultParcel.create(payload);
        qc.invalidateQueries({ queryKey: ["lv-parcels"] });
        navigate(`/lv/parcels/${result.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const showFamily = ["family","community","trust","institutional"].includes(form.ownership_type);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? "Edit Parcel" : "Register Parcel"}</h1>
          <p className="text-sm text-muted-foreground">ASV-EHM-WARD-XXXXXX (system-generated)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-600" /> Location *</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Community *</Label><Input value={form.community} onChange={e => set("community", e.target.value)} required /></div>
              <div><Label className="text-xs">Village</Label><Input value={form.village} onChange={e => set("village", e.target.value)} /></div>
              <div><Label className="text-xs">Ward</Label><Input value={form.ward} onChange={e => set("ward", e.target.value)} /></div>
              <div><Label className="text-xs">LGA</Label><Input value={form.lga} onChange={e => set("lga", e.target.value)} /></div>
              <div><Label className="text-xs">State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} /></div>
              <div><Label className="text-xs">Size (m²)</Label><Input type="number" value={form.size_sqm} onChange={e => set("size_sqm", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-2 text-xs">
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} Capture GPS
              </Button>
              {form.gps_lat && <span className="text-xs text-muted-foreground font-mono">{Number(form.gps_lat).toFixed(5)}, {Number(form.gps_lng).toFixed(5)}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Land Type */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Land Classification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ownership Type *</Label>
              <Select value={form.ownership_type} onValueChange={v => set("ownership_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OWNERSHIP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Land Use</Label>
              <Select value={form.land_use} onValueChange={v => set("land_use", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LAND_USES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Owner / Family */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ownership Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!showFamily ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Owner Name</Label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} /></div>
                <div><Label className="text-xs">Owner Phone</Label><Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">NIN (Private)</Label><Input value={form.owner_nin} onChange={e => set("owner_nin", e.target.value)} placeholder="Stored privately" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Family Name</Label><Input value={form.family_name} onChange={e => set("family_name", e.target.value)} /></div>
                <div><Label className="text-xs">Representative</Label><Input value={form.family_representative} onChange={e => set("family_representative", e.target.value)} /></div>
                <div><Label className="text-xs">Founder Name</Label><Input value={form.founder_name} onChange={e => set("founder_name", e.target.value)} /></div>
                <div><Label className="text-xs">Total Fee (₦)</Label><Input type="number" value={form.total_fee} onChange={e => set("total_fee", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Inheritance Notes</Label><textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={form.inheritance_notes} onChange={e => set("inheritance_notes", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Family History</Label><textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={form.family_history_notes} onChange={e => set("family_history_notes", e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boundary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Boundary & Survey</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">GeoJSON Polygon</Label><textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={form.geojson_polygon} onChange={e => set("geojson_polygon", e.target.value)} placeholder='{"type":"Polygon","coordinates":[...]}' /></div>
            <div><Label className="text-xs">Boundary Notes</Label><Input value={form.boundary_notes} onChange={e => set("boundary_notes", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 h-12 text-base font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : isEdit ? "Update Parcel" : "Register Parcel"}
        </Button>
      </form>
    </div>
  );
}