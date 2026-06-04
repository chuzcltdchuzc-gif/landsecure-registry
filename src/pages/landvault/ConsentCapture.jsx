/**
 * SECTION H — LandVault Consent Capture Module
 * Verbal consent, audio, signature, photo, witness, scoring, timeline.
 */
import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Mic, MicOff, Camera, Pen, User, Users, AlertTriangle, Shield, Clock } from "lucide-react";

const WITNESS_ROLES = ["family_witness","community_witness","village_head","kindred_head"];

function computeConsentScore(state) {
  let score = 0;
  if (state.verbal_consent) score += 25;
  if (state.consent_audio_captured) score += 20;
  else if (state.consent_audio_declined) score += 5;
  if (state.consent_signature_captured) score += 20;
  else if (state.consent_signature_declined) score += 5;
  if (state.consent_photo_captured) score += 15;
  else if (state.consent_photo_declined) score += 3;
  if (state.consent_witness_name) score += 15;
  score = Math.min(100, score);
  const confidence = score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  return { score, confidence };
}

function ScoreMeter({ score, confidence }) {
  const color = confidence === "HIGH" ? "bg-emerald-500" : confidence === "MEDIUM" ? "bg-yellow-500" : "bg-red-500";
  const textColor = confidence === "HIGH" ? "text-emerald-700" : confidence === "MEDIUM" ? "text-yellow-700" : "text-red-700";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold">Consent Strength</span>
        <span className={`text-xs font-bold ${textColor}`}>{score}/100 — {confidence}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ConsentCapture({ parcelId, onSave }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const [state, setState] = useState({
    verbal_consent: false,
    consent_audio_captured: false, consent_audio_declined: false,
    consent_signature_captured: false, consent_signature_declined: false,
    consent_photo_captured: false, consent_photo_declined: false,
    consent_witness_name: "", consent_witness_phone: "", consent_witness_role: "family_witness",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: existing = [] } = useQuery({
    queryKey: ["lv-parcel-consent", parcelId],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id: parcelId }),
    enabled: !!parcelId,
  });
  const parcel = existing[0];

  const addToTimeline = (action, details = {}) => {
    const event = {
      timestamp: new Date().toISOString(),
      actor_email: user?.email,
      actor_name: user?.full_name,
      actor_role: user?.role,
      action,
      ...details,
    };
    setTimeline(prev => [...prev, event]);
    return event;
  };

  const set = (k, v) => setState(s => ({ ...s, [k]: v }));

  const handleVerbalConsent = () => {
    set("verbal_consent", true);
    addToTimeline("VERBAL_CONSENT_RECORDED", { verbal_gps: null });
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      set("consent_audio_captured", true);
      addToTimeline("AUDIO_CONSENT_RECORDED");
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSignatureUpload = (e) => {
    const f = e.target.files[0];
    if (f) {
      setSignatureFile(f);
      set("consent_signature_captured", true);
      addToTimeline("SIGNATURE_CAPTURED");
    }
  };

  const handlePhotoUpload = (e) => {
    const f = e.target.files[0];
    if (f) {
      setPhotoFile(f);
      set("consent_photo_captured", true);
      addToTimeline("PHOTO_CONSENT_CAPTURED");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { score, confidence } = computeConsentScore(state);
    const consentTimeline = [...timeline];

    // Upload audio if recorded
    let audioUploadUrl = "";
    if (audioBlob) {
      const audioFile = new File([audioBlob], "consent_audio.webm", { type: "audio/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
      audioUploadUrl = file_url;
      // Store in EvidenceVault
      await base44.entities.EvidenceVault.create({
        parcel_id: parcelId, parcel_number: parcel?.parcel_number,
        evidence_type: "audio_consent", file_url: audioUploadUrl,
        file_name: "consent_audio.webm", file_type: "audio/webm",
        captured_by_email: user?.email, captured_by_name: user?.full_name,
        captured_by_role: user?.role, captured_at: new Date().toISOString(),
        is_immutable: true, seal_status: "SEALED", sealed_at: new Date().toISOString(),
        sealed_by: user?.email, custody_chain: JSON.stringify([{ timestamp: new Date().toISOString(), actor_email: user?.email, action: "AUDIO_CONSENT_SUBMITTED" }]),
      });
    }

    // Upload signature
    if (signatureFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: signatureFile });
      await base44.entities.EvidenceVault.create({
        parcel_id: parcelId, parcel_number: parcel?.parcel_number,
        evidence_type: "signature", file_url,
        file_name: signatureFile.name, file_type: signatureFile.type,
        captured_by_email: user?.email, captured_by_name: user?.full_name,
        captured_by_role: user?.role, captured_at: new Date().toISOString(),
        is_immutable: true, seal_status: "SEALED", sealed_at: new Date().toISOString(),
        sealed_by: user?.email, custody_chain: JSON.stringify([{ timestamp: new Date().toISOString(), actor_email: user?.email, action: "SIGNATURE_SUBMITTED" }]),
      });
    }

    // Upload photo
    if (photoFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
      await base44.entities.EvidenceVault.create({
        parcel_id: parcelId, parcel_number: parcel?.parcel_number,
        evidence_type: "representative_photo", file_url,
        file_name: photoFile.name, file_type: photoFile.type,
        captured_by_email: user?.email, captured_by_name: user?.full_name,
        captured_by_role: user?.role, captured_at: new Date().toISOString(),
        is_immutable: true, seal_status: "SEALED", sealed_at: new Date().toISOString(),
        sealed_by: user?.email, custody_chain: JSON.stringify([{ timestamp: new Date().toISOString(), actor_email: user?.email, action: "PHOTO_SUBMITTED" }]),
      });
    }

    // Update parcel with consent fields
    await base44.entities.LandVaultParcel.update(parcelId, {
      ...state,
      consent_strength_score: score,
      consent_confidence: confidence,
      consent_timeline: JSON.stringify(consentTimeline),
      consent_verbal: state.verbal_consent,
      consent_verbal_timestamp: consentTimeline.find(e => e.action === "VERBAL_CONSENT_RECORDED")?.timestamp,
      consent_verbal_agent: user?.email,
    });

    qc.invalidateQueries({ queryKey: ["lv-parcel-consent", parcelId] });
    setSaving(false);
    if (onSave) onSave();
  };

  const { score, confidence } = computeConsentScore(state);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Consent Capture</h2>
          <p className="text-xs text-muted-foreground">Record all consent evidence for this parcel</p>
        </div>
      </div>

      <ScoreMeter score={score} confidence={confidence} />

      {/* Step 1 — Verbal Consent */}
      <Card className={`border-0 shadow-sm ${state.verbal_consent ? "bg-emerald-50 border-emerald-200" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${state.verbal_consent ? "text-emerald-600" : "text-muted-foreground"}`} />
            Step 1 — Verbal Consent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!state.verbal_consent ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-2" onClick={handleVerbalConsent}>
              <CheckCircle2 className="w-3 h-3" /> Record Verbal Consent
            </Button>
          ) : (
            <p className="text-xs text-emerald-700 font-medium">✓ Verbal consent recorded at {new Date().toLocaleTimeString("en-NG")}</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Audio */}
      <Card className={`border-0 shadow-sm ${state.consent_audio_captured ? "bg-emerald-50" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className={`w-4 h-4 ${state.consent_audio_captured ? "text-emerald-600" : "text-muted-foreground"}`} />
            Step 2 — Audio Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!state.consent_audio_declined && !state.consent_audio_captured && (
            <div className="flex gap-2">
              {!recording ? (
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={startRecording}><Mic className="w-3 h-3" /> Start Recording</Button>
              ) : (
                <Button size="sm" className="text-xs gap-1 bg-red-500 hover:bg-red-600" onClick={stopRecording}><MicOff className="w-3 h-3 animate-pulse" /> Stop</Button>
              )}
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { set("consent_audio_declined", true); addToTimeline("AUDIO_DECLINED"); }}>
                Declined
              </Button>
            </div>
          )}
          {state.consent_audio_captured && audioUrl && (
            <div><audio controls src={audioUrl} className="w-full h-8" /><p className="text-xs text-emerald-700 mt-1">✓ Audio recorded</p></div>
          )}
          {state.consent_audio_declined && <p className="text-xs text-amber-700">⚠ Representative declined audio consent</p>}
        </CardContent>
      </Card>

      {/* Step 3 — Signature */}
      <Card className={`border-0 shadow-sm ${state.consent_signature_captured ? "bg-emerald-50" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pen className={`w-4 h-4 ${state.consent_signature_captured ? "text-emerald-600" : "text-muted-foreground"}`} />
            Step 3 — Signature / Thumb
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!state.consent_signature_declined && !state.consent_signature_captured && (
            <div className="flex gap-2 flex-wrap">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-input hover:bg-accent font-medium"><Pen className="w-3 h-3" /> Upload Signature / Thumb</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
              </label>
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { set("consent_signature_declined", true); addToTimeline("SIGNATURE_DECLINED"); }}>
                Declined
              </Button>
            </div>
          )}
          {state.consent_signature_captured && <p className="text-xs text-emerald-700">✓ Signature captured: {signatureFile?.name}</p>}
          {state.consent_signature_declined && <p className="text-xs text-amber-700">⚠ Representative declined to sign</p>}
        </CardContent>
      </Card>

      {/* Step 4 — Photo */}
      <Card className={`border-0 shadow-sm ${state.consent_photo_captured ? "bg-emerald-50" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className={`w-4 h-4 ${state.consent_photo_captured ? "text-emerald-600" : "text-muted-foreground"}`} />
            Step 4 — Representative Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!state.consent_photo_declined && !state.consent_photo_captured && (
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-input hover:bg-accent font-medium"><Camera className="w-3 h-3" /> Capture Photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { set("consent_photo_declined", true); addToTimeline("PHOTO_DECLINED"); }}>
                Declined
              </Button>
            </div>
          )}
          {state.consent_photo_captured && <p className="text-xs text-emerald-700">✓ Photo captured: {photoFile?.name}</p>}
          {state.consent_photo_declined && <p className="text-xs text-amber-700">⚠ Photo consent declined</p>}
        </CardContent>
      </Card>

      {/* Step 5 — Witness */}
      <Card className={`border-0 shadow-sm ${state.consent_witness_name ? "bg-emerald-50" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className={`w-4 h-4 ${state.consent_witness_name ? "text-emerald-600" : "text-muted-foreground"}`} />
            Step 5 — Witness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Witness Name</Label><Input value={state.consent_witness_name} onChange={e => set("consent_witness_name", e.target.value)} /></div>
            <div><Label className="text-xs">Witness Phone</Label><Input value={state.consent_witness_phone} onChange={e => set("consent_witness_phone", e.target.value)} /></div>
            <div className="col-span-2">
              <Label className="text-xs">Witness Role</Label>
              <Select value={state.consent_witness_role} onValueChange={v => { set("consent_witness_role", v); addToTimeline("WITNESS_ADDED", { witness_role: v }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WITNESS_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline preview */}
      {timeline.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Consent Timeline ({timeline.length} events)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[10px] w-14 shrink-0">{new Date(ev.timestamp).toLocaleTimeString("en-NG")}</span>
                  <span className="font-medium">{ev.action?.replace(/_/g," ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-base font-semibold gap-2" disabled={saving || !state.verbal_consent} onClick={handleSave}>
        {saving ? "Saving consent…" : <><Shield className="w-4 h-4" /> Save Consent Record</>}
      </Button>
      {!state.verbal_consent && <p className="text-xs text-center text-muted-foreground">Verbal consent (Step 1) is required before saving.</p>}
    </div>
  );
}