import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Map, Shield, Settings, Zap, ChevronDown, ChevronRight, Download } from "lucide-react";

function GuideSection({ title, icon: Icon, iconColor, role, sections }) {
  const [open, setOpen] = useState(false);

  function downloadGuide() {
    const lines = [
      `${title.toUpperCase()}`,
      `LandSecure Registry — Greenfield LGA Pilot`,
      `Role: ${role}`,
      "=".repeat(60),
      "",
      ...sections.flatMap(s => [
        `## ${s.heading}`,
        "-".repeat(40),
        ...s.steps.map((step, i) => `${i + 1}. ${step}`),
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full ml-1">{role}</span>
            <span className="text-xs text-muted-foreground ml-1">{sections.length} sections · {sections.reduce((a, s) => a + s.steps.length, 0)} steps</span>
            {open ? <ChevronDown className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />}
          </div>
          <Button size="sm" variant="outline" onClick={downloadGuide} className="gap-1 text-xs h-7">
            <Download className="w-3 h-3" /> Download
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-2 space-y-4">
          {sections.map((s, i) => (
            <div key={i}>
              <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide border-b pb-1">{s.heading}</h4>
              <ol className="space-y-1">
                {s.steps.map((step, j) => (
                  <li key={j} className="flex gap-2 text-xs text-gray-700">
                    <span className="font-mono font-bold text-gray-400 w-5 shrink-0">{j + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function QuickRefCard({ title, role, color, items }) {
  function download() {
    const lines = [
      `QUICK REFERENCE: ${title.toUpperCase()}`,
      `Role: ${role}`,
      "=".repeat(50),
      ...items.map(item => `• ${item.action.padEnd(30)} → ${item.path}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `quick_ref_${role.replace(/\s+/g,"_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={download} className="gap-1 text-xs h-7">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-gray-100 last:border-0">
              <span className="text-gray-700 font-medium">{item.action}</span>
              <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">{item.path}</code>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrainingMaterialsTab({ data }) {
  const { parcels, cases, families, audits } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  const guides = [
    {
      title: "User Guide", icon: BookOpen, iconColor: "text-blue-600", role: "General Users / Land Owners",
      sections: [
        { heading: "1. Logging In & First-Time Setup", steps: [
          "Navigate to the LandSecure Registry platform URL provided by your registration officer.",
          "Click 'Log In' and enter your assigned email address and password.",
          "On first login, you will be prompted to select your role — select 'General User'.",
          "Your dashboard will load showing your registered parcels and submissions.",
          "Update your profile by clicking your name in the top-right corner.",
        ]},
        { heading: "2. Viewing Your Land Parcels", steps: [
          "From the dashboard, click 'My Claims' in the left sidebar.",
          "You will see all parcels where you are listed as owner_name.",
          "Click any parcel row to view full details including boundary map, status, and documents.",
          "Check the 'Status' badge: Pending = awaiting review, Approved = registered, Rejected = see rejection reason.",
          "Use the GIS Map page to view your parcel boundary on an interactive map.",
        ]},
        { heading: "3. Submitting a New Registration", steps: [
          "Click 'Register Land' in the left sidebar.",
          "Fill in all required fields: Parcel Number, Owner Name, Address.",
          "Enter GPS coordinates or use the map picker to set location.",
          "Upload supporting documents (survey plan, ID documents) using the document upload section.",
          "Click 'Submit Registration' — your parcel will enter 'Pending' status.",
          "You will receive a notification when your submission is reviewed.",
        ]},
        { heading: "4. Checking Submission Status", steps: [
          "Click 'My Submissions' to see all your submissions and their current status.",
          "Green badge = Approved. Orange badge = Pending. Red badge = Rejected.",
          "For rejected submissions, click the record to read the rejection reason.",
          "To resubmit or appeal, contact your local registry office.",
        ]},
        { heading: "5. Filing a Dispute", steps: [
          "Navigate to 'Disputes' in the sidebar.",
          "Click 'New Dispute' and select the parcel number in question.",
          "Choose the dispute type (Boundary, Ownership, Fraud, etc.).",
          "Write a clear description of the issue and upload any supporting evidence.",
          "Click Submit — a compliance officer will be assigned and contact you.",
        ]},
      ]
    },
    {
      title: "Surveyor Guide", icon: Map, iconColor: "text-teal-600", role: "Licensed Surveyors",
      sections: [
        { heading: "1. Your Role & Access", steps: [
          "As a Licensed Surveyor, you have access to: Survey Documents, Field Reports, GIS Map, Assigned Parcels.",
          "You can upload survey plans, capture GPS coordinates, and submit field reports.",
          "You cannot approve or reject parcels — that is done by the Surveyor General.",
          "Log in with your assigned surveyor credentials from the Demo Access page.",
        ]},
        { heading: "2. Uploading Survey Documents", steps: [
          "Navigate to 'Survey Documents' in the sidebar.",
          "Click 'Upload Document' and select the parcel number.",
          "Choose document type: survey_plan, cad_drawing, boundary_report, gis_data.",
          "Attach the file and add a description of the survey work performed.",
          "Click Submit — the document enters 'Pending' review status.",
          "The Surveyor General will review and mark it as approved or rejected.",
        ]},
        { heading: "3. Capturing GPS Field Data", steps: [
          "Navigate to 'Field Reports' in the sidebar.",
          "Click 'New Field Report' and select the assigned parcel.",
          "Choose report type: gps_survey, boundary_check, site_inspection.",
          "If in the field, use 'GPS Auto' capture to record current coordinates.",
          "Offline: Complete the report offline and it will sync when connectivity is restored.",
          "Set quality_flag to 'pass', 'warn', or 'fail' based on conditions observed.",
        ]},
        { heading: "4. Working Offline", steps: [
          "The platform supports offline data entry — complete reports without internet.",
          "Set network_status to 'offline' when capturing without connectivity.",
          "Data is queued locally and synced automatically when connection is restored.",
          "Check the OfflineSync manager to verify all queued reports have synced.",
          "Synced reports show network_status = 'synced_offline' in the system.",
        ]},
        { heading: "5. Reviewing Spatial Conflicts", steps: [
          "Navigate to 'GIS Map' to view all parcel boundaries.",
          "Parcels with orange borders have 'overlap_warning' spatial status.",
          "Parcels with red borders are 'conflict_blocked' — these require resolution.",
          "Click a conflict parcel to view the spatial_conflict_notes.",
          "Document your findings in a Field Report and notify the Surveyor General.",
        ]},
      ]
    },
    {
      title: "Compliance Officer Guide", icon: Shield, iconColor: "text-red-600", role: "Compliance Officers",
      sections: [
        { heading: "1. Your Role & Access", steps: [
          "Compliance Officers oversee fraud detection, dispute management, and registry integrity.",
          "Your routes: Fraud Alerts, Disputes, Compliance Reports, Global Audit, Customary Governance.",
          "You can investigate alerts, assign cases, and escalate critical issues.",
          "You participate in the Inheritance approval workflow at the 'compliance_review' stage.",
        ]},
        { heading: "2. Investigating Fraud Alerts", steps: [
          "Navigate to 'Fraud Alerts' under the Governance menu.",
          "Open alerts will show at the top — click an alert to see full details.",
          "Review the alert_type: duplicate_registration, boundary_manipulation, ownership_fraud, etc.",
          "Add investigation_notes documenting your findings.",
          "Assign the alert to yourself or another officer if needed.",
          "Mark as 'resolved' with resolution notes, or 'escalated' if it requires senior review.",
        ]},
        { heading: "3. Managing Disputes", steps: [
          "Navigate to 'Disputes' to see all open disputes.",
          "Filter by status (open, under_review, escalated) and priority (critical, high, medium, low).",
          "Click a dispute to open the full detail view.",
          "Add resolution_notes and change status to 'resolved' once concluded.",
          "For critical boundary or fraud disputes, escalate to the Surveyor General.",
        ]},
        { heading: "4. Inheritance Case Review", steps: [
          "You review inheritance cases at the 'compliance_review' stage.",
          "Go to Inheritance Management and filter by status = 'compliance_review'.",
          "Review beneficiary shares (must total 100%), witness verification, and community consent.",
          "Add compliance_notes and either advance to 'surveyor_general_review' or reject.",
          "Document all findings — these feed into the compliance audit report.",
        ]},
        { heading: "5. Generating Compliance Reports", steps: [
          "Navigate to 'Compliance Reports' under Governance.",
          "Select the reporting period and LGA (use Greenfield Local Government for pilot).",
          "Review fraud metrics, dispute resolution rates, and inheritance compliance rates.",
          "Export the report as CSV for external distribution.",
          "Schedule quarterly reviews using the audit log timestamps.",
        ]},
      ]
    },
    {
      title: "Administrator Guide", icon: Settings, iconColor: "text-gray-600", role: "Super Admin / Surveyor General",
      sections: [
        { heading: "1. Your Role & Access", steps: [
          "As Super Admin or Surveyor General, you have access to all platform functions.",
          "Key admin routes: User Management, Parcel Freeze, Global Audit, Bulk Import, Pilot Dashboard.",
          "You are the final approver for inheritance cases and community validations.",
          "You can freeze parcels, manage user roles, and access all data.",
        ]},
        { heading: "2. User Management", steps: [
          "Navigate to 'User Management' under Governance.",
          "View all registered users and their roles.",
          "To invite a new user: use the 'Invite User' function with their email and role.",
          "Roles: super_admin, surveyor_general, compliance_officer, surveyor, field_agent, general_user.",
          "To change a user's role, update their record in User Management.",
        ]},
        { heading: "3. Final Inheritance Approval", steps: [
          "Inheritance cases reaching 'surveyor_general_review' require your sign-off.",
          "Navigate to Inheritance Management and filter by status = 'surveyor_general_review'.",
          "Review the full case: beneficiaries, shares, witnesses, community consent, compliance notes.",
          "Add sg_notes and set sg_review_date.",
          "Approve to advance to 'approved' status — a certificate can then be generated.",
        ]},
        { heading: "4. Parcel Freeze & Integrity", steps: [
          "Navigate to 'Parcel Freeze' under Governance to manage restricted parcels.",
          "Freeze a parcel when a fraud investigation or dispute is active.",
          "Frozen parcels cannot be approved, transferred, or modified.",
          "Unfreeze once the investigation is resolved and documented.",
          "All freeze/unfreeze actions are recorded in the Audit Log.",
        ]},
        { heading: "5. Bulk Import & Pilot Data", steps: [
          "Navigate to 'Bulk Import' to import legacy parcel data from CSV/Excel.",
          "Use the provided template — required fields: parcel_number, owner_name, address.",
          "Preview the import before confirming to catch errors.",
          "After import, run the Pilot Validation suite to check data integrity.",
          "Monitor the Import History page for upload status and error counts.",
        ]},
      ]
    },
  ];

  const quickRefCards = [
    {
      title: "Registry Officer", role: "Daily Operations", color: "border-blue-400",
      items: [
        { action: "View all parcels", path: "/lands" },
        { action: "Approve pending parcel", path: "/approvals" },
        { action: "Register new land", path: "/register-land" },
        { action: "View disputes", path: "/disputes" },
        { action: "View GIS map", path: "/gis-map" },
        { action: "Audit log", path: "/audit-logs" },
      ]
    },
    {
      title: "Surveyor", role: "Field Work", color: "border-teal-400",
      items: [
        { action: "Upload survey plan", path: "/survey-documents" },
        { action: "Submit field report", path: "/field-reports" },
        { action: "Review assigned parcels", path: "/assigned-parcels" },
        { action: "View GIS conflicts", path: "/gis-map" },
        { action: "Survey review queue", path: "/survey-reviews" },
      ]
    },
    {
      title: "Compliance Officer", role: "Oversight", color: "border-red-400",
      items: [
        { action: "Fraud alerts", path: "/gov/fraud-alerts" },
        { action: "Dispute management", path: "/disputes" },
        { action: "Global audit log", path: "/gov/global-audit" },
        { action: "Compliance reports", path: "/gov/compliance-reports" },
        { action: "Pending approvals", path: "/gov/pending-approvals" },
      ]
    },
    {
      title: "Administrator", role: "System Admin", color: "border-gray-400",
      items: [
        { action: "User management", path: "/gov/user-management" },
        { action: "Parcel freeze", path: "/gov/parcel-freeze" },
        { action: "Bulk import", path: "/gov/bulk-import" },
        { action: "Pilot dashboard", path: "/gov/pilot-dashboard" },
        { action: "Pilot validation", path: "/gov/pilot-validation" },
        { action: "Demo readiness", path: "/gov/demo-readiness" },
      ]
    },
    {
      title: "General User", role: "Land Owner", color: "border-green-400",
      items: [
        { action: "My land claims", path: "/my-claims" },
        { action: "My submissions", path: "/my-submissions" },
        { action: "Register new land", path: "/register-land" },
        { action: "File a dispute", path: "/disputes" },
        { action: "Notifications", path: "/notifications" },
      ]
    },
    {
      title: "Inheritance Manager", role: "Customary Workflow", color: "border-purple-400",
      items: [
        { action: "Inheritance cases", path: "/inheritance" },
        { action: "Customary governance", path: "/gov/customary-governance" },
        { action: "Community validation", path: "/gov/customary-governance" },
        { action: "Trad. authority", path: "/gov/customary-governance" },
        { action: "Plot allocations", path: "/inheritance" },
      ]
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-gray-900">4</p><p className="text-xs text-muted-foreground mt-0.5">Role Guides</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-blue-700">{guides.reduce((a, g) => a + g.sections.length, 0)}</p><p className="text-xs text-muted-foreground mt-0.5">Guide Sections</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-emerald-700">{guides.reduce((a, g) => a + g.sections.reduce((b, s) => b + s.steps.length, 0), 0)}</p><p className="text-xs text-muted-foreground mt-0.5">Instructional Steps</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-purple-700">6</p><p className="text-xs text-muted-foreground mt-0.5">Quick Reference Cards</p></CardContent></Card>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Role-Based User Guides</h3>
        <div className="space-y-3">
          {guides.map((g, i) => <GuideSection key={i} {...g} />)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Quick Reference Cards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickRefCards.map((c, i) => <QuickRefCard key={i} {...c} />)}
        </div>
      </div>
    </div>
  );
}