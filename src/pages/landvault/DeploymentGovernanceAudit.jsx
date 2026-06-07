import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, CheckCircle2, XCircle, Shield, Server,
  Database, GitBranch, FileText, ChevronDown,
  ChevronRight, AlertOctagon
} from "lucide-react";

// ── Audit data ────────────────────────────────────────────────────────────────

const ENVIRONMENTS = [
  {
    name: "Development",
    url: "base44 preview URL (app editor)",
    database: "⚠️ SHARED — same Base44 app DB",
    storage: "⚠️ SHARED — same Base44 storage bucket",
    auth: "Base44 Auth (shared app)",
    deployment: "Base44 auto-deploy on save",
    risk: "critical",
    note: "No isolation. Every save overwrites the single live codebase.",
  },
  {
    name: "Staging",
    url: "❌ NOT CONFIGURED",
    database: "❌ NOT CONFIGURED",
    storage: "❌ NOT CONFIGURED",
    auth: "❌ NOT CONFIGURED",
    deployment: "❌ NOT CONFIGURED",
    risk: "critical",
    note: "No staging environment exists. Code moves directly from development to production.",
  },
  {
    name: "Production",
    url: "Custom domain (if configured) or base44.io subdomain",
    database: "⚠️ SHARED — same Base44 app DB as dev",
    storage: "⚠️ SHARED — same Base44 storage bucket as dev",
    auth: "Base44 Auth (shared app)",
    deployment: "Promoted from editor — no CI/CD gate",
    risk: "high",
    note: "Production runs on the same app instance as development. No environment separation exists.",
  },
];

const RISKS = [
  {
    severity: "CRITICAL",
    title: "Single Database for All Environments",
    detail: "Development testing, demo data seeding, and live pilot records all write to the same database. A seed function (seedDemoPhase1/2/3) or a misrouted update can corrupt live land records.",
    color: "red",
  },
  {
    severity: "CRITICAL",
    title: "No Staging Environment",
    detail: "There is no intermediate environment for integration testing, security review, or UAT before code reaches live data. Every code change is a direct production deploy.",
    color: "red",
  },
  {
    severity: "CRITICAL",
    title: "All Scheduled Automations Failing",
    detail: "5 automations exist (Job Queue, Abuse Detection, Daily Backup, Fraud Scoring, GIS Validation). ALL scheduled automations show 0 successful runs and 5 consecutive failures. The daily backup has never succeeded. Live land data has NO verified backup.",
    color: "red",
  },
  {
    severity: "HIGH",
    title: "Shared Storage Bucket",
    detail: "Evidence files, consent audio, signatures, and survey documents from development testing share the same private storage bucket as any production records. Signed URLs can cross environments.",
    color: "red",
  },
  {
    severity: "HIGH",
    title: "No CI/CD Pipeline or Deployment Gate",
    detail: "Code is deployed by saving in the Base44 editor. There is no automated test run, no security scan, no peer review, and no deployment approval before changes are live.",
    color: "orange",
  },
  {
    severity: "HIGH",
    title: "backupEntityExport Misses LandVault Entities",
    detail: "The backup function targets LandParcel, FamilyOwnership etc. (original registry entities) but does NOT include LandVaultParcel, EvidenceVault, DuplicateAlert, SurveyAssignment, LandVaultPayment, or CommunityLead — the core pilot entities.",
    color: "orange",
  },
  {
    severity: "MEDIUM",
    title: "Demo Seed Functions Available in Production Context",
    detail: "seedDemoPhase1/2/3/Finalize are deployed and accessible to admins in the same environment as live data. A mis-click could insert test records into the live pilot dataset.",
    color: "yellow",
  },
  {
    severity: "MEDIUM",
    title: "No APP_ENV Environment Variable Enforced",
    detail: "healthCheck reads Deno.env.get('APP_ENV') but it returns 'production' as fallback regardless of context. No code path branches on environment — dev and prod behave identically.",
    color: "yellow",
  },
  {
    severity: "MEDIUM",
    title: "requiresAuth: false in base44Client",
    detail: "The SDK client is initialised with requiresAuth: false. This allows unauthenticated access to public routes but must be reviewed to ensure no authenticated endpoints are inadvertently exposed.",
    color: "yellow",
  },
  {
    severity: "LOW",
    title: "index.html Title Not Branded",
    detail: "The HTML title tag still reads 'Base44 APP'. For a pilot presentation to traditional rulers or LGA officials, the page title should read 'Aquasavannah LandVault' for credibility.",
    color: "blue",
  },
];

