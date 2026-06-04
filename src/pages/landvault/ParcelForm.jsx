import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Navigation, Loader2, MapPin, User, Shield, AlertTriangle } from "lucide-react";

// SECTION B — Full ownership structure
const OWNERSHIP_TYPES = [
  { value: "individual", label: "Individual Ownership" },
  { value: "family", label: "Family Ownership" },
  { value: "joint", label: "Joint Ownership" },
  { value: "community", label: "Community Ownership" },
  { value: "trust", label: "Trust Ownership" },
  { value: "corporate", label: "Corporate Ownership" },
  { value: "government", label: "Government Ownership" },
  { value: "institutional", label: "Institutional Ownership" },
];

const LAND_USES = ["residential","commercial","agricultural","industrial","mixed_use","government"];

// SECTION A — Representative capacity values
const REPRESENTATIVE_CAPACITIES = [
  "Owner","Family Representative","Executor","Administrator",
  "Attorney","Community Trustee","Village Head","Court Appointed Representative","Other"
];

const AUTHORITY_BASES = [
  "Personal Ownership","Family Resolution","Power of Attorney",
  "Letter of Administration","Probate","Court Order","Community Endorsement","Other"
];

const REPRESENTATIVE_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "family_head", label: "Family Head" },
  { value: "family_representative", label: "Family Representative" },
  { value: "executor", label: "Executor" },
  { value: "administrator", label: "Administrator" },
  { value: "attorney", label: "Attorney" },
  { value: "community_trustee", label: "Community Trustee" },
  { value: "village_head", label: "Village Head" },
  { value: "court_appointed", label: "Court Appointed" },
  { value: "other", label: "Other" },
];

// SECTION C+D — Risk computation with GPS and duplicate signals
function computeRisk(form) {
  let score = 100;
  const factors = [];

  if (form.geojson_polygon) { score -= 20; } else { factors.push("No boundary polygon"); }
  if (form.gps_lat) {
    // SECTION D — GPS accuracy check
    if (form.gps_accuracy_m && form.gps_accuracy_m > 50) {
      score += 10; // penalty for poor accuracy
      factors.push(`Poor GPS accuracy: ${form.gps_accuracy_m}m`);
    } else {
      score -= 10;
    }
  } else { factors.push("No GPS coordinates"); }
  if (form.community_validation_status === "confirmed") score -= 15;
  if (form.owner_name || form.family_name) score -= 10;
  // SECTION A — Representative capacity increases confidence
  if (form.representative_capacity && form.authority_basis) score -= 10;
  else factors.push("Representative capacity incomplete");
  // SECTION B — ownership type risk
  if (form.ownership_type === "individual") score -= 5;
  if (form.ownership_type === "community" || form.ownership_type === "government") score -= 8;
  // SECTION C — duplicate flag penalty
  if (form.duplicate_flag) { score += 20; factors.push("Duplicate flag active"); }

  score = Math.max(0, Math.min(100, score));
  const level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : "HIGH";
  return { risk_score: score, risk_level: level, risk_factors: JSON.stringify(factors) };
}

