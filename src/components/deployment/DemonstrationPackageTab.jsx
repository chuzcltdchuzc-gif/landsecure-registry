import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, Clock, AlertTriangle, Download, ChevronDown, ChevronRight, BarChart2, List } from "lucide-react";

const DEMO_SCRIPT = [
  { time: "0:00–2:00", segment: "Opening — Platform Overview", speaker: "Presenter", actions: ["Open Executive Dashboard", "Show headline KPIs: total parcels, approved, GFL coverage", "Show pilot scope: Greenfield LGA, 1,000-parcel target"], talking_points: ["LandSecure Registry is a comprehensive digital land administration platform", "Purpose-built for customary land tenure in Nigeria", "Today we demonstrate operational readiness for the Greenfield LGA pilot"], nav: "/gov/executive-dashboard" },
  { time: "2:00–4:30", segment: "Land Parcel Registration", speaker: "Registry Officer Demo", actions: ["Navigate to Land Registry", "Show existing GFL parcels", "Open an approved parcel — highlight fields: parcel_number, owner_name, LGA, status, approval_date, approved_by"], talking_points: ["Full chain of custody: who registered, who approved, when", "Every action is time-stamped and audit-logged", "Status workflow: pending → approved / rejected"], nav: "/lands" },
  { time: "4:30–7:00", segment: "GIS Mapping & Spatial Validation", speaker: "Technical Lead Demo", actions: ["Navigate to GIS Map", "Pan to Greenfield LGA parcels", "Click a parcel to show boundary polygon and details panel", "Show spatial_validation_status: valid, overlap_warning"], talking_points: ["GPS-captured boundaries stored as GeoJSON", "Automated spatial conflict detection prevents duplicate registrations", "Field agents capture boundaries on mobile devices, synced to map in real time"], nav: "/gis-map" },
  { time: "7:00–10:00", segment: "Customary Inheritance Processing", speaker: "Customary Law Specialist Demo", actions: ["Navigate to Inheritance Management", "Open an approved inheritance case", "Show: case_type, beneficiaries with percentage_share totalling 100%", "Show certificate_generated = true, certificate_url"], talking_points: ["Supports Yoruba, Igbo, Hausa customary inheritance norms", "Multi-stage approval: Surveyor → Compliance → Surveyor General", "Family meeting resolutions, witness verification, plot allocation all recorded", "Digital certificate issued on final approval"], nav: "/inheritance" },
  { time: "10:00–12:30", segment: "Community & Traditional Authority Validation", speaker: "Community Liaison Demo", actions: ["Open Inheritance Management → Community Validation tab", "Show a fully approved community validation with all stages completed", "Navigate to Traditional Authority Validations", "Show a trad. ruler endorsement with traditional_institution and validation_date"], talking_points: ["Validation chain: Community → Village Head → Traditional Authority → Compliance → Surveyor General", "Traditional rulers' endorsements digitally recorded and time-stamped", "Eliminates paper-based processes prone to fraud and loss"], nav: "/gov/customary-governance" },
  { time: "12:30–15:00", segment: "Fraud Detection & Compliance", speaker: "Compliance Officer Demo", actions: ["Navigate to Governance → Fraud Alerts", "Show a critical fraud alert with investigation_notes and resolved status", "Navigate to Disputes — show resolved dispute with resolution_notes", "Navigate to Global Audit — show audit log breadth"], talking_points: ["Automated fraud risk scoring on every parcel", "Compliance officer triage and investigation workflow", "Full audit trail — every action by every user, immutable", "Real-time fraud alert notifications"], nav: "/gov/fraud-alerts" },
  { time: "15:00–17:00", segment: "Field Operations", speaker: "Field Agent Demo", actions: ["Navigate to Field Reports", "Show a GPS-captured report with quality_flag = pass and gps_accuracy", "Show network_status = synced_offline — offline capability demonstrated", "Open a photo-rich report"], talking_points: ["Field agents work offline — reports queue and sync when connected", "GPS accuracy automatically quality-graded", "Photo evidence attached at point of capture", "Device ID tracked for chain of custody"], nav: "/field-reports" },
  { time: "17:00–19:00", segment: "Governance & Administration", speaker: "Super Admin Demo", actions: ["Navigate to Pending Approvals", "Navigate to Pilot Dashboard — show operational metrics", "Navigate to Data Integrity Report — show health checks"], talking_points: ["Centralised approval queue for all pending registrations", "Real-time operational dashboard for pilot managers", "Automated data integrity verification — catches errors before they propagate"], nav: "/gov/pilot-dashboard" },
  { time: "19:00–20:00", segment: "Closing — Go-Live Readiness", speaker: "Presenter", actions: ["Navigate to Pilot Validation Framework — show acceptance test summary", "Show Pilot Readiness score"], talking_points: ["All 11 acceptance test domains verified against live data", "Platform is operational and ready for 1,000-parcel controlled pilot", "Post-pilot: scale to full LGA and neighbouring states"], nav: "/gov/pilot-validation" },
];