const WORKFLOW_STEPS = [
  {
    phase: "Feature Development",
    env: "Development App",
    actor: "Developer",
    actions: ["Write code in Base44 editor", "Test against dev database only", "Use seeded demo data — never real records", "Unit test backend functions via test_backend_function"],
    gate: "Code review by lead developer",
    color: "blue",
  },
  {
    phase: "Development Testing",
    env: "Development App",
    actor: "Developer + QA",
    actions: ["Run all backend functions manually", "Verify RLS rules per role", "Test evidence upload + hash generation", "Test duplicate detection alerts", "Test GPS trust scoring", "Verify consent capture flow", "Check public verify returns no PII"],
    gate: "All functions pass. RLS verified for all 8 roles.",
    color: "teal",
  },
  {
    phase: "Staging Testing",
    env: "Staging App (separate Base44 app)",
    actor: "QA + Compliance Officer",
    actions: ["Deploy code to staging app instance", "Import a sample of anonymised test parcels", "Run full evidence sealing workflow end-to-end", "Verify automation triggers (duplicate detection, fraud scoring)", "Penetration test: attempt direct SDK calls from public portal", "Verify backup automation completes successfully", "Obtain sign-off from compliance officer"],
    gate: "Zero critical failures. Backup verified. PII test passed.",
    color: "violet",
  },
  {
    phase: "Security Review",
    env: "Staging App",
    actor: "Security Lead + Compliance Officer",
    actions: ["Review all RLS rules against role matrix", "Confirm publicLandVaultLookup exposes no PII fields", "Audit AuditLog for correct entries on all sensitive operations", "Verify evidence_sealed=true blocks updates at entity layer", "Check consent_timeline is append-only in practice", "Confirm DuplicateAlert dashboard accessible only to admin roles", "Review environment variable secrets — no hardcoded keys"],
    gate: "Security sign-off document signed by Compliance Officer.",
    color: "amber",
  },
  {
    phase: "Production Release",
    env: "Production App",
    actor: "Super Admin",
    actions: ["Take manual backup snapshot before deploy", "Deploy code to production app", "Run healthCheck function and verify all checks pass", "Verify backup automation is active and last run succeeded", "Confirm all 5 automations show is_active=true", "Record release in AuditLog with release notes", "Notify field agents of any workflow changes"],
    gate: "healthCheck returns status: healthy. Backup confirmed.",
    color: "emerald",
  },
];