// SECTION D — GPS LGA bounds (Ehime Mbano approximate bbox)
const EHM_BOUNDS = { minLat: 5.55, maxLat: 5.85, minLng: 7.20, maxLng: 7.55 };
function checkGPSInsideLGA(lat, lng) {
  if (!lat || !lng) return null;
  return lat >= EHM_BOUNDS.minLat && lat <= EHM_BOUNDS.maxLat &&
         lng >= EHM_BOUNDS.minLng && lng <= EHM_BOUNDS.maxLng;
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
  const [gpsWarning, setGpsWarning] = useState("");

  const [form, setForm] = useState({
    lead_id: leadId || "",
    community: "", village: "", ward: "", lga: "Ehime Mbano", state: "Imo",
    ownership_type: "family", land_use: "residential",
    owner_name: "", owner_phone: "", owner_nin: "",
    family_name: "", family_representative: "", founder_name: "",
    inheritance_notes: "", family_history_notes: "",
    // SECTION A — Representative Capacity
    representative_name: "", representative_role: "family_representative",
    representative_capacity: "Family Representative",
    relationship_to_land: "", authority_basis: "Family Resolution",
    // SECTION D — GPS metadata
    size_sqm: "", gps_lat: "", gps_lng: "", gps_accuracy_m: "", gps_captured_at: "",
    gps_confidence: "MEDIUM", gps_inside_lga: null, gps_spoofing_flag: false,
    geojson_polygon: "", boundary_notes: "",
    total_fee: "",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

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
        representative_name: l.family_representative || f.representative_name,
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
        representative_name: p.representative_name || "",
        representative_role: p.representative_role || "family_representative",
        representative_capacity: p.representative_capacity || "Family Representative",
        relationship_to_land: p.relationship_to_land || "",
        authority_basis: p.authority_basis || "Family Resolution",
        size_sqm: p.size_sqm || "", gps_lat: p.gps_lat || "", gps_lng: p.gps_lng || "",
        gps_accuracy_m: p.gps_accuracy_m || "", gps_captured_at: p.gps_captured_at || "",
        gps_confidence: p.gps_confidence || "MEDIUM",
        gps_inside_lga: p.gps_inside_lga ?? null,
        gps_spoofing_flag: p.gps_spoofing_flag || false,
        geojson_polygon: p.geojson_polygon || "", boundary_notes: p.boundary_notes || "",
        total_fee: p.total_fee || "",
      });
    }
  }, [existing]);

  // SECTION D — GPS capture with metadata + LGA validation
  const captureGPS = () => {
    setGpsLoading(true);
    setGpsWarning("");
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const insideLGA = checkGPSInsideLGA(lat, lng);
        let confidence = "HIGH";
        let warning = "";
        if (accuracy > 100) { confidence = "LOW"; warning = `⚠ GPS accuracy is ${Math.round(accuracy)}m — too low for reliable registration.`; }
        else if (accuracy > 50) { confidence = "MEDIUM"; warning = `GPS accuracy: ${Math.round(accuracy)}m. Consider retaking in open area.`; }
        if (insideLGA === false) {
          warning += " ⚠ GPS coordinates appear to be OUTSIDE Ehime Mbano LGA. Verify location.";
        }
        setGpsWarning(warning);
        setForm(f => ({
          ...f,
          gps_lat: lat, gps_lng: lng,
          gps_accuracy_m: Math.round(accuracy),
          gps_captured_at: new Date().toISOString(),
          gps_confidence: confidence,
          gps_inside_lga: insideLGA,
          gps_spoofing_flag: false,
        }));
        setGpsLoading(false);
      },
      () => { setGpsWarning("GPS capture failed. Enter coordinates manually."); setGpsLoading(false); },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // SECTION A — Validation
  const validate = () => {
    if (!form.representative_name) return "Representative name is required.";
    if (!form.representative_capacity) return "Representative capacity is required.";
    if (!form.authority_basis) return "Authority basis is required.";
    if (!form.relationship_to_land) return "Relationship to land is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { alert(validationError); return; }
    setSaving(true);
    const { risk_score, risk_level, risk_factors } = computeRisk(form);
    const payload = {
      ...form,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : undefined,
      size_hectares: form.size_sqm ? Number(form.size_sqm) / 10000 : undefined,
      gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
      gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
      gps_accuracy_m: form.gps_accuracy_m ? Number(form.gps_accuracy_m) : undefined,
      total_fee: form.total_fee ? Number(form.total_fee) : undefined,
      outstanding_balance: form.total_fee ? Number(form.total_fee) : undefined,
      risk_score, risk_level, risk_factors,
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
        const allParcels = await base44.entities.LandVaultParcel.list("-created_date", 1);
        const seq = String((allParcels.length || 0) + 1).padStart(6, "0");
        const ward_code = (form.ward || "GEN").slice(0, 3).toUpperCase();
        payload.parcel_number = `ASV-EHM-${ward_code}-${seq}`;
        payload.status = "draft";
        const result = await base44.entities.LandVaultParcel.create(payload);
        qc.invalidateQueries({ queryKey: ["lv-parcels"] });
        navigate(`/lv/parcels/${result.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const showFamily = ["family","community","trust","institutional","joint"].includes(form.ownership_type);

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

        {/* SECTION A — Representative Capacity */}
        <Card className="border border-blue-200 bg-blue-50/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Representative Capacity *
            </CardTitle>
            <p className="text-xs text-muted-foreground">Who is presenting this land for registration?</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Representative Full Name *</Label>
                <Input value={form.representative_name} onChange={e => set("representative_name", e.target.value)} required placeholder="Full legal name of presenter" />
              </div>
              <div>
                <Label className="text-xs">Capacity *</Label>
                <Select value={form.representative_capacity} onValueChange={v => set("representative_capacity", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REPRESENTATIVE_CAPACITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={form.representative_role} onValueChange={v => set("representative_role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REPRESENTATIVE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Relationship to Land *</Label>
                <Input value={form.relationship_to_land} onChange={e => set("relationship_to_land", e.target.value)} required placeholder="e.g. First-born son, Eldest wife group, Direct owner" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Authority Basis *</Label>
                <Select value={form.authority_basis} onValueChange={v => set("authority_basis", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUTHORITY_BASES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {(form.authority_basis === "Power of Attorney" || form.authority_basis === "Letter of Administration" || form.authority_basis === "Probate" || form.authority_basis === "Court Order") && (
              <div className="p-2 rounded-md bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-800">⚠ Authority document required. Upload via Evidence Vault after registration.</p>
              </div>
            )}
          </CardContent>
        </Card>

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
            {/* SECTION D — GPS with validation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-2 text-xs">
                  {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} Capture GPS
                </Button>
                {form.gps_lat && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {Number(form.gps_lat).toFixed(5)}, {Number(form.gps_lng).toFixed(5)}
                    {form.gps_accuracy_m && <span className="ml-1 text-[10px]">(±{form.gps_accuracy_m}m)</span>}
                  </span>
                )}
                {form.gps_confidence && form.gps_lat && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${form.gps_confidence === "HIGH" ? "bg-emerald-100 text-emerald-700" : form.gps_confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    GPS {form.gps_confidence}
                  </span>
                )}
              </div>
              {gpsWarning && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">{gpsWarning}</p>
                </div>
              )}
              {form.gps_inside_lga === false && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 border border-red-200">
                  <Shield className="w-3 h-3 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-800 font-medium">GPS is outside Ehime Mbano LGA boundary. This parcel will be flagged for review.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION B — Ownership Structure */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ownership Classification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ownership Type *</Label>
              <Select value={form.ownership_type} onValueChange={v => set("ownership_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OWNERSHIP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Land Use</Label>
              <Select value={form.land_use} onValueChange={v => set("land_use", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LAND_USES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
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
                <div><Label className="text-xs">Family / Entity Name</Label><Input value={form.family_name} onChange={e => set("family_name", e.target.value)} /></div>
                <div><Label className="text-xs">Representative</Label><Input value={form.family_representative} onChange={e => set("family_representative", e.target.value)} /></div>
                <div><Label className="text-xs">Founder / Head</Label><Input value={form.founder_name} onChange={e => set("founder_name", e.target.value)} /></div>
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