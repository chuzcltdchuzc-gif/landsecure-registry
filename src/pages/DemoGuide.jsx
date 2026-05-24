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
    id: 1, icon: MapPin, color: "blue", title: "Register Land Parcel",
    route: "/register-land", routeLabel: "Go to Register Land",
    duration: "3 min",
    description: "A surveyor or land owner registers a new parcel by providing parcel details, uploading documents, and entering GPS coordinates.",
    actions: [
      "Navigate to Register Land in the sidebar",
      "Fill in Parcel Number: GFL/2025/DEMO/001",
      "Enter owner name: Chukwuemeka Okafor",
      "Select Land Use: Residential",
      "Enter Address: 12 Mango Street, Greenfield South Ward",
      "Set GPS coordinates: 6.4550, 3.3841",
      "Click Register Parcel to submit"
    ],
    outcome: "Parcel created with Pending status and assigned to approval queue"
  },
  {
    id: 2, icon: FileText, color: "purple", title: "Upload Survey Plan",
    route: "/survey-documents", routeLabel: "Go to Survey Documents",
    duration: "2 min",
    description: "A licensed surveyor uploads the official survey plan document and CAD drawings to be reviewed by the Surveyor General.",
    actions: [
      "Navigate to Survey Documents",
      "Click Upload Document",
      "Select Document Type: Survey Plan",
      "Enter Surveyor Name: Adebayo Fashola (FNIVS/2019/4421)",
      "Upload a PDF survey plan file",
      "Add description: Residential plot, Greenfield South Ward",
      "Submit for review"
    ],
    outcome: "Survey document uploaded with Pending review status"
  },
  {
    id: 3, icon: Crop, color: "green", title: "Capture Polygon Boundary",
    route: "/gis-map", routeLabel: "Open GIS Map",
    duration: "4 min",
    description: "Field Agent uses the GIS mapping tools to draw an accurate polygon boundary for the parcel using GPS-verified coordinates.",
    actions: [
      "Open the GIS Map from the sidebar",
      "Locate the parcel marker on the map",
      "Click on the parcel to view details",
      "Click 'Show Family Lineage' to view ownership overlay",
      "Observe boundary polygon drawn on the map",
      "Verify coordinates match survey plan",
      "Note spatial validation status: Valid"
    ],
    outcome: "Parcel boundary verified on GIS map with valid spatial status"
  },
  {
    id: 4, icon: Play, color: "amber", title: "Field Agent Site Visit",
    route: "/field-reports", routeLabel: "Go to Field Reports",
    duration: "3 min",
    description: "A field agent conducts an on-site inspection, captures GPS coordinates and photographs, then submits a verification report.",
    actions: [
      "Navigate to Field Reports",
      "Click New Field Report",
      "Select Parcel: GFL/2025/DEMO/001",
      "Select Report Type: Site Inspection",
      "Click 'Use My GPS Location' to auto-capture coordinates",
      "Enter description: Boundary markers verified on-site",
      "Upload site photographs",
      "Submit report"
    ],
    outcome: "Field report submitted with GPS coordinates and photos attached"
  },
  {
    id: 5, icon: CheckCircle2, color: "teal", title: "Submit for Approval",
    route: "/approvals", routeLabel: "Go to Approvals",
    duration: "2 min",
    description: "The approval officer reviews pending parcels, checks spatial validation, and approves or rejects with documented reasons.",
    actions: [
      "Navigate to Approvals (as Surveyor General or Compliance Officer)",
      "Find GFL/2025/DEMO/001 in the pending list",
      "Click View Details to review full parcel information",
      "Check spatial validation status",
      "Review field reports and survey documents",
      "Click Approve to confirm the registration",
      "Parcel status changes to Approved"
    ],
    outcome: "Parcel approved and locked — official record in the registry"
  },
  {
    id: 6, icon: Shield, color: "indigo", title: "Compliance Review",
    route: "/gov/pending-approvals", routeLabel: "Open Pending Approvals",
    duration: "3 min",
    description: "The Compliance Officer reviews pending inheritance cases and land registrations for regulatory compliance before final approval.",
    actions: [
      "Login as Compliance Officer",
      "Navigate to Gov → Pending Approvals",
      "Switch to Inheritance Cases tab",
      "Select a pending inheritance case",
      "Review beneficiary allocations and percentages",
      "Check attached documentation",
      "Add compliance review notes",
      "Advance case to Surveyor General Review"
    ],
    outcome: "Case advances through compliance stage with documented review notes"
  },
  {
    id: 7, icon: Users, color: "emerald", title: "Family Ownership Registration",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "5 min",
    description: "Register a family ownership record linking multiple beneficiaries to a land parcel with defined inheritance shares.",
    actions: [
      "Navigate to Inheritance Management",
      "Click New Case",
      "Select Case Type: Succession",
      "Link to parcel: GFL/2025/DEMO/001",
      "Enter Family Name: Okafor Family",
      "Add Family Head: Elder Chukwuemeka Okafor",
      "Add 3 beneficiaries with percentage shares",
      "Set inheritance rank and generation levels",
      "Submit the inheritance case"
    ],
    outcome: "Family ownership registered with beneficiary tree and succession chain"
  },
  {
    id: 8, icon: GitBranch, color: "violet", title: "Inheritance Management",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "5 min",
    description: "Navigate a full inheritance case showing multi-generational family tree, plot allocations, and community validation.",
    actions: [
      "Open Inheritance Management",
      "Find the Okafor Family succession case",
      "Click to open the full case detail",
      "View the Beneficiaries tab — see generation hierarchy",
      "Open Plot Allocation tab — assign sub-plots to beneficiaries",
      "Open Community Validation tab — add community elder approval",
      "Add Traditional Authority validation from Obi of Greenfield",
      "Generate Inheritance Certificate"
    ],
    outcome: "Complete inheritance case with multi-generation lineage, allocations, and certificate"
  },
  {
    id: 9, icon: AlertTriangle, color: "red", title: "Fraud Detection",
    route: "/gov/fraud-alerts", routeLabel: "Open Fraud Alerts",
    duration: "4 min",
    description: "Review the automated fraud detection system flagging duplicate submissions, overlapping parcels, and suspicious claims.",
    actions: [
      "Navigate to Gov → Fraud Alerts",
      "View the fraud risk dashboard",
      "Click on a High Risk alert",
      "Review the fraud risk reasons",
      "Open the GIS Map to visualise overlapping parcels",
      "Assign the alert to an investigation officer",
      "Document investigation findings",
      "Resolve or escalate the alert"
    ],
    outcome: "Fraud alert investigated with documented resolution path"
  },
  {
    id: 10, icon: Shield, color: "orange", title: "Dispute Resolution",
    route: "/disputes", routeLabel: "Open Disputes",
    duration: "4 min",
    description: "Follow a boundary dispute from filing through investigation, mediation, and resolution with full evidence trail.",
    actions: [
      "Navigate to Disputes",
      "Find an active boundary dispute",
      "Review dispute details and claimants",
      "View attached evidence files",
      "Change status to Under Review",
      "Add investigation notes",
      "Schedule a hearing date",
      "Mark as Resolved with resolution summary"
    ],
    outcome: "Dispute resolved with full timeline and audit trail documented"
  },
  {
    id: 11, icon: Landmark, color: "teal", title: "Community Validation",
    route: "/gov/customary-governance", routeLabel: "Open Customary Governance",
    duration: "4 min",
    description: "Demonstrate the full community and traditional authority validation workflow for customary land governance.",
    actions: [
      "Navigate to Gov → Customary Governance",
      "Open an active community validation",
      "View the 7-stage workflow pipeline",
      "Advance: Community Review → Village Head → Traditional Authority",
      "Add community elder name: Chief Emmanuel Nwosu",
      "Add traditional ruler: Obi Obiora II of Greenfield",
      "Review Death Verification for inheritance case",
      "View Evidence Chain with document hashes"
    ],
    outcome: "Community validation completed through all governance stages"
  },
  {
    id: 12, icon: Award, color: "gold", title: "Certificate Generation",
    route: "/inheritance", routeLabel: "Open Inheritance Management",
    duration: "2 min",
    description: "Generate the official Land Inheritance Certificate — the final output of the complete workflow.",
    actions: [
      "Open a fully approved inheritance case",
      "Navigate to the Certificate tab",
      "Review all case details pre-populated on certificate",
      "Click Generate Certificate",
      "Certificate created with official seals and signatures",
      "Download PDF for official records",
      "Share with all beneficiaries"
    ],
    outcome: "Official Land Inheritance Certificate generated and archived"
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
            Walk stakeholders through all 12 core workflows of LandSecure Registry
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
              <p className="text-xs text-muted-foreground">{completed.size} of {STEPS.length} workflows demonstrated</p>
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
          { label: "Total Workflows", value: "12", icon: Play, color: "text-primary" },
          { label: "Est. Duration", value: "~40 min", icon: Clock, color: "text-amber-600" },
          { label: "Roles Covered", value: "6", icon: Users, color: "text-emerald-600" },
          { label: "Modules Shown", value: "8", icon: Globe, color: "text-purple-600" },
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
              { audience: "Government Officials", steps: "1, 5, 6, 9, 10, 11", color: "text-blue-700" },
              { audience: "Investors / Board", steps: "1, 5, 9, 12 + Executive Dashboard", color: "text-purple-700" },
              { audience: "Traditional Authorities", steps: "7, 8, 11, 12", color: "text-emerald-700" },
              { audience: "Surveyors", steps: "1, 2, 3, 5", color: "text-orange-700" },
              { audience: "Field Agents", steps: "1, 4, 3", color: "text-amber-700" },
              { audience: "Full Walkthrough", steps: "All 12 steps in order", color: "text-red-700" },
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
            <p className="text-sm text-emerald-700">All 12 workflows successfully demonstrated. The system is ready for pilot deployment.</p>
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