import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Loader2, Shield, Navigation, CheckCircle2 } from "lucide-react";

const EVIDENCE_TYPES = [
  "verbal_consent","audio_consent","signature","thumb_impression",
  "representative_photo","witness_record","village_head_validation",
  "supporting_document","survey_photo","boundary_photo","other"
];

const WITNESS_ROLES = ["family_witness","community_witness","village_head","kindred_head","none"];

export default function EvidenceUpload() {
  const [searchParams] = useSearchParams();
  const parcelId = searchParams.get("parcel_id");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    evidence_type: "supporting_document", description: "",
    witness_name: "", witness_phone: "", witness_role: "none",
    gps_lat: "", gps_lng: "",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcel-ev", parcelId],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id: parcelId }),
    enabled: !!parcelId,
  });
  const parcel = parcels[0];

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setForm(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude })); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let file_url = "";
      let file_name = "";
      let file_type = "";
      if (file) {
        const { file_url: url } = await base44.integrations.Core.UploadFile({ file });
        file_url = url;
        file_name = file.name;
        file_type = file.type;
      }
      const payload = {
        parcel_id: parcelId,
        parcel_number: parcel?.parcel_number,
        ...form,
        file_url,
        file_name,
        file_type,
        captured_by_email: user?.email,
        captured_by_name: user?.full_name,
        captured_at: new Date().toISOString(),
        gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
        gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
        device_id: navigator.userAgent?.slice(0, 100),
        is_immutable: true,
      };
      return base44.entities.EvidenceVault.create(payload);
    },
    onSuccess: () => {
      setUploading(false);
      setDone(true);
      qc.invalidateQueries({ queryKey: ["lv-evidence-parcel", parcelId] });
      setTimeout(() => navigate(-1), 1500);
    },
    onError: () => setUploading(false),
  });

  if (done) {
    return (
      <div className="max-w-sm mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold">Evidence Saved</h2>
        <p className="text-sm text-muted-foreground">Evidence has been permanently recorded in the vault.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Upload Evidence</h1>
          <p className="text-sm text-muted-foreground">{parcel?.parcel_number || parcelId || "Evidence Vault"}</p>
        </div>
      </div>

      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">Evidence is immutable once submitted. No edits or deletions are permitted after upload.</p>
        </CardContent>
      </Card>

      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Evidence Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Evidence Type *</Label>
              <Select value={form.evidence_type} onValueChange={v => set("evidence_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description…" />
            </div>
            <div>
              <Label className="text-xs">File</Label>
              <input type="file" accept="image/*,audio/*,application/pdf,.pdf" onChange={e => setFile(e.target.files[0])}
                className="w-full mt-1 text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Witness (Optional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Witness Name</Label><Input value={form.witness_name} onChange={e => set("witness_name", e.target.value)} /></div>
              <div><Label className="text-xs">Witness Phone</Label><Input value={form.witness_phone} onChange={e => set("witness_phone", e.target.value)} /></div>
              <div className="col-span-2">
                <Label className="text-xs">Witness Role</Label>
                <Select value={form.witness_role} onValueChange={v => set("witness_role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WITNESS_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-2 text-xs">
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} Capture GPS
              </Button>
              {form.gps_lat && <span className="text-xs text-muted-foreground font-mono">{Number(form.gps_lat).toFixed(5)}, {Number(form.gps_lng).toFixed(5)}</span>}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={uploading || saveMutation.isPending} className="w-full h-12 text-base font-semibold bg-violet-600 hover:bg-violet-700 gap-2">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Submit Evidence</>}
        </Button>
      </form>
    </div>
  );
}