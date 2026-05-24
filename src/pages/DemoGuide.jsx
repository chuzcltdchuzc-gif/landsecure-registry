import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, FileText, Crop, CheckCircle2, Shield, Users, GitBranch,
  AlertTriangle, Award, ChevronRight, ChevronDown, Play, BookOpen,
  Camera, Globe, BarChart2, Home, ArrowRight, Clock, Landmark
} from "lucide-react";

const STEPS = [
  {
    id: 1, icon: MapPin, color: "blue", title: "Land Registration",
    route: "/register-land", routeLabel: "Go to Register Land",
    duration: "3 min",
    description: "A surveyor or land owner registers a new parcel by providing parcel details, uploading documents, and entering GPS coordinates. Over 1,000 parcels are already registered in the Greenfield LGA pilot.",
    actions: [
      "Navigate to Register Land in the sidebar",
      "Fill in Parcel Number: GFL/2026/DEMO/001",
      "Enter owner name: Chukwuemeka Okafor",
      "Select Land Use: Residential",
      "Enter Address: 12 Mango Street, Central Ward, Greenfield LGA",
      "Enter GPS coordinates: 6.4550, 3.3841",
      "Click Register Parcel to submit",
      "Point to existing parcels GFL/2023/0001–0050 already approved"
    ],
    outcome: "Parcel created with Pending status — joins 1,000+ parcels already in the Greenfield LGA registry",
    liveData: "1,000+ parcels | 10 communities | 25 villages | 12 wards"
  },
  {
    id: 2, icon: FileText, color: "purple", title: "Survey Submission",
    route: "/survey-documents", routeLabel: "Go to Survey Documents",
    duration: "3 min",
    description: "A licensed surveyor uploads the official survey plan and GIS data. The system maintains 50+ reviewed survey documents with approval history.",
    actions: [
      "Navigate to Survey Documents in the sidebar",
      "Click Upload Document",
      "Select Document Type: Survey Plan",
      "Enter Surveyor: Chidi Okoye (FNIVS/2019/4421)",
      "Upload a PDF survey plan file",
      "Add description: Residential plot, Central Ward",
      "Submit — status becomes Pending review",
      "Show an existing approved document from the list"
    ],
    outcome: "Survey document queued for Surveyor General review — joins 50+ survey documents on file",
    liveData: "50+ survey documents | Approved, Pending, Rejected statuses visible"
  },
  {
    id: 3, icon: Crop, color: "green", title: "GIS Validation",
    route: "/gis-map", routeLabel: "Open GIS Map",
    duration: "4 min",
    description: "The spatial validation engine checks every registered polygon for overlaps, duplicates, and boundary conflicts. All 1,000+ parcels have GIS polygons rendered in real-time.",
    actions: [
      "Open the GIS Map from the sidebar",
      "Zoom into Greenfield LGA area (6.43–6.48°N, 3.35–3.42°E)",
      "Observe coloured polygons — green=valid, orange=warning, red=conflict",
      "Click a parcel to view spatial validation status",
      "Click 'Show Family Lineage' toggle for ownership overlay",
      "Locate a parcel with 'overlap_warning' status",
      "Explain how spatial validation prevents double allocation",
      "Show boundary coordinates and area calculations in the panel"
    ],
    outcome: "GIS map shows live polygon data for all registered parcels with spatial validation colour coding",
    liveData: "1,000+ polygons rendered | Valid / Overlap Warning / Conflict statuses shown"
  },
  {
    id: 4, icon: Users, color: "emerald", title: "Family Ownership Registration",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "5 min",
    description: "Register a family ownership record linking multiple beneficiaries with defined inheritance shares, wife lineage groups, and economic improvements. 50+ family ownerships are pre-populated.",
    actions: [
      "Navigate to Inheritance Management",
      "Show existing families: Okafor, Eze, Nwosu, Adeleke — click any",
      "Demonstrate the Family Record: head, wife groups, generation level",
      "Show site features: buildings, boreholes, economic trees",
      "Click a family to view its Beneficiary Tree",
      "Show multi-generation structure: Gen 1 → Gen 2 → Gen 3",
      "Point out: percentage shares, inheritance rank, allocated plots",
      "Show a deceased beneficiary with successor chain"
    ],
    outcome: "Full family ownership record visible — multi-wife, multi-generation beneficiary hierarchy with plot allocations",
    liveData: "50+ family ownerships | 240+ beneficiaries | 10 community + 10 traditional institution records"
  },
  {
    id: 5, icon: GitBranch, color: "violet", title: "Inheritance Processing",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "5 min",
    description: "Navigate a complete inheritance case from initiation through surveyor review, compliance, and Surveyor General approval. 25+ cases at various workflow stages.",
    actions: [
      "In Inheritance Management, switch to Cases tab",
      "Filter by Status: compliance_review — pick one",
      "Click case to open full detail view",
      "Show IC/2024/010 — Dim Family — allocation case",
      "Review case timeline: draft → surveyor → compliance → SG",
      "Show attached witnesses (3 verified witnesses per case)",
      "Show death verification with LGA and court confirmation",
      "Click the Plot Allocation tab — show Plot A, B, C assignments",
      "Show Family Meeting Resolution — adopted, 26 attendees"
    ],
    outcome: "Full inheritance workflow demonstrated — from family meeting resolution to plot allocations with evidence chain",
    liveData: "25 inheritance cases | 54 witnesses | 10 death verifications | 51 plot allocations | 15 meeting resolutions"
  },
  {
    id: 6, icon: Landmark, color: "teal", title: "Community Validation",
    route: "/gov/customary-governance", routeLabel: "Open Customary Governance",
    duration: "4 min",
    description: "Full community and traditional authority validation workflow — from community elder review through village head, traditional ruler, compliance, and Surveyor General sign-off.",
    actions: [
      "Navigate to Gov → Customary Governance",
      "Open the Community Validations panel",
      "Show a validation at 'village_head_validation' stage",
      "Show community elder: Chief Obinna Garba, CDC Chairman",
      "Show traditional ruler: Obi Achebe III of Greenfield",
      "Switch to Traditional Authority Validations panel",
      "Show an approved TAV with full ruler signature and comments",
      "Show a conditionally approved case with stated conditions",
      "Show Community Consent records — 15 granted consents"
    ],
    outcome: "Multi-stage community governance workflow visible — traditional rulers, village heads, and community consent fully documented",
    liveData: "18+ community validations | 18 traditional authority validations | 15 community consent records"
  },
  {
    id: 7, icon: AlertTriangle, color: "red", title: "Fraud Detection",
    route: "/gov/fraud-alerts", routeLabel: "Open Fraud Alerts",
    duration: "4 min",
    description: "Automated fraud detection flags duplicates, overlapping boundaries, forged documents, and suspicious transfers. 25+ fraud alerts with severity levels and investigation trails.",
    actions: [
      "Navigate to Gov → Fraud Alerts",
      "Show the fraud alert dashboard — severity distribution",
      "Click a Critical severity alert",
      "Read: 'Three separate claimants submitted documents for this parcel within 60 days'",
      "Show alert type: duplicate_registration / boundary_manipulation",
      "Show parcel's fraud_risk_score (e.g. 85/100) in GIS map",
      "Assign the investigation to Compliance Officer",
      "Show a resolved alert with investigation notes",
      "Cross-reference: open GIS map to see conflicting polygon"
    ],
    outcome: "Fraud detection workflow demonstrated — from automated flag through investigation to resolution or escalation",
    liveData: "25+ fraud alerts | Critical / High / Medium / Low severity | Open, Under Investigation, Resolved statuses"
  },
  {
    id: 8, icon: Shield, color: "orange", title: "Dispute Resolution",
    route: "/disputes", routeLabel: "Open Disputes",
    duration: "4 min",
    description: "Full dispute lifecycle from filing through assignment, investigation, and resolution. 60+ disputes including boundary overlaps, ownership conflicts, and double allocations.",
    actions: [
      "Navigate to Disputes in the sidebar",
      "Show dispute statistics: Open, Under Review, Escalated, Resolved",
      "Click an Under Review boundary dispute",
      "Read dispute: 'Boundary overlap of 312sqm with adjacent parcel'",
      "Show complainant details and priority: High / Critical",
      "Show assigned officer: Dr. Amara Okafor (Surveyor General)",
      "Open a resolved dispute — show resolution notes",
      "Cross-reference: open GIS Map and locate the parcel"
    ],
    outcome: "Complete dispute timeline visible — from citizen complaint through SG resolution with documented evidence",
    liveData: "60+ disputes | Open, Under Review, Escalated, Resolved, Closed statuses | All linked to GIS parcels"
  },
  {
    id: 9, icon: CheckCircle2, color: "indigo", title: "Surveyor General Approval",
    route: "/gov/pending-approvals", routeLabel: "Open Pending Approvals",
    duration: "3 min",
    description: "The Surveyor General reviews, approves, or rejects pending parcel registrations and inheritance cases. Full compliance and survey review history visible.",
    actions: [
      "Login as Surveyor General (sg.demo@landsecure.app)",
      "Navigate to Gov → Pending Approvals",
      "Show pending parcel registrations count",
      "Click a pending parcel — review spatial validation, field reports",
      "Check survey document status: Approved",
      "Switch to Inheritance Cases tab",
      "Show a case at 'surveyor_general_review' stage",
      "Review compliance notes from previous reviewer",
      "Approve case — status advances to Approved",
      "Show Executive Dashboard — metrics update in real time"
    ],
    outcome: "Surveyor General approval demonstrated across both parcel registrations and inheritance cases",
    liveData: "Pending parcels + inheritance cases | Full review history | Live metrics on Executive Dashboard"
  },
  {
    id: 10, icon: Award, color: "gold", title: "Certificate Generation",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "3 min",
    description: "Generate the official Land Inheritance Certificate — the final authoritative output of the complete customary governance workflow.",
    actions: [
      "Open Inheritance Management → Cases",
      "Filter by Status: Approved",
      "Open IC/2024/012 — Asogwa Family (fully approved, certificate generated)",
      "Click to open case detail",
      "Navigate to the Certificate tab",
      "Show auto-populated certificate: parcel number, family, beneficiaries, SG signature",
      "Click Generate / View Certificate",
      "Download PDF — show official seals, case reference, date",
      "Explain: certificate is immutable — locked once issued"
    ],
    outcome: "Official Land Inheritance Certificate generated with parcel details, beneficiary allocations, and Surveyor General's digital seal",
    liveData: "Multiple approved cases with certificates: Asogwa Family (IC/2024/012), Mbah Family (IC/2024/013)"
  },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", badge: "bg-blue-100 text-blue-700", num: "bg-blue-600" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-100 text-purple-600", badge: "bg-purple-100 text-purple-700", num: "bg-purple-600" },
  green: { bg: "bg-green-50", border: "border-green-200", icon: "bg-green-100 text-green-600", badge: "bg-green-100 text-green-700", num: "bg-green-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100 text-amber-600", badge: "bg-amber-100 text-amber-700", num: "bg-amber-500" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "bg-teal-100 text-teal-600", badge: "bg-teal-100 text-teal-700", num: "bg-teal-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-100 text-indigo-600", badge: "bg-indigo-100 text-indigo-700", num: "bg-indigo-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", badge: "bg-emerald-100 text-emerald-700", num: "bg-emerald-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-100 text-violet-600", badge: "bg-violet-100 text-violet-700", num: "bg-violet-600" },
  red: { bg: "bg-red-50", border: "border-red-200", icon: "bg-red-100 text-red-600", badge: "bg-red-100 text-red-700", num: "bg-red-600" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "bg-orange-100 text-orange-600", badge: "bg-orange-100 text-orange-700", num: "bg-orange-500" },
  gold: { bg: "bg-yellow-50", border: "border-yellow-300", icon: "bg-yellow-100 text-yellow-600", badge: "bg-yellow-100 text-yellow-700", num: "bg-yellow-500" },
};

