import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Upload, Save, AlertTriangle, Shield, Zap, Lock, Package } from "lucide-react";
import ParcelPolygonEditor from "@/components/gis/ParcelPolygonEditor";
import {
  WARDS, PROPERTY_TYPES, OWNERSHIP_TYPES,
  STATE_CODE, LGA_CODE, STATE_NAME, LGA_NAME
} from "@/lib/ehimeMbanoData";

const ALLOWED_ROLES = ["super_admin", "surveyor_general", "compliance_officer", "surveyor"];

export default function EhimeRegisterLand() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  // Read package context from URL params (set when navigating from PackageManagement)
  const urlParams = new URLSearchParams(window.location.search);
  const linkedPackageId = urlParams.get("package_id");
  const linkedPackageNumber = urlParams.get("package_number");
  const linkedFamilyName = urlParams.get("family_name") ? decodeURIComponent(urlParams.get("family_name")) : "";

  const [form, setForm] = useState({
    title: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    owner_nin: "",
    ownership_type: "individual",
    size_sqm: "",
    address: "",
    community: "",
    ward: "",
    ward_code: "",
    property_type: "",
    land_use: "residential",
    encumbrance_status: "none",
    latitude: "",
    longitude: "",
    notes: "",
    family_name: linkedFamilyName || "",
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!generatedParcelNumber) throw new Error("Generate a Parcel ID first");
      if (!form.owner_name) throw new Error("Owner name is required");
      if (!form.ward_code) throw new Error("Ward is required");
      if (!form.property_type) throw new Error("Property type is required");

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

      const today = new Date().toISOString().split("T")[0];
      const certFee = 30000;

      await base44.entities.LandParcel.create({
        tenant_id: "EHM-001",
        parcel_number: generatedParcelNumber,
        title: form.title,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        owner_phone: form.owner_phone,
        owner_nin: form.owner_nin,
        ownership_type: form.ownership_type,
        size_sqm: form.size_sqm ? parseFloat(form.size_sqm) : undefined,
        address: form.address,
        community: form.community,
        state: STATE_NAME,
        lga: LGA_NAME,
        ward: form.ward,
        ward_code: form.ward_code,
        property_type: form.property_type,
        land_use: form.land_use,
        encumbrance_status: form.encumbrance_status,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        notes: form.notes,
        survey_plan_url,
        photos: photoUrls,
        registered_by: user?.email,
        status: "pending",
        verification_status: "unverified",
        registration_date: today,
        parcel_boundary: polygonData.geojsonStr || undefined,
        boundary_area: polygonData.areaSqm || undefined,
        boundary_perimeter: polygonData.perimeterM || undefined,
        boundary_source: polygonData.geojsonStr ? "manual_entry" : undefined,
        boundary_capture_date: polygonData.geojsonStr ? today : undefined,
        spatial_validation_status: polygonData.validationStatus,
        spatial_conflict_notes: polygonData.issues?.length > 0 ? JSON.stringify(polygonData.issues) : undefined,
        registration_package_id: linkedPackageId || undefined,
        registration_completed: true,
        survey_completed: !!polygonData.geojsonStr,
        ownership_verified: !!form.owner_name,
        protected_in_registry: true,
        certificate_release_status: "held",
        certificate_hold_reason: "payment_pending",
        outstanding_certificate_fee: certFee,
      });

      // Update package counters
      if (linkedPackageId) {
        const pkgs = await base44.entities.RegistrationPackage.filter({ id: linkedPackageId });
        if (pkgs[0]) {
          const prev = pkgs[0];
          await base44.entities.RegistrationPackage.update(linkedPackageId, {
            registered_parcels: (prev.registered_parcels || 0) + 1,
            certificates_held: (prev.certificates_held || 0) + 1,
          });
        }
      }

      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user?.email,
        user_name: user?.full_name,
        action: "PARCEL_REGISTERED",
        entity_type: "LandParcel",
        details: JSON.stringify({
          parcel_number: generatedParcelNumber,
          ward: form.ward,
          property_type: form.property_type,
          package_id: linkedPackageId || null,
          package_number: linkedPackageNumber || null,
          certificate_status: "held",
        }),
      });
    },
    onSuccess: () => {
      toast.success("Land parcel registered successfully!");
      navigate("/ehime/parcels");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!ALLOWED_ROLES.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm">Only government officers can register land parcels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Register New Land Parcel</h1>
          <p className="text-sm text-muted-foreground mt-1">{LGA_NAME} · {STATE_NAME} Official Land Registry</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
            <Shield className="w-3 h-3" /> Government Officers Only
          </Badge>
          {linkedPackageNumber && (
            <Badge className="gap-1 bg-blue-100 text-blue-800 border border-blue-300">
              <Package className="w-3 h-3" /> Package: {linkedPackageNumber}
              {linkedFamilyName && ` · ${linkedFamilyName}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Step 1: Location & Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Step 1 — Select Ward & Property Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ward <span className="text-red-500">*</span></Label>
              <Select value={form.ward_code} onValueChange={handleWardChange}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {WARDS.map(w => (
                    <SelectItem key={w.code} value={w.code}>{w.name} ({w.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Property Type <span className="text-red-500">*</span></Label>
              <Select value={form.property_type} onValueChange={handlePropertyTypeChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(pt => (
                    <SelectItem key={pt.code} value={pt.code}>{pt.label} ({pt.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">System Parcel ID</p>
                {generatedParcelNumber ? (
                  <p className="text-xl font-mono font-bold text-primary">{generatedParcelNumber}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select ward & type, then generate</p>
                )}
              </div>
              <Button
                onClick={generateParcelId}
                disabled={!form.ward_code || !form.property_type || isGenerating}
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary hover:text-white shrink-0"
              >
                <Zap className="w-4 h-4" />
                {isGenerating ? "Generating…" : generatedParcelNumber ? "Regenerate" : "Generate ID"}
              </Button>
            </div>
            {generatedParcelNumber && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> System-generated — cannot be manually edited
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Owner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Step 2 — Ownership Information
            <Badge variant="secondary" className="text-xs ml-auto">Restricted Access</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ownership Type</Label>
            <Select value={form.ownership_type} onValueChange={v => set("ownership_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OWNERSHIP_TYPES.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.ownership_type === "family" && (
            <div>
              <Label>Family Name</Label>
              <Input value={form.family_name} onChange={e => set("family_name", e.target.value)} placeholder="e.g. Eze Family" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Owner / Representative Name <span className="text-red-500">*</span></Label>
              <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Full legal name" />
            </div>
            <div>
              <Label>NIN (Private)</Label>
              <Input value={form.owner_nin} onChange={e => set("owner_nin", e.target.value)} placeholder="National ID Number" />
            </div>
            <div>
              <Label>Phone Number (Private)</Label>
              <Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} placeholder="+234..." />
            </div>
            <div>
              <Label>Email (Private)</Label>
              <Input value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="Email address" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Owner personal data (NIN, phone, email) is strictly private and never shown publicly.
          </p>
        </CardContent>
      </Card>

      {/* Step 3: Parcel Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Step 3 — Parcel Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Parcel Title / Description</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Ancestral Home Plot" />
            </div>
            <div>
              <Label>Size (sqm)</Label>
              <Input type="number" step="0.01" value={form.size_sqm} onChange={e => set("size_sqm", e.target.value)} placeholder="e.g. 500" />
            </div>
            <div>
              <Label>Community</Label>
              <Input value={form.community} onChange={e => set("community", e.target.value)} placeholder="Community name" />
            </div>
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
          <div>
            <Label>Address / Location Description <span className="text-red-500">*</span></Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Plot description, street, landmark" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>GPS Latitude</Label>
              <Input type="number" step="0.000001" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="e.g. 5.7564" />
            </div>
            <div>
              <Label>GPS Longitude</Label>
              <Input type="number" step="0.000001" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="e.g. 7.2786" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* GIS Polygon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Step 4 — Parcel Boundary (GIS)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Draw the parcel boundary on the map. Area and perimeter are calculated automatically.
          </p>
          {(polygonData.validationStatus === "conflict_blocked" || polygonData.validationStatus === "invalid_geometry") && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800 font-medium">Spatial conflict detected — this parcel overlaps with an existing registered parcel</p>
            </div>
          )}
          <ParcelPolygonEditor
            value={polygonData.geojsonStr}
            onChange={(geojsonStr, areaSqm, perimeterM, validationStatus, issues) =>
              setPolygonData({ geojsonStr, areaSqm, perimeterM, validationStatus: validationStatus || "not_validated", issues: issues || [] })
            }
            allParcels={allParcels}
            parcel={{ parcel_number: generatedParcelNumber }}
          />
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Step 5 — Documents & Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Survey Plan (PDF/Image)</Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setSurveyFile(e.target.files[0])} />
          </div>
          <div>
            <Label>Site Photos</Label>
            <Input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files))} />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between pb-6">
        <div>
          {!generatedParcelNumber && (
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Generate a Parcel ID before submitting
            </p>
          )}
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!generatedParcelNumber || !form.owner_name || !form.address || createMutation.isPending}
          className="gap-2 bg-green-700 hover:bg-green-800 px-8"
        >
          <Save className="w-4 h-4" />
          {createMutation.isPending ? "Registering…" : "Submit Registration"}
        </Button>
      </div>
    </div>
  );
}