const EXEC_SLIDES = [
  { slide: 1, title: "LandSecure Registry", subtitle: "Greenfield LGA — Pilot Deployment Readiness", type: "cover", bullets: ["Controlled pilot: 1,000 parcels · Greenfield Local Government Area", "End-to-end digital land administration platform", "Customary tenure + statutory framework supported"] },
  { slide: 2, title: "The Problem We Solve", subtitle: "Land Administration Challenges in Nigeria", type: "problem", bullets: ["Fragmented paper records: multiple competing title documents for same parcel", "Customary inheritance disputes: no authoritative digital record of family land decisions", "Fraud vulnerability: manual processes enable boundary manipulation and double registration", "Slow registration: average 2–5 years for formal title under legacy system"] },
  { slide: 3, title: "Platform Capabilities", subtitle: "Comprehensive Digital Land Registry", type: "capabilities", bullets: ["Parcel Registration: full lifecycle from submission to certified title", "GIS Mapping: GPS-captured boundaries, spatial conflict detection, Leaflet map", "Customary Inheritance: multi-stage family workflow with traditional authority endorsement", "Fraud Detection: automated risk scoring, alert management, compliance investigation", "Field Operations: mobile capture, offline sync, GPS quality grading", "Audit Trail: immutable log of every action by every user"] },
  { slide: 4, title: "Pilot Data Summary", subtitle: "Live Platform Statistics — Greenfield LGA", type: "data", dynamic: true },
  { slide: 5, title: "Workflow Validation", subtitle: "End-to-End Process Demonstration", type: "workflow", bullets: ["Registration workflow: Submit → Review → Approve (with audit trail)", "Inheritance workflow: 7-stage approval chain (Surveyor → Compliance → SG → Certificate)", "Community validation: 6-stage endorsement (Community → Village Head → Trad. Authority → SG)", "Dispute resolution: Open → Investigate → Resolve (linked to parcel and audit log)", "Fraud investigation: Alert → Assign → Investigate → Resolve / Dismiss"] },
  { slide: 6, title: "Security & Compliance", subtitle: "Role-Based Access and Audit Protection", type: "security", bullets: ["6 user roles with distinct permission sets", "Immutable audit log — every action recorded with user email, timestamp, entity ID", "Parcel freeze capability for high-risk or disputed records", "Admin-invite-only access — no open self-registration", "All critical workflows require named approvers at each stage"] },
  { slide: 7, title: "Pilot Readiness Assessment", subtitle: "Acceptance Testing Framework Results", type: "readiness", dynamic: true },
  { slide: 8, title: "Go-Live Recommendation", subtitle: "Deployment Decision", type: "golive", dynamic: true },
  { slide: 9, title: "Post-Pilot Roadmap", subtitle: "Scale & Expansion", type: "roadmap", bullets: ["Pilot evaluation: 3 months · target 1,000 parcels fully registered", "Phase 2: expand to 5 LGAs in state", "Phase 3: statewide rollout with inter-LGA transfer capability", "Phase 4: national registry integration", "Ongoing: mobile app hardening, offline sync optimisation, training expansion"] },
];

