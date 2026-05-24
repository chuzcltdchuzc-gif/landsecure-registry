import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, User, Ruler, Shield, Settings, Zap } from "lucide-react";

const GUIDES = [
  {
    key: "user",
    icon: User,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    title: "General User Guide",
    audience: "Land owners, family representatives, community members",
    sections: [
      {
        title: "Getting Started",
        content: [
          "Visit the LandSecure Registry portal and enter your invitation credentials",
          "Select your role: General User (land owner / applicant)",
          "Your dashboard shows your submitted parcels and their current status",
          "Navigate using the left sidebar — items shown depend on your role",
        ]
      },
      {
        title: "Registering a Land Parcel",
        content: [
          "Click Register Land in the left sidebar",
          "Fill in: Parcel Number, Owner Name, Address, State, LGA (select Greenfield Local Government for pilot parcels)",
          "Set Land Use (residential, commercial, agricultural, etc.)",
          "Optionally attach a Survey Plan URL if available",
          "Click Submit — status becomes 'pending' awaiting approval",
          "Track progress in My Submissions",
        ]
      },
      {
        title: "Checking Submission Status",
        content: [
          "Navigate to My Submissions to see all your parcel applications",
          "Status meanings: Pending = awaiting review · Approved = registered · Rejected = see rejection reason",
          "If rejected, the rejection_reason field will explain the issue",
          "Contact your registry officer to resolve a rejection",
        ]
      },
      {
        title: "Filing a Dispute",
        content: [
          "Navigate to Disputes",
          "Click New Dispute and select the related parcel",
          "Choose dispute type: boundary, ownership, fraud, encroachment, documentation",
          "Describe the dispute clearly and attach evidence documents",
          "Track dispute status in the Disputes list",
        ]
      },
      {
        title: "Inheritance & Family Land",
        content: [
          "Navigate to Inheritance Management",
          "Your family's land parcels and beneficiaries are listed under My Claims",
          "Contact your Family Representative or Registry Officer to initiate a formal inheritance case",
        ]
      },
    ]
  },
  {
    key: "surveyor",
    icon: Ruler,
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200",
    title: "Licensed Surveyor Guide",
    audience: "Licensed surveyors, field agents, GIS technicians",
    sections: [
      {
        title: "Your Role in the System",
        content: [
          "Surveyors upload survey plans, capture GPS field data, and support boundary validation",
          "Field agents submit on-site reports with GPS coordinates and photos",
          "Your work feeds into the GIS Map and spatial validation engine",
        ]
      },
      {
        title: "Uploading Survey Documents",
        content: [
          "Navigate to Survey Documents",
          "Click Upload Document",
          "Select Document Type: survey_plan, cad_drawing, boundary_report, gis_data",
          "Attach the file (PDF, DWG, GeoJSON supported)",
          "Link to the correct Parcel ID",
          "Status defaults to 'pending' until Surveyor General reviews",
        ]
      },
      {
        title: "Submitting Field Reports",
        content: [
          "Navigate to Field Reports → New Report",
          "Select the parcel and report type (gps_survey, boundary_check, site_inspection)",
          "Enable GPS capture on your device — gps_accuracy should be < 5 metres",
          "Set network_status: online (connected), offline (no network), synced_offline (synced later)",
          "Add description, boundary observations, and photos",
          "Submit — quality_flag is auto-assessed: pass / warn / fail",
        ]
      },
      {
        title: "Offline Working Procedure",
        content: [
          "Create field reports with network_status = offline when in the field without connectivity",
          "Reports are queued locally until network is available",
          "On reconnect, update network_status to synced_offline",
          "Verify report appears in Field Reports list with correct GPS coordinates",
        ]
      },
      {
        title: "Understanding GPS Quality Flags",
        content: [
          "Pass: gps_accuracy < 5m — high precision, suitable for boundary cadastre",
          "Warn: gps_accuracy 5–10m — acceptable for site inspection, flag for resurvey",
          "Fail: gps_accuracy > 10m — insufficient for boundary work, must resurvey",
        ]
      },
      {
        title: "GIS Map Navigation",
        content: [
          "Navigate to GIS Map to view all parcels with boundaries",
          "Parcels colour-coded by spatial_validation_status: green=valid, amber=overlap warning, red=conflict blocked",
          "Click a parcel to view details and family lineage overlay",
          "Report overlap or conflict issues to the Surveyor General",
        ]
      },
    ]
  },
  {
    key: "compliance",
    icon: Shield,
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    title: "Compliance Officer Guide",
    audience: "Compliance officers, fraud investigators, audit reviewers",
    sections: [
      {
        title: "Compliance Officer Responsibilities",
        content: [
          "Investigate fraud alerts, review compliance at inheritance workflow stages",
          "Manage dispute escalations and provide audit log oversight",
          "Generate compliance reports for management and regulators",
          "Review community validation submissions",
        ]
      },
      {
        title: "Fraud Alert Investigation",
        content: [
          "Navigate to Fraud Alerts (Governance menu)",
          "Filter by severity: critical alerts require same-day response",
          "Open alert → assign to self (assigned_to = your email)",
          "Set status = under_investigation, add investigation_notes",
          "Gather evidence: check linked parcel, ownership history, and audit logs",
          "Resolve: set status = resolved + resolved_by + resolved_date",
          "Dismiss false positives: status = dismissed with notes",
        ]
      },
      {
        title: "Inheritance Case Compliance Review",
        content: [
          "Inheritance cases arrive at your stage after Surveyor review",
          "Open case in compliance_review status",
          "Verify: beneficiary shares sum to 100%, all witnesses have identification, plot allocations are documented",
          "Check community validation and traditional authority endorsement are attached",
          "Approve: set compliance_reviewer + compliance_review_date + compliance_notes + advance to next stage",
          "Reject: provide detailed rejection reason, case returned to initiator",
        ]
      },
      {
        title: "Audit Log Review",
        content: [
          "Navigate to Audit Logs (Governance → Global Audit)",
          "Filter by entity_type, user_email, date range, or action keyword",
          "Every parcel approval, fraud alert, and transfer must have an audit entry",
          "Report any gaps in audit coverage to the Super Admin immediately",
        ]
      },
      {
        title: "Compliance Report Generation",
        content: [
          "Navigate to Compliance Reports",
          "Set reporting period (pilot start date to today)",
          "Report includes: pending approvals, open fraud alerts, unresolved disputes, stalled workflows",
          "Export and share with Surveyor General and Super Admin",
        ]
      },
    ]
  },
  {
    key: "admin",
    icon: Settings,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    title: "Administrator Guide",
    audience: "Super admins, Surveyor General, system administrators",
    sections: [
      {
        title: "Administrator Responsibilities",
        content: [
          "User management: invite new users and assign roles",
          "Final approval authority for parcels, inheritance cases, and community validations",
          "Parcel freeze management for disputed or high-risk records",
          "Bulk import oversight and data integrity monitoring",
          "Access to all Governance modules",
        ]
      },
      {
        title: "User Management",
        content: [
          "Navigate to Governance → User Management",
          "Invite users by email — available roles: general_user, surveyor, field_agent, compliance_officer, surveyor_general, super_admin",
          "Assign roles carefully — role determines all system access",
          "Revoke access by contacting Base44 support (no self-service deactivation in pilot)",
        ]
      },
      {
        title: "Parcel Approval Authority",
        content: [
          "Navigate to Pending Approvals (Governance)",
          "Review parcel details, attached survey documents, and field reports",
          "Approve: status = approved, set approved_by (your email) and approval_date",
          "Reject: status = rejected, mandatory rejection_reason",
          "Approved parcels trigger notification to the registered_by user",
        ]
      },
      {
        title: "Parcel Freeze Procedure",
        content: [
          "Navigate to Governance → Parcel Freeze",
          "Freeze a parcel when: fraud suspected, dispute raised, court order received",
          "Set status = frozen — all edit operations are blocked",
          "Unfreeze only after investigation is complete and documented",
        ]
      },
      {
        title: "Bulk Import",
        content: [
          "Navigate to Governance → Bulk Import",
          "Upload CSV with columns: parcel_number, owner_name, address, state, lga, size_hectares, land_use",
          "Review import preview — check LGA matches 'Greenfield Local Government' for pilot parcels",
          "Confirm import — ImportHistory record created with success/fail counts",
          "Post-import: run spatial validation on newly imported parcels",
        ]
      },
      {
        title: "Data Integrity Monitoring",
        content: [
          "Navigate to Governance → Data Integrity Report",
          "Run weekly during pilot: checks for orphan records, duplicate parcel numbers, missing required fields",
          "Navigate to Governance → Pilot Validation for full acceptance testing suite",
          "Escalate any FAIL results to Base44 support before go-live",
        ]
      },
    ]
  },
];