function StepCard({ step, isOpen, onToggle, isCompleted, onComplete }) {
  const c = COLOR_MAP[step.color];
  const Icon = step.icon;
  return (
    <Card className={`border-2 transition-all ${isCompleted ? "border-emerald-300 bg-emerald-50/30" : c.border} ${isOpen ? "shadow-lg" : ""}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-emerald-500" : c.num}`}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.id}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-emerald-100" : c.icon}`}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
            <Badge className={`text-[10px] border-0 ${isCompleted ? "bg-emerald-100 text-emerald-700" : c.badge}`}>
              {isCompleted ? "Done" : `~${step.duration}`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{step.description.slice(0, 80)}…</p>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </div>

      {isOpen && (
        <CardContent className="pt-0 pb-4 px-4 border-t border-border/50">
          <div className="pt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Step-by-Step Actions</p>
              <ol className="space-y-2">
                {step.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${c.num}`}>{i + 1}</span>
                    <span className="text-foreground">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Full Description</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              <div className={`rounded-xl p-3 border ${c.border} ${c.bg}`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expected Outcome</p>
                <p className="text-xs font-medium">{step.outcome}</p>
              </div>
              {step.liveData && (
                <div className="rounded-xl p-3 border border-emerald-200 bg-emerald-50">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">Live Data in System</p>
                  <p className="text-xs text-emerald-800 font-medium">{step.liveData}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Link to={step.route}>
                  <Button size="sm" className={`gap-1.5 h-7 text-xs`}>
                    <ArrowRight className="w-3 h-3" /> {step.routeLabel}
                  </Button>
                </Link>
                {!isCompleted && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs border-emerald-300 text-emerald-700" onClick={(e) => { e.stopPropagation(); onComplete(); }}>
                    <CheckCircle2 className="w-3 h-3" /> Mark Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function DemoGuide() {
  const [openStep, setOpenStep] = useState(1);
  const [completed, setCompleted] = useState(new Set());

  const markDone = (id) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (id < STEPS.length) setOpenStep(id + 1);
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Demonstration Guide</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Walk stakeholders through the 10 core workflows of LandSecure Registry — Greenfield LGA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/demo">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="w-4 h-4" /> Demo Accounts
            </Button>
          </Link>
          <Link to="/gov/executive-dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart2 className="w-4 h-4" /> Executive Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Demo Progress</p>
              <p className="text-xs text-muted-foreground">{completed.size} of {STEPS.length} workflows demonstrated — ~30 min full walkthrough</p>
            </div>
            <div className="text-2xl font-bold text-primary">{progress}%</div>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white cursor-pointer transition-all ${completed.has(s.id) ? "bg-emerald-500" : openStep === s.id ? "bg-primary" : "bg-muted-foreground/30"}`}
                onClick={() => setOpenStep(openStep === s.id ? null : s.id)}
              >
                {completed.has(s.id) ? "✓" : s.id}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Workflows", value: "10", icon: Play, color: "text-primary" },
          { label: "Est. Duration", value: "~30 min", icon: Clock, color: "text-amber-600" },
          { label: "Roles Covered", value: "6", icon: Users, color: "text-emerald-600" },
          { label: "Live Records", value: "1,000+", icon: Globe, color: "text-purple-600" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
              <div>
                <p className="text-base font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audience guide */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Recommended Demo Path by Audience</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { audience: "Government Officials", steps: "1, 3, 7, 9, 10 + Executive Dashboard", color: "text-blue-700" },
              { audience: "Investors / Board", steps: "1, 3, 7, 10 + Executive Dashboard", color: "text-purple-700" },
              { audience: "Traditional Authorities", steps: "4, 5, 6, 10", color: "text-emerald-700" },
              { audience: "Surveyors / SG Office", steps: "1, 2, 3, 9", color: "text-orange-700" },
              { audience: "Field Agents", steps: "1, 2, 3", color: "text-amber-700" },
              { audience: "Full Walkthrough", steps: "All 10 steps in order (~30 min)", color: "text-red-700" },
            ].map(item => (
              <div key={item.audience} className="text-xs">
                <p className={`font-semibold ${item.color}`}>{item.audience}</p>
                <p className="text-muted-foreground">Steps: {item.steps}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map(step => (
          <StepCard
            key={step.id}
            step={step}
            isOpen={openStep === step.id}
            onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
            isCompleted={completed.has(step.id)}
            onComplete={() => markDone(step.id)}
          />
        ))}
      </div>

      {completed.size === STEPS.length && (
        <Card className="border-2 border-emerald-400 bg-emerald-50">
          <CardContent className="p-6 text-center">
            <Award className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-emerald-800 mb-1">Demonstration Complete!</h3>
            <p className="text-sm text-emerald-700">All 10 workflows successfully demonstrated. Greenfield LGA pilot is ready for stakeholder sign-off.</p>
            <Link to="/gov/executive-dashboard">
              <Button className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
                <BarChart2 className="w-4 h-4" /> View Executive Summary
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}