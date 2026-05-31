import React from "react";
import { CheckCircle2, XCircle, Clock, Shield, Mic, PenLine, Camera, Users, Lock } from "lucide-react";

const EVENT_ICONS = {
  "Verbal Consent": Shield,
  "Audio Captured": Mic,
  "Audio Skipped": Mic,
  "Land Data Saved": Clock,
  "Signature Obtained": PenLine,
  "Signature Declined": PenLine,
  "Photo Taken": Camera,
  "Photo Declined": Camera,
  "Witness Recorded": Users,
  "No Witness": Users,
  "Parcel Submitted": CheckCircle2,
  "Community Confirmed": Shield,
};

const EVENT_COLORS = {
  "Verbal Consent": "bg-green-100 text-green-700",
  "Audio Captured": "bg-blue-100 text-blue-700",
  "Audio Skipped": "bg-slate-100 text-slate-500",
  "Land Data Saved": "bg-blue-100 text-blue-700",
  "Signature Obtained": "bg-green-100 text-green-700",
  "Signature Declined": "bg-amber-100 text-amber-700",
  "Photo Taken": "bg-green-100 text-green-700",
  "Photo Declined": "bg-slate-100 text-slate-500",
  "Witness Recorded": "bg-green-100 text-green-700",
  "No Witness": "bg-slate-100 text-slate-500",
  "Parcel Submitted": "bg-primary/10 text-primary",
  "Community Confirmed": "bg-green-100 text-green-700",
};

export default function ConsentTimeline({ timeline }) {
  let entries = [];
  if (typeof timeline === "string") {
    try { entries = JSON.parse(timeline); } catch { entries = []; }
  } else if (Array.isArray(timeline)) {
    entries = timeline;
  }

  if (!entries.length) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No consent timeline recorded for this parcel.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
      <div className="space-y-4">
        {entries.map((entry, idx) => {
          const Icon = EVENT_ICONS[entry.event] || Clock;
          const colorClass = EVENT_COLORS[entry.event] || "bg-slate-100 text-slate-500";
          return (
            <div key={idx} className="flex items-start gap-4 pl-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium text-foreground">{entry.event}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-GB") : "—"}
                  {entry.agent_id && <span className="ml-2">· Agent: {entry.agent_id}</span>}
                  {entry.gps && (() => { try { const g = JSON.parse(entry.gps); return <span className="ml-2">· GPS: {g.lat?.toFixed(4)}, {g.lng?.toFixed(4)}</span>; } catch { return null; } })()}
                </p>
                {entry.notes && <p className="text-xs text-amber-700 mt-1 italic">{entry.notes}</p>}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>Sealed</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}