const QUICK_REF = [
  {
    title: "Status Codes Quick Reference",
    color: "text-blue-700",
    items: [
      { term: "pending", def: "Submitted, awaiting review by registry officer" },
      { term: "approved", def: "Reviewed and accepted — parcel officially registered" },
      { term: "rejected", def: "Declined — see rejection_reason for details" },
      { term: "disputed", def: "Under active dispute proceedings" },
      { term: "frozen", def: "Locked by Compliance/Admin — no edits permitted" },
      { term: "approved_locked", def: "Approved and protected from re-submission" },
    ]
  },
  {
    title: "Inheritance Workflow Stages",
    color: "text-emerald-700",
    items: [
      { term: "draft", def: "Being prepared by initiator" },
      { term: "submitted", def: "Submitted for review" },
      { term: "surveyor_review", def: "Under review by Licensed Surveyor" },
      { term: "compliance_review", def: "Under review by Compliance Officer" },
      { term: "surveyor_general_review", def: "Final technical review by Surveyor General" },
      { term: "approved", def: "Fully approved — certificate can be generated" },
      { term: "rejected", def: "Rejected — see rejection_reason and rejection_stage" },
    ]
  },
  {
    title: "GPS Quality Flags",
    color: "text-teal-700",
    items: [
      { term: "pass", def: "GPS accuracy < 5m — suitable for boundary cadastre" },
      { term: "warn", def: "GPS accuracy 5–10m — flag for resurvey consideration" },
      { term: "fail", def: "GPS accuracy > 10m — must resurvey before cadastral use" },
    ]
  },
  {
    title: "Spatial Validation Status",
    color: "text-purple-700",
    items: [
      { term: "valid", def: "Geometry passed all spatial checks" },
      { term: "overlap_warning", def: "Boundary overlaps with a neighbouring parcel" },
      { term: "duplicate_warning", def: "Boundary near-identical to another parcel" },
      { term: "conflict_blocked", def: "Serious spatial conflict — cannot be approved" },
      { term: "not_validated", def: "Spatial validation not yet run" },
    ]
  },
  {
    title: "Fraud Alert Severity",
    color: "text-red-700",
    items: [
      { term: "critical", def: "Immediate response required — escalate to Compliance Officer + Admin" },
      { term: "high", def: "Same-day investigation required" },
      { term: "medium", def: "Investigate within 3 working days" },
      { term: "low", def: "Review within 7 working days" },
    ]
  },
  {
    title: "Key Navigation Shortcuts",
    color: "text-amber-700",
    items: [
      { term: "Dashboard", def: "Your personalised overview by role" },
      { term: "Land Registry", def: "Browse all parcels (admin/SG) or your parcels (user)" },
      { term: "GIS Map", def: "Spatial map of all parcels with boundary polygons" },
      { term: "Inheritance Management", def: "Family land, beneficiaries, cases, allocations" },
      { term: "Governance →", def: "Admin-only: approvals, freeze, fraud, audit, compliance" },
    ]
  },
];

function GuideSection({ section, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(v=>!v)}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{String(idx+1).padStart(2,"0")}</span>
          <p className="text-sm font-semibold text-gray-800">{section.title}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
      {open && (
        <div className="px-4 pb-3 ml-8">
          <ol className="space-y-1.5">
            {section.content.map((line, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700">
                <span className="text-gray-400 flex-shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function TrainingMaterialsTab({ data }) {
  const [activeGuide, setActiveGuide] = useState("user");
  const [showQuickRef, setShowQuickRef] = useState(false);
  const guide = GUIDES.find(g => g.key === activeGuide);
  const GuideIcon = guide.icon;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GUIDES.map(g => {
          const GIcon = g.icon;
          const active = activeGuide === g.key;
          return (
            <Card key={g.key} className={`cursor-pointer transition-all ${active ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setActiveGuide(g.key)}>
              <CardContent className="p-3 text-center">
                <GIcon className={`w-5 h-5 mx-auto mb-1 ${g.color}`} />
                <p className="text-xs font-bold text-gray-800">{g.title.replace(" Guide","")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{g.sections.length} sections</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <GuideIcon className={`w-5 h-5 ${guide.color}`} />
                <CardTitle className="text-base font-bold">{guide.title}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Audience: {guide.audience}</p>
            </div>
            <Badge className={guide.bg}>{guide.sections.length} sections</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {guide.sections.map((s, i) => <GuideSection key={i} section={s} idx={i} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowQuickRef(v=>!v)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-bold">Quick Reference Cards</CardTitle>
              <span className="text-xs text-muted-foreground">{QUICK_REF.length} reference cards</span>
            </div>
            {showQuickRef ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </CardHeader>
        {showQuickRef && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QUICK_REF.map(card => (
                <div key={card.title} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                    <p className={`text-xs font-bold ${card.color}`}>{card.title}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {card.items.map(item => (
                      <div key={item.term} className="flex gap-2 px-3 py-2">
                        <code className="text-[11px] font-mono font-bold text-gray-700 w-32 flex-shrink-0">{item.term}</code>
                        <p className="text-[11px] text-gray-600">{item.def}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}