const CHECKLIST = [
  { category: "Data Readiness", items: [
    { label: "≥ 100 GFL parcels registered in Greenfield LGA", check: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); return { pass: gfl.length>=100, value: gfl.length }; } },
    { label: "≥ 50 parcels approved", check: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); const n=gfl.filter(p=>p.status==="approved").length; return { pass: n>=50, value: n }; } },
    { label: "Family ownership records present", check: (d) => ({ pass: d.families.length>=10, value: d.families.length }) },
    { label: "Beneficiary records with share totals", check: (d) => ({ pass: d.beneficiaries.length>=20, value: d.beneficiaries.length }) },
    { label: "Ownership history chain present", check: (d) => ({ pass: d.ownershipHistory.length>=10, value: d.ownershipHistory.length }) },
  ]},
  { category: "Workflow Readiness", items: [
    { label: "Inheritance case approved end-to-end", check: (d) => ({ pass: d.cases.filter(c=>c.status==="approved").length>0, value: `${d.cases.filter(c=>c.status==="approved").length} approved` }) },
    { label: "Inheritance certificate issued", check: (d) => ({ pass: d.cases.filter(c=>c.certificate_generated).length>0, value: `${d.cases.filter(c=>c.certificate_generated).length} certs` }) },
    { label: "Dispute resolved end-to-end", check: (d) => ({ pass: d.disputes.filter(d2=>d2.status==="resolved").length>0, value: `${d.disputes.filter(d2=>d2.status==="resolved").length} resolved` }) },
    { label: "Fraud alert investigated and resolved", check: (d) => ({ pass: d.fraud.filter(f=>f.status==="resolved").length>0, value: `${d.fraud.filter(f=>f.status==="resolved").length} resolved` }) },
    { label: "Community validation fully approved", check: (d) => ({ pass: d.communityVal.filter(c=>c.status==="approved").length>0, value: `${d.communityVal.filter(c=>c.status==="approved").length} approved` }) },
    { label: "Traditional authority endorsement recorded", check: (d) => ({ pass: d.tradVal.filter(t=>t.validation_status==="approved").length>0, value: `${d.tradVal.filter(t=>t.validation_status==="approved").length} approved` }) },
  ]},
  { category: "Field & GIS Readiness", items: [
    { label: "GIS boundary coverage ≥ 70%", check: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); const pct=Math.round(gfl.filter(p=>p.parcel_boundary&&p.parcel_boundary!=="null").length/Math.max(gfl.length,1)*100); return { pass: pct>=70, value: `${pct}%` }; } },
    { label: "GPS coordinate coverage ≥ 70%", check: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); const pct=Math.round(gfl.filter(p=>p.latitude&&p.longitude).length/Math.max(gfl.length,1)*100); return { pass: pct>=70, value: `${pct}%` }; } },
    { label: "≥ 50 field reports submitted", check: (d) => ({ pass: d.fieldReports.length>=50, value: d.fieldReports.length }) },
    { label: "Field reports with GPS present", check: (d) => ({ pass: d.fieldReports.filter(r=>r.latitude&&r.longitude).length>0, value: `${d.fieldReports.filter(r=>r.latitude&&r.longitude).length} geolocated` }) },
    { label: "Offline sync reports present", check: (d) => ({ pass: d.fieldReports.filter(r=>r.network_status==="synced_offline").length>0, value: `${d.fieldReports.filter(r=>r.network_status==="synced_offline").length} synced` }) },
    { label: "Spatial conflicts < 20 in GFL", check: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); const n=gfl.filter(p=>["overlap_warning","conflict_blocked"].includes(p.spatial_validation_status)).length; return { pass: n<20, value: n }; } },
  ]},
  { category: "Governance & Audit Readiness", items: [
    { label: "Audit log ≥ 100 entries", check: (d) => ({ pass: d.audits.length>=100, value: d.audits.length }) },
    { label: "Audit entries fully linked (user + entity)", check: (d) => { const ok=d.audits.filter(a=>a.user_email&&a.entity_id&&a.action).length; return { pass: ok/Math.max(d.audits.length,1)>=0.9, value: `${ok}/${d.audits.length}` }; } },
    { label: "Survey documents reviewed/approved", check: (d) => ({ pass: d.surveyDocs.filter(s=>["reviewed","approved"].includes(s.review_status)).length>0, value: `${d.surveyDocs.filter(s=>s.review_status==="approved").length} approved` }) },
    { label: "No duplicate parcel numbers", check: (d) => { const m={}; d.parcels.forEach(p=>{m[p.parcel_number]=(m[p.parcel_number]||0)+1;}); const dups=Object.values(m).filter(v=>v>1).length; return { pass: dups===0, value: dups===0?"Clean":""+dups+" duplicates" }; } },
  ]},
];

function ProgressBar({ pct, color }) {
  return <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>;
}

