import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PenLine, Camera, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => { e.preventDefault(); drawing.current = true; const { x, y } = getPos(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { e.preventDefault(); if (!drawing.current) return; setHasStrokes(true); const { x, y } = getPos(e); const ctx = canvasRef.current.getContext("2d"); ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) { toast.error("Please draw a signature first"); return; }
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          width={560}
          height={200}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground pointer-events-none select-none">
          Sign here with finger or stylus
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} className="gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </Button>
        <Button onClick={save} disabled={!hasStrokes} className="gap-1.5 bg-green-700 hover:bg-green-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> Accept Signature
        </Button>
      </div>
    </div>
  );
}

export default function Stage4Signature({ onComplete }) {
  const [mode, setMode] = useState(null); // "signature" | "thumb" | "declined"
  const [signatureData, setSignatureData] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [declineNotes, setDeclineNotes] = useState("");

  const handleThumbPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (mode === "signature" && signatureData) {
      onComplete({ signatureData, thumbFile: null, declined: false });
    } else if (mode === "thumb" && thumbFile) {
      const reader = new FileReader();
      reader.onload = () => onComplete({ signatureData: reader.result, thumbFile, declined: false });
      reader.readAsDataURL(thumbFile);
    } else if (mode === "declined") {
      onComplete({ signatureData: null, thumbFile: null, declined: true, declineNotes });
    } else {
      toast.error("Please complete or decline the signature step");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stage 4 — Signature or Thumb Impression</h2>
        <p className="text-sm text-muted-foreground mt-1">Please ask the representative to sign below.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "signature", icon: PenLine, label: "Finger / Stylus Signature" },
          { key: "thumb", icon: Camera, label: "Thumb Impression (Photo)" },
          { key: "declined", icon: AlertTriangle, label: "Representative Declines to Sign" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setSignatureData(null); setThumbFile(null); setThumbPreview(null); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
              mode === key
                ? key === "declined"
                  ? "border-amber-500 bg-amber-50 text-amber-800"
                  : "border-green-500 bg-green-50 text-green-800"
                : "border-border hover:border-primary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-6 h-6" />
            {label}
          </button>
        ))}
      </div>

      {mode === "signature" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Draw Signature</CardTitle></CardHeader>
          <CardContent>
            {signatureData ? (
              <div className="space-y-3">
                <img src={signatureData} alt="Signature" className="border rounded-lg w-full max-h-48 object-contain bg-white" />
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Signature captured</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSignatureData(null)}>Re-draw</Button>
              </div>
            ) : (
              <SignaturePad onSave={setSignatureData} />
            )}
          </CardContent>
        </Card>
      )}

      {mode === "thumb" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Photograph Thumb Impression</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Ask the representative to place their thumb on a flat surface. Photograph the impression.</p>
            <input type="file" accept="image/*" capture="environment" onChange={handleThumbPhoto} className="text-sm" />
            {thumbPreview && (
              <div className="space-y-2">
                <img src={thumbPreview} alt="Thumb" className="rounded-lg max-h-48 object-contain border" />
                <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">Photo captured</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "declined" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-800">Representative Declines to Sign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-amber-700">Representative is present but declines to sign. Add notes to document the reason.</p>
            <div>
              <Label className="text-xs">Reason / Notes (required for record)</Label>
              <Textarea
                value={declineNotes}
                onChange={e => setDeclineNotes(e.target.value)}
                placeholder="e.g. Representative states they do not sign documents on religious grounds. Witness confirmed presence."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {mode && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={
              (mode === "signature" && !signatureData) ||
              (mode === "thumb" && !thumbFile)
            }
            className="gap-2 bg-green-700 hover:bg-green-800"
          >
            <CheckCircle2 className="w-4 h-4" /> Save & Continue
          </Button>
        </div>
      )}
    </div>
  );
}