import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, SkipForward, CheckCircle2, Square } from "lucide-react";
import { toast } from "sonner";

export default function Stage3AudioConsent({ onComplete }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach(t => t.stop());
    };
    mr.start();
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(s => {
        if (s >= 10) { stopRecording(); return s; }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleSave = () => {
    if (!audioBlob) { toast.error("Record audio first"); return; }
    onComplete({ audioBlob, skipped: false });
  };

  const handleSkip = () => {
    onComplete({ audioBlob: null, skipped: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stage 3 — Audio Consent <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h2>
        <p className="text-sm text-muted-foreground mt-1">Ask the representative to speak the consent phrase, then record.</p>
      </div>

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="py-5 px-5">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Ask the representative to say aloud:</p>
          <p className="text-lg font-medium text-blue-900 italic">"I agree to register this land."</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Audio Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!audioBlob ? (
            <div className="flex flex-col items-center gap-4 py-4">
              {recording ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-400 flex items-center justify-center animate-pulse">
                    <Mic className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-red-600">Recording… {elapsed}s / 10s max</p>
                  <Button onClick={stopRecording} variant="outline" className="border-red-300 text-red-700 gap-2">
                    <Square className="w-4 h-4" /> Stop Recording
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <MicOff className="w-8 h-8 text-slate-400" />
                  </div>
                  <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 gap-2">
                    <Mic className="w-4 h-4" /> Press to Record (5–10 seconds)
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Audio captured successfully</span>
              </div>
              <audio src={audioUrl} controls className="w-full" />
              <Button variant="ghost" size="sm" onClick={() => { setAudioBlob(null); setAudioUrl(null); }}>
                Re-record
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={handleSkip} className="gap-2 text-muted-foreground">
          <SkipForward className="w-4 h-4" /> Skip audio — not required
        </Button>
        <Button onClick={handleSave} disabled={!audioBlob} className="gap-2 bg-green-700 hover:bg-green-800">
          <CheckCircle2 className="w-4 h-4" /> Save & Continue
        </Button>
      </div>
    </div>
  );
}