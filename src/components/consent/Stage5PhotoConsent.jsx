import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, XCircle, Mic } from "lucide-react";
import { toast } from "sonner";

export default function Stage5PhotoConsent({ onComplete }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [declined, setDeclined] = useState(false);

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setDeclined(false);
  };

  const handleSave = () => {
    if (!photoFile && !declined) { toast.error("Take a photo or select Decline"); return; }
    onComplete({ photoFile, declined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stage 5 — Photo Consent</h2>
        <p className="text-sm text-muted-foreground mt-1">Read the statement aloud, then take action based on the representative's response.</p>
      </div>

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="py-6 px-5">
          <div className="flex items-start gap-3 mb-3">
            <Mic className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Read aloud to the representative</p>
          </div>
          <p className="text-base font-medium text-blue-900 leading-relaxed">
            "We can take a photo of you here today. This photo will never appear on the public website and will only ever be seen by authorised staff if there is a formal dispute about this land. Would you like to proceed?"
          </p>
        </CardContent>
      </Card>

      {!declined && !photoPreview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors">
              <Camera className="w-8 h-8 text-green-700" />
              <span className="text-sm font-medium text-green-800">Take Photo Now</span>
              <span className="text-xs text-muted-foreground text-center">Opens camera to photograph representative</span>
            </div>
            <input type="file" accept="image/*" capture="user" onChange={handlePhotoCapture} className="hidden" />
          </label>
          <button
            onClick={() => { setDeclined(true); setPhotoFile(null); setPhotoPreview(null); }}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <XCircle className="w-8 h-8 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Decline Photo</span>
            <span className="text-xs text-muted-foreground text-center">Representative opts out of photo</span>
          </button>
        </div>
      )}

      {photoPreview && (
        <div className="space-y-3">
          <img src={photoPreview} alt="Consent photo" className="rounded-xl border max-h-64 object-contain w-full bg-slate-50" />
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Photo captured — stored privately</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>Retake</Button>
        </div>
      )}

      {declined && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 border">
          <XCircle className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-sm font-medium">Photo declined</p>
            <p className="text-xs text-muted-foreground">Representative opted out. This is recorded on the consent timeline.</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setDeclined(false)}>Undo</Button>
        </div>
      )}

      {(photoFile || declined) && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2 bg-green-700 hover:bg-green-800">
            <CheckCircle2 className="w-4 h-4" /> Save & Continue
          </Button>
        </div>
      )}
    </div>
  );
}