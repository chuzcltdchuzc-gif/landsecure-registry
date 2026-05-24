import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const SCENARIOS = {
  surveyor: {
    label: "Surveyor Scenarios",
    color: "bg-blue-100 text-blue-800",
    cases: [
      {
        id: "SUR-01", title: "Upload Survey Document",
        steps: ["Log in as Licensed Surveyor", "Navigate to Survey Documents", "Upload a survey plan PDF for an existing parcel", "Verify file_url stored and review_status = pending"],
        expected: "Document uploaded, review_status = 'pending', AuditLog entry created",
        dataCheck: (d) => `${d.surveyDocs.length} survey docs in system · ${d.surveyDocs.filter(s=>s.review_status==="pending").length} pending review`,
      },
      {
        id: "SUR-02", title: "Capture GPS Field Report",
        steps: ["Log in as Field Agent", "Open Field Reports", "Create report with GPS coordinates for a GFL parcel", "Set network_status = offline, capture_method = gps_auto"],
        expected: "Report saved with latitude/longitude · quality_flag assessed automatically",
        dataCheck: (d) => `${d.fieldReports.length} field reports · ${d.fieldReports.filter(r=>r.latitude&&r.longitude).length} with GPS`,
      },
      {
        id: "SUR-03", title: "Review and Approve Survey Document",
        steps: ["Log in as Surveyor General", "Navigate to Survey Reviews", "Open a pending survey document", "Add review notes and set status to approved"],
        expected: "review_status = 'approved', reviewed_by populated, AuditLog updated",
        dataCheck: (d) => `${d.surveyDocs.filter(s=>s.review_status==="approved").length} approved · ${d.surveyDocs.filter(s=>s.review_status==="rejected").length} rejected`,
      },
      {
        id: "SUR-04", title: "GIS Boundary Validation",
        steps: ["Open GIS Map page", "Locate a parcel with boundary polygon", "Verify polygon renders correctly on Leaflet map", "Check spatial_validation_status is not conflict_blocked"],
        expected: "Boundary visible, no spatial conflict for valid parcel",
        dataCheck: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); return `${gfl.filter(p=>p.parcel_boundary&&p.parcel_boundary!=="null").length}/${gfl.length} GFL parcels have boundary`; },
      },
      {
        id: "SUR-05", title: "Reject Survey with Reason",
        steps: ["Log in as Surveyor General", "Open a pending survey document", "Set review_status = rejected", "Provide mandatory review_notes"],
        expected: "review_status = 'rejected', review_notes populated",
        dataCheck: (d) => `${d.surveyDocs.filter(s=>s.review_status==="rejected").length} rejections recorded with notes`,
      },
      {
        id: "SUR-06", title: "Parcel Registration — Survey Plan Attached",
        steps: ["Log in as General User or Field Agent", "Register a new parcel via Register Land", "Attach survey plan URL", "Submit for approval"],
        expected: "LandParcel.survey_plan_url stored, status = pending",
        dataCheck: (d) => `${d.parcels.filter(p=>p.survey_plan_url).length} parcels have survey plan attached`,
      },
      {
        id: "SUR-07", title: "Offline Report Sync",
        steps: ["Create field report with network_status = offline", "Simulate reconnect: update to synced_offline", "Verify report appears in Field Reports list"],
        expected: "network_status transitions correctly, report accessible after sync",
        dataCheck: (d) => `${d.fieldReports.filter(r=>r.network_status==="synced_offline").length} synced-offline reports`,
      },
      {
        id: "SUR-08", title: "GPS Accuracy Threshold Check",
        steps: ["Submit field report with gps_accuracy > 10m", "Submit another with gps_accuracy < 5m", "Compare quality_flag on both reports"],
        expected: "High-accuracy report = pass, low-accuracy = warn or fail",
        dataCheck: (d) => `${d.fieldReports.filter(r=>r.gps_accuracy&&r.gps_accuracy<5).length} high-accuracy · ${d.fieldReports.filter(r=>r.gps_accuracy&&r.gps_accuracy>10).length} low-accuracy reports`,
      },
    ]
  },
  compliance: {
    label: "Compliance Scenarios",
    color: "bg-purple-100 text-purple-800",
    cases: [
      {
        id: "COM-01", title: "Fraud Alert Triage",
        steps: ["Log in as Compliance Officer", "Navigate to Fraud Alerts", "Open a critical alert", "Assign to self, add investigation_notes, set status = under_investigation"],
        expected: "assigned_to populated, investigation_notes saved, AuditLog entry",
        dataCheck: (d) => `${d.fraud.length} alerts · ${d.fraud.filter(f=>f.severity==="critical").length} critical · ${d.fraud.filter(f=>f.status==="under_investigation").length} under investigation`,
      },
      {
        id: "COM-02", title: "Fraud Alert Resolution",
        steps: ["Open an under_investigation fraud alert", "Set status = resolved", "Populate resolved_by and resolved_date", "Verify parcel no longer shows fraud_risk_level = high"],
        expected: "status = resolved, resolved fields populated",
        dataCheck: (d) => `${d.fraud.filter(f=>f.status==="resolved").length} resolved · ${d.fraud.filter(f=>f.status==="dismissed").length} dismissed`,
      },
      {
        id: "COM-03", title: "Compliance Review — Inheritance Case",
        steps: ["Log in as Compliance Officer", "Open an InheritanceCase in compliance_review stage", "Review beneficiary shares and witness records", "Approve or reject with notes"],
        expected: "compliance_reviewer, compliance_review_date, compliance_notes all populated",
        dataCheck: (d) => `${d.cases.filter(c=>c.status==="compliance_review").length} cases at compliance stage · ${d.cases.filter(c=>c.compliance_notes).length} with compliance notes`,
      },
      {
        id: "COM-04", title: "Dispute Escalation",
        steps: ["Navigate to Disputes", "Open a high-priority dispute", "Escalate to next authority: status = escalated", "Verify assigned_to and priority retained"],
        expected: "status = escalated, priority = high, audit trail updated",
        dataCheck: (d) => `${d.disputes.filter(d2=>d2.status==="escalated").length} escalated · ${d.disputes.filter(d2=>d2.priority==="high").length} high priority`,
      },
      {
        id: "COM-05", title: "Audit Log Inspection",
        steps: ["Navigate to Audit Logs as Compliance Officer", "Filter by entity_type = LandParcel", "Verify actions, timestamps, and user emails are fully recorded"],
        expected: "Audit entries with user_email, entity_id, action, timestamp all populated",
        dataCheck: (d) => `${d.audits.length} entries · ${d.audits.filter(a=>a.user_email&&a.entity_id&&a.action).length} fully populated`,
      },
      {
        id: "COM-06", title: "Generate Compliance Report",
        steps: ["Navigate to Compliance Reports", "Set date range covering pilot period", "Download or view report", "Verify all pending items flagged"],
        expected: "Report includes pending approvals, unresolved alerts, open disputes",
        dataCheck: (d) => `${d.parcels.filter(p=>p.status==="pending").length} pending parcels · ${d.fraud.filter(f=>f.status==="open").length} open fraud alerts`,
      },
      {
        id: "COM-07", title: "Parcel Freeze Verification",
        steps: ["Navigate to Parcel Freeze module", "Freeze a disputed parcel", "Attempt modification as another user", "Verify modification blocked"],
        expected: "Parcel status = frozen, edit attempts rejected",
        dataCheck: (d) => `${d.parcels.filter(p=>p.status==="frozen").length} parcels currently frozen`,
      },
    ]
  },
  registry: {
    label: "Registry Officer Scenarios",
    color: "bg-emerald-100 text-emerald-800",
    cases: [
      {
        id: "REG-01", title: "Land Parcel Approval",
        steps: ["Log in as Surveyor General or Admin", "Navigate to Pending Approvals", "Open a pending parcel registration", "Set status = approved, populate approved_by and approval_date"],
        expected: "Parcel status = approved, approval fields populated, notification sent",
        dataCheck: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); return `${gfl.filter(p=>p.status==="approved").length} approved · ${gfl.filter(p=>p.status==="pending").length} pending`; },
      },
      {
        id: "REG-02", title: "Parcel Rejection with Reason",
        steps: ["Open a pending parcel", "Set status = rejected", "Provide rejection_reason (mandatory)", "Verify status updated and owner notified"],
        expected: "status = rejected, rejection_reason populated, AuditLog entry",
        dataCheck: (d) => `${d.parcels.filter(p=>p.status==="rejected").length} rejected · ${d.parcels.filter(p=>p.status==="rejected"&&p.rejection_reason).length} with documented reason`,
      },
      {
        id: "REG-03", title: "Ownership Transfer Recording",
        steps: ["Navigate to a parcel's ownership history", "Record a new transfer: from_owner → to_owner", "Set transfer_type = purchase, provide transfer_date", "Approve the transfer"],
        expected: "OwnershipHistory record created, parcel owner_name updated",
        dataCheck: (d) => `${d.ownershipHistory.length} transfers recorded · ${d.ownershipHistory.filter(o=>o.status==="approved").length} approved`,
      },
      {
        id: "REG-04", title: "Bulk Import Parcels",
        steps: ["Navigate to Bulk Import", "Upload CSV with GFL parcel data", "Review import summary", "Confirm records created in LandParcel entity"],
        expected: "ImportHistory record created, parcels imported with correct LGA",
        dataCheck: (d) => { const gfl=d.parcels.filter(p=>p.lga==="Greenfield Local Government"); return `${gfl.length} GFL parcels in registry`; },
      },
      {
        id: "REG-05", title: "Search and Filter Parcels",
        steps: ["Navigate to Land Registry", "Search by owner name", "Filter by LGA = Greenfield Local Government", "Filter by status = approved", "Verify results match"],
        expected: "Filtered results accurate, response < 3 seconds",
        dataCheck: (d) => `${d.parcels.length} total parcels searchable`,
      },
      {
        id: "REG-06", title: "Parcel Revision Request",
        steps: ["Locate an approved parcel", "Submit a revision request with documented reason", "Officer reviews and approves/rejects revision", "Parcel updated to revised values"],
        expected: "ParcelRevision record created, original parcel updated on approval",
        dataCheck: (d) => `${d.parcels.filter(p=>p.status==="approved").length} approved parcels eligible for revision`,
      },
    ]
  },
  community: {
    label: "Community Validation Scenarios",
    color: "bg-amber-100 text-amber-800",
    cases: [
      {
        id: "COM-CV-01", title: "Community Validation Submission",
        steps: ["Log in as General User", "Navigate to Inheritance → Community Validation", "Submit new validation with community_name, lga, village_name", "Assign community elder and village head"],
        expected: "CommunityValidation record created, status = submitted",
        dataCheck: (d) => `${d.communityVal.length} submissions · ${d.communityVal.filter(c=>c.status==="submitted").length} awaiting review`,
      },
      {
        id: "COM-CV-02", title: "Village Head Validation Step",
        steps: ["Open a community validation at village_head_validation stage", "Log in as authorised officer", "Record village_head_validated_by and village_head_validation_date", "Add notes"],
        expected: "Stage advances to traditional_authority_validation",
        dataCheck: (d) => `${d.communityVal.filter(c=>c.village_head_validated_by).length} village head validations recorded`,
      },
      {
        id: "COM-CV-03", title: "Traditional Authority Endorsement",
        steps: ["Navigate to Traditional Authority Validations", "Open a pending validation", "Record traditional_ruler_name, validation_date, and comments", "Set validation_status = approved"],
        expected: "TraditionalAuthorityValidation approved, digital_signature_url stored",
        dataCheck: (d) => `${d.tradVal.filter(t=>t.validation_status==="approved").length} approved · ${d.tradVal.filter(t=>t.validation_status==="pending").length} pending`,
      },
      {
        id: "COM-CV-04", title: "Community Consent Granting",
        steps: ["Create CommunityConsent record for a parcel", "Set consent_type = community, date_granted", "Verify status = granted", "Check expiry_date populated"],
        expected: "CommunityConsent with status = granted, expiry tracked",
        dataCheck: (d) => `${d.communityVal.filter(c=>c.status==="approved").length} fully approved community validations`,
      },
      {
        id: "COM-CV-05", title: "Full Multi-Stage Community Approval",
        steps: ["Trace a validation from submitted → community_review → village_head_validation → traditional_authority_validation → compliance_review → approved", "Verify each stage reviewer recorded"],
        expected: "All review fields populated for each stage, no gaps in chain",
        dataCheck: (d) => `${d.communityVal.filter(c=>c.status==="approved").length} full approvals · ${d.communityVal.filter(c=>["community_review","village_head_validation","traditional_authority_validation"].includes(c.status)).length} in progress`,
      },
    ]
  },
  inheritance: {
    label: "Inheritance Processing Scenarios",
    color: "bg-rose-100 text-rose-800",
    cases: [
      {
        id: "INH-01", title: "Create Inheritance Case",
        steps: ["Navigate to Inheritance Management", "Click New Case", "Select case_type = succession", "Link to FamilyOwnership and parcel", "Set initiated_by"],
        expected: "InheritanceCase created with status = draft, case_reference populated",
        dataCheck: (d) => `${d.cases.length} cases · ${d.cases.filter(c=>c.case_type==="succession").length} succession type`,
      },
      {
        id: "INH-02", title: "Add Beneficiaries and Shares",
        steps: ["Open an inheritance case", "Add at least 2 FamilyBeneficiary records", "Assign percentage_share ensuring total = 100%", "Set relationship and generation_level"],
        expected: "Beneficiaries saved, share totals validated (must sum to 100)",
        dataCheck: (d) => { const families=d.families; const byFam={}; d.beneficiaries.forEach(b=>{ byFam[b.family_ownership_id]=(byFam[b.family_ownership_id]||0)+b.percentage_share; }); const ok=Object.values(byFam).filter(v=>Math.abs(v-100)<1).length; return `${d.beneficiaries.length} beneficiaries · ${ok} families with 100% share total`; },
      },
      {
        id: "INH-03", title: "Witness Registration and Verification",
        steps: ["Open an inheritance case", "Add at least 1 InheritanceWitness", "Set witness_role = family_witness or community_witness", "Record identification and witness_statement"],
        expected: "Witness records saved, verification_status = pending",
        dataCheck: (d) => `${d.witnesses.length} witnesses · ${d.witnesses.filter(w=>w.verification_status==="verified").length} verified`,
      },
      {
        id: "INH-04", title: "Multi-Stage Approval Workflow",
        steps: ["Submit case from draft → submitted", "Surveyor review stage: set surveyor_reviewer + date + notes", "Compliance review stage", "Surveyor General review stage", "Final approval: status = approved"],
        expected: "All review stages populated, final_approved_by and final_approved_date set",
        dataCheck: (d) => `${d.cases.filter(c=>c.status==="approved").length} approved · ${d.cases.filter(c=>c.final_approved_by).length} with final approver recorded`,
      },
      {
        id: "INH-05", title: "Plot Allocation from Approved Case",
        steps: ["Open an approved inheritance case", "Create PlotAllocation for each beneficiary", "Set area_sqm and allocation_percentage", "Confirm allocations: allocation_status = confirmed"],
        expected: "PlotAllocation records created and confirmed",
        dataCheck: (d) => `${d.plotAllocations.length} allocations · ${d.plotAllocations.filter(a=>a.allocation_status==="confirmed").length} confirmed`,
      },
      {
        id: "INH-06", title: "Certificate Generation",
        steps: ["Open a fully approved inheritance case", "Trigger certificate generation", "Verify certificate_generated = true and certificate_url stored"],
        expected: "certificate_generated = true, certificate_url accessible",
        dataCheck: (d) => `${d.cases.filter(c=>c.certificate_generated).length} certificates issued of ${d.cases.filter(c=>c.status==="approved").length} approved cases`,
      },
      {
        id: "INH-07", title: "Inheritance Dispute Handling",
        steps: ["Raise a dispute on an active inheritance case", "Set dispute_type = share_percentage", "Assign to compliance officer", "Record resolution and close"],
        expected: "InheritanceDispute created, linked to case, resolved with notes",
        dataCheck: (d) => `${d.cases.filter(c=>c.status==="rejected").length} cases rejected · ${d.disputes.filter(d2=>d2.dispute_type==="ownership").length} ownership disputes`,
      },
    ]
  }
};

function ScenarioGroup({ groupKey, group, data }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState({});
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setOpen(v=>!v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold">{group.label}</CardTitle>
            <Badge className={group.color}>{group.cases.length} test cases</Badge>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {group.cases.map(tc => (
              <div key={tc.id} className="p-3">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(e=>({...e, [tc.id]: !e[tc.id]}))}>
                  <div className="flex items-start gap-2">
                    <code className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5">{tc.id}</code>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{tc.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tc.dataCheck(data)}</p>
                    </div>
                  </div>
                  {expanded[tc.id] ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 mt-1 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-1 flex-shrink-0" />}
                </div>
                {expanded[tc.id] && (
                  <div className="mt-3 ml-10 space-y-2">
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Test Steps</p>
                      <ol className="space-y-1">
                        {tc.steps.map((s, i) => (
                          <li key={i} className="flex gap-2 text-xs text-gray-700">
                            <span className="text-gray-400 font-mono w-4 flex-shrink-0">{i+1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                      <p className="text-[11px] font-bold text-emerald-700 mb-0.5">Expected Result</p>
                      <p className="text-xs text-emerald-800">{tc.expected}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function UATSuiteTab({ data }) {
  const total = Object.values(SCENARIOS).reduce((a, g) => a + g.cases.length, 0);
  const gfl = data.parcels.filter(p => p.lga === "Greenfield Local Government");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Test Cases", value: total, color: "text-blue-700" },
          { label: "GFL Parcels", value: gfl.length, color: "text-emerald-700" },
          { label: "Inheritance Cases", value: data.cases.length, color: "text-purple-700" },
          { label: "Field Reports", value: data.fieldReports.length, color: "text-amber-700" },
          { label: "Audit Entries", value: data.audits.length, color: "text-gray-700" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-800">All test cases execute against live platform data. Click any test case ID to expand step-by-step instructions and live evidence counts.</p>
      </div>
      {Object.entries(SCENARIOS).map(([key, group]) => (
        <ScenarioGroup key={key} groupKey={key} group={group} data={data} />
      ))}
    </div>
  );
}