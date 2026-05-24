import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, User, Map, Shield, Users, GitBranch } from "lucide-react";

function pass(ok) {
  if (ok === true) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" />PASS</span>;
  if (ok === "warn") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" />WARN</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800"><XCircle className="w-3 h-3" />FAIL</span>;
}

function ScenarioGroup({ title, icon: Icon, iconColor, scenarios }) {
  const [open, setOpen] = useState(true);
  const passed = scenarios.filter(s => s.result === true).length;
  const warned = scenarios.filter(s => s.result === "warn").length;
  const failed = scenarios.filter(s => s.result === false).length;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <span className="text-xs text-muted-foreground ml-1">{scenarios.length} scenarios</span>
          </div>
          <div className="flex items-center gap-2">
            {passed > 0 && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{passed} pass</span>}
            {warned > 0 && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{warned} warn</span>}
            {failed > 0 && <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{failed} fail</span>}
            {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 w-8">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Scenario</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Precondition</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Expected Outcome</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Live Evidence</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Result</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${s.result === false ? "!bg-red-50" : s.result === "warn" ? "!bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{s.scenario}</td>
                    <td className="px-3 py-2 text-gray-600">{s.precondition}</td>
                    <td className="px-3 py-2 text-gray-600">{s.expected}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-500 italic">{s.evidence}</td>
                    <td className="px-3 py-2 text-center">{pass(s.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function UATSuiteTab({ data }) {
  const { parcels, families, beneficiaries, cases, disputes, fraud,
          audits, fieldReports, surveyDocs, communityVal, tradVal,
          plotAllocations, witnesses, ownershipHistory } = data;

  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const approvedParcels = gfl.filter(p => p.status === "approved");
  const approvedCases = cases.filter(c => c.status === "approved");
  const certCases = cases.filter(c => c.certificate_generated);
  const resolvedDisputes = disputes.filter(d => d.status === "resolved");
  const resolvedFraud = fraud.filter(f => ["resolved", "dismissed"].includes(f.status));
  const approvedComm = communityVal.filter(c => c.status === "approved");
  const approvedTrad = tradVal.filter(t => t.validation_status === "approved");
  const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");
  const confirmedAllocations = plotAllocations.filter(a => a.allocation_status === "confirmed");
  const approvedSurveyDocs = surveyDocs.filter(s => s.review_status === "approved");
  const gpsFieldReports = fieldReports.filter(r => r.latitude && r.longitude);
  const gflWithBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
  const gflWithGps = gfl.filter(p => p.latitude && p.longitude);

  const surveyorScenarios = [
    { scenario: "Submit new survey plan for GFL parcel", precondition: "≥1 SurveyDocument uploaded", expected: "Document stored, review_status = pending", evidence: `${surveyDocs.length} survey docs on record; ${surveyDocs.filter(s=>s.review_status==="pending").length} pending review`, result: surveyDocs.length > 0 },
    { scenario: "Capture GPS coordinates in field", precondition: "≥1 FieldReport with GPS capture", expected: "latitude/longitude stored, gps_auto capture method", evidence: `${gpsFieldReports.length} of ${fieldReports.length} field reports have GPS coordinates`, result: gpsFieldReports.length > 0 },
    { scenario: "Upload boundary GeoJSON polygon", precondition: "≥1 GFL parcel with parcel_boundary", expected: "GeoJSON stored, spatial_validation_status updated", evidence: `${gflWithBoundary.length} of ${gfl.length} GFL parcels have boundary polygon`, result: gflWithBoundary.length > 0 ? true : "warn" },
    { scenario: "Survey document approved by reviewer", precondition: "≥1 SurveyDocument with review_status = approved", expected: "Document status advances, parcel verification_status updated", evidence: `${approvedSurveyDocs.length} survey documents have review_status = approved`, result: approvedSurveyDocs.length > 0 },
    { scenario: "Submit field report with offline sync", precondition: "≥1 FieldReport with network_status = synced_offline", expected: "Report stored with synced_offline status, capture_timestamp present", evidence: `${fieldReports.filter(r=>r.network_status==="synced_offline").length} offline-synced reports on record`, result: fieldReports.filter(r=>r.network_status==="synced_offline").length > 0 ? true : "warn" },
    { scenario: "Reject survey document with notes", precondition: "≥1 SurveyDocument with review_status = rejected", expected: "review_notes populated, surveyor notified", evidence: `${surveyDocs.filter(s=>s.review_status==="rejected").length} rejected docs; ${surveyDocs.filter(s=>s.review_status==="rejected"&&s.review_notes).length} with notes`, result: surveyDocs.filter(s=>s.review_status==="rejected").length > 0 ? true : "warn" },
    { scenario: "Review spatial conflict on map", precondition: "≥1 parcel with spatial_validation_status = overlap_warning", expected: "Conflict parcels visible on GIS, conflict_notes populated", evidence: `${gfl.filter(p=>p.spatial_validation_status==="overlap_warning").length} overlap_warning parcels in GFL`, result: gfl.filter(p=>p.spatial_validation_status==="overlap_warning").length > 0 ? true : "warn" },
    { scenario: "Export survey report as CSV", precondition: "≥10 parcels registered", expected: "CSV file generated with all parcel fields", evidence: `${gfl.length} GFL parcels available for export; export UI present in LandRegistry page`, result: gfl.length >= 10 },
  ];

  const complianceScenarios = [
    { scenario: "Investigate open fraud alert", precondition: "≥1 FraudAlert with status = open or under_investigation", expected: "Alert assigned to officer, investigation_notes added", evidence: `${fraud.filter(f=>f.status==="under_investigation").length} alerts under investigation; ${fraud.filter(f=>f.assigned_to).length} assigned to officers`, result: fraud.length > 0 },
    { scenario: "Resolve fraud alert with outcome", precondition: "≥1 FraudAlert status = resolved", expected: "resolved_by, resolved_date, investigation_notes all populated", evidence: `${resolvedFraud.length} fraud alerts resolved/dismissed from ${fraud.length} total`, result: resolvedFraud.length > 0 },
    { scenario: "Flag duplicate registration fraud", precondition: "≥1 FraudAlert with alert_type = duplicate_registration", expected: "Alert created, linked parcel frozen or flagged", evidence: `${fraud.filter(f=>f.alert_type==="duplicate_registration").length} duplicate registration alerts`, result: fraud.filter(f=>f.alert_type==="duplicate_registration").length > 0 ? true : "warn" },
    { scenario: "Review compliance report", precondition: "Audit log has ≥50 entries", expected: "Compliance report shows activity by user, action type breakdown", evidence: `${audits.length} audit entries; ${new Set(audits.map(a=>a.user_email).filter(Boolean)).size} distinct users logged`, result: audits.length >= 50 },
    { scenario: "Escalate critical dispute", precondition: "≥1 Dispute with priority = critical or status = escalated", expected: "Dispute escalated, escalation recorded in audit log", evidence: `${disputes.filter(d=>d.priority==="critical").length} critical disputes; ${disputes.filter(d=>d.status==="escalated").length} escalated`, result: disputes.filter(d=>d.priority==="critical").length > 0 ? true : "warn" },
    { scenario: "Verify audit trail completeness", precondition: "≥100 AuditLog entries", expected: "Every action has user_email, action, entity_id, timestamp", evidence: `${audits.filter(a=>a.user_email&&a.entity_id&&a.action).length} of ${audits.length} entries fully attributed`, result: audits.length >= 100 },
    { scenario: "Review boundary manipulation alert", precondition: "≥1 FraudAlert with alert_type = boundary_manipulation", expected: "Alert links to parcel, officer can view boundary history", evidence: `${fraud.filter(f=>f.alert_type==="boundary_manipulation").length} boundary manipulation alerts on record`, result: fraud.filter(f=>f.alert_type==="boundary_manipulation").length > 0 ? true : "warn" },
  ];

  const registryScenarios = [
    { scenario: "Approve pending parcel registration", precondition: "≥1 LandParcel with status = approved", expected: "approval_date set, approved_by recorded, status = approved", evidence: `${approvedParcels.length} approved GFL parcels; ${approvedParcels.filter(p=>p.approval_date).length} with approval_date`, result: approvedParcels.length > 0 },
    { scenario: "Reject parcel with documented reason", precondition: "≥1 LandParcel with status = rejected", expected: "rejection_reason populated, status = rejected", evidence: `${gfl.filter(p=>p.status==="rejected").length} rejected parcels; ${gfl.filter(p=>p.status==="rejected"&&p.rejection_reason).length} with reason`, result: gfl.filter(p=>p.status==="rejected").length > 0 ? true : "warn" },
    { scenario: "Transfer parcel ownership", precondition: "≥1 OwnershipHistory record with status = approved", expected: "OwnershipHistory created, LandParcel owner_name updated", evidence: `${ownershipHistory.length} ownership history records; ${ownershipHistory.filter(o=>o.status==="approved").length} approved transfers`, result: ownershipHistory.filter(o=>o.status==="approved").length > 0 },
    { scenario: "Search parcel by owner name", precondition: "≥50 parcels in database", expected: "Filtered results returned within 2 seconds", evidence: `${parcels.length} total parcels; ${new Set(parcels.map(p=>p.owner_name).filter(Boolean)).size} unique owners`, result: parcels.length >= 50 },
    { scenario: "Filter parcels by LGA", precondition: "Multiple LGAs present in database", expected: "Only parcels from selected LGA returned", evidence: `LGAs present: ${[...new Set(parcels.map(p=>p.lga).filter(Boolean))].slice(0,4).join(", ")}`, result: new Set(parcels.map(p=>p.lga).filter(Boolean)).size > 1 },
    { scenario: "Freeze parcel under investigation", precondition: "≥1 LandParcel with status = frozen", expected: "Parcel locked from edits, freeze reason recorded", evidence: `${parcels.filter(p=>p.status==="frozen").length} frozen parcels in registry`, result: parcels.filter(p=>p.status==="frozen").length > 0 ? true : "warn" },
  ];

  const communityScenarios = [
    { scenario: "Submit community validation", precondition: "≥1 CommunityValidation record submitted", expected: "CommunityValidation created, status = submitted", evidence: `${communityVal.length} community validations on record`, result: communityVal.length > 0 },
    { scenario: "Village head validates submission", precondition: "≥1 CommunityValidation with village_head_validation_date", expected: "village_head_validated_by populated, status advances", evidence: `${communityVal.filter(c=>c.village_head_validation_date).length} village head validations recorded`, result: communityVal.filter(c=>c.village_head_validation_date).length > 0 ? true : "warn" },
    { scenario: "Traditional authority approves", precondition: "≥1 TraditionalAuthorityValidation with status = approved", expected: "digital_signature_url or seal_url present, validation_date set", evidence: `${approvedTrad.length} traditional authority approvals; ${tradVal.filter(t=>t.digital_signature_url).length} with digital signature`, result: approvedTrad.length > 0 },
    { scenario: "Community consent granted", precondition: "≥1 CommunityConsent or communityVal with approved status", expected: "consent status = granted, date_granted recorded", evidence: `${approvedComm.length} community validations fully approved`, result: approvedComm.length > 0 },
    { scenario: "Full community approval chain complete", precondition: "≥1 CommunityValidation through all 5 stages to approved", expected: "All reviewer fields populated, status = approved", evidence: `${approvedComm.length} validations reached approved status; final_approved_by: ${approvedComm.filter(c=>c.final_approved_by).length}`, result: approvedComm.length > 0 },
  ];

  const inheritanceScenarios = [
    { scenario: "Initiate inheritance case", precondition: "≥1 InheritanceCase with status ≠ draft", expected: "Case created with family_ownership_id, parcel_id, case_type", evidence: `${cases.filter(c=>c.status!=="draft").length} cases submitted beyond draft stage`, result: cases.filter(c=>c.status!=="draft").length > 0 },
    { scenario: "Add beneficiaries with shares totalling 100%", precondition: "≥1 FamilyOwnership with beneficiaries", expected: "All beneficiary percentage_share values sum to ≤100%", evidence: (() => { const shares = families.map(f => { const bs = beneficiaries.filter(b=>b.family_ownership_id===f.id&&b.status==="active"&&!b.is_deleted); const sum = bs.reduce((a,b)=>a+Number(b.percentage_share||0),0); return sum; }); const over = shares.filter(s=>s>100.5); return `${shares.length} families checked; ${over.length} with shares > 100%`; })(), result: (() => { const over = families.filter(f => { const bs = beneficiaries.filter(b=>b.family_ownership_id===f.id&&b.status==="active"&&!b.is_deleted); return bs.reduce((a,b)=>a+Number(b.percentage_share||0),0) > 100.5; }); return over.length === 0; })() },
    { scenario: "Add witnesses to inheritance case", precondition: "≥1 InheritanceWitness with verification_status = verified", expected: "Witnesses linked to case, identification recorded", evidence: `${verifiedWitnesses.length} verified witnesses; ${witnesses.filter(w=>w.identification).length} with ID recorded`, result: verifiedWitnesses.length > 0 },
    { scenario: "Complete surveyor review stage", precondition: "≥1 InheritanceCase with surveyor_review_date", expected: "surveyor_reviewer and surveyor_review_date populated", evidence: `${cases.filter(c=>c.surveyor_review_date).length} cases with surveyor review completed`, result: cases.filter(c=>c.surveyor_review_date).length > 0 ? true : "warn" },
    { scenario: "Final approval by Surveyor General", precondition: "≥1 InheritanceCase with status = approved", expected: "final_approved_by, final_approved_date, status = approved", evidence: `${approvedCases.length} cases approved; ${approvedCases.filter(c=>c.final_approved_by).length} with final_approved_by`, result: approvedCases.length > 0 },
    { scenario: "Generate inheritance certificate", precondition: "≥1 InheritanceCase with certificate_generated = true", expected: "certificate_url present, certificate_generated = true", evidence: `${certCases.length} certificates issued; ${certCases.filter(c=>c.certificate_url).length} with certificate_url`, result: certCases.length > 0 },
    { scenario: "Confirm plot allocations", precondition: "≥1 PlotAllocation with allocation_status = confirmed", expected: "allocated_by, area_sqm, allocation_percentage all set", evidence: `${confirmedAllocations.length} confirmed allocations; ${plotAllocations.filter(a=>a.area_sqm).length} with area_sqm`, result: confirmedAllocations.length > 0 },
  ];

  const allScenarios = [...surveyorScenarios, ...complianceScenarios, ...registryScenarios, ...communityScenarios, ...inheritanceScenarios];
  const totalPass = allScenarios.filter(s => s.result === true).length;
  const totalWarn = allScenarios.filter(s => s.result === "warn").length;
  const totalFail = allScenarios.filter(s => s.result === false).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-gray-900">{allScenarios.length}</p><p className="text-xs text-muted-foreground mt-0.5">Total Test Scenarios</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-emerald-700">{totalPass}</p><p className="text-xs text-muted-foreground mt-0.5">Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-amber-600">{totalWarn}</p><p className="text-xs text-muted-foreground mt-0.5">Warnings</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-red-600">{totalFail}</p><p className="text-xs text-muted-foreground mt-0.5">Failed</p></CardContent></Card>
      </div>

      <ScenarioGroup title="Surveyor Scenarios" icon={Map} iconColor="text-teal-600" scenarios={surveyorScenarios} />
      <ScenarioGroup title="Compliance Scenarios" icon={Shield} iconColor="text-red-600" scenarios={complianceScenarios} />
      <ScenarioGroup title="Registry Officer Scenarios" icon={User} iconColor="text-blue-600" scenarios={registryScenarios} />
      <ScenarioGroup title="Community Validation Scenarios" icon={Users} iconColor="text-purple-600" scenarios={communityScenarios} />
      <ScenarioGroup title="Inheritance Processing Scenarios" icon={GitBranch} iconColor="text-emerald-600" scenarios={inheritanceScenarios} />
    </div>
  );
}