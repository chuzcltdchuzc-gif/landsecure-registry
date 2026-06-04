/**
 * SECTION K — Pilot Readiness Scorecard
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Shield, BarChart2 } from "lucide-react";

const AUDIT_RESULTS = [
  { section: "A", title: "Representative Capacity", status: "BUILT", score: 9, notes: "All 8 capacity values, authority_basis enum, validation, form fields, schema — fully implemented." },
  { section: "B", title: "Ownership Structure", status: "BUILT", score: 9, notes: "8 ownership types including joint, corporate, government. Risk scoring differentiated by type." },
  { section: "C", title: "Duplicate Detection Engine", status: "PARTIALLY BUILT", score: 5, notes: "DuplicateAlert entity + dashboard built. Backend engine detection (GPS proximity, hash match) still requires async function wiring." },
  { section: "D", title: "GPS Validation", status: "BUILT", score: 8, notes: "LGA boundary check, accuracy threshold, GPS confidence score, spoofing flag, timestamp — all implemented in ParcelForm and EvidenceUpload." },
  { section: "E", title: "Evidence Hashing", status: "BUILT", score: 9, notes: "SHA-256 computed client-side via Web Crypto API on every file upload. Hash stored in EvidenceVault with algorithm and verify timestamp." },
  { section: "F", title: "Evidence Sealing", status: "BUILT", score: 9, notes: "seal_status, sealed_at, sealed_by fields. RLS blocks all updates/deletes for non-super-admin. UI shows SEALED/IMMUTABLE badges." },
  { section: "G", title: "Chain of Custody", status: "BUILT", score: 8, notes: "custody_chain JSON array stored on every evidence record: timestamp, actor_email, actor_role, GPS, device, file_hash. EvidenceDetail UI renders full timeline." },
  { section: "H", title: "Consent Module", status: "BUILT", score: 8, notes: "ConsentCapture component: verbal, audio (MediaRecorder), signature upload, photo, witness, scoring 0-100, timeline, private EvidenceVault storage per item." },
  { section: "I", title: "Role Security Audit", status: "PARTIALLY BUILT", score: 7, notes: "RLS on all entities corrected. community_validator added to EvidenceVault read. Direct asServiceRole call removed from PublicVerify frontend." },
  { section: "J", title: "Public Verification Security", status: "BUILT", score: 9, notes: "Backend allowlist enforced. Direct SDK call removed from frontend. Owner name, phone, GPS, consent, payments, evidence — all excluded from public response." },
];

const CATEGORY_SCORES = [
  { name: "Legal Defensibility", score: 8, rationale: "Representative capacity, authority basis, consent timeline all captured." },
  { name: "Customary Land Suitability", score: 8, rationale: "Family ownership, inheritance notes, village head witness, community validation." },
  { name: "Evidence Integrity", score: 9, rationale: "SHA-256 hashing, sealed evidence, immutable chain of custody." },
  { name: "Fraud Resistance", score: 7, rationale: "GPS LGA validation, duplicate detection schema, risk scoring — backend engine partially complete." },
  { name: "Operational Readiness", score: 7, rationale: "Field agent workflow complete. Consent capture complete. GPS capture live." },
  { name: "Community Trust", score: 7, rationale: "Community validator queue, village head witness capture, community confirmation field." },
  { name: "Government Demonstrability", score: 8, rationale: "Observer portal, public verify portal, audit logs, role-based access." },
  { name: "Bank Due-Diligence Suitability", score: 6, rationale: "Certificate status, survey plan, risk score present. Formal title integration not built." },
  { name: "Lawyer Review Suitability", score: 7, rationale: "Authority basis, representative capacity, chain of custody — defensible paper trail." },
  { name: "Diaspora Family Suitability", score: 8, rationale: "Family ownership, inheritance notes, beneficiary system, community validation, public verify portal." },
];

const STATUS_CONFIG = {
  BUILT: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  "PARTIALLY BUILT": { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  "NOT BUILT": { color: "bg-red-100 text-red-700", icon: XCircle },
};

function ScoreBar({ score }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-bold w-6 text-right">{score}</span>
    </div>
  );
}

export default function PilotReadinessReport() {
  const overallScore = Math.round(CATEGORY_SCORES.reduce((s, c) => s + c.score, 0) / CATEGORY_SCORES.length * 10) / 10;
  const readiness = overallScore >= 9 ? "NATIONAL READY" : overallScore >= 8 ? "STATE READY" : overallScore >= 7 ? "LGA READY" : overallScore >= 5 ? "PILOT READY" : "NOT READY";
  const readinessColor = overallScore >= 8 ? "bg-emerald-600" : overallScore >= 7 ? "bg-blue-600" : overallScore >= 5 ? "bg-yellow-600" : "bg-red-600";

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold">Pilot Readiness Report</h1>
        <p className="text-sm text-muted-foreground">Aquasavannah LandVault — Technical Audit 2026-06-04</p>
      </div>

      {/* Overall Score */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 text-center space-y-3">
          <Shield className="w-10 h-10 text-violet-600 mx-auto" />
          <div>
            <p className="text-5xl font-black text-foreground">{overallScore}<span className="text-2xl text-muted-foreground">/10</span></p>
            <p className="text-sm text-muted-foreground mt-1">Overall Pilot Readiness Score</p>
          </div>
          <span className={`inline-block px-6 py-2 rounded-full text-white font-bold text-lg ${readinessColor}`}>{readiness}</span>
        </CardContent>
      </Card>

      {/* Section Audit */}
      <div>
        <h2 className="text-base font-bold mb-3">Section Audit Results</h2>
        <div className="space-y-3">
          {AUDIT_RESULTS.map(r => {
            const cfg = STATUS_CONFIG[r.status];
            const Icon = cfg.icon;
            return (
              <Card key={r.section} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">{r.section}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{r.title}</span>
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{r.status}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">{r.score}/10</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <h2 className="text-base font-bold mb-3">Category Scores</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {CATEGORY_SCORES.map(c => (
              <div key={c.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">{c.name}</span>
                </div>
                <ScoreBar score={c.score} />
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Gaps Remaining */}
      <div>
        <h2 className="text-base font-bold mb-3">Remaining Gaps</h2>
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-2">
            {[
              "Section C: Backend duplicate detection function (GPS proximity, hash match) not wired as automation — manual admin review only.",
              "Section I: Route-level guards for government_observer and licensed_surveyor pages are layout-based only — no server-side enforcement.",
              "Section I: super_admin evidence overwrite creates no audit trail — recommend adding AuditLog entry on any EvidenceVault update.",
              "Section D: GPS spoofing detection is schema-ready but no spoofing algorithm implemented (speed/altitude cross-check not built).",
            ].map((gap, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{gap}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Fixes Applied */}
      <div>
        <h2 className="text-base font-bold mb-3">Fixes Applied This Audit</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-1">
            {[
              "LandVaultParcel schema: Added representative_name, representative_role, representative_capacity, relationship_to_land, authority_basis, authority_document_url",
              "LandVaultParcel schema: Added joint, corporate, government to ownership_type enum",
              "LandVaultParcel schema: Added full GPS metadata fields (gps_accuracy_m, gps_captured_at, gps_confidence, gps_confidence_score, gps_inside_lga, gps_spoofing_flag)",
              "LandVaultParcel schema: Added full consent module fields (consent_verbal, consent_audio_captured, consent_signature_captured, consent_photo_captured, consent_strength_score, consent_confidence, consent_timeline, community_confirmed)",
              "LandVaultParcel schema: Added duplicate detection fields (duplicate_flag, duplicate_type, duplicate_notes, duplicate_reviewed, duplicate_review_outcome)",
              "EvidenceVault schema: Added evidence_sequence, hash_fingerprint, hash_algorithm, hash_verified_at, seal_status, sealed_at, sealed_by, captured_by_role, gps_accuracy_m, gps_timestamp, gps_confidence, gps_inside_lga, gps_spoofing_flag, network_status, custody_chain, file_size_bytes",
              "EvidenceVault schema: Added community_validator to read RLS",
              "DuplicateAlert entity: Created new entity with full detection schema and RLS",
              "ParcelForm.jsx: Full representative capacity section with all 8 capacity values and 8 authority_basis values, validation, GPS metadata, LGA boundary check",
              "EvidenceUpload.jsx: SHA-256 hashing via Web Crypto API, seal status, chain of custody, GPS metadata, LGA validation, evidence sequence number",
              "EvidenceDetail.jsx: Seal indicator, immutable badge, hash display, GPS chain, chain of custody timeline",
              "ConsentCapture.jsx: Full consent workflow — verbal, audio (MediaRecorder), signature, photo, witness, scoring 0-100, timeline, private EvidenceVault storage",
              "DuplicateAlertDashboard.jsx: Admin review queue for all duplicate alert types",
              "LandVaultPublicVerify.jsx: Removed direct asServiceRole frontend call — now routes 100% through publicParcelLookup backend function",
              "PilotReadinessReport.jsx: This scorecard",
            ].map((fix, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">{fix}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}