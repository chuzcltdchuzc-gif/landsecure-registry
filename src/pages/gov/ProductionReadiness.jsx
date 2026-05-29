import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download,
  Shield, ShieldCheck, Database, Server, Zap, Lock, Globe, Archive,
  Activity, FileText, Users, HardDrive, GitBranch, BarChart2
} from "lucide-react";

// ── score helpers ─────────────────────────────────────────
const CONTROLS = {
  environment: [
    { id: "env_separation", label: "Dev / Staging / Prod environment separation", status: "implemented", notes: "Base44 platform provides isolated project environments. Use separate Base44 apps per environment." },
    { id: "db_isolation", label: "Database isolation between environments", status: "implemented", notes: "Each Base44 app has a fully isolated data store. No cross-environment data leakage is possible." },
    { id: "env_vars", label: "Environment variable management", status: "implemented", notes: "Secrets managed via Base44 dashboard environment variables. Never committed to source." },
    { id: "neon_branches", label: "Neon PostgreSQL branch strategy (dev/staging/prod)", status: "documented", notes: "Base44 manages the underlying DB. For self-hosted Neon: create branches per env, promote via migration scripts." },
    { id: "promotion_workflow", label: "Deployment promotion workflow documented", status: "documented", notes: "Workflow: develop → merge PR → staging deploy → smoke test → tag release → production promote." },
    { id: "rollback_proc", label: "Rollback procedures defined", status: "documented", notes: "Rollback: revert to previous Base44 snapshot / git tag. DB rollback via Neon branch restore for self-hosted." },
  ],
  multiTenant: [
    { id: "tenant_id_field", label: "tenant_id field on all major entities", status: "partial", notes: "Architecture requires tenant_id added to LandParcel, FamilyOwnership, InheritanceCase, Dispute, FraudAlert, AuditLog. Use LGA code as tenant_id for current pilot." },
    { id: "tenant_config", label: "Tenant configuration registry", status: "documented", notes: "Create a TenantConfig entity with: tenant_id, name, state, lga, contact, logo_url, active." },
    { id: "tenant_scoped_queries", label: "Tenant-scoped queries on all list operations", status: "partial", notes: "Filter all entity lists by user's assigned tenant_id. Implement via RLS conditions or frontend filter." },
    { id: "multi_lga", label: "Multi-LGA / Multi-State support architecture", status: "documented", notes: "Greenfield pilot uses single LGA. Schema supports expansion: add tenant_id = lga_code to all records." },
    { id: "tenant_admin", label: "Tenant admin role separation", status: "partial", notes: "Current roles support single-tenant. Add tenant_admin role for multi-tenant rollout." },
  ],
  rls: [
    { id: "rls_super_admin", label: "Super Admin: full read/write across all entities", status: "implemented", notes: "RLS configured on all entities. super_admin role has unrestricted access." },
    { id: "rls_surveyor_general", label: "Surveyor General: read all, approve parcels & cases", status: "implemented", notes: "RLS on LandParcel, SurveyDocument, InheritanceCase grants read + update to surveyor_general." },
    { id: "rls_compliance", label: "Compliance Officer: read all, manage fraud & disputes", status: "implemented", notes: "RLS on FraudAlert, Dispute, ComplianceReport grants full access to compliance_officer." },
    { id: "rls_surveyor", label: "Surveyor: own submissions + survey documents", status: "implemented", notes: "Surveyors can read own submissions and survey documents. Cannot access others' records." },
    { id: "rls_field_agent", label: "Field Agent: own reports + unverified parcels", status: "implemented", notes: "Field agents limited to own FieldReports and unverified LandParcels." },
    { id: "rls_general_user", label: "General User: own parcels and claims only", status: "implemented", notes: "General users see only own parcel records (owner_email match)." },
    { id: "rls_audit_immutable", label: "Audit logs: insert-only for regular roles, read for admins", status: "implemented", notes: "AuditLog update/delete restricted to super_admin only. Provides tamper-evident trail." },
    { id: "rls_approved_lock", label: "Approved-locked parcels: no modification by non-admins", status: "implemented", notes: "approved_locked status prevents update by creator/owner. Only super_admin/compliance can override." },
  ],
  apiProtection: [
    { id: "rate_limit_platform", label: "Platform-level rate limiting", status: "implemented", notes: "Base44 platform enforces API rate limits. 429 responses returned automatically on breach." },
    { id: "rate_limit_batching", label: "Client-side request batching to prevent limit breach", status: "implemented", notes: "Data fetches batched in groups of 5 with 300ms delay. Prevents simultaneous flood of requests." },
    { id: "auth_required", label: "Authentication required on all data endpoints", status: "implemented", notes: "All entity operations require valid session token. Unauthenticated requests return 401." },
    { id: "role_enforcement", label: "Role enforcement on all backend functions", status: "implemented", notes: "healthCheck and all backend functions validate user role before processing." },
    { id: "input_validation", label: "Entity schema validation on all writes", status: "implemented", notes: "JSON schema validation enforced by Base44 on all entity create/update operations." },
    { id: "abuse_detection", label: "Abuse detection & anomaly monitoring", status: "partial", notes: "Implement: monitor AuditLog for burst writes from single user. Alert on >50 actions/min." },
    { id: "cors_policy", label: "CORS policy enforced", status: "implemented", notes: "Base44 platform enforces CORS. Only whitelisted origins can call the API." },
  ],
  infrastructure: [
    { id: "connection_pooling", label: "Connection pooling enabled", status: "implemented", notes: "Base44 managed database uses connection pooling internally. Expected: 50-200 concurrent connections in production." },
    { id: "connection_limits", label: "Connection limits documented", status: "documented", notes: "Pilot: 50 concurrent users → ~150 connections. Production 1000-parcel LGA: 200 connections max. Scale with PgBouncer for >1000 users." },
    { id: "health_check_endpoint", label: "Health check endpoint (/api/healthCheck)", status: "implemented", notes: "Backend function 'healthCheck' returns DB latency, auth status, environment. Suitable for uptime monitors." },
    { id: "horizontal_scaling", label: "Horizontal scaling readiness", status: "implemented", notes: "Base44 platform scales horizontally automatically. Stateless frontend + managed backend = scale-ready." },
    { id: "cdn_files", label: "CDN delivery for uploaded files", status: "implemented", notes: "Base44 UploadFile integration returns CDN-backed URLs. Survey docs, images, certificates served from edge." },
    { id: "cdn_gis", label: "GIS tile caching", status: "partial", notes: "Leaflet uses OpenStreetMap tiles (CDN-backed). GeoJSON boundary data cached client-side via React Query." },
  ],
  backgroundJobs: [
    { id: "job_fraud_scoring", label: "Fraud scoring: async background processing", status: "documented", notes: "Implement via Base44 scheduled automation (every 5 min): fetch new parcels, run fraud score, update fraud_risk_score field." },
    { id: "job_gis_validation", label: "GIS validation: async boundary check queue", status: "documented", notes: "Entity automation on LandParcel create/update: trigger GIS validation function, update spatial_validation_status." },
    { id: "job_bulk_import", label: "Bulk imports: chunked background processing", status: "implemented", notes: "Bulk import seeded via backend functions (seedDemoPhase1-3). Production imports should chunk at 100 records per job." },
    { id: "job_pdf", label: "PDF generation: async with URL return", status: "documented", notes: "Use exportTasks-pattern backend function. Generate PDF, upload via UploadFile, return signed URL. Never block UI." },
    { id: "job_audit_export", label: "Audit report export: background generation", status: "documented", notes: "Large audit exports should be queued. User receives email with download link when ready." },
    { id: "job_notifications", label: "Notification delivery: event-driven", status: "documented", notes: "Use entity automation on status changes to create Notification records. Extend with email via SendEmail integration." },
  ],
  caching: [
    { id: "cache_react_query", label: "Client-side cache via React Query", status: "implemented", notes: "All entity fetches use TanStack React Query with staleTime. Dashboard stats cached for session duration." },
    { id: "cache_gis", label: "GIS layer caching (client-side)", status: "implemented", notes: "Leaflet tile layers are browser-cached. GeoJSON boundary data cached in React Query with 5-min stale time." },
    { id: "cache_stats", label: "Dashboard statistics cache", status: "implemented", notes: "Pilot dashboard KPIs fetched once and held in component state. Refresh on demand." },
    { id: "cache_invalidation", label: "Cache invalidation strategy on mutations", status: "implemented", notes: "React Query invalidateQueries() called after all create/update/delete operations." },
    { id: "cache_ttl", label: "Cache TTL policy defined", status: "documented", notes: "Dashboard: 5 min | GIS layers: 10 min | Reports: 15 min | Reference data: 60 min | Real-time alerts: 0 (no cache)." },
  ],
  compliance: [
    { id: "ndpa", label: "Nigeria Data Protection Act (NDPA) 2023 controls", status: "partial", notes: "Required: Privacy Notice, Consent Mechanism, Data Subject Rights, DPO designation, breach notification within 72h." },
    { id: "gdpr", label: "GDPR Article 25 (privacy by design)", status: "partial", notes: "RLS enforces data minimisation. No cross-tenant access. Implement: right to erasure, data portability endpoint." },
    { id: "ccpa", label: "CCPA controls (if US residents involved)", status: "documented", notes: "If deploying to US stakeholders: add 'Do Not Sell' disclosure. Current pilot scope: Nigeria only, CCPA not applicable." },
    { id: "privacy_policy", label: "Privacy Policy document", status: "documented", notes: "See Compliance tab. Covers data collected, processing purpose, retention, subject rights, contact." },
    { id: "terms_of_service", label: "Terms of Service document", status: "documented", notes: "See Compliance tab. Covers acceptable use, liability, government data sovereignty, dispute resolution." },
    { id: "data_retention", label: "Data retention policy defined", status: "documented", notes: "Active records: indefinite. Deleted records: soft-delete retained 7 years. Audit logs: 10 years. GIS snapshots: permanent." },
    { id: "breach_notification", label: "Data breach notification procedure", status: "documented", notes: "Detect via audit log anomaly. Notify NITDA within 72h. Notify affected users within 7 days." },
    { id: "pii_handling", label: "PII handling controls", status: "implemented", notes: "owner_email, national_id, phone stored encrypted at rest by Base44 platform. Never logged in AuditLog details." },
  ],
  monitoring: [
    { id: "error_monitoring", label: "Error monitoring (frontend)", status: "partial", notes: "Implement: wrap App.jsx in error boundary. Add window.onerror handler. Forward to monitoring service (e.g. Sentry)." },
    { id: "perf_monitoring", label: "Performance monitoring", status: "partial", notes: "Use Web Vitals API: report LCP, FID, CLS. Implement healthCheck polling every 5 min from admin dashboard." },
    { id: "audit_monitoring", label: "Audit trail monitoring", status: "implemented", notes: "AuditLog entity captures all actions. Global Audit page provides real-time review. Automated on entity changes." },
    { id: "db_health", label: "Database health monitoring", status: "implemented", notes: "healthCheck backend function probes DB latency. Can be called by external uptime monitors (UptimeRobot, Pingdom)." },
    { id: "uptime_check", label: "Uptime monitoring integration", status: "documented", notes: "Point UptimeRobot/Pingdom to healthCheck endpoint. Alert on >2s latency or non-200 status." },
    { id: "alerting", label: "Alerting on critical failures", status: "documented", notes: "Configure: email alert on healthCheck failure, Slack alert on fraud_alert critical, auto-notify on import failure." },
  ],
  disasterRecovery: [
    { id: "backup_entity", label: "Entity data backup via export", status: "documented", notes: "Daily: trigger CSV export of all entities via scheduled automation. Store in secure cloud bucket (S3/GCS)." },
    { id: "backup_gis", label: "GIS boundary backup", status: "documented", notes: "parcel_boundary GeoJSON fields are included in entity backup. Maintain separate GeoJSON file export weekly." },
    { id: "backup_audit", label: "Audit log backup (append-only export)", status: "documented", notes: "AuditLog is append-only by policy. Weekly export to offsite storage. 10-year retention required." },
    { id: "restore_proc", label: "Restore procedure documented", status: "documented", notes: "1. Provision clean Base44 app. 2. Import entity CSVs via Bulk Import. 3. Verify record counts. 4. Run healthCheck. 5. Restore GIS files." },
    { id: "rpo", label: "Recovery Point Objective (RPO) defined", status: "documented", notes: "RPO: 24 hours for standard restore. 1 hour for premium tier with continuous backup." },
    { id: "rto", label: "Recovery Time Objective (RTO) defined", status: "documented", notes: "RTO: 4 hours for full platform restore. 1 hour for read-only mode with GIS and search." },
    { id: "dr_test", label: "Disaster recovery test schedule", status: "documented", notes: "Quarterly DR drill: simulate DB loss, restore from backup, validate record counts, sign off by Surveyor General." },
    { id: "bcp", label: "Business Continuity Plan (BCP)", status: "documented", notes: "Offline mode: Field agents use paper forms. Manual registry maintained. Data entered on recovery. No >24h gap in service." },
  ],
};

const STATUS_CONFIG = {
  implemented: { label: "Implemented", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2, iconColor: "text-emerald-600" },
  documented: { label: "Documented", color: "bg-blue-100 text-blue-800 border-blue-300", icon: FileText, iconColor: "text-blue-600" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-800 border-amber-300", icon: AlertTriangle, iconColor: "text-amber-500" },
  gap: { label: "Gap", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle, iconColor: "text-red-500" },
};

function scoreSection(controls) {
  const total = controls.length;
  const implemented = controls.filter(c => c.status === "implemented").length;
  const documented = controls.filter(c => c.status === "documented").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const score = Math.round(((implemented * 1.0 + documented * 0.7 + partial * 0.4) / total) * 100);
  return { score, implemented, documented, partial, gap: total - implemented - documented - partial, total };
}

function ScoreGauge({ score, label, size = "md" }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
  const bg = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const ring = score >= 80 ? "stroke-emerald-500" : score >= 60 ? "stroke-amber-500" : "stroke-red-500";
  const r = size === "lg" ? 48 : 36;
  const cx = size === "lg" ? 60 : 48;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${bg}`}>
      <svg width={size === "lg" ? 120 : 96} height={size === "lg" ? 120 : 96}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx={cx} cy={cx} r={r} fill="none" className={ring} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`} />
        <text x={cx} y={cx + 6} textAnchor="middle" className={`fill-current ${color}`}
          style={{ fontSize: size === "lg" ? 22 : 18, fontWeight: 700 }}>{score}</text>
      </svg>
      <p className="text-xs font-semibold text-gray-700 mt-1 text-center">{label}</p>
    </div>
  );
}

function ControlRow({ control }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[control.status];
  const Icon = cfg.icon;
  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-gray-50 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.iconColor}`} />
          <span className="text-sm font-medium text-gray-800 truncate">{control.label}</span>
        </div>
        <Badge variant="outline" className={`text-xs flex-shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 border-t text-xs text-gray-600 leading-relaxed">
          {control.notes}
        </div>
      )}
    </div>
  );
}

function DomainSection({ title, icon: Icon, color, controls }) {
  const { score, implemented, documented, partial, gap } = scoreSection(controls);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            {title}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-semibold">{implemented} impl</span>
            <span className="text-blue-600">{documented} doc</span>
            {partial > 0 && <span className="text-amber-500">{partial} partial</span>}
            {gap > 0 && <span className="text-red-500">{gap} gap</span>}
            <Badge variant="outline" className={score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-300" : score >= 60 ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-red-50 text-red-700 border-red-300"}>
              {score}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {controls.map(c => <ControlRow key={c.id} control={c} />)}
      </CardContent>
    </Card>
  );
}

function ComplianceDocTab() {
  const docs = [
    {
      title: "Privacy Policy",
      sections: [
        { h: "1. Data Controller", b: "The relevant State Government Ministry of Lands & Housing ('Ministry') is the data controller. Contact: dataprivacy@landsecure.gov.ng" },
        { h: "2. Data Collected", b: "Personal data collected includes: full name, email address, phone number, national ID number, GPS coordinates, property ownership records, and identity documents uploaded during registration." },
        { h: "3. Purpose of Processing", b: "Data is processed exclusively for: land title registration, ownership verification, dispute resolution, fraud prevention, and generation of official certificates." },
        { h: "4. Legal Basis", b: "Processing is authorised under: Nigeria Data Protection Act 2023 (NDPA), Land Use Act 1978, and State Land Registration Laws." },
        { h: "5. Data Retention", b: "Active records: retained indefinitely as public registry. Audit logs: 10 years. Deleted records: soft-deleted, retained 7 years for legal compliance. GIS data: permanent." },
        { h: "6. Data Subject Rights", b: "Under NDPA 2023: Right to access your records · Right to correct inaccurate data · Right to restrict processing during disputes · Right to lodge complaints with NITDA." },
        { h: "7. Data Security", b: "All data is encrypted at rest and in transit. Role-based access controls prevent unauthorised access. Comprehensive audit logging tracks all data access events." },
        { h: "8. International Transfers", b: "Data is processed and stored within Nigeria. No international data transfers without explicit NITDA approval and adequate safeguards." },
        { h: "9. Breach Notification", b: "In the event of a data breach, NITDA will be notified within 72 hours. Affected individuals will be notified within 7 days where feasible." },
        { h: "10. Contact", b: "Data Protection Officer: dpo@landsecure.gov.ng | NITDA Complaints: info@nitda.gov.ng" },
      ]
    },
    {
      title: "Terms of Service",
      sections: [
        { h: "1. Acceptance", b: "By accessing LandSecure Registry, users accept these Terms and all applicable Nigerian laws governing land administration." },
        { h: "2. Authorised Use", b: "The platform is for authorised government officers, licensed surveyors, registered field agents, and verified land owners. Unauthorised access is prohibited under the Cybercrimes Act 2015." },
        { h: "3. Data Accuracy", b: "Users are responsible for the accuracy of all submitted data. Submission of false or fraudulent information is a criminal offence under the Land Use Act and Criminal Code." },
        { h: "4. Government Data Sovereignty", b: "All land registry data is the property of the State Government. Users have no ownership rights over registry data. The Ministry may use data for official planning and governance purposes." },
        { h: "5. Liability", b: "The Ministry is not liable for: technical downtime, data loss beyond documented backup procedures, or disputes arising from pre-existing land conflicts not entered in the registry." },
        { h: "6. Account Security", b: "Users are responsible for maintaining the confidentiality of credentials. Shared accounts are prohibited. Report suspected compromises immediately." },
        { h: "7. Dispute Resolution", b: "Disputes regarding platform use are resolved under Nigerian law in the courts of the State in which the Ministry operates." },
        { h: "8. Modifications", b: "The Ministry reserves the right to modify these Terms. Users will be notified of material changes via the platform notification system." },
      ]
    },
    {
      title: "Data Retention Policy",
      sections: [
        { h: "Active Land Records", b: "Retained indefinitely as part of the permanent public land registry. Cannot be deleted — only status changes allowed." },
        { h: "Soft-Deleted Records", b: "Records marked is_deleted=true are retained for 7 years before permanent purge. Required for legal audit trail." },
        { h: "Audit Logs", b: "All AuditLog entries retained for minimum 10 years. Append-only. Cannot be deleted by any role except super_admin under extraordinary circumstances." },
        { h: "Survey Documents & Files", b: "All uploaded documents retained permanently. Survey plans are legal instruments and cannot be destroyed." },
        { h: "Field Reports", b: "Retained for 5 years after parcel approval. GPS coordinates and photos constitute official evidence." },
        { h: "User Account Data", b: "Retained while account is active + 3 years after deactivation. Email retained permanently for audit trail matching." },
        { h: "Backup Archives", b: "Nightly backups retained 30 days. Weekly backups retained 1 year. Monthly backups retained 7 years." },
        { h: "Review Schedule", b: "Retention policy reviewed annually by the Data Protection Officer and Ministry Legal Counsel." },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      {docs.map(doc => (
        <Card key={doc.title}>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />{doc.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {doc.sections.map(s => (
              <div key={s.h} className="border-l-2 border-blue-200 pl-3">
                <p className="text-xs font-bold text-gray-800 mb-0.5">{s.h}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ArchitectureTab() {
  const items = [
    { title: "Environment Separation", icon: GitBranch, color: "text-purple-600", items: [
      "Development: Local Base44 app (dev project). Feature branches tested here. No real data.",
      "Staging: Separate Base44 app (staging project). Seeded with anonymised production snapshot. UAT runs here.",
      "Production: Live Base44 app. Restricted deploy access. Requires 2-person approval for schema changes.",
      "Promotion workflow: Dev PR → Staging deploy → 48h soak → Production release tag → Go-live.",
      "Neon (self-hosted path): Create branch per environment. Promote via pg_dump/restore. Rollback via branch switch.",
    ]},
    { title: "Multi-Tenant Architecture", icon: Users, color: "text-indigo-600", items: [
      "Current pilot: single tenant (Greenfield LGA). tenant_id = 'GFL-001'.",
      "Expansion: Add tenant_id field to LandParcel, FamilyOwnership, InheritanceCase, Dispute, FraudAlert, AuditLog.",
      "Tenant config: TenantConfig entity stores name, state, lga, logo_url, admin_email, is_active, plan_tier.",
      "Query isolation: All list() calls filter by tenant_id from user session. Admins can switch tenant context.",
      "New LGA onboarding: Create tenant record → assign super_admin → seed reference data → go-live.",
    ]},
    { title: "Background Job Queue", icon: Zap, color: "text-amber-600", items: [
      "Fraud Scoring: Scheduled automation every 15 min → fetch new parcels → run ML rules → update fraud_risk_score.",
      "GIS Validation: Entity automation on LandParcel create/update → validate polygon → update spatial_validation_status.",
      "Bulk Import: chunked 100-records-per-job → progress stored in ImportHistory → failure retry with backoff.",
      "PDF Generation: Backend function generates PDF → uploads via UploadFile → returns signed URL → never blocks UI.",
      "Audit Export: Large exports triggered async → user notified via Notification record when download is ready.",
      "Notification Delivery: Entity automation on status change → create Notification → call SendEmail integration.",
    ]},
    { title: "Caching Strategy", icon: Database, color: "text-teal-600", items: [
      "Client cache: TanStack React Query with staleTime. All entity fetches cached in browser memory.",
      "Dashboard stats: 5-minute stale time. Refetch on window focus.",
      "GIS layers: OpenStreetMap tiles browser-cached by Leaflet. GeoJSON cached in React Query 10 min.",
      "Reference data (roles, LGAs, states): 60-minute stale time. Rarely changes.",
      "Real-time alerts (fraud, disputes): No cache. Always fresh. Refetch every 30s.",
      "Invalidation: invalidateQueries() called after every mutation. Ensures consistency.",
    ]},
    { title: "Connection Pooling & Capacity", icon: Server, color: "text-blue-600", items: [
      "Base44 managed: Connection pooling handled internally. No configuration required.",
      "Pilot capacity: 50 concurrent users → ~150 DB connections. Well within managed limits.",
      "Production LGA (1000 parcels, 200 users): ~600 connections peak. Require connection pool monitoring.",
      "Multi-LGA (5000+ parcels, 1000 users): Add PgBouncer. Set pool_size=25 per service. Max 500 server connections.",
      "Health check: Monitor avg query latency via healthCheck endpoint. Alert if >500ms sustained.",
    ]},
    { title: "CDN & File Delivery", icon: Globe, color: "text-green-600", items: [
      "Survey documents: Uploaded via Base44 UploadFile → stored on CDN-backed storage → URL returned.",
      "Images & photos: Same pipeline. URLs are permanent, globally distributed.",
      "GIS files (CAD, shapefiles): Upload to Base44 private storage. Create signed URLs with 1-hour expiry.",
      "Certificates (PDF): Generate via jsPDF backend function → upload → signed URL shared with recipient.",
      "Large reports: Generate in background → upload → Notification record with download link.",
      "Sensitive docs: Use UploadPrivateFile → CreateFileSignedUrl for time-limited access (15 min expiry).",
    ]},
    { title: "Auto Scaling & Resilience", icon: Activity, color: "text-red-600", items: [
      "Frontend scaling: React SPA served from CDN. Scales to unlimited concurrent viewers automatically.",
      "Backend functions: Deno Deploy functions scale horizontally on demand. No configuration required.",
      "Database: Base44 managed DB auto-scales read capacity. Write scaling via connection pool tuning.",
      "Health checks: healthCheck endpoint probed every 5 min by uptime monitor. Alert on failure.",
      "Failure recovery: Stateless architecture means instance failure = auto-restart with no data loss.",
      "Circuit breaker: Frontend catches 429/503 errors, shows user-friendly message, retries with backoff.",
    ]},
    { title: "Disaster Recovery", icon: Archive, color: "text-gray-600", items: [
      "RPO (Recovery Point Objective): 24 hours standard / 1 hour premium backup tier.",
      "RTO (Recovery Time Objective): 4 hours full restore / 1 hour read-only mode.",
      "Backup procedure: Daily automated CSV export of all entities → encrypted upload to S3 → verify record count.",
      "Restore procedure: 1) Provision clean Base44 app → 2) Import CSVs → 3) Verify counts → 4) Run healthCheck → 5) Go-live.",
      "GIS backup: Weekly GeoJSON export of all parcel boundaries. Stored separately from entity backup.",
      "DR drill: Quarterly test. Simulate DB loss → restore → validate. Signed off by Surveyor General.",
      "BCP: Offline mode → paper forms → data entry on recovery. Max 24h gap. No critical decisions blocked.",
    ]},
  ];

  return (
    <div className="space-y-5">
      {items.map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <section.icon className={`w-4 h-4 ${section.color}`} />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function ProductionReadiness() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("report");

  const allControls = Object.values(CONTROLS).flat();
  const implemented = allControls.filter(c => c.status === "implemented").length;
  const documented = allControls.filter(c => c.status === "documented").length;
  const partial = allControls.filter(c => c.status === "partial").length;
  const gap = allControls.filter(c => c.status === "gap").length;
  const total = allControls.length;

  const securityScore = scoreSection([...CONTROLS.rls, ...CONTROLS.apiProtection, ...CONTROLS.compliance]).score;
  const scalabilityScore = scoreSection([...CONTROLS.infrastructure, ...CONTROLS.backgroundJobs, ...CONTROLS.caching]).score;
  const complianceScore = scoreSection(CONTROLS.compliance).score;
  const overallScore = Math.round((implemented * 1.0 + documented * 0.7 + partial * 0.4) / total * 100);

  const recommendation = overallScore >= 80
    ? "GO-LIVE APPROVED — Platform meets production readiness threshold. Address partial items in first sprint post-launch."
    : overallScore >= 65
    ? "CONDITIONAL GO-LIVE — Platform is deployable for controlled pilot. Resolve partial items before full rollout."
    : "NOT READY — Address all gap and partial items before production deployment.";

  const recColor = overallScore >= 80 ? "bg-emerald-50 border-emerald-300 text-emerald-800"
    : overallScore >= 65 ? "bg-amber-50 border-amber-300 text-amber-800"
    : "bg-red-50 border-red-300 text-red-800";

  async function runHealthCheck() {
    setHealthLoading(true);
    try {
      const res = await base44.functions.invoke('healthCheck', {});
      setHealth(res.data);
    } catch (e) {
      setHealth({ status: 'error', error: e.message });
    }
    setHealthLoading(false);
  }

  function handleExport() {
    const lines = [
      "LANDSECURE REGISTRY — PRODUCTION READINESS REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      "=".repeat(70),
      "",
      `Overall Score: ${overallScore}%`,
      `Security Score: ${securityScore}%`,
      `Scalability Score: ${scalabilityScore}%`,
      `Compliance Score: ${complianceScore}%`,
      "",
      `Total Controls: ${total}`,
      `Implemented: ${implemented}`,
      `Documented: ${documented}`,
      `Partial: ${partial}`,
      `Gaps: ${gap}`,
      "",
      `RECOMMENDATION: ${recommendation}`,
      "",
      "=".repeat(70),
      "CONTROL DETAIL",
      "",
      ...Object.entries(CONTROLS).flatMap(([domain, controls]) => [
        `\n[${domain.toUpperCase()}]`,
        ...controls.map(c => `  [${c.status.toUpperCase().padEnd(11)}] ${c.label}`)
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production_readiness_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Readiness Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Architecture hardening · Security · Compliance · Scalability · Disaster Recovery</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={runHealthCheck} disabled={healthLoading} className="gap-2">
            <Activity className={`w-3.5 h-3.5 ${healthLoading ? "animate-pulse" : ""}`} />
            {healthLoading ? "Checking…" : "Health Check"}
          </Button>
          <Button size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-3.5 h-3.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* Health check result */}
      {health && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap text-sm ${health.status === 'healthy' ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
          {health.status === 'healthy'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            : <XCircle className="w-4 h-4 text-red-500" />}
          <span className="font-semibold">{health.status === 'healthy' ? 'Platform Healthy' : 'Platform Issue Detected'}</span>
          {health.latency && <span className="text-gray-600">DB: {health.latency.db_ms}ms · Total: {health.latency.total_ms}ms</span>}
          {health.error && <span className="text-red-600">{health.error}</span>}
          {health.timestamp && <span className="text-gray-400 text-xs ml-auto">{new Date(health.timestamp).toLocaleTimeString()}</span>}
        </div>
      )}

      {/* Score strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ScoreGauge score={overallScore} label="Overall Readiness" size="lg" />
        <ScoreGauge score={securityScore} label="Security Score" />
        <ScoreGauge score={scalabilityScore} label="Scalability Score" />
        <ScoreGauge score={complianceScore} label="Compliance Score" />
      </div>

      {/* Recommendation */}
      <div className={`rounded-xl border px-5 py-4 ${recColor}`}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1">Go-Live Recommendation</p>
        <p className="text-sm font-semibold">{recommendation}</p>
        <div className="flex gap-4 mt-2 text-xs">
          <span><span className="font-bold text-emerald-700">{implemented}</span> Implemented</span>
          <span><span className="font-bold text-blue-700">{documented}</span> Documented</span>
          <span><span className="font-bold text-amber-700">{partial}</span> Partial</span>
          {gap > 0 && <span><span className="font-bold text-red-700">{gap}</span> Gaps</span>}
          <span className="ml-auto text-gray-500">{total} total controls</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="report" className="text-xs"><BarChart2 className="w-3.5 h-3.5 mr-1" />Controls</TabsTrigger>
          <TabsTrigger value="architecture" className="text-xs"><Server className="w-3.5 h-3.5 mr-1" />Architecture</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Compliance Docs</TabsTrigger>
        </TabsList>

        {/* Controls Tab */}
        <TabsContent value="report" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DomainSection title="Environment Separation" icon={GitBranch} color="text-purple-600" controls={CONTROLS.environment} />
            <DomainSection title="Multi-Tenant Architecture" icon={Users} color="text-indigo-600" controls={CONTROLS.multiTenant} />
            <DomainSection title="Row Level Security (RLS)" icon={Lock} color="text-red-600" controls={CONTROLS.rls} />
            <DomainSection title="API Protection" icon={Shield} color="text-blue-600" controls={CONTROLS.apiProtection} />
            <DomainSection title="Infrastructure & Scaling" icon={Server} color="text-teal-600" controls={CONTROLS.infrastructure} />
            <DomainSection title="Background Job Processing" icon={Zap} color="text-amber-600" controls={CONTROLS.backgroundJobs} />
            <DomainSection title="Caching Strategy" icon={Database} color="text-green-600" controls={CONTROLS.caching} />
            <DomainSection title="Security & Compliance" icon={ShieldCheck} color="text-violet-600" controls={CONTROLS.compliance} />
            <DomainSection title="Operational Monitoring" icon={Activity} color="text-orange-600" controls={CONTROLS.monitoring} />
            <DomainSection title="Disaster Recovery" icon={Archive} color="text-gray-600" controls={CONTROLS.disasterRecovery} />
          </div>
          <p className="text-xs text-center text-muted-foreground">Click any control to expand its implementation notes.</p>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="mt-4">
          <ArchitectureTab />
        </TabsContent>

        {/* Compliance Docs Tab */}
        <TabsContent value="compliance" className="mt-4">
          <ComplianceDocTab />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-muted-foreground pt-2">
        LandSecure Registry · Production Architecture Hardening Report · {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}