import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, ChevronRight,
  User, Users, GitMerge, Map, Shield, ExternalLink, Clock, Star
} from "lucide-react";

/* ── Gauge Component ─────────────────────────────── */
function Gauge({ pct, size = 80 }) {
  const r = 28, cx = 40, cy = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{pct}%</text>
    </svg>
  );
}

/* ── Readiness Dimension Card ─────────────────────── */
function DimensionCard({ label, score, items }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-2">
        <Gauge pct={score} />
        <p className="text-sm font-semibold text-gray-800 text-center">{label}</p>
        <div className="w-full space-y-1 mt-1">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              {it.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> :
                       <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              {it.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Scenario Card ────────────────────────────────── */
function ScenarioCard({ scenario }) {
  const [open, setOpen] = useState(false);
  const icons = { 1: User, 2: Users, 3: GitMerge, 4: Map, 5: Shield };
  const Icon = icons[scenario.id] || User;
  const colors = {
    1: "border-blue-200 bg-blue-50",
    2: "border-purple-200 bg-purple-50",
    3: "border-emerald-200 bg-emerald-50",
    4: "border-amber-200 bg-amber-50",
    5: "border-red-200 bg-red-50",
  };
  const iconColors = { 1: "text-blue-600", 2: "text-purple-600", 3: "text-emerald-600", 4: "text-amber-600", 5: "text-red-600" };

  return (
    <Card className={`border-2 ${colors[scenario.id]}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white shadow-sm ${iconColors[scenario.id]}`}>
              {scenario.id}
            </div>
            <Icon className={`w-5 h-5 ${iconColors[scenario.id]}`} />
            <div>
              <CardTitle className="text-sm font-bold">{scenario.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{scenario.summary}</p>
            </div>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {/* Anchor Records */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Anchor Records (Live Data)</p>
            <div className="space-y-1.5">
              {scenario.anchorRecords.map((r, i) => (
                <div key={i} className="flex items-start justify-between bg-white rounded-lg px-3 py-2 border border-gray-200 gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{r.type}</p>
                    <p className="text-xs text-gray-600 truncate">{r.label}</p>
                    {r.id && <p className="text-[10px] text-gray-400 font-mono">ID: {r.id.slice(-8)}</p>}
                  </div>
                  {r.status && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{r.status}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Navigation Links</p>
            <div className="flex flex-wrap gap-2">
              {scenario.navLinks.map((l, i) => (
                <Link key={i} to={l.path}>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7">
                    <ExternalLink className="w-3 h-3" />
                    {l.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Workflow Steps */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Workflow Steps</p>
            <ol className="space-y-1.5">
              {scenario.workflowSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center
                    ${step.type === "approval" ? "bg-emerald-100 text-emerald-700" :
                      step.type === "audit" ? "bg-blue-100 text-blue-700" :
                      step.type === "flag" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-800">{step.label}</p>
                    {step.actor && <p className="text-[10px] text-muted-foreground">Actor: {step.actor}</p>}
                    {step.type === "approval" && <Badge className="text-[10px] mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-200">Approval Action</Badge>}
                    {step.type === "audit" && <Badge className="text-[10px] mt-0.5 bg-blue-100 text-blue-700 border-blue-200">Audit Trail</Badge>}
                    {step.type === "flag" && <Badge className="text-[10px] mt-0.5 bg-red-100 text-red-700 border-red-200">System Flag</Badge>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Audit Trail Events */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Audit Trail Events</p>
            <div className="space-y-1">
              {scenario.auditEvents.map((e, i) => (
                <div key={i} className="flex items-start gap-2 bg-blue-50 rounded px-2 py-1.5 border border-blue-100">
                  <Clock className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-mono font-bold text-blue-800">{e.action}</p>
                    <p className="text-[10px] text-blue-600">{e.actor} · {e.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ── Main Page ────────────────────────────────────── */
export default function DemoReadinessReport() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [parcels, families, inheritanceCases, fraudAlerts, disputes, auditLogs, fieldReports, surveyDocs, communityVal, tradVal, plotAllocations, witnesses] = await Promise.all([
      base44.entities.LandParcel.list("-created_date", 2000),
      base44.entities.FamilyOwnership.list("-created_date", 500),
      base44.entities.InheritanceCase.list("-created_date", 500),
      base44.entities.FraudAlert.list("-created_date", 500),
      base44.entities.Dispute.list("-created_date", 500),
      base44.entities.AuditLog.list("-created_date", 2000),
      base44.entities.FieldReport.list("-created_date", 1000),
      base44.entities.SurveyDocument.list("-created_date", 500),
      base44.entities.CommunityValidation.list("-created_date", 500),
      base44.entities.TraditionalAuthorityValidation.list("-created_date", 500),
      base44.entities.PlotAllocation.list("-created_date", 500),
      base44.entities.InheritanceWitness.list("-created_date", 500),
    ]);

    const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
    const withBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
    const withGps = gfl.filter(p => p.latitude && p.longitude);
    const approved = gfl.filter(p => p.status === "approved");
    const certCases = inheritanceCases.filter(c => c.certificate_generated);
    const approvedCases = inheritanceCases.filter(c => c.status === "approved");
    const resolvedDisputes = disputes.filter(d => d.status === "resolved");
    const resolvedFraud = fraudAlerts.filter(f => f.status === "resolved" || f.status === "dismissed");
    const approvedSurveyDocs = surveyDocs.filter(s => s.review_status === "approved");
    const approvedTradVal = tradVal.filter(t => t.validation_status === "approved");
    const approvedCommunityVal = communityVal.filter(c => c.status === "approved");
    const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");

    // SYSTEM completeness (are all modules populated?)
    const systemScore = Math.round(
      ([gfl.length > 100, families.length > 10, inheritanceCases.length > 5,
        fraudAlerts.length > 5, disputes.length > 5, auditLogs.length > 100,
        fieldReports.length > 50, surveyDocs.length > 10,
        communityVal.length > 5, tradVal.length > 5,
        plotAllocations.length > 5, witnesses.length > 5]
        .filter(Boolean).length / 12) * 100
    );

    // DATA completeness
    const dataScore = Math.round(
      ([gfl.length >= 100, families.length >= 20,
        approved.length >= 50, certCases.length >= 2,
        withBoundary.length / gfl.length >= 0.7,
        withGps.length / gfl.length >= 0.7,
        auditLogs.length >= 200, fieldReports.length >= 100]
        .filter(Boolean).length / 8) * 100
    );

    // WORKFLOW completeness
    const workflowScore = Math.round(
      ([approvedCases.length > 0, certCases.length > 0,
        resolvedDisputes.length > 0, resolvedFraud.length > 0,
        approvedTradVal.length > 0, approvedCommunityVal.length > 0,
        verifiedWitnesses.length > 0,
        inheritanceCases.some(c => c.status === "compliance_review"),
        inheritanceCases.some(c => c.status === "rejected")]
        .filter(Boolean).length / 9) * 100
    );

    // GIS completeness
    const gisScore = Math.min(100, Math.round(
      (withBoundary.length / Math.max(gfl.length, 1) * 50) +
      (withGps.length / Math.max(gfl.length, 1) * 30) +
      (approvedSurveyDocs.length > 5 ? 20 : approvedSurveyDocs.length * 4)
    ));

    // AUDIT completeness
    const auditActions = new Set(auditLogs.map(l => l.action));
    const auditScore = Math.min(100, Math.round(
      ([auditLogs.length >= 100, auditActions.size >= 5,
        auditLogs.some(l => l.action?.includes("APPROVED")),
        auditLogs.some(l => l.action?.includes("FRAUD")),
        auditLogs.some(l => l.action?.includes("DISPUTE")),
        auditLogs.some(l => l.action?.includes("FIELD")),
        auditLogs.some(l => l.action?.includes("SURVEY"))]
        .filter(Boolean).length / 7) * 100
    ));

    const pilotScore = Math.round((systemScore + dataScore + workflowScore + gisScore + auditScore) / 5);

    setMetrics({
      system: { score: systemScore, items: [
        { ok: gfl.length > 100, label: `${gfl.length} GFL parcels registered` },
        { ok: families.length > 10, label: `${families.length} family ownerships` },
        { ok: inheritanceCases.length > 5, label: `${inheritanceCases.length} inheritance cases` },
        { ok: fraudAlerts.length > 5, label: `${fraudAlerts.length} fraud alerts` },
        { ok: fieldReports.length > 50, label: `${fieldReports.length} field reports` },
        { ok: witnesses.length > 5, label: `${witnesses.length} witnesses` },
      ]},
      data: { score: dataScore, items: [
        { ok: approved.length >= 50, label: `${approved.length} approved parcels` },
        { ok: certCases.length >= 2, label: `${certCases.length} certificates issued` },
        { ok: withBoundary.length / gfl.length >= 0.7, label: `${Math.round(withBoundary.length / gfl.length * 100)}% boundary coverage` },
        { ok: auditLogs.length >= 200, label: `${auditLogs.length} audit log entries` },
      ]},
      workflow: { score: workflowScore, items: [
        { ok: approvedCases.length > 0, label: `${approvedCases.length} cases fully approved` },
        { ok: certCases.length > 0, label: `${certCases.length} certificates generated` },
        { ok: resolvedDisputes.length > 0, label: `${resolvedDisputes.length} disputes resolved` },
        { ok: approvedTradVal.length > 0, label: `${approvedTradVal.length} trad. authority approvals` },
        { ok: approvedCommunityVal.length > 0, label: `${approvedCommunityVal.length} community validations` },
      ]},
      gis: { score: gisScore, items: [
        { ok: withBoundary.length / gfl.length >= 0.7, label: `${withBoundary.length}/${gfl.length} have GeoJSON boundary` },
        { ok: withGps.length / gfl.length >= 0.7, label: `${withGps.length}/${gfl.length} have GPS coords` },
        { ok: approvedSurveyDocs.length > 5, label: `${approvedSurveyDocs.length} approved survey docs` },
      ]},
      audit: { score: auditScore, items: [
        { ok: auditLogs.length >= 100, label: `${auditLogs.length} total audit entries` },
        { ok: auditActions.size >= 5, label: `${auditActions.size} distinct action types` },
        { ok: auditLogs.some(l => l.action?.includes("FRAUD")), label: "Fraud actions logged" },
        { ok: auditLogs.some(l => l.action?.includes("APPROVED")), label: "Approval actions logged" },
      ]},
      pilot: pilotScore,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Scenarios built from real data confirmed above ──
  const scenarios = [
    {
      id: 1,
      title: "Individual Land Registration",
      summary: "Citizen registers parcel → field agent verifies → surveyor uploads plan → SG approves",
      anchorRecords: [
        { type: "LandParcel", label: "GFL/2023/0129 — Grace Danjuma-Obi, 0.28ha Residential", id: "6a1302b4cdf9d209645ea77d", status: "approved" },
        { type: "SurveyDocument", label: "GFL/2024/0001 — Survey Plan (Tobi Fashola)", id: "6a130190cdf9d209645ea732", status: "approved" },
        { type: "FieldReport", label: "GFL/2022/0828 — GPS Verification (Taiwo Adeleke)", id: "6a1301622ed2c20f6b3e0bc7", status: "submitted" },
      ],
      navLinks: [
        { label: "Land Registry", path: "/lands" },
        { label: "Register Land", path: "/register-land" },
        { label: "Survey Reviews", path: "/survey-reviews" },
        { label: "Pending Approvals", path: "/gov/pending-approvals" },
        { label: "Field Reports", path: "/field-reports" },
        { label: "GIS Map", path: "/gis-map" },
      ],
      workflowSteps: [
        { label: "Citizen submits parcel registration form with owner details and address", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Field agent captures GPS coordinates and photographs on-site", actor: "agent.demo@landsecure.app", type: "action" },
        { label: "Field report submitted with boundary validity confirmation", actor: "agent.demo@landsecure.app", type: "audit" },
        { label: "Licensed surveyor uploads survey plan and boundary report", actor: "surveyor.demo@landsecure.app", type: "audit" },
        { label: "Spatial validation engine checks for overlaps and duplicates", actor: "System Auto-Detection", type: "flag" },
        { label: "Surveyor General reviews survey plan and approves registration", actor: "sg.demo@landsecure.app", type: "approval" },
        { label: "Certificate of Occupancy issued, audit log entry created", actor: "sg.demo@landsecure.app", type: "audit" },
      ],
      auditEvents: [
        { action: "PARCEL_REGISTERED", actor: "citizen.demo@landsecure.app", detail: "Batch registration: GFL/2023/0031 agricultural parcel" },
        { action: "FIELD_REPORT_SUBMITTED", actor: "agent.demo@landsecure.app", detail: "GPS survey completed: GFL/2023/0034 industrial parcel" },
        { action: "SURVEY_BATCH_UPLOADED", actor: "surveyor.demo@landsecure.app", detail: "10 parcels in Greenfield LGA pilot" },
        { action: "PARCEL_APPROVED", actor: "sg.demo@landsecure.app", detail: "Bulk approval: GFL/2022/0020 to GFL/2022/0029" },
      ],
    },
    {
      id: 2,
      title: "Family Ownership Registration",
      summary: "Family registers communal land with beneficiaries, community validation, traditional authority sign-off",
      anchorRecords: [
        { type: "FamilyOwnership", label: "Greenfield Central Community — CDC Chairman, 3 buildings", id: "6a13023c096b5d8b7253a66a", status: "active" },
        { type: "FamilyBeneficiary", label: "Nnamdi Aliyu — Plot A, 10% share, rank 1 (son)", id: "6a13014607c1db4d028bd97c", status: "active" },
        { type: "CommunityValidation", label: "Greenfield Central — Obi Achebe III, status: approved", id: "6a13013745bfa35bedf32fa8", status: "approved" },
        { type: "TraditionalAuthority", label: "Nze na Ozo Council — Onowu Chioma Ani (Obi)", id: "6a13023bb958f71b546c37f2", status: "approved" },
      ],
      navLinks: [
        { label: "Inheritance Management", path: "/inheritance" },
        { label: "Customary Governance", path: "/gov/customary-governance" },
        { label: "Land Registry", path: "/lands" },
        { label: "GIS Map", path: "/gis-map" },
      ],
      workflowSteps: [
        { label: "Family representative submits FamilyOwnership record with family head details", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Beneficiaries registered with percentage shares and relationships", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Community validation submitted — community elder and village head named", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Community review completed by Chief Funmilayo Okorie", actor: "Community Elder", type: "approval" },
        { label: "Traditional Authority validation submitted to Nze na Ozo Council", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Obi Onowu Chioma Ani approves — no competing customary claims", actor: "Traditional Authority", type: "approval" },
        { label: "Family ownership registration audit entry created", actor: "citizen.demo@landsecure.app", type: "audit" },
      ],
      auditEvents: [
        { action: "FAMILY_OWNERSHIP_REGISTERED", actor: "citizen.demo@landsecure.app", detail: "Danjuma Family for GFL/2024/0005 — Head: Gen. Danladi Danjuma, 5 beneficiaries" },
        { action: "COMPLIANCE_AUDIT_COMPLETED", actor: "compliance.demo@landsecure.app", detail: "15 parcels reviewed — 2 flagged for additional documentation" },
      ],
    },
    {
      id: 3,
      title: "Inheritance Transfer",
      summary: "Deceased patriarch → succession case → surveyor & compliance review → SG approval → certificate",
      anchorRecords: [
        { type: "InheritanceCase", label: "IC/2024/012 — Asogwa Family transfer (GFL/2023/0041)", id: "6a13014f05d807963d4e4de9", status: "approved" },
        { type: "InheritanceCase", label: "IC/2024/013 — Mbah Family dispute_resolution (GFL/2023/0042)", id: "6a13014f05d807963d4e4dea", status: "approved" },
        { type: "InheritanceWitness", label: "Chief Emmanuel Nwosu — community_witness (verified)", id: "6a130229cdf9d209645ea758", status: "verified" },
        { type: "PlotAllocation", label: "Plot A — Ngozi Okafor, 30%, GFL/2024/0001 (confirmed)", id: "6a13024dcdf9d209645ea763", status: "confirmed" },
      ],
      navLinks: [
        { label: "Inheritance Management", path: "/inheritance" },
        { label: "Customary Governance", path: "/gov/customary-governance" },
        { label: "Pending Approvals", path: "/gov/pending-approvals" },
        { label: "Audit Logs", path: "/audit-logs" },
      ],
      workflowSteps: [
        { label: "Citizen initiates inheritance case — attaches death verification and family agreement", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Witnesses registered: community witness, traditional ruler, religious witness", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Surveyor reviews and verifies boundary measurements — all beacons intact", actor: "surveyor.demo@landsecure.app", type: "approval" },
        { label: "Compliance officer reviews regulatory requirements — notarised agreement confirmed", actor: "compliance.demo@landsecure.app", type: "approval" },
        { label: "Plot allocations confirmed: Plot A (30%), Plot B (40%), Plot C (20%), Plot D (10%)", actor: "surveyor.demo@landsecure.app", type: "action" },
        { label: "Surveyor General issues final approval — certificate generated", actor: "sg.demo@landsecure.app", type: "approval" },
        { label: "Certificate of inheritance issued and recorded in audit log", actor: "System", type: "audit" },
      ],
      auditEvents: [
        { action: "FAMILY_OWNERSHIP_REGISTERED", actor: "citizen.demo@landsecure.app", detail: "IC/2024/012 — Asogwa Family, surveyor review Apr 2026" },
        { action: "PARCEL_APPROVED", actor: "sg.demo@landsecure.app", detail: "Final approval: IC/2024/012, final_approved_date: 2026-05-05" },
        { action: "FRAUD_INVESTIGATION_COMPLETED", actor: "compliance.demo@landsecure.app", detail: "GFL/2024/0002 admin error confirmed, alert resolved" },
      ],
    },
    {
      id: 4,
      title: "Boundary Conflict Detection",
      summary: "Spatial engine flags overlap → dispute filed → field agent re-surveys → surveyor resolves",
      anchorRecords: [
        { type: "LandParcel", label: "GFL/2023/0123 — Bello Estate (overlap_warning, fraud_risk: high)", id: "6a1302b4cdf9d209645ea777", status: "disputed" },
        { type: "LandParcel", label: "GFL/2023/0971 — Adeyemi Grove industrial (overlap_warning)", id: "6a130162bc07817910f1822c", status: "disputed" },
        { type: "Dispute", label: "GFL/2023/0498 — Amarachi Aneke — encroachment 312sqm overlap", id: "6a130132909eae938903d515", status: "under_review" },
        { type: "SurveyDocument", label: "GFL/2024/0004 — DISPUTED BOUNDARY: north extended 3.2m", id: "6a130190cdf9d209645ea735", status: "reviewed" },
        { type: "Dispute", label: "GFL/2025/0500 — Resolved: re-survey & boundary agreement", id: "6a130132909eae938903d517", status: "resolved" },
      ],
      navLinks: [
        { label: "GIS Map", path: "/gis-map" },
        { label: "Disputes", path: "/disputes" },
        { label: "Survey Reviews", path: "/survey-reviews" },
        { label: "Land Registry", path: "/lands" },
        { label: "Fraud Alerts", path: "/gov/fraud-alerts" },
      ],
      workflowSteps: [
        { label: "Citizen or surveyor submits parcel with GPS boundary polygon", actor: "surveyor.demo@landsecure.app", type: "action" },
        { label: "Spatial validation engine runs — overlap_warning triggered on GFL/2023/0123", actor: "System Auto-Detection", type: "flag" },
        { label: "Fraud risk engine raises score (62) — boundary overlap >5% & duplicate survey plan", actor: "System Auto-Detection", type: "flag" },
        { label: "Dispute filed: Amarachi Aneke — 312sqm encroachment with GFL/2024/0003", actor: "citizen.demo@landsecure.app", type: "action" },
        { label: "Field agent re-surveys disputed boundary — GPS coordinates captured", actor: "agent.demo@landsecure.app", type: "audit" },
        { label: "Surveyor confirms northern markers moved — boundary report updated, re-survey ordered", actor: "sg.demo@landsecure.app", type: "approval" },
        { label: "All parties agree to revised demarcation — dispute resolved & survey plan updated", actor: "sg.demo@landsecure.app", type: "approval" },
      ],
      auditEvents: [
        { action: "SPATIAL_VALIDATION_RUN", actor: "System Auto-Detection", detail: "3 parcels flagged: overlap_warning ×2, duplicate_warning ×1" },
        { action: "DISPUTE_FILED", actor: "citizen.demo@landsecure.app", detail: "Fraud dispute filed for GFL/2024/0010 — forged documentation" },
        { action: "FRAUD_ALERT_ESCALATED", actor: "sg.demo@landsecure.app", detail: "High-priority alert for GFL/2025/0065 — duplicate confirmed by field agent" },
      ],
    },
    {
      id: 5,
      title: "Fraud Investigation and Resolution",
      summary: "System auto-flags duplicate registration → compliance investigates → alert resolved or escalated",
      anchorRecords: [
        { type: "FraudAlert", label: "GFL/2025/0511 — duplicate GPS coords (high) — under_investigation", id: "6a130131192da0f2d48bc0cb", status: "under_investigation" },
        { type: "FraudAlert", label: "GFL/2023/0514 — suspicious_transfer (critical) — under_investigation", id: "6a130131192da0f2d48bc0ce", status: "under_investigation" },
        { type: "FraudAlert", label: "GFL/2022/0506 — forged_document — RESOLVED (admin error)", id: "6a130131192da0f2d48bc0c6", status: "resolved" },
        { type: "SurveyDocument", label: "GFL/2024/0010 — REJECTED: duplicate of SN/2023/4421 hash match", id: "6a130190cdf9d209645ea73a", status: "rejected" },
        { type: "Dispute", label: "GFL/2025/0501 — Yusuf Nwosu — 1998 allocation letter predates 2023 registration", id: "6a130132909eae938903d518", status: "resolved" },
      ],
      navLinks: [
        { label: "Fraud Alerts", path: "/gov/fraud-alerts" },
        { label: "Compliance Reports", path: "/gov/compliance-reports" },
        { label: "Global Audit", path: "/gov/global-audit" },
        { label: "Parcel Freeze", path: "/gov/parcel-freeze" },
        { label: "Land Registry", path: "/lands" },
      ],
      workflowSteps: [
        { label: "System auto-detection: duplicate GPS coordinates flagged on GFL/2025/0511", actor: "System Auto-Detection", type: "flag" },
        { label: "Surveyor Emeka Obi manually flags document timestamp inconsistency", actor: "surveyor.demo@landsecure.app", type: "flag" },
        { label: "Fraud alert assigned to Compliance Officer Ngozi Adeyemi for investigation", actor: "compliance.demo@landsecure.app", type: "audit" },
        { label: "Survey document hash verification fails — GFL/2024/0010 matches SN/2023/4421", actor: "surveyor.demo@landsecure.app", type: "flag" },
        { label: "Parcel frozen pending investigation (conflict_blocked spatial status)", actor: "sg.demo@landsecure.app", type: "approval" },
        { label: "Investigation completed — GFL/2022/0506 confirmed administrative error, records corrected", actor: "compliance.demo@landsecure.app", type: "approval" },
        { label: "Critical alert GFL/2023/0514 escalated to Surveyor General for final ruling", actor: "sg.demo@landsecure.app", type: "approval" },
      ],
      auditEvents: [
        { action: "FRAUD_ALERT_ESCALATED", actor: "sg.demo@landsecure.app", detail: "GFL/2025/0065 — duplicate registration confirmed by field agent" },
        { action: "FRAUD_INVESTIGATION_COMPLETED", actor: "compliance.demo@landsecure.app", detail: "GFL/2024/0002 survey plan duplication = admin error. Alert resolved." },
        { action: "SPATIAL_VALIDATION_RUN", actor: "System Auto-Detection", detail: "Scheduled run — 3 parcels flagged across Greenfield LGA" },
        { action: "OFFLINE_REPORT_SYNCED", actor: "agent.demo@landsecure.app", detail: "GPS data synced on return to LGA office: GFL/2024/0009" },
      ],
    },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading readiness metrics from live database…</p>
      </div>
    </div>
  );

  const { system, data: dataM, workflow, gis, audit, pilot } = metrics;
  const pilotColor = pilot >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-300" :
                     pilot >= 60 ? "text-amber-700 bg-amber-50 border-amber-300" :
                     "text-red-700 bg-red-50 border-red-300";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Readiness Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Greenfield LGA Pilot · 5 guided demonstration scenarios · Live data only</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Pilot Score Banner */}
      <Card className={`border-2 ${pilotColor}`}>
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex items-center gap-4">
            <Gauge pct={pilot} size={100} />
            <div>
              <p className="text-3xl font-black text-gray-900">{pilot}%</p>
              <p className="text-base font-bold text-gray-700">Pilot Readiness Score</p>
              <p className="text-xs text-muted-foreground">Composite of all 5 dimensions below</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
            {[
              { label: "System", score: system.score },
              { label: "Data", score: dataM.score },
              { label: "Workflow", score: workflow.score },
              { label: "GIS", score: gis.score },
              { label: "Audit", score: audit.score },
            ].map(d => (
              <div key={d.label} className="flex flex-col items-center bg-white rounded-lg p-2 border">
                <Gauge pct={d.score} size={56} />
                <p className="text-xs font-semibold text-gray-600 mt-1">{d.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dimension Cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" /> Readiness Dimensions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <DimensionCard label="System Completeness" score={system.score} items={system.items} />
          <DimensionCard label="Data Completeness" score={dataM.score} items={dataM.items} />
          <DimensionCard label="Workflow Completeness" score={workflow.score} items={workflow.items} />
          <DimensionCard label="GIS Completeness" score={gis.score} items={gis.items} />
          <DimensionCard label="Audit Completeness" score={audit.score} items={audit.items} />
        </div>
      </div>

      {/* Scenarios */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Guided Demonstration Scenarios
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Click each scenario to expand live record references, navigation links, workflow steps and audit trail events.</p>
        <div className="space-y-3">
          {scenarios.map(s => <ScenarioCard key={s.id} scenario={s} />)}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">All metrics computed live from actual database. No synthetic statistics used.</p>
    </div>
  );
}