const RELEASE_CHECKLIST = [
  {
    section: "Public Verify Security",
    items: [
      { id: "pv1", label: "publicLandVaultLookup returns only allowlisted fields", status: "pass" },
      { id: "pv2", label: "No owner_name, owner_phone, owner_nin in response", status: "pass" },
      { id: "pv3", label: "No GPS coordinates exposed in public response", status: "pass" },
      { id: "pv4", label: "No consent records, audio, signatures, photos in response", status: "pass" },
      { id: "pv5", label: "IP-based rate limiting active (30 req / 10 min)", status: "pass" },
      { id: "pv6", label: "Every lookup logged to AuditLog", status: "pass" },
      { id: "pv7", label: "Direct SDK asServiceRole call removed from frontend", status: "pass" },
    ],
  },
  {
    section: "Consent Module",
    items: [
      { id: "cm1", label: "Verbal consent captured with GPS + timestamp", status: "pass" },
      { id: "cm2", label: "Audio consent upload or decline recorded", status: "pass" },
      { id: "cm3", label: "Signature or thumb impression captured or declined with reason", status: "pass" },
      { id: "cm4", label: "Representative photo captured or declined", status: "pass" },
      { id: "cm5", label: "Witness name, phone, role recorded", status: "pass" },
      { id: "cm6", label: "Consent strength score 0-100 computed", status: "pass" },
      { id: "cm7", label: "consent_timeline is append-only (no edits)", status: "partial" },
      { id: "cm8", label: "All consent media stored in PRIVATE bucket only", status: "partial" },
    ],
  },
  {
    section: "Evidence Vault",
    items: [
      { id: "ev1", label: "SHA-256 hash computed in browser before upload", status: "pass" },
      { id: "ev2", label: "Hash stored in hash_fingerprint field", status: "pass" },
      { id: "ev3", label: "Chain-of-custody JSON appended on upload", status: "pass" },
      { id: "ev4", label: "Evidence seal locks all items (seal_status = SEALED)", status: "pass" },
      { id: "ev5", label: "Post-seal: update RLS blocks field_agent modifications", status: "pass" },
      { id: "ev6", label: "EvidenceVault.update restricted to super_admin only", status: "pass" },
      { id: "ev7", label: "Evidence Detail page shows full chain of custody", status: "pass" },
      { id: "ev8", label: "LandVaultParcel entities in daily backup", status: "fail" },
      { id: "ev9", label: "EvidenceVault entities in daily backup", status: "fail" },
    ],
  },
  {
    section: "GPS Validation",
    items: [
      { id: "gp1", label: "GPS accuracy captured in metres (gps_accuracy_m)", status: "pass" },
      { id: "gp2", label: "GPS confidence score computed (HIGH/MEDIUM/LOW/FAILED)", status: "pass" },
      { id: "gp3", label: "GPS inside LGA boundary validated", status: "pass" },
      { id: "gp4", label: "GPS spoofing flag set on suspicious records", status: "pass" },
      { id: "gp5", label: "GPS timestamp recorded for each evidence item", status: "pass" },
      { id: "gp6", label: "Cross-evidence GPS consistency check active", status: "fail" },
    ],
  },
  {
    section: "Duplicate Detection",
    items: [
      { id: "dd1", label: "GPS proximity check (< 50m) operational", status: "pass" },
      { id: "dd2", label: "Survey plan URL duplicate check operational", status: "pass" },
      { id: "dd3", label: "Family name + ward conflict check operational", status: "pass" },
      { id: "dd4", label: "Owner NIN duplicate check operational", status: "pass" },
      { id: "dd5", label: "Evidence SHA-256 hash duplicate check operational", status: "pass" },
      { id: "dd6", label: "Automation trigger active on parcel create/update", status: "fail" },
      { id: "dd7", label: "Automation trigger active on evidence upload", status: "fail" },
      { id: "dd8", label: "DuplicateAlert resolution blocks VERIFIED status", status: "fail" },
    ],
  },
  {
    section: "Role Permissions (RBAC)",
    items: [
      { id: "rp1", label: "super_admin: full access all entities", status: "pass" },
      { id: "rp2", label: "surveyor_general: read all, update parcels", status: "pass" },
      { id: "rp3", label: "compliance_officer: read all, update alerts", status: "pass" },
      { id: "rp4", label: "field_agent: create parcels, own records only", status: "pass" },
      { id: "rp5", label: "licensed_surveyor: update assigned parcels only", status: "pass" },
      { id: "rp6", label: "community_validator: update pending validation only", status: "pass" },
      { id: "rp7", label: "government_observer: read-only", status: "pass" },
      { id: "rp8", label: "DuplicateAlert: read restricted to admin roles", status: "pass" },
      { id: "rp9", label: "EvidenceVault: read restricted to named roles only", status: "pass" },
    ],
  },
  {
    section: "Audit Logs",
    items: [
      { id: "al1", label: "All public lookups logged to AuditLog", status: "pass" },
      { id: "al2", label: "Evidence seal events logged immutably", status: "pass" },
      { id: "al3", label: "User suspend/reinstate logged", status: "pass" },
      { id: "al4", label: "Parcel status changes logged", status: "partial" },
      { id: "al5", label: "Community validation actions logged to timeline", status: "partial" },
      { id: "al6", label: "AuditLog: update restricted to super_admin", status: "pass" },
      { id: "al7", label: "AuditLog: delete restricted to super_admin", status: "pass" },
      { id: "al8", label: "AuditLog included in daily backup", status: "pass" },
    ],
  },
  {
    section: "Backup Verification",
    items: [
      { id: "bv1", label: "Daily backup automation configured", status: "pass" },
      { id: "bv2", label: "Daily backup automation is currently active", status: "fail" },
      { id: "bv3", label: "Last backup completed successfully", status: "fail" },
      { id: "bv4", label: "LandVaultParcel included in backup", status: "fail" },
      { id: "bv5", label: "EvidenceVault included in backup", status: "fail" },
      { id: "bv6", label: "Backup stored in private encrypted storage", status: "pass" },
      { id: "bv7", label: "Backup restore procedure documented and tested", status: "fail" },
    ],
  },
];

const RECOMMENDED_ARCH = [
  {
    env: "Development",
    purpose: "Active code development and feature testing",
    db: "Separate Base44 app instance (dev app ID)",
    storage: "Separate Base44 storage bucket (dev)",
    auth: "Base44 Auth — dev user pool only",
    secrets: "Development API keys / mock secrets",
    access: "Developers only",
    url: "dev-landvault.aquasavannah.com",
    color: "blue",
  },
  {
    env: "Staging",
    purpose: "Integration testing, QA, compliance review, UAT",
    db: "Separate Base44 app instance (staging app ID) with anonymised test data",
    storage: "Separate storage bucket (staging) — anonymised test files only",
    auth: "Base44 Auth — staging user pool (test accounts)",
    secrets: "Staging API keys",
    access: "QA, Compliance Officer, Security Lead",
    url: "staging-landvault.aquasavannah.com",
    color: "amber",
  },
  {
    env: "Production",
    purpose: "Live pilot — real land records, real owners, real field agents",
    db: "Production Base44 app instance (prod app ID) — NEVER shared with dev/staging",
    storage: "Production private storage bucket — encrypted, access-controlled",
    auth: "Base44 Auth — production user pool",
    secrets: "Production secrets via Deno.env — never in code",
    access: "Field agents, surveyors, admins, government observers only",
    url: "landvault.aquasavannah.com",
    color: "emerald",
  },
];

const PILOT_SCORES = [
  { category: "Evidence Integrity", score: 7, max: 10, note: "Hashing, sealing, and chain of custody are built. Backup automation failing reduces score." },
  { category: "Legal Defensibility", score: 6, max: 10, note: "Consent capture, representative authority, and witness recording are solid. No staging environment or tested backup weakens legal standing." },
  { category: "Fraud Resistance", score: 6, max: 10, note: "Duplicate detection engine built. All fraud scoring automations currently failing (0 successful runs). RLS rules comprehensive." },
  { category: "Community Trust", score: 7, max: 10, note: "Community validation workflow, consent strength scoring, and dispute readiness panel are operational." },
  { category: "Deployment Architecture", score: 2, max: 10, note: "Single environment, shared DB, no staging, no CI/CD, all backup automations failing. Critical gap." },
  { category: "Data Protection", score: 5, max: 10, note: "Private storage used for sensitive files. No verified backup. Shared DB between dev and prod is a data protection risk." },
  { category: "Government Demonstrability", score: 7, max: 10, note: "Pilot readiness dashboard, public verify portal, and evidence seal panel are suitable for LGA demonstration." },
  { category: "Bank Due Diligence", score: 6, max: 10, note: "Land Evidence Report generator built. No backup verified. No staging. Bank reviewers would require proven data integrity." },
  { category: "Lawyer Review Readiness", score: 6, max: 10, note: "Chain of custody, representative authority, evidence sealing are in place. No production backup verified." },
  { category: "Diaspora Confidence", score: 6, max: 10, note: "Public verify, dispute readiness score, and consent trail are credible. Shared infrastructure reduces trust." },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "pass") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />PASS</span>;
  if (status === "partial") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />PARTIAL</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />FAIL</span>;
}

function SeverityBadge({ sev }) {
  const cfg = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-blue-100 text-blue-700",
  }[sev] || "bg-gray-100 text-gray-700";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg}`}>{sev}</span>;
}

function Section({ title, icon: IconComp, children }) {
  const Icon = IconComp;
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-0 shadow-sm">
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Icon className="w-4 h-4" />{title}</CardTitle>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </CardHeader>
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DeploymentGovernanceAudit() {
  const auditDate = "2026-06-07";

  // Aggregate pilot score
  const totalScore = PILOT_SCORES.reduce((s, p) => s + p.score, 0);
  const maxScore = PILOT_SCORES.reduce((s, p) => s + p.max, 0);
  const overallPct = Math.round((totalScore / maxScore) * 100);

  // Checklist pass/fail/partial summary
  const allItems = RELEASE_CHECKLIST.flatMap(s => s.items);
  const passCount = allItems.filter(i => i.status === "pass").length;
  const partialCount = allItems.filter(i => i.status === "partial").length;
  const failCount = allItems.filter(i => i.status === "fail").length;

  const classification = overallPct >= 85 ? "STATE READY"
    : overallPct >= 75 ? "LGA READY"
    : overallPct >= 60 ? "PILOT READY"
    : "NOT READY";
  const classColor = overallPct >= 75 ? "text-emerald-700 bg-emerald-100"
    : overallPct >= 60 ? "text-amber-700 bg-amber-100"
    : "text-red-700 bg-red-100";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Aquasavannah LandVault</p>
            <h1 className="text-2xl font-black">Deployment Governance Audit</h1>
            <p className="text-sm text-slate-300 mt-1">Audit Date: {auditDate} · Auditor: Base44 Governance Engine</p>
          </div>
          <div className="text-right">
            <span className={`text-lg font-black px-4 py-2 rounded-xl ${classColor}`}>{classification}</span>
            <p className="text-xs text-slate-400 mt-1">Overall Score: {totalScore}/{maxScore} ({overallPct}%)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-emerald-900/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-300">{passCount}</p>
            <p className="text-[10px] text-slate-400 uppercase">Checks Pass</p>
          </div>
          <div className="bg-amber-900/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-300">{partialCount}</p>
            <p className="text-[10px] text-slate-400 uppercase">Partial</p>
          </div>
          <div className="bg-red-900/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-red-300">{failCount}</p>
            <p className="text-[10px] text-slate-400 uppercase">Checks Fail</p>
          </div>
        </div>
      </div>

      {/* 1. Environment Table */}
      <Section title="1. Current Environment Inventory" icon={Server}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-2 font-semibold border border-border">Environment</th>
                <th className="text-left p-2 font-semibold border border-border">URL</th>
                <th className="text-left p-2 font-semibold border border-border">Database</th>
                <th className="text-left p-2 font-semibold border border-border">Storage</th>
                <th className="text-left p-2 font-semibold border border-border">Auth</th>
                <th className="text-left p-2 font-semibold border border-border">Deployment</th>
              </tr>
            </thead>
            <tbody>
              {ENVIRONMENTS.map(env => (
                <tr key={env.name} className="border-b border-border">
                  <td className="p-2 border border-border font-bold">
                    {env.name}
                    <SeverityBadge sev={env.risk === "critical" ? "CRITICAL" : "HIGH"} />
                  </td>
                  <td className="p-2 border border-border text-muted-foreground">{env.url}</td>
                  <td className="p-2 border border-border text-muted-foreground">{env.database}</td>
                  <td className="p-2 border border-border text-muted-foreground">{env.storage}</td>
                  <td className="p-2 border border-border text-muted-foreground">{env.auth}</td>
                  <td className="p-2 border border-border text-muted-foreground">{env.deployment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-2">
          {ENVIRONMENTS.map(env => (
            <div key={env.name} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800"><strong>{env.name}:</strong> {env.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Risk Register */}
      <Section title="2. Risk Register" icon={AlertTriangle}>
        <div className="space-y-3">
          {RISKS.map((risk, i) => {
            const borderColor = risk.color === "red" ? "border-red-300 bg-red-50"
              : risk.color === "orange" ? "border-orange-300 bg-orange-50"
              : risk.color === "yellow" ? "border-yellow-300 bg-yellow-50"
              : "border-blue-200 bg-blue-50";
            const textColor = risk.color === "red" ? "text-red-900"
              : risk.color === "orange" ? "text-orange-900"
              : risk.color === "yellow" ? "text-yellow-900"
              : "text-blue-900";
            return (
              <div key={i} className={`border rounded-xl p-3 ${borderColor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge sev={risk.severity} />
                  <span className={`text-xs font-bold ${textColor}`}>{risk.title}</span>
                </div>
                <p className={`text-xs ${textColor} opacity-80`}>{risk.detail}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3. Recommended Architecture */}
      <Section title="3. Recommended Three-Environment Architecture" icon={Database}>
        <div className="grid gap-4 md:grid-cols-3">
          {RECOMMENDED_ARCH.map(arch => {
            const border = arch.color === "blue" ? "border-blue-200 bg-blue-50"
              : arch.color === "amber" ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50";
            const head = arch.color === "blue" ? "text-blue-700"
              : arch.color === "amber" ? "text-amber-700"
              : "text-emerald-700";
            return (
              <div key={arch.env} className={`border rounded-xl p-4 ${border}`}>
                <p className={`text-sm font-black mb-2 ${head}`}>{arch.env}</p>
                <p className="text-xs text-muted-foreground mb-3 italic">{arch.purpose}</p>
                <div className="space-y-1.5 text-xs">
                  <div><span className="font-semibold">Database:</span> {arch.db}</div>
                  <div><span className="font-semibold">Storage:</span> {arch.storage}</div>
                  <div><span className="font-semibold">Auth:</span> {arch.auth}</div>
                  <div><span className="font-semibold">Secrets:</span> {arch.secrets}</div>
                  <div><span className="font-semibold">Access:</span> {arch.access}</div>
                  <div><span className="font-semibold">URL:</span> <code className="text-[10px] bg-white px-1 rounded">{arch.url}</code></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-700 mb-1">Implementation Note — Base44 Platform</p>
          <p className="text-xs text-slate-600">On Base44, each environment must be a separate app instance with its own App ID. Create three apps: <code className="bg-white px-1 rounded text-[10px]">landvault-dev</code>, <code className="bg-white px-1 rounded text-[10px]">landvault-staging</code>, <code className="bg-white px-1 rounded text-[10px]">landvault-prod</code>. Each has an isolated database, storage bucket, and auth configuration. Deploy by exporting code from dev and importing into staging, then prod — never by editing prod directly.</p>
        </div>
      </Section>

      {/* 4. Deployment Workflow */}
      <Section title="4. Deployment Workflow" icon={GitBranch}>
        <div className="relative">
          {WORKFLOW_STEPS.map((step, i) => {
            const colors = {
              blue: { bg: "bg-blue-50 border-blue-200", head: "text-blue-700", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
              teal: { bg: "bg-teal-50 border-teal-200", head: "text-teal-700", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
              violet: { bg: "bg-violet-50 border-violet-200", head: "text-violet-700", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
              amber: { bg: "bg-amber-50 border-amber-200", head: "text-amber-700", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
              emerald: { bg: "bg-emerald-50 border-emerald-200", head: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
            }[step.color];
            return (
              <div key={i} className="flex gap-3 mb-4">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full ${colors.dot} text-white flex items-center justify-center text-xs font-bold shrink-0`}>{i + 1}</div>
                  {i < WORKFLOW_STEPS.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>
                <div className={`flex-1 border rounded-xl p-3 mb-2 ${colors.bg}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className={`text-sm font-bold ${colors.head}`}>{step.phase}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>{step.env}</span>
                    <span className="text-[10px] text-muted-foreground">Actor: {step.actor}</span>
                  </div>
                  <ul className="space-y-0.5 mb-2">
                    {step.actions.map((a, j) => (
                      <li key={j} className="flex items-center gap-1.5 text-xs text-foreground">
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <p className="text-[10px] font-semibold text-muted-foreground">Gate: {step.gate}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5. Release Checklist */}
      <Section title="5. Release Checklist" icon={FileText}>
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {passCount} Pass</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> {partialCount} Partial</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {failCount} Fail</span>
        </div>
        <div className="space-y-4">
          {RELEASE_CHECKLIST.map(section => {
            const sPass = section.items.filter(i => i.status === "pass").length;
            const sTotal = section.items.length;
            const pct = Math.round((sPass / sTotal) * 100);
            return (
              <div key={section.section}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">{section.section}</p>
                  <span className="text-[10px] text-muted-foreground">{sPass}/{sTotal} ({pct}%)</span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full mb-2 overflow-hidden">
                  <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="space-y-1">
                  {section.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                      <span className="text-xs text-foreground">{item.label}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 6. Pilot Readiness Scores */}
      <Section title="6. Pilot Readiness Scorecard" icon={Shield}>
        <div className="space-y-3 mb-4">
          {PILOT_SCORES.map(item => {
            const pct = (item.score / item.max) * 100;
            const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
            const textColor = pct >= 80 ? "text-emerald-700" : pct >= 60 ? "text-amber-700" : "text-red-700";
            return (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{item.category}</span>
                  <span className={`text-sm font-black ${textColor}`}>{item.score}/{item.max}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{item.note}</p>
              </div>
            );
          })}
        </div>

        {/* Overall verdict */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-black">Overall Deployment Architecture Score</p>
              <p className="text-xs text-muted-foreground">Deployment infrastructure readiness only (not feature completeness)</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-red-600">2/10</p>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">CRITICAL GAPS</span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              "Create three isolated Base44 app instances (dev / staging / prod) with completely separate databases and storage",
              "Fix all 5 failing automations — especially backupEntityExport which has NEVER succeeded",
              "Add LandVaultParcel, EvidenceVault, DuplicateAlert, SurveyAssignment, CommunityLead to the backup function",
              "Wire lvDuplicateDetection as an entity automation triggered on LandVaultParcel create/update and EvidenceVault create",
              "Remove demo seed functions (seedDemoPhase1/2/3) from the production app entirely",
              "Enforce environment variable APP_ENV in all backend functions to prevent cross-environment side effects",
              "Update the index.html title from 'Base44 APP' to 'Aquasavannah LandVault'",
              "Document and test a backup restore procedure before onboarding any live land records",
            ].map((gap, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{gap}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-1">Classification: {classification}</p>
            <p className="text-xs text-slate-600">
              The LandVault <strong>feature platform</strong> is approaching Pilot Ready (features score ~{Math.round(PILOT_SCORES.filter(p => p.category !== "Deployment Architecture").reduce((s,p) => s+p.score,0) / PILOT_SCORES.filter(p => p.category !== "Deployment Architecture").reduce((s,p) => s+p.max,0) * 100)}%),
              but the <strong>deployment infrastructure</strong> scores 2/10. No live land records should be onboarded until the database is isolated,
              backups are verified working, and at minimum one successful staging test cycle has been completed.
              Target: resolve all CRITICAL and HIGH risks above, then re-classify as PILOT READY.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}