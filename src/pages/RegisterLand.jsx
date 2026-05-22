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
import { toast } from "sonner";
import { MapPin, Upload, Save, AlertTriangle } from "lucide-react";
import ParcelPolygonEditor from "@/components/gis/ParcelPolygonEditor";

export default function RegisterLand() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    parcel_number: "",
    title: "",
    owner_name: "",
    owner_email: "",
    size_hectares: "",
    address: "",
    state: "",
    lga: "",
    latitude: "",
    longitude: "",
    land_use: "",
    notes: "",
  });
  const [surveyFile, setSurveyFile] = useState(null);
  const [cadFile, setCadFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [polygonData, setPolygonData] = useState({ geojsonStr: null, areaSqm: null, perimeterM: null, validationStatus: "not_validated", issues: [] });

  const { data: allParcels = [] } = useQuery({
    queryKey: ["all-parcels-for-validation"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const createMutation = useMutation({
    mutationFn: async () => {
      let survey_plan_url = "";
      let cad_file_url = "";
      const photoUrls = [];

      if (surveyFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: surveyFile });
        survey_plan_url = file_url;
      }
      if (cadFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: cadFile });
        cad_file_url = file_url;
      }
      for (const photo of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
        photoUrls.push(file_url);
      }

      await base44.entities.LandParcel.create({
        ...form,
        size_hectares: form.size_hectares ? parseFloat(form.size_hectares) : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        survey_plan_url,
        cad_file_url,
        photos: photoUrls,
        registered_by: user?.email,
        status: "pending",
        verification_status: "unverified",
        parcel_boundary: polygonData.geojsonStr || undefined,
        boundary_area: polygonData.areaSqm || undefined,
        boundary_perimeter: polygonData.perimeterM || undefined,
        boundary_source: polygonData.geojsonStr ? "manual_entry" : undefined,
        boundary_capture_date: polygonData.geojsonStr ? new Date().toISOString().split("T")[0] : undefined,
        spatial_validation_status: polygonData.validationStatus,
        spatial_conflict_notes: polygonData.issues?.length > 0 ? JSON.stringify(polygonData.issues) : undefined,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Registered new land parcel ${form.parcel_number}`,
        entity_type: "LandParcel",
      });
    },
    onSuccess: () => {
      toast.success("Land parcel registered successfully");
      navigate("/my-submissions");
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Register New Land Parcel</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit a new land registration for approval</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Parcel Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Parcel Number *</Label>
              <Input value={form.parcel_number} onChange={(e) => set("parcel_number", e.target.value)} placeholder="e.g. LAG/2025/001" />
            </div>
            <div>
              <Label>Land Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Land title" />
            </div>
            <div>
              <Label>Owner Name *</Label>
              <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Owner Email</Label>
              <Input value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} placeholder="Email" />
            </div>
            <div>
              <Label>Size (Hectares)</Label>
              <Input type="number" step="0.01" value={form.size_hectares} onChange={(e) => set("size_hectares", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Land Use</Label>
              <Select value={form.land_use} onValueChange={(v) => set("land_use", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Address *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State" />
            </div>
            <div>
              <Label>LGA</Label>
              <Input value={form.lga} onChange={(e) => set("lga", e.target.value)} placeholder="Local Government Area" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="0.000001" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="e.g. 6.5244" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="0.000001" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="e.g. 3.3792" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." />
          </div>
        </CardContent>
      </Card>

      {/* Polygon Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Parcel Boundary (GIS Polygon)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Draw the parcel boundary on the map. Click vertices to define the polygon shape. Area and perimeter are calculated automatically.
          </p>
          {polygonData.validationStatus === "conflict_blocked" || polygonData.validationStatus === "invalid_geometry" ? (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800 font-medium">Spatial conflicts detected — submission may be reviewed more carefully</p>
            </div>
          ) : null}
          <ParcelPolygonEditor
            value={polygonData.geojsonStr}
            onChange={(geojsonStr, areaSqm, perimeterM, validationStatus, issues) =>
              setPolygonData({ geojsonStr, areaSqm, perimeterM, validationStatus: validationStatus || "not_validated", issues: issues || [] })
            }
            allParcels={allParcels}
            parcel={{ parcel_number: form.parcel_number }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Documents & Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Survey Plan (PDF/Image)</Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSurveyFile(e.target.files[0])} />
          </div>
          <div>
            <Label>CAD/Technical Drawing (PDF)</Label>
            <Input type="file" accept=".pdf,.dwg,.dxf" onChange={(e) => setCadFile(e.target.files[0])} />
          </div>
          <div>
            <Label>Photos (Multiple)</Label>
            <Input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files))} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!form.parcel_number || !form.owner_name || !form.address || createMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {createMutation.isPending ? "Submitting..." : "Submit Registration"}
        </Button>
      </div>
    </div>
  );
}