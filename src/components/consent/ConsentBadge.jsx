import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Clock, CheckCircle2 } from "lucide-react";
import ConsentTimeline from "./ConsentTimeline";

export default function ConsentBadge({ parcel, canViewMedia = false }) {
  const [open, setOpen] = useState(false);
  const score = parcel?.consent_strength_score;
  const confidence = parcel?.consent_confidence;
  const pending = parcel?.community_confirmation_pending && !parcel?.community_confirmed;

  if (score == null && !confidence) return null;

  const badgeClass =
    confidence === "HIGH" ? "bg-green-100 text-green-800 border-green-300 cursor-pointer hover:bg-green-200"
    : confidence === "MEDIUM" ? "bg-amber-100 text-amber-800 border-amber-300 cursor-pointer hover:bg-amber-200"
    : "bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200";

  const Icon = confidence === "HIGH" ? CheckCircle2 : confidence === "MEDIUM" ? Clock : Shield;

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          onClick={() => setOpen(true)}
          className={`${badgeClass} gap-1.5 border text-xs font-semibold px-2.5 py-1`}
        >
          <Icon className="w-3 h-3" />
          Consent: {confidence || "—"} ({score ?? "?"}%)
        </Badge>
        {pending && (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 border text-xs gap-1">
            <Clock className="w-3 h-3" /> Community Confirmation Pending
          </Badge>
        )}
        {parcel?.community_confirmed && (
          <Badge className="bg-green-100 text-green-800 border-green-300 border text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" /> Community Confirmed
          </Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Consent Record — {parcel?.parcel_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Verbal", value: parcel?.verbal_consent ? "✓" : "✗" },
                { label: "Signature", value: (parcel?.consent_signature && !parcel?.sign_declined) ? "✓" : parcel?.sign_declined ? "Declined" : "✗" },
                { label: "Photo", value: (parcel?.consent_photo && !parcel?.photo_declined) ? "✓" : parcel?.photo_declined ? "Declined" : "✗" },
                { label: "Audio", value: (parcel?.consent_audio && !parcel?.audio_declined) ? "✓ (+10)" : parcel?.audio_declined ? "Skipped" : "✗" },
                { label: "Witness", value: parcel?.witness_name ? `✓ (${parcel.witness_role?.replace(/_/g, " ")})` : "None" },
                { label: "Community", value: parcel?.community_confirmed ? "✓" : parcel?.community_confirmation_pending ? "Pending" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted p-2">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Consent Timeline (Immutable)</p>
              <ConsentTimeline timeline={parcel?.consent_timeline} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}