/**
 * SECTION F+G — Evidence Seal Status, Lock Indicator, Chain of Custody viewer
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Shield, CheckCircle2, AlertTriangle, Clock, User, MapPin, Smartphone, Wifi } from "lucide-react";

const EVIDENCE_TYPE_LABELS = {
  verbal_consent: "Verbal Consent",
  audio_consent: "Audio Consent",
  signature: "Signature",
  thumb_impression: "Thumb Impression",
  representative_photo: "Representative Photo",
  witness_record: "Witness Record",
  village_head_validation: "Village Head Validation",
  authority_document: "Authority Document",
  supporting_document: "Supporting Document",
  survey_photo: "Survey Photo",
  boundary_photo: "Boundary Photo",
  other: "Other",
};

function CustodyEvent({ event, index }) {
  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">{index + 1}</div>
        <div className="w-0.5 bg-border flex-1 mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold">{event.action?.replace(/_/g," ")}</span>
          <span className="text-[10px] text-muted-foreground">{event.timestamp ? new Date(event.timestamp).toLocaleString("en-NG") : ""}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          <User className="w-3 h-3 inline mr-1" />{event.actor_name || event.actor_email}
          {event.actor_role && <span className="ml-1 text-[10px]">({event.actor_role})</span>}
        </p>
        {event.gps && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />{Number(event.gps.lat).toFixed(5)}, {Number(event.gps.lng).toFixed(5)}
          </p>
        )}
        {event.file_hash && (
          <p className="text-[9px] font-mono text-muted-foreground mt-0.5 truncate">SHA-256: {event.file_hash}</p>
        )}
      </div>
    </div>
  );
}

export default function EvidenceDetail({ evidenceId, parcelId }) {
  const { data: items = [] } = useQuery({
    queryKey: ["lv-evidence-detail", evidenceId || parcelId],
    queryFn: () => evidenceId
      ? base44.entities.EvidenceVault.filter({ id: evidenceId })
      : base44.entities.EvidenceVault.filter({ parcel_id: parcelId }),
    enabled: !!(evidenceId || parcelId),
  });

  const records = items;

  if (records.length === 0) return (
    <div className="text-center py-8 text-sm text-muted-foreground">No evidence records found.</div>
  );

  return (
    <div className="space-y-4">
      {records.map(ev => {
        let custodyEvents = [];
        try { custodyEvents = ev.custody_chain ? JSON.parse(ev.custody_chain) : []; } catch {}

        return (
          <Card key={ev.id} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Evidence #{ev.evidence_sequence || "—"}</p>
                  <h3 className="text-sm font-semibold">{EVIDENCE_TYPE_LABELS[ev.evidence_type] || ev.evidence_type}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* SECTION F — Seal status indicator */}
                  {ev.seal_status === "SEALED" ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <Lock className="w-3 h-3" /> SEALED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      <AlertTriangle className="w-3 h-3" /> PENDING
                    </span>
                  )}
                  {ev.is_immutable && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      <Shield className="w-3 h-3" /> IMMUTABLE
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Core metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Uploaded by</p>
                  <p className="font-medium">{ev.captured_by_name || ev.captured_by_email}</p>
                  {ev.captured_by_role && <p className="text-muted-foreground text-[10px]">{ev.captured_by_role}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Sealed at</p>
                  <p className="font-medium">{ev.sealed_at ? new Date(ev.sealed_at).toLocaleString("en-NG") : ev.captured_at ? new Date(ev.captured_at).toLocaleString("en-NG") : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File</p>
                  <p className="font-medium truncate">{ev.file_name || "Uploaded file"}</p>
                  {ev.file_size_bytes && <p className="text-[10px] text-muted-foreground">{(ev.file_size_bytes / 1024).toFixed(1)} KB</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Network</p>
                  <p className="font-medium">{ev.network_status || "online"}</p>
                </div>
              </div>

              {/* SECTION E — Hash fingerprint */}
              {ev.hash_fingerprint && (
                <div className="p-2 rounded-md bg-gray-50 border border-gray-200">
                  <p className="text-[10px] font-semibold text-gray-600 mb-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {ev.hash_algorithm || "SHA-256"} Hash
                  </p>
                  <p className="text-[9px] font-mono text-gray-600 break-all">{ev.hash_fingerprint}</p>
                  {ev.hash_verified_at && <p className="text-[9px] text-muted-foreground mt-0.5">Verified: {new Date(ev.hash_verified_at).toLocaleString("en-NG")}</p>}
                </div>
              )}

              {/* SECTION D — GPS metadata */}
              {ev.gps_lat && (
                <div className="p-2 rounded-md bg-blue-50 border border-blue-100">
                  <p className="text-[10px] font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> GPS Chain
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-blue-700">
                    <span>Lat: {ev.gps_lat?.toFixed(5)}</span>
                    <span>Lng: {ev.gps_lng?.toFixed(5)}</span>
                    {ev.gps_accuracy_m && <span>Accuracy: ±{ev.gps_accuracy_m}m</span>}
                    <span className={`font-semibold ${ev.gps_confidence === "HIGH" ? "text-emerald-600" : ev.gps_confidence === "LOW" ? "text-red-600" : "text-yellow-600"}`}>
                      GPS: {ev.gps_confidence || "—"}
                    </span>
                    {ev.gps_inside_lga !== undefined && ev.gps_inside_lga !== null && (
                      <span className={ev.gps_inside_lga ? "text-emerald-600" : "text-red-600 font-semibold"}>
                        {ev.gps_inside_lga ? "Inside LGA ✓" : "OUTSIDE LGA ⚠"}
                      </span>
                    )}
                    {ev.gps_spoofing_flag && <span className="text-red-600 font-semibold col-span-2">⚠ SPOOFING FLAG</span>}
                  </div>
                </div>
              )}

              {/* Witness */}
              {ev.witness_name && (
                <div className="text-xs">
                  <p className="text-muted-foreground mb-0.5">Witness</p>
                  <p className="font-medium">{ev.witness_name} ({ev.witness_role?.replace(/_/g," ")})</p>
                  {ev.witness_phone && <p className="text-muted-foreground">{ev.witness_phone}</p>}
                </div>
              )}

              {/* SECTION G — Chain of custody timeline */}
              {custodyEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Chain of Custody
                  </p>
                  <div>
                    {custodyEvents.map((ev_event, i) => (
                      <CustodyEvent key={i} event={ev_event} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}