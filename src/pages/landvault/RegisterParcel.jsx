import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Save, Upload, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = ["Location", "Ownership", "Survey", "Evidence", "Review"];

const WARD_CODES = {
  "Umueze": "UME", "Ibenta": "IBE", "Okporo": "OKP", "Oguta": "OGU",
  "Umuna": "UMN", "Isiala": "ISL", "Amandugba": "AMD", "Other": "OTH"
};

function computeRisk(form) {
  let score = 100;
  if (form.geojson_polygon) score -= 20;
  if (form.gps_lat && form.gps_lng) score -= 15;
  if (form.survey_plan_url) score -= 20;
  if (form.family_name || form.owner_name) score -= 10;
  if (form.size_sqm) score -= 10;
  if (form.land_use) score -= 5;
  score = Math.max(0, Math.min(100, score));
  const risk_level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : "HIGH";
  return { risk_score: score, risk_level };
}

export default function RegisterParcel() {
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [leadId, setLeadId] = useState(null);

  const [form, setForm] = useState({
    community: "", village: "", ward: "", lga: "Ehime Mbano", state: "Imo State",
    ownership_type: "family", land_use: "residential",
    size_sqm: "", size_hectares: "",
    gps_lat: "", gps_lng: "", geojson_polygon: "", boundary_notes: "",
    owner_name: "", owner_phone: "", owner_nin: "",
    family_name: "", family_representative: "", founder_name: "",
    inheritance_notes: "", family_history_notes: "",
    surveyor_name: "", surveyor_licence: "", survey_date: "",
    survey_plan_url: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lid = params.get("lead_id");
    if (lid) {
      setLeadId(lid);
      base44.entities.CommunityLead.filter({ id: lid }).then(r => {
        if (r && r[0]) {
          const l = r[0];
          setForm(f => ({ ...f, community: l.community || "", village: l.village || "", ward: l.ward || "", lga: l.lga || f.lga, family_name: l.family_name || "", family_representative: l.family_representative || "" }));
        }
      }).catch(() => {});
    }
  }, []);

  const captureGPS = () => {
    if (!navigator.geolocation) { toast({ title: "GPS not available", variant: "destructive" }); return; }
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(p => {
      setForm(f => ({ ...f, gps_lat: p.coords.latitude.toFixed(6), gps_lng: p.coords.longitude.toFixed(6) }));
      setGettingGPS(false);
    }, () => { setGettingGPS(false); toast({ title: "GPS failed", variant: "destructive" }); }, { timeout: 10000 });
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleFileField = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Uploading..." });
    const url = await uploadFile(file);
    if (url) setForm(f => ({ ...f, [field]: url }));
  };

  const handleSubmit = async () => {
    if (!form.community || !form.ward || !form.ownership_type) {
      toast({ title: "Community, Ward, and Ownership Type are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { risk_score, risk_level } = computeRisk(form);
    const wardCode = WARD_CODES[form.ward] || "OTH";
    // Generate parcel number
    let parcel_number;
    try {
      const res = await base44.functions.invoke("generateParcelId", {
        state_code: "IMO", lga_code: "EHM", ward_code: wardCode, property_type: form.land_use?.slice(0, 3).toUpperCase() || "RES"
      });
      // LandVault uses ASV prefix
      const seq = (res?.data?.sequence_number || 1).toString().padStart(6, "0");
      parcel_number = `ASV-EHM-${wardCode}-${seq}`;
    } catch {
      const seq = Math.floor(Math.random() * 99999).toString().padStart(6, "0");
      parcel_number = `ASV-EHM-${wardCode}-${seq}`;
    }

    await base44.entities.LandVaultParcel.create({
      ...form,
      parcel_number,
      lead_id: leadId,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : undefined,
      size_hectares: form.size_hectares ? Number(form.size_hectares) : undefined,
      gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
      gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
      risk_score,
      risk_level,
      status: "submitted",
      survey_status: "not_assigned",
      certificate_status: "PENDING",
      payment_status: "UNPAID",
      field_agent_email: user?.email,
      field_agent_name: user?.full_name,
      registered_by: user?.email,
      device_id: navigator.userAgent.slice(0, 50),
    });

    // Update lead status if linked
    if (leadId) {
      base44.entities.CommunityLead.update(leadId, { status: "CONSENT_RECEIVED" }).catch(() => {});
    }

    toast({ title: "Parcel registered", description: parcel_number });
    navigate("/landvault/parcels");
    setSaving(false);
  };

  const f = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));
  const fi = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Register Parcel</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-4">
          {/* Step 0 — Location */}
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Community *</Label><Input value={form.community} onChange={fi("community")} placeholder="e.g. Oguta" /></div>
                <div><Label>Village</Label><Input value={form.village} onChange={fi("village")} /></div>
                <div>
                  <Label>Ward *</Label>
                  <Select value={form.ward} onValueChange={f("ward")}>
                    <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(WARD_CODES).map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>LGA</Label><Input value={form.lga} onChange={fi("lga")} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={fi("state")} /></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">GPS Coordinates</p>
                <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gettingGPS}>
                  <MapPin className="w-4 h-4 mr-1" />{gettingGPS ? "Capturing..." : "Capture GPS"}
                </Button>
                {form.gps_lat && <p className="text-xs text-green-600 mt-1">GPS: {form.gps_lat}, {form.gps_lng}</p>}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><Label>Latitude</Label><Input value={form.gps_lat} onChange={fi("gps_lat")} placeholder="auto-captured" /></div>
                  <div><Label>Longitude</Label><Input value={form.gps_lng} onChange={fi("gps_lng")} /></div>
                </div>
              </div>
              <div>
                <Label>Size (sqm)</Label><Input type="number" value={form.size_sqm} onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, size_sqm: v, size_hectares: v ? (Number(v) / 10000).toFixed(4) : "" }));
                }} />
                {form.size_hectares && <p className="text-xs text-muted-foreground mt-1">{form.size_hectares} hectares</p>}
              </div>
              <div><Label>Boundary Notes</Label><Textarea value={form.boundary_notes} onChange={fi("boundary_notes")} rows={2} /></div>
              <div><Label>GeoJSON Polygon</Label><Textarea value={form.geojson_polygon} onChange={fi("geojson_polygon")} rows={3} placeholder='{"type":"Polygon","coordinates":[...]}' /></div>
            </>
          )}

          {/* Step 1 — Ownership */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ownership Type *</Label>
                  <Select value={form.ownership_type} onValueChange={f("ownership_type")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["individual","family","community","trust","institutional"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Land Use</Label>
                  <Select value={form.land_use} onValueChange={f("land_use")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["residential","commercial","agricultural","industrial","mixed_use","government"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(form.ownership_type === "individual") && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={fi("owner_name")} /></div>
                  <div><Label>Owner Phone</Label><Input value={form.owner_phone} onChange={fi("owner_phone")} /></div>
                  <div className="col-span-2"><Label>NIN (private)</Label><Input value={form.owner_nin} onChange={fi("owner_nin")} /></div>
                </div>
              )}
              {["family","community","trust","institutional"].includes(form.ownership_type) && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Family / Group Name</Label><Input value={form.family_name} onChange={fi("family_name")} /></div>
                    <div><Label>Representative</Label><Input value={form.family_representative} onChange={fi("family_representative")} /></div>
                    <div><Label>Founder / Ancestor</Label><Input value={form.founder_name} onChange={fi("founder_name")} /></div>
                  </div>
                  <div><Label>Inheritance Notes</Label><Textarea value={form.inheritance_notes} onChange={fi("inheritance_notes")} rows={2} /></div>
                  <div><Label>Family History Notes</Label><Textarea value={form.family_history_notes} onChange={fi("family_history_notes")} rows={2} /></div>
                </div>
              )}
            </>
          )}

          {/* Step 2 — Survey */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Surveyor Name</Label><Input value={form.surveyor_name} onChange={fi("surveyor_name")} /></div>
                <div><Label>Licence Number</Label><Input value={form.surveyor_licence} onChange={fi("surveyor_licence")} /></div>
                <div><Label>Date Surveyed</Label><Input type="date" value={form.survey_date} onChange={fi("survey_date")} /></div>
              </div>
              <div>
                <Label>Survey Plan Upload</Label>
                <input type="file" accept=".pdf,.jpg,.png,.dwg" className="mt-1 block w-full text-sm" onChange={e => handleFileField(e, "survey_plan_url")} />
                {form.survey_plan_url && <p className="text-xs text-green-600 mt-1">✓ Survey plan uploaded</p>}
              </div>
            </>
          )}

          {/* Step 3 — Evidence */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Evidence is stored securely and never publicly visible. Upload via the Evidence Vault after parcel creation.</p>
              <div className="p-4 rounded-lg bg-muted/40 text-center text-sm text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                After registering this parcel, you can upload:<br/>
                Verbal consent · Audio consent · Signature · Witness records · Survey photos · Boundary photos
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <div className={`p-3 rounded-lg ${computeRisk(form).risk_level === "LOW" ? "bg-green-50 text-green-700" : computeRisk(form).risk_level === "MEDIUM" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                <p className="font-bold">{computeRisk(form).risk_level} RISK — Score: {computeRisk(form).risk_score}/100</p>
                <p className="text-xs">Complete survey, GPS, and family details to reduce risk level.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Community:</span> {form.community}</div>
                <div><span className="text-muted-foreground">Ward:</span> {form.ward}</div>
                <div><span className="text-muted-foreground">Ownership:</span> {form.ownership_type}</div>
                <div><span className="text-muted-foreground">Land Use:</span> {form.land_use}</div>
                <div><span className="text-muted-foreground">Family:</span> {form.family_name || form.owner_name || "—"}</div>
                <div><span className="text-muted-foreground">GPS:</span> {form.gps_lat ? `${form.gps_lat}, ${form.gps_lng}` : "Not captured"}</div>
                <div><span className="text-muted-foreground">Survey Plan:</span> {form.survey_plan_url ? "✓ Uploaded" : "Not uploaded"}</div>
                <div><span className="text-muted-foreground">GeoJSON:</span> {form.geojson_polygon ? "✓ Present" : "Not provided"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />{step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? "Registering..." : "Register Parcel"}
          </Button>
        )}
      </div>
    </div>
  );
}