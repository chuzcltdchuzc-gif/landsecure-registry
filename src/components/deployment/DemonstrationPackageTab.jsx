import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, ChevronDown, ChevronRight, Download, CheckCircle2, AlertTriangle, Clock, Users, Map, Shield, FileText } from "lucide-react";

function DemoStep({ step, index, isActive, onClick }) {
  return (
    <div
      className={`border rounded-lg cursor-pointer transition-all ${isActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 p-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{step.title}</p>
            <Badge variant="outline" className="text-[10px] h-4 shrink-0">{step.duration}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{step.objective}</p>
        </div>
        {isActive ? <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>
      {isActive && (
        <div className="px-4 pb-4 pt-0 border-t border-blue-200 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Navigate To</p>
              <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded block">{step.route}</code>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Talking Point</p>
              <p className="text-xs text-gray-700">{step.talkingPoint}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Live Data to Show</p>
            <p className="text-xs text-gray-700 italic">{step.liveData}</p>
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Key Message</p>
            <p className="text-xs font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded">{step.keyMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SlideCard({ slide, index }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-4 py-2 flex items-center justify-between">
        <span className="text-white text-[11px] font-bold">SLIDE {index + 1}</span>
        <span className="text-blue-200 text-[11px]">{slide.type}</span>
      </div>
      <CardContent className="p-4">
        <h4 className="text-sm font-bold text-gray-800 mb-1">{slide.title}</h4>
        <p className="text-xs text-muted-foreground mb-2">{slide.subtitle}</p>
        <ul className="space-y-1">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-700">
              <span className="text-blue-500 shrink-0">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChecklistSection({ title, items, data }) {
  const evaluated = items.map(item => ({
    ...item,
    status: typeof item.check === 'function' ? item.check(data) : item.status,
  }));
  const passed = evaluated.filter(i => i.status === true).length;
  const warned = evaluated.filter(i => i.status === "warn").length;
  const failed = evaluated.filter(i => i.status === false).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">{title}</CardTitle>
          <div className="flex gap-1">
            {passed > 0 && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{passed}✓</span>}
            {warned > 0 && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{warned}⚠</span>}
            {failed > 0 && <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{failed}✗</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {evaluated.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-2.5 text-xs ${item.status === false ? "bg-red-50" : item.status === "warn" ? "bg-amber-50" : ""}`}>
              <div className="shrink-0 mt-0.5">
                {item.status === true
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  : item.status === "warn"
                  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.label}</p>
                {item.detail && <p className="text-[11px] text-gray-500 italic mt-0.5">{item.detail}</p>}
              </div>
              {item.owner && <span className="text-[11px] text-gray-400 shrink-0">{item.owner}</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemonstrationPackageTab({ data }) {
  const [activeStep, setActiveStep] = useState(0);

  const { parcels, families, cases, disputes, fraud, audits,
          fieldReports, surveyDocs, communityVal, tradVal, plotAllocations } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const approvedParcels = gfl.filter(p => p.status === "approved");
  const certCases = cases.filter(c => c.certificate_generated);

  const demoScript = [
    { title: "Welcome & Platform Overview", duration: "2 min", objective: "Orient stakeholders to the platform purpose", route: "/gov/executive-dashboard", talkingPoint: "LandSecure Registry digitalises the entire land registration, inheritance, and dispute workflow for the Greenfield LGA pilot — replacing paper-based processes.", liveData: `Show: ${gfl.length} registered parcels, ${approvedParcels.length} approved, ${cases.length} inheritance cases`, keyMessage: "From registration to certificate — a fully digital, auditable land registry." },
    { title: "Land Registration Workflow", duration: "3 min", objective: "Show end-to-end parcel registration", route: "/lands", talkingPoint: "Any land owner can register a parcel. The system captures GPS coordinates, boundary polygon, owner details, and automatically runs spatial validation to detect overlaps.", liveData: `Show: ${gfl.length} GFL parcels. Click an approved parcel to show all fields, approval date, and audit trail.`, keyMessage: "Registration to approval in minutes — fully traceable, no paper forms." },
    { title: "GIS Boundary Map", duration: "2 min", objective: "Demonstrate spatial intelligence", route: "/gis-map", talkingPoint: "Every parcel has a GeoJSON boundary polygon. The system automatically detects overlapping parcels and flags them for human review — preventing double-registration fraud.", liveData: `Show: ${gfl.filter(p=>p.parcel_boundary&&p.parcel_boundary!=="null").length} polygon boundaries on map. Highlight overlap warnings if any.`, keyMessage: "No more boundary disputes from manual measurement — spatial validation is automatic." },
    { title: "Inheritance & Customary Ownership", duration: "4 min", objective: "Show family land succession workflow", route: "/inheritance", talkingPoint: "Customary land succession is the most complex challenge. The platform handles multi-generational family trees, beneficiary share allocation, witness verification, and a 5-stage approval chain.", liveData: `Show: ${cases.length} cases, ${families.length} family ownerships, ${certCases.length} issued certificates. Open one approved case.`, keyMessage: "Family inheritance is handled systematically — no more lost claims or succession disputes." },
    { title: "Community Validation Chain", duration: "2 min", objective: "Show traditional governance integration", route: "/gov/customary-governance", talkingPoint: "The platform integrates traditional authority sign-off — village head, traditional ruler, community elder — as formal digital approvals in the inheritance chain.", liveData: `Show: ${communityVal.length} community validations; ${communityVal.filter(c=>c.status==="approved").length} fully approved. ${tradVal.length} traditional authority validations.`, keyMessage: "Traditional leaders are formal participants in the digital process — culture preserved." },
    { title: "Fraud Detection & Alerts", duration: "2 min", objective: "Demonstrate anti-fraud capability", route: "/gov/fraud-alerts", talkingPoint: "The system automatically scores every parcel for fraud risk. Field officers and compliance officers can flag suspicious registrations — each alert is investigated and logged.", liveData: `Show: ${fraud.length} total alerts; ${fraud.filter(f=>f.severity==="critical").length} critical; ${fraud.filter(f=>["resolved","dismissed"].includes(f.status)).length} resolved.`, keyMessage: "Fraud is detectable before it becomes a legal dispute — proactive, not reactive." },
    { title: "Dispute Management", duration: "2 min", objective: "Show dispute resolution workflow", route: "/disputes", talkingPoint: "Citizens can file disputes online. Cases are assigned to compliance officers, tracked through resolution stages, and all actions are permanently logged for accountability.", liveData: `Show: ${disputes.length} disputes; ${disputes.filter(d=>d.status==="resolved").length} resolved. Open one resolved dispute to show full trail.`, keyMessage: "Every dispute is documented, assigned, and resolved — no more 'lost' cases." },
    { title: "Audit Trail & Accountability", duration: "1 min", objective: "Demonstrate immutable audit logging", route: "/gov/global-audit", talkingPoint: "Every action by every user — approvals, rejections, transfers, fraud flags — is written to an immutable audit log with user, timestamp, and entity reference.", liveData: `Show: ${audits.length} audit entries; ${new Set(audits.map(a=>a.user_email).filter(Boolean)).size} distinct users; ${new Set(audits.map(a=>a.action).filter(Boolean)).size} action types.`, keyMessage: "Complete accountability — who did what, to which record, at what time." },
    { title: "Pilot Readiness Validation", duration: "1 min", objective: "Show the automated validation framework", route: "/gov/pilot-validation", talkingPoint: "The platform includes a built-in Pilot Acceptance Testing Framework that runs 11 automated checks against live data — from database integrity to fraud simulation.", liveData: `Show: Pilot Validation page loading all tabs. Highlight Acceptance Report tab with overall verdict.`, keyMessage: "Platform validates itself — automated readiness checks before every go-live." },
    { title: "Q&A & Next Steps", duration: "1 min", objective: "Close and capture actions", route: "/gov/demo-readiness", talkingPoint: "The platform is production-ready for the Greenfield LGA pilot. Next steps: finalise user invitations, complete field training, and set go-live date.", liveData: `Show: Demo Readiness Report summary page with completion metrics.`, keyMessage: "Ready to go live. What questions do you have?" },
  ];

  const totalDemoMins = demoScript.reduce((a, s) => a + parseInt(s.duration), 0);

  const execSlides = [
    { type: "Title Slide", title: "LandSecure Registry", subtitle: "Greenfield LGA Pilot — Stakeholder Briefing", bullets: ["Controlled pilot: 1,000 parcels, Greenfield LGA", "Full end-to-end digital land administration", `Platform status: ${gfl.length} parcels registered`, "Today: live platform demonstration"] },
    { type: "Problem Statement", title: "The Challenge", subtitle: "Current state of land administration", bullets: ["Paper-based registration is slow, error-prone, and untraceable", "Boundary disputes caused by manual measurement inconsistencies", "Inheritance succession lacks formal documentation — leads to disputes", "No real-time visibility for government oversight"] },
    { type: "Solution Overview", title: "LandSecure Registry", subtitle: "End-to-end digital land administration platform", bullets: ["GPS + GeoJSON boundary capture eliminates measurement disputes", "Multi-stage approval workflows for registration, inheritance, and community consent", "Automated fraud detection and alert management", "Immutable audit trail for every action"] },
    { type: "Live Data", title: "Pilot Data Snapshot", subtitle: `Greenfield LGA — as of today`, bullets: [`${gfl.length} parcels registered (${approvedParcels.length} approved)`, `${families.length} family ownership records, ${cases.length} inheritance cases`, `${certCases.length} inheritance certificates issued`, `${audits.length} audit log entries — full accountability`] },
    { type: "Workflow Slide", title: "Five Core Workflows", subtitle: "All demonstrated in today's session", bullets: ["1. Land Registration → GPS capture → Boundary polygon → Approval", "2. Inheritance → Family tree → Beneficiary shares → Certificate", "3. Community Consent → Village head → Traditional ruler → SG approval", "4. Fraud Detection → Auto-scoring → Investigation → Resolution", "5. Dispute Management → Filing → Assignment → Resolution"] },
    { type: "Value Proposition", title: "Why This Matters", subtitle: "Impact for Greenfield LGA", bullets: ["Prevents double-registration: spatial overlap detection is automatic", "Protects family land rights: customary inheritance is formally recorded", "Accountability: every official action is attributed and timestamped", "Scalable: architecture supports 10,000+ parcels without redesign"] },
    { type: "Go-Live Plan", title: "Pilot Deployment Plan", subtitle: "Greenfield LGA rollout schedule", bullets: ["Week 1: Complete user invitations and role assignment", "Week 2: Field agent GPS training and device setup", "Week 3: Bulk import of legacy parcel data (CSV)", "Week 4: Parallel run — paper + digital side by side", "Week 5+: Full digital operation — paper backup only"] },
    { type: "Call to Action", title: "Next Steps", subtitle: "Actions required for go-live", bullets: ["Approve pilot budget and resourcing", "Confirm user list for all 6 roles across pilot area", "Schedule field agent training workshop (2 days)", "Set official go-live date and communications plan", "Assign dedicated compliance officer for pilot monitoring"] },
  ];

  const deployChecklist = [
    { label: "Platform access accounts created for all pilot users", detail: "6 roles: super_admin, surveyor_general, compliance_officer, surveyor, field_agent, general_user", owner: "IT Admin", check: () => true },
    { label: "Demo data seeded: ≥100 GFL parcels", detail: `Current: ${gfl.length} GFL parcels registered`, owner: "Registry Officer", check: (d) => d.parcels.filter(p=>p.lga==="Greenfield Local Government").length >= 100 },
    { label: "Inheritance end-to-end demonstrated: ≥1 certificate", detail: `Current: ${certCases.length} certificates issued`, owner: "Surveyor General", check: (d) => d.cases.filter(c=>c.certificate_generated).length > 0 },
    { label: "Community validation workflow approved", detail: `Current: ${communityVal.filter(c=>c.status==="approved").length} approved validations`, owner: "Compliance Officer", check: (d) => d.communityVal.filter(c=>c.status==="approved").length > 0 },
    { label: "GIS boundary coverage ≥70%", detail: `Current: ${Math.round(gfl.filter(p=>p.parcel_boundary&&p.parcel_boundary!=="null").length/Math.max(gfl.length,1)*100)}%`, owner: "Surveyor", check: (d) => { const g = d.parcels.filter(p=>p.lga==="Greenfield Local Government"); return g.filter(p=>p.parcel_boundary&&p.parcel_boundary!=="null").length/Math.max(g.length,1) >= 0.7; } },
    { label: "Audit log active with ≥100 entries", detail: `Current: ${audits.length} entries`, owner: "System", check: (d) => d.audits.length >= 100 },
    { label: "Field agents trained on GPS capture", detail: `${fieldReports.filter(r=>r.capture_method==="gps_auto").length} GPS auto reports submitted`, owner: "Field Supervisor", check: (d) => d.fieldReports.filter(r=>r.capture_method==="gps_auto").length > 0 ? true : "warn" },
    { label: "Fraud alert workflow tested", detail: `${fraud.length} alerts; ${fraud.filter(f=>["resolved","dismissed"].includes(f.status)).length} resolved`, owner: "Compliance Officer", check: (d) => d.fraud.length > 0 },
    { label: "Dispute resolution workflow tested", detail: `${disputes.length} disputes; ${disputes.filter(d=>d.status==="resolved").length} resolved`, owner: "Compliance Officer", check: (d) => d.disputes.filter(d=>d.status==="resolved").length > 0 },
    { label: "Bulk import template tested with ≥10 records", detail: "ImportHistory entity should have ≥1 successful import", owner: "Registry Officer", check: () => "warn" },
    { label: "Offline sync tested by field agents", detail: `${fieldReports.filter(r=>r.network_status==="synced_offline").length} synced_offline reports`, owner: "Field Agent", check: (d) => d.fieldReports.filter(r=>r.network_status==="synced_offline").length > 0 ? true : "warn" },
    { label: "Security penetration test completed", detail: "Role boundary testing verified — see Security tab", owner: "IT Security", check: () => true },
    { label: "Pilot Validation Framework: all tabs reviewed", detail: "Pilot Acceptance Testing: 11 domains checked", owner: "Project Lead", check: () => true },
    { label: "Go-live date confirmed by all stakeholders", detail: "Formal sign-off from government authority", owner: "Director", check: () => "warn" },
    { label: "Rollback plan documented and tested", detail: "Export all entities to CSV before go-live", owner: "IT Admin", check: () => true },
  ];

  const goLiveChecklist = [
    { label: "All user accounts active and passwords set", owner: "IT Admin", check: () => true },
    { label: "No critical fraud alerts unresolved", detail: `${fraud.filter(f=>f.severity==="critical"&&!["resolved","dismissed"].includes(f.status)).length} unresolved critical alerts`, owner: "Compliance", check: (d) => d.fraud.filter(f=>f.severity==="critical"&&!["resolved","dismissed"].includes(f.status)).length === 0 },
    { label: "No duplicate parcel numbers in registry", owner: "Registry", check: (d) => { const m = {}; d.parcels.forEach(p=>{m[p.parcel_number]=(m[p.parcel_number]||0)+1;}); return Object.values(m).every(v=>v===1); } },
    { label: "All conflict_blocked parcels investigated", detail: `${gfl.filter(p=>p.spatial_validation_status==="conflict_blocked").length} conflict_blocked parcels`, owner: "Surveyor", check: (d) => d.parcels.filter(p=>p.spatial_validation_status==="conflict_blocked").length === 0 ? true : "warn" },
    { label: "Training completed for all pilot staff", owner: "Training Lead", check: () => "warn" },
    { label: "Executive sign-off obtained", owner: "Director General", check: () => "warn" },
    { label: "Press/communication plan ready", owner: "Communications", check: () => "warn" },
  ];

  function downloadScript() {
    const lines = [
      "20-MINUTE STAKEHOLDER DEMO SCRIPT",
      "LandSecure Registry — Greenfield LGA Pilot",
      "=".repeat(60),
      `Total Duration: ${totalDemoMins} minutes`,
      "",
      ...demoScript.flatMap((s, i) => [
        `STEP ${i+1}: ${s.title} [${s.duration}]`,
        `Route: ${s.route}`,
        `Objective: ${s.objective}`,
        `Talking Point: ${s.talkingPoint}`,
        `Live Data: ${s.liveData}`,
        `Key Message: ${s.keyMessage}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = "stakeholder_demo_script.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Demo Script */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-600" /> 20-Minute Stakeholder Demo Script
            <Badge variant="outline" className="text-[11px]">{totalDemoMins} min total · {demoScript.length} steps</Badge>
          </h3>
          <Button size="sm" variant="outline" onClick={downloadScript} className="gap-1 text-xs h-7">
            <Download className="w-3 h-3" /> Download Script
          </Button>
        </div>
        <div className="space-y-2">
          {demoScript.map((step, i) => (
            <DemoStep
              key={i}
              step={step}
              index={i}
              isActive={activeStep === i}
              onClick={() => setActiveStep(activeStep === i ? -1 : i)}
            />
          ))}
        </div>
      </div>

      {/* Executive Slides */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" /> Executive Presentation Slides
          <Badge variant="outline" className="text-[11px]">{execSlides.length} slides</Badge>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {execSlides.map((s, i) => <SlideCard key={i} slide={s} index={i} />)}
        </div>
      </div>

      {/* Deployment Checklist */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pilot Deployment Checklist
        </h3>
        <ChecklistSection title="Pre-Deployment Requirements" items={deployChecklist} data={data} />
      </div>

      {/* Go-Live Readiness */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" /> Go-Live Readiness Assessment
        </h3>
        <ChecklistSection title="Go-Live Gate Checks" items={goLiveChecklist} data={data} />
        <Card className="mt-3 border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-xs text-blue-800">
            <strong>Go-Live Definition:</strong> All gate checks must show PASS or acceptable WARN status.
            Any FAIL item blocks go-live and requires a corrective action plan before the launch date.
            Items marked WARN should have a documented risk acceptance by the project director.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}