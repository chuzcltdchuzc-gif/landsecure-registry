import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Upload, Shield, Zap, Lock, AlertTriangle } from "lucide-react";
import ParcelPolygonEditor from "@/components/gis/ParcelPolygonEditor";
import { WARDS, PROPERTY_TYPES, OWNERSHIP_TYPES, STATE_CODE, LGA_CODE } from "@/lib/ehimeMbanoData";

export default function ParcelDataForm({ user, onSaved, onBack }) {
  const [form, setForm] = useState({
    title: "", owner_name: "", owner_email: "", owner_phone: "", owner_nin: "",
    ownership_type: "individual", size_sqm: "", address: "", community: "",
    ward: "", ward_code: "", property_type: "", land_use: "residential",
    encumbrance_status: "none", latitude: "", longitude: "", notes: "", family_name: "",
  });
  const [generatedParcelNumber, setGeneratedParcelNumber] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [surveyFile, setSurveyFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [polygonData, setPolygonData] = useState({
    geojsonStr: null, areaSqm: null, perimeterM: null,
    validationStatus: "not_validated", issues: []
  });

  const { data: allParcels = [] } = useQuery({
    queryKey: ["all-parcels-for-validation"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleWardChange = (wardCode) => {
    const ward = WARDS.find(w => w.code === wardCode);
    setForm(f => ({ ...f, ward: ward?.name || "", ward_code: wardCode }));
    setGeneratedParcelNumber("");
  };

  const handlePropertyTypeChange = (pt) => {
    set("property_type", pt);
    setGeneratedParcelNumber("");
  };

  const generateParcelId = async () => {
    if (!form.ward_code || !form.property_type) {
      toast.error("Select Ward and Property Type before generating parcel ID");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await base44.functions.invoke("generateParcelId", {
        state_code: STATE_CODE,
        lga_code: LGA_CODE,
        ward_code: form.ward_code,
        property_type: form.property_type,
      });
      setGeneratedParcelNumber(res.data.parcel_number);
      toast.success(`Parcel ID generated: ${res.data.parcel_number}`);
    } catch (err) {
      toast.error("Failed to generate parcel ID: " + (err?.response?.data?.error || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedParcelNumber) { toast.error("Generate a Parcel ID first"); return; }
    if (!form.owner_name) { toast.error("Owner name is required"); return; }
    if (!form.address) { toast.error("Address is required"); return; }

    let survey_plan_url = "";
    const photoUrls = [];
    if (surveyFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: surveyFile });
      survey_plan_url = file_url;
    }
    for (const photo of photos) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
      photoUrls.push(file_url);
    }

    onSaved({
      ...form,
      parcel_number: generatedParcelNumber,
      survey_plan_url,
      photos: photoUrls,
      parcel_boundary: polygonData.geojsonStr,
      boundary_area: polygonData.areaSqm,
      boundary_perimeter: polygonData.perimeterM,
      spatial_validation_status: polygonData.validationStatus,
      spatial_conflict_notes: polygonData.issues?.length > 0 ? JSON.stringify(polygonData.issues) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stage 2 — Land Data Capture</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter parcel details. Verbal consent has been recorded.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Ward & Property Type</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ward <span className="text-red-500">*</span></Label>
              <Select value={form.ward_code} onValueChange={handleWardChange}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>{WARDS.map(w => <SelectItem key={w.code} value={w.code}>{w.name} ({w.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Property Type <span className="text-red-500">*</span></Label>
              <Select value={form.property_type} onValueChange={handlePropertyTypeChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map(pt => <SelectItem key={pt.code} value={pt.code}>{pt.label} ({pt.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold mb-0.5">System Parcel ID</p>
                {generatedParcelNumber
                  ? <p className="text-xl font-mono font-bold text-primary">{generatedParcelNumber}</p>
                  : <p className="text-sm text-muted-foreground">Select ward & type, then generate</p>}
              </div>
              <Button onClick={generateParcelId} disabled={!form.ward_code || !form.property_type || isGenerating}
                variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-white shrink-0">
                <Zap className="w-4 h-4" />{isGenerating ? "Generating…" : generatedParcelNumber ? "Regenerate" : "Generate ID"}
              </Button>
            </div>
            {generatedParcelNumber && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Lock className="w-3 h-3" /> System-generated — cannot be manually edited</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Ownership Information <Badge variant="secondary" className="text-xs ml-auto">Restricted</Badge></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ownership Type</Label>
            <Select value={form.ownership_type} onValueChange={v => set("ownership_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OWNERSHIP_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.ownership_type === "family" && (
            <div><Label>Family Name</Label><Input value={form.family_name} onChange={e => set("family_name", e.target.value)} placeholder="e.g. Eze Family" /></div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Owner / Representative Name <span className="text-red-500">*</span></Label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Full legal name" /></div>
            <div><Label>NIN (Private)</Label><Input value={form.owner_nin} onChange={e => set("owner_nin", e.target.value)} placeholder="National ID Number" /></div>
            <div><Label>Phone Number (Private)</Label><Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} placeholder="+234..." /></div>
            <div><Label>Email (Private)</Label><Input value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="Email address" /></div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Owner personal data is strictly private and never shown publicly.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Parcel Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Parcel Title</Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Ancestral Home Plot" /></div>
            <div><Label>Size (sqm)</Label><Input type="number" step="0.01" value={form.size_sqm} onChange={e => set("size_sqm", e.target.value)} placeholder="e.g. 500" /></div>
            <div><Label>Community</Label><Input value={form.community} onChange={e => set("community", e.target.value)} placeholder="Community name" /></div>
            <div>
              <Label>Encumbrance Status</Label>
              <Select value={form.encumbrance_status} onValueChange={v => set("encumbrance_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="dispute">Under Dispute</SelectItem>
                  <SelectItem value="lien">Lien</SelectItem>
                  <SelectItem value="court_order">Court Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Address <span className="text-red-500">*</span></Label><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Plot description, street, landmark" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>GPS Latitude</Label><Input type="number" step="0.000001" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="e.g. 5.7564" /></div>
            <div><Label>GPS Longitude</Label><Input type="number" step="0.000001" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="e.g. 7.2786" /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." rows={2} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Parcel Boundary (GIS)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Draw the parcel boundary. Overlap with existing parcels is detected automatically.</p>
          {(polygonData.validationStatus === "conflict_blocked" || polygonData.validationStatus === "invalid_geometry") && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-800 font-medium">Spatial conflict detected</p>
            </div>
          )}
          <ParcelPolygonEditor
            value={polygonData.geojsonStr}
            onChange={(geojsonStr, areaSqm, perimeterM, validationStatus, issues) =>
              setPolygonData({ geojsonStr, areaSqm, perimeterM, validationStatus: validationStatus || "not_validated", issues: issues || [] })}
            allParcels={allParcels}
            parcel={{ parcel_number: generatedParcelNumber }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Documents & Photos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Survey Plan (PDF/Image)</Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setSurveyFile(e.target.files[0])} /></div>
          <div><Label>Site Photos</Label><Input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files))} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-between pb-6">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={handleSave} disabled={!generatedParcelNumber || !form.owner_name || !form.address}
          className="gap-2 bg-green-700 hover:bg-green-800 px-8">
          Save & Continue →
        </Button>
      </div>
    </div>
  );
}