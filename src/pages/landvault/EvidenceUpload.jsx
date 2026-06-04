import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Loader2, Shield, Navigation, CheckCircle2, Lock, AlertTriangle } from "lucide-react";

const EVIDENCE_TYPES = [
  "verbal_consent","audio_consent","signature","thumb_impression",
  "representative_photo","witness_record","village_head_validation",
  "authority_document","supporting_document","survey_photo","boundary_photo","other"
];

const WITNESS_ROLES = ["family_witness","community_witness","village_head","kindred_head","none"];

// SECTION E — SHA-256 hash generation in browser
async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// SECTION D — GPS LGA bounds for Ehime Mbano
const EHM_BOUNDS = { minLat: 5.55, maxLat: 5.85, minLng: 7.20, maxLng: 7.55 };
function checkInsideLGA(lat, lng) {
  if (!lat || !lng) return null;
  return lat >= EHM_BOUNDS.minLat && lat <= EHM_BOUNDS.maxLat &&
         lng >= EHM_BOUNDS.minLng && lng <= EHM_BOUNDS.maxLng;
}

export default function EvidenceUpload() {
  const [searchParams] = useSearchParams();
  const parcelId = searchParams.get("parcel_id");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [computedHash, setComputedHash] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsWarning, setGpsWarning] = useState("");
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    evidence_type: "supporting_document",
    description: "",
    witness_name: "", witness_phone: "", witness_role: "none",
    gps_lat: "", gps_lng: "",
    gps_accuracy_m: "", gps_timestamp: "",
    gps_confidence: "MEDIUM",
    gps_inside_lga: null,
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Count existing evidence for sequence number
  const { data: existingEvidence = [] } = useQuery({
    queryKey: ["lv-evidence-count", parcelId],
    queryFn: () => base44.entities.EvidenceVault.filter({ parcel_id: parcelId }),
    enabled: !!parcelId,
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcel-ev", parcelId],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id: parcelId }),
    enabled: !!parcelId,
  });
  const parcel = parcels[0];

  // SECTION E — Auto-hash on file select
  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) { setFile(null); setComputedHash(""); return; }
    setFile(f);
    setHashing(true);
    const hash = await computeSHA256(f);
    setComputedHash(hash);
    setHashing(false);
  };

  // SECTION D — GPS capture with metadata
  const captureGPS = () => {
    setGpsLoading(true);
    setGpsWarning("");
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const inside = checkInsideLGA(lat, lng);
        let confidence = accuracy <= 20 ? "HIGH" : accuracy <= 50 ? "MEDIUM" : "LOW";
        let warning = "";
        if (accuracy > 100) warning = `⚠ GPS accuracy is ${Math.round(accuracy)}m — poor signal.`;
        if (inside === false) warning += " ⚠ GPS outside Ehime Mbano LGA.";
        setGpsWarning(warning);
        setForm(f => ({
          ...f, gps_lat: lat, gps_lng: lng,
          gps_accuracy_m: Math.round(accuracy),
          gps_timestamp: new Date().toISOString(),
          gps_confidence: confidence,
          gps_inside_lga: inside,
        }));
        setGpsLoading(false);
      },
      () => { setGpsWarning("GPS unavailable."); setGpsLoading(false); },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let file_url = "";
      let file_name = "";
      let file_type = "";
      let file_size_bytes = 0;
      if (file) {
        const { file_url: url } = await base44.integrations.Core.UploadFile({ file });
        file_url = url;
        file_name = file.name;
        file_type = file.type;
        file_size_bytes = file.size;
      }
      const now = new Date().toISOString();
      const sequenceNum = existingEvidence.length + 1;

      // SECTION G — Chain of custody initial entry
      const custodyEntry = {
        timestamp: now,
        actor_email: user?.email,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action: "EVIDENCE_SUBMITTED",
        gps: form.gps_lat ? { lat: form.gps_lat, lng: form.gps_lng } : null,
        device: navigator.userAgent?.slice(0, 80),
        file_hash: computedHash,
      };

      const payload = {
        parcel_id: parcelId,
        parcel_number: parcel?.parcel_number,
        ...form,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        captured_by_email: user?.email,
        captured_by_name: user?.full_name,
        captured_by_role: user?.role,
        captured_at: now,
        gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
        gps_lng: form.gps_lng ? Number(form.gps_lng) : undefined,
        gps_accuracy_m: form.gps_accuracy_m ? Number(form.gps_accuracy_m) : undefined,
        gps_timestamp: form.gps_timestamp || now,
        gps_confidence: form.gps_confidence,
        gps_inside_lga: form.gps_inside_lga,
        gps_spoofing_flag: false,
        device_id: navigator.userAgent?.slice(0, 100),
        network_status: navigator.onLine ? "online" : "offline",
        // SECTION E — Hash
        hash_fingerprint: computedHash,
        hash_algorithm: "SHA-256",
        hash_verified_at: now,
        // SECTION F — Sealing
        is_immutable: true,
        seal_status: "SEALED",
        sealed_at: now,
        sealed_by: user?.email,
        // SECTION G — Sequence + custody
        evidence_sequence: sequenceNum,
        custody_chain: JSON.stringify([custodyEntry]),
      };
      return base44.entities.EvidenceVault.create(payload);
    },
    onSuccess: () => {
      setUploading(false);
      setDone(true);
      qc.invalidateQueries({ queryKey: ["lv-evidence-parcel", parcelId] });
      qc.invalidateQueries({ queryKey: ["lv-evidence-count", parcelId] });
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
        <h2 className="text-xl font-bold">Evidence Sealed</h2>
        <p className="text-sm text-muted-foreground">Evidence has been permanently sealed in the vault. SHA-256 hash recorded.</p>
        {computedHash && <p className="text-[10px] font-mono text-muted-foreground break-all px-4">{computedHash}</p>}
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

      {/* SECTION F — Seal warning */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Evidence is sealed on submission</p>
            <p className="text-xs text-amber-700">No edits, replacements, or deletions are permitted after upload. A SHA-256 hash is computed and stored permanently.</p>
          </div>
        </CardContent>
      </Card>

      {/* Evidence sequence badge */}
      <div className="text-xs text-muted-foreground px-1">
        Evidence item #{existingEvidence.length + 1} for this parcel
      </div>

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
              <Label className="text-xs">File *</Label>
              <input type="file" accept="image/*,audio/*,application/pdf,.pdf" onChange={handleFileChange}
                className="w-full mt-1 text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer" />
            </div>
            {/* SECTION E — Hash display */}
            {hashing && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Computing SHA-256…</p>}
            {computedHash && !hashing && (
              <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200">
                <p className="text-[10px] text-emerald-700 font-semibold mb-0.5">SHA-256 Hash (stored permanently):</p>
                <p className="text-[9px] font-mono text-emerald-700 break-all">{computedHash}</p>
              </div>
            )}
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

        {/* SECTION D — GPS with LGA validation */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-2 text-xs">
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} Capture GPS
              </Button>
              {form.gps_lat && (
                <span className="text-xs text-muted-foreground font-mono">
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
          </CardContent>
        </Card>

        <Button type="submit" disabled={uploading || saveMutation.isPending || !file} className="w-full h-12 text-base font-semibold bg-violet-600 hover:bg-violet-700 gap-2">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading & Sealing…</> : <><Shield className="w-4 h-4" />Seal Evidence</>}
        </Button>
      </form>
    </div>
  );
}