export default function DemonstrationPackageTab({ data }) {
  const [activeSection, setActiveSection] = useState("script");
  const [expandedSlide, setExpandedSlide] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const gfl = data.parcels.filter(p => p.lga === "Greenfield Local Government");
  const checkResults = CHECKLIST.flatMap(cat => cat.items.map(item => item.check(data)));
  const passed = checkResults.filter(r => r.pass).length;
  const total = checkResults.length;
  const score = Math.round(passed / total * 100);
  const verdict = score >= 85 ? "GO-LIVE APPROVED" : score >= 65 ? "CONDITIONAL APPROVAL" : "NOT READY";
  const verdictColor = score >= 85 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : score >= 65 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-red-100 text-red-800 border-red-300";

  function downloadChecklist() {
    const lines = ["PILOT GO-LIVE READINESS CHECKLIST", `Generated: ${new Date().toLocaleString()}`, `Score: ${score}% (${passed}/${total})`, `Verdict: ${verdict}`, "=".repeat(60), ""];
    CHECKLIST.forEach(cat => {
      lines.push(`\n${cat.category}`);
      lines.push("-".repeat(40));
      cat.items.forEach(item => {
        const r = item.check(data);
        lines.push(`[${r.pass ? "PASS" : "FAIL"}] ${item.label} — ${r.value}`);
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `golive_readiness_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "script", label: "20-Min Demo Script", icon: PlayCircle },
          { key: "slides", label: "Exec Slides", icon: BarChart2 },
          { key: "checklist", label: "Deployment Checklist", icon: List },
          { key: "golive", label: "Go-Live Assessment", icon: CheckCircle2 },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Button key={s.key} size="sm" variant={activeSection === s.key ? "default" : "outline"} onClick={() => setActiveSection(s.key)} className="gap-1.5">
              <Icon className="w-3.5 h-3.5" />{s.label}
            </Button>
          );
        })}
      </div>

      {/* 20-min demo script */}
      {activeSection === "script" && (
        <div className="space-y-3">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <p className="text-xs font-bold text-blue-800">20-Minute Stakeholder Demo Script — Greenfield LGA Pilot</p>
              <p className="text-xs text-blue-700 mt-1">Click each segment to expand navigation path, on-screen actions, and talking points.</p>
            </CardContent>
          </Card>
          {DEMO_SCRIPT.map((seg, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex items-start justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedStep(expandedStep === i ? null : i)}>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">{seg.time}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{seg.segment}</p>
                    <p className="text-[11px] text-muted-foreground">{seg.speaker} · Navigate to: <code className="font-mono">{seg.nav}</code></p>
                  </div>
                </div>
                {expandedStep === i ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>
              {expandedStep === i && (
                <CardContent className="pt-0 grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">On-Screen Actions</p>
                    <ol className="space-y-1">
                      {seg.actions.map((a, j) => <li key={j} className="flex gap-2 text-xs text-gray-700"><span className="text-gray-400 font-mono w-4 flex-shrink-0">{j+1}.</span><span>{a}</span></li>)}
                    </ol>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Talking Points</p>
                    <ul className="space-y-1">
                      {seg.talking_points.map((t, j) => <li key={j} className="flex gap-2 text-xs text-gray-700"><span className="text-gray-400 flex-shrink-0">•</span><span>{t}</span></li>)}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Exec slides */}
      {activeSection === "slides" && (
        <div className="space-y-3">
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-3">
              <p className="text-xs font-bold text-purple-800">Executive Presentation — {EXEC_SLIDES.length} slides</p>
              <p className="text-xs text-purple-700 mt-1">Click a slide to expand content. Dynamic slides pull from live platform data.</p>
            </CardContent>
          </Card>
          {EXEC_SLIDES.map((slide, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedSlide(expandedSlide === i ? null : i)}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full w-14 text-center flex-shrink-0">Slide {slide.slide}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{slide.title}</p>
                    <p className="text-[11px] text-muted-foreground">{slide.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {slide.dynamic && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Live Data</Badge>}
                  {expandedSlide === i ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expandedSlide === i && (
                <CardContent className="pt-0">
                  {slide.dynamic && slide.type === "data" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "GFL Parcels Registered", value: gfl.length },
                        { label: "Approved Parcels", value: gfl.filter(p=>p.status==="approved").length },
                        { label: "Inheritance Cases", value: data.cases.length },
                        { label: "Approved Cases", value: data.cases.filter(c=>c.status==="approved").length },
                        { label: "Certificates Issued", value: data.cases.filter(c=>c.certificate_generated).length },
                        { label: "Audit Entries", value: data.audits.length },
                        { label: "Field Reports", value: data.fieldReports.length },
                        { label: "Community Validations", value: data.communityVal.length },
                        { label: "Fraud Alerts Resolved", value: data.fraud.filter(f=>f.status==="resolved").length },
                      ].map(s => (
                        <Card key={s.label}><CardContent className="p-3 text-center">
                          <p className="text-xl font-black text-gray-800">{s.value}</p>
                          <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                  )}
                  {slide.dynamic && slide.type === "readiness" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center"><p className="text-3xl font-black text-gray-800">{score}%</p><p className="text-xs text-muted-foreground">Readiness Score</p></div>
                        <div className="flex-1"><ProgressBar pct={score} color={score>=85?"bg-emerald-500":score>=65?"bg-amber-500":"bg-red-500"} /></div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${verdictColor}`}>{verdict}</span>
                      </div>
                    </div>
                  )}
                  {slide.dynamic && slide.type === "golive" && (
                    <div className={`p-4 rounded-lg border-2 ${verdictColor} text-center`}>
                      <p className="text-2xl font-black">{verdict}</p>
                      <p className="text-sm mt-1">{passed}/{total} readiness criteria passed · Score: {score}%</p>
                    </div>
                  )}
                  {slide.bullets && (
                    <ul className="space-y-2 mt-2">
                      {slide.bullets.map((b, j) => <li key={j} className="flex gap-2 text-sm text-gray-700"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /><span>{b}</span></li>)}
                    </ul>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Deployment Checklist */}
      {activeSection === "checklist" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">{passed}/{total} items passing · Click items for details</p>
            <Button size="sm" variant="outline" onClick={downloadChecklist} className="gap-2"><Download className="w-3.5 h-3.5" />Export Checklist</Button>
          </div>
          {CHECKLIST.map(cat => (
            <Card key={cat.category} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{cat.category}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {cat.items.map((item, j) => {
                    const r = item.check(data);
                    return (
                      <div key={j} className={`flex items-center gap-3 px-4 py-2.5 ${r.pass ? "" : "bg-amber-50"}`}>
                        {r.pass
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        <p className="text-sm text-gray-800 flex-1">{item.label}</p>
                        <code className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{String(r.value)}</code>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Go-Live Assessment */}
      {activeSection === "golive" && (
        <div className="space-y-4">
          <Card className={`border-2 ${verdictColor}`}>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-black mb-2">{verdict}</p>
              <p className="text-lg font-semibold">{passed} / {total} criteria met</p>
              <div className="mt-4 max-w-sm mx-auto"><ProgressBar pct={score} color={score>=85?"bg-emerald-500":score>=65?"bg-amber-500":"bg-red-500"} /></div>
              <p className="text-sm text-muted-foreground mt-2">Readiness Score: {score}%</p>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-emerald-700">✓ Criteria Passing</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                {CHECKLIST.flatMap(cat => cat.items.map(item => ({ label: item.label, r: item.check(data) }))).filter(x => x.r.pass).map((x, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span>{x.label}</span>
                    <code className="ml-auto font-mono text-emerald-700 font-bold">{String(x.r.value)}</code>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-amber-700">⚠ Criteria Failing</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                {CHECKLIST.flatMap(cat => cat.items.map(item => ({ label: item.label, r: item.check(data) }))).filter(x => !x.r.pass).length === 0
                  ? <p className="text-xs text-emerald-700 font-semibold">All criteria passing!</p>
                  : CHECKLIST.flatMap(cat => cat.items.map(item => ({ label: item.label, r: item.check(data) }))).filter(x => !x.r.pass).map((x, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span>{x.label}</span>
                    <code className="ml-auto font-mono text-amber-700 font-bold">{String(x.r.value)}</code>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">Verdict Thresholds</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• <strong className="text-emerald-700">≥ 85%</strong> — GO-LIVE APPROVED: Platform is ready for 1,000-parcel controlled pilot</p>
                <p>• <strong className="text-amber-700">65–84%</strong> — CONDITIONAL APPROVAL: Resolve failing items before expanding beyond 100 parcels</p>
                <p>• <strong className="text-red-700">&lt; 65%</strong> — NOT READY: Critical gaps require remediation before any pilot activity</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}