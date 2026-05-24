import { S, SectionCard, StatBox } from "./PilotShared";
import { GitBranch, FileText, AlertTriangle, Shield, Link } from "lucide-react";

export default function ChainOfTitleTab({ data }) {
  const { parcels, families, ownershipHistory, cases, surveyDocs, audits, beneficiaries } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));

  // ── Ownership history continuity ──
  // Each approved parcel should have at least one ownership history entry
  const approvedParcels = gfl.filter(p => p.status === "approved");
  const historyParcelIds = new Set(ownershipHistory.map(o => o.parcel_id));
  const approvedWithHistory = approvedParcels.filter(p => historyParcelIds.has(p.id));
  const approvedMissingHistory = approvedParcels.filter(p => !historyParcelIds.has(p.id));

  // Ownership records with both from_owner and to_owner
  const histComplete = ownershipHistory.filter(o => o.from_owner && o.to_owner && o.transfer_date);
  const histIncomplete = ownershipHistory.filter(o => !(o.from_owner && o.to_owner && o.transfer_date));

  // Chains: parcels with >1 history entry (multi-generational)
  const histByParcel = {};
  ownershipHistory.forEach(o => { histByParcel[o.parcel_id] = (histByParcel[o.parcel_id] || []).concat(o); });
  const multiChainParcels = Object.values(histByParcel).filter(chain => chain.length > 1);

  const continuityRows = [
    { label: "Approved parcels with at least one ownership history record", checked: approvedParcels.length, passed: approvedWithHistory.length, failed: approvedMissingHistory.length, sampleIds: approvedMissingHistory.slice(0, 5).map(p => p.id), evidence: `${approvedWithHistory.length} of ${approvedParcels.length} approved parcels have a documented transfer history`, status: approvedMissingHistory.length === 0 ? S.ok : approvedMissingHistory.length < 10 ? S.warn : S.fail },
    { label: "Ownership history records with complete from/to/date", checked: ownershipHistory.length, passed: histComplete.length, failed: histIncomplete.length, sampleIds: histIncomplete.slice(0, 5).map(o => o.id), evidence: `${histComplete.length} fully-documented transfers · ${histIncomplete.length} missing from_owner, to_owner or transfer_date`, status: histIncomplete.length === 0 ? S.ok : histIncomplete.length < 5 ? S.warn : S.fail },
    { label: "Multi-generational chains (>1 transfer per parcel)", checked: Object.keys(histByParcel).length, passed: multiChainParcels.length, failed: 0, sampleIds: [], evidence: `${multiChainParcels.length} parcels have a chain of ≥2 ownership transfers — demonstrates continuity depth`, status: multiChainParcels.length > 0 ? S.ok : S.warn },
    { label: "Ownership transfers with approved status", checked: ownershipHistory.length, passed: ownershipHistory.filter(o => o.status === "approved").length, failed: ownershipHistory.filter(o => o.status === "rejected").length, sampleIds: ownershipHistory.filter(o => o.status === "rejected").slice(0, 5).map(o => o.id), evidence: `${ownershipHistory.filter(o => o.status === "approved").length} approved · ${ownershipHistory.filter(o => o.status === "pending").length} pending · ${ownershipHistory.filter(o => o.status === "rejected").length} rejected`, status: ownershipHistory.filter(o => o.status === "approved").length > 0 ? S.ok : S.warn },
  ];

  // ── Broken inheritance chains ──
  // Inheritance cases whose family_ownership_id or parcel_id cannot be resolved
  const brokenCaseFamily = cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id));
  const brokenCaseParcel = cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id));
  // Cases with no ownership history for their parcel
  const casesWithNoHistory = cases.filter(c => c.parcel_id && !historyParcelIds.has(c.parcel_id));

  const brokenChainRows = [
    { label: "Broken chain: InheritanceCase → FamilyOwnership unresolvable", checked: cases.length, passed: cases.length - brokenCaseFamily.length, failed: brokenCaseFamily.length, sampleIds: brokenCaseFamily.slice(0, 5).map(c => c.id), evidence: brokenCaseFamily.length === 0 ? "All inheritance cases link to a valid FamilyOwnership record" : `${brokenCaseFamily.length} cases reference a non-existent FamilyOwnership`, status: brokenCaseFamily.length === 0 ? S.ok : S.fail },
    { label: "Broken chain: InheritanceCase → LandParcel unresolvable", checked: cases.length, passed: cases.length - brokenCaseParcel.length, failed: brokenCaseParcel.length, sampleIds: brokenCaseParcel.slice(0, 5).map(c => c.id), evidence: brokenCaseParcel.length === 0 ? "All cases link to a valid parcel" : `${brokenCaseParcel.length} cases reference a non-existent parcel`, status: brokenCaseParcel.length === 0 ? S.ok : S.fail },
    { label: "Inheritance cases with no ownership history on their parcel", checked: cases.length, passed: cases.length - casesWithNoHistory.length, failed: casesWithNoHistory.length, sampleIds: casesWithNoHistory.slice(0, 5).map(c => c.id), evidence: `${casesWithNoHistory.length} cases operate on parcels with no prior transfer history — chain starts here`, status: casesWithNoHistory.length < 5 ? S.ok : S.warn },
  ];

  // ── Missing approvals ──
  const approvedCasesNoApprover = cases.filter(c => c.status === "approved" && !c.final_approved_by);
  const approvedCasesNoDate = cases.filter(c => c.status === "approved" && !c.final_approved_date);
  const approvedParcelsNoApprover = approvedParcels.filter(p => !p.approved_by);
  const approvedParcelsNoDate = approvedParcels.filter(p => !p.approval_date);

  const missingApprovalRows = [
    { label: "Approved inheritance cases with approver recorded", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.status === "approved").length - approvedCasesNoApprover.length, failed: approvedCasesNoApprover.length, sampleIds: approvedCasesNoApprover.slice(0, 5).map(c => c.id), evidence: `${approvedCasesNoApprover.length} approved cases missing final_approved_by`, status: approvedCasesNoApprover.length === 0 ? S.ok : S.warn },
    { label: "Approved inheritance cases with approval date", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.status === "approved").length - approvedCasesNoDate.length, failed: approvedCasesNoDate.length, sampleIds: approvedCasesNoDate.slice(0, 5).map(c => c.id), evidence: `${approvedCasesNoDate.length} approved cases missing final_approved_date`, status: approvedCasesNoDate.length === 0 ? S.ok : S.warn },
    { label: "Approved parcels with approved_by recorded", checked: approvedParcels.length, passed: approvedParcels.length - approvedParcelsNoApprover.length, failed: approvedParcelsNoApprover.length, sampleIds: approvedParcelsNoApprover.slice(0, 5).map(p => p.id), evidence: `${approvedParcelsNoApprover.length} approved parcels missing approved_by officer`, status: approvedParcelsNoApprover.length === 0 ? S.ok : S.warn },
    { label: "Approved parcels with approval_date recorded", checked: approvedParcels.length, passed: approvedParcels.length - approvedParcelsNoDate.length, failed: approvedParcelsNoDate.length, sampleIds: approvedParcelsNoDate.slice(0, 5).map(p => p.id), evidence: `${approvedParcelsNoDate.length} approved parcels missing approval_date`, status: approvedParcelsNoDate.length === 0 ? S.ok : S.warn },
  ];

  // ── Missing supporting documents ──
  // Survey documents per parcel
  const surveyParcelIds = new Set(surveyDocs.map(s => s.parcel_id));
  const approvedNoSurveyDoc = approvedParcels.filter(p => !surveyParcelIds.has(p.id));
  const surveyNoFile = surveyDocs.filter(s => !s.file_url);
  const casesNoCert = cases.filter(c => c.status === "approved" && !c.certificate_generated);

  const missingDocRows = [
    { label: "Approved parcels with at least one survey document", checked: approvedParcels.length, passed: approvedParcels.length - approvedNoSurveyDoc.length, failed: approvedNoSurveyDoc.length, sampleIds: approvedNoSurveyDoc.slice(0, 5).map(p => p.id), evidence: `${approvedNoSurveyDoc.length} approved parcels have no survey document on record`, status: approvedNoSurveyDoc.length === 0 ? S.ok : approvedNoSurveyDoc.length < 10 ? S.warn : S.fail },
    { label: "Survey documents with file_url (actual file attached)", checked: surveyDocs.length, passed: surveyDocs.length - surveyNoFile.length, failed: surveyNoFile.length, sampleIds: surveyNoFile.slice(0, 5).map(s => s.id), evidence: `${surveyNoFile.length} survey document records have no file attached`, status: surveyNoFile.length === 0 ? S.ok : S.warn },
    { label: "Approved inheritance cases with certificate generated", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.status === "approved").length - casesNoCert.length, failed: casesNoCert.length, sampleIds: casesNoCert.slice(0, 5).map(c => c.id), evidence: `${casesNoCert.length} approved cases have no certificate generated`, status: casesNoCert.length === 0 ? S.ok : S.warn },
  ];

  // ── Ownership conflicts ──
  // Same parcel_number used by multiple parcels
  const parcelNumMap = {};
  parcels.forEach(p => { parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || []).concat(p); });
  const conflictingParcels = Object.values(parcelNumMap).filter(list => list.length > 1);
  const conflictIds = conflictingParcels.flatMap(list => list.map(p => p.id));

  // Same parcel linked to multiple active families
  const familyByParcel = {};
  families.forEach(f => { familyByParcel[f.parcel_id] = (familyByParcel[f.parcel_id] || 0) + 1; });
  const multiOwnerParcels = Object.entries(familyByParcel).filter(([, c]) => c > 1);

  // Parcels with conflict_blocked spatial status
  const conflictBlocked = gfl.filter(p => p.spatial_validation_status === "conflict_blocked");

  const conflictRows = [
    { label: "Duplicate parcel numbers (double registration risk)", checked: parcels.length, passed: parcels.length - conflictIds.length, failed: conflictIds.length, sampleIds: conflictIds.slice(0, 5), evidence: conflictingParcels.length === 0 ? "No duplicate parcel numbers detected" : `${conflictingParcels.length} parcel numbers shared by multiple records: ${conflictingParcels.slice(0, 2).map(list => list[0].parcel_number).join(", ")}`, status: conflictingParcels.length === 0 ? S.ok : S.fail },
    { label: "Parcels with multiple FamilyOwnership records (ownership conflict)", checked: Object.keys(familyByParcel).length, passed: Object.keys(familyByParcel).length - multiOwnerParcels.length, failed: multiOwnerParcels.length, sampleIds: multiOwnerParcels.slice(0, 5).map(([id]) => id), evidence: multiOwnerParcels.length === 0 ? "Each parcel has at most one family ownership record" : `${multiOwnerParcels.length} parcels have >1 family ownership claim`, status: multiOwnerParcels.length === 0 ? S.ok : S.fail },
    { label: "Parcels with spatial conflict_blocked status", checked: gfl.length, passed: gfl.length - conflictBlocked.length, failed: conflictBlocked.length, sampleIds: conflictBlocked.slice(0, 5).map(p => p.id), evidence: `${conflictBlocked.length} parcels are frozen pending conflict resolution`, status: conflictBlocked.length === 0 ? S.ok : conflictBlocked.length < 5 ? S.warn : S.fail },
    { label: "Audit log records ownership conflict events", checked: audits.length, passed: audits.filter(a => a.action?.toUpperCase().includes("CONFLICT") || a.action?.toUpperCase().includes("FRAUD") || a.action?.toUpperCase().includes("DISPUTE")).length, failed: 0, sampleIds: [], evidence: `${audits.filter(a => a.action?.toUpperCase().includes("CONFLICT") || a.action?.toUpperCase().includes("DISPUTE")).length} conflict/dispute events in audit log`, status: S.ok },
  ];

  const allRows = [...continuityRows, ...brokenChainRows, ...missingApprovalRows, ...missingDocRows, ...conflictRows];
  const critical = allRows.filter(r => r.status === S.fail).length;
  const warnings = allRows.filter(r => r.status === S.warn).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Ownership Records" value={ownershipHistory.length} color="text-blue-700" />
        <StatBox label="Chain Breaks Detected" value={brokenCaseFamily.length + brokenCaseParcel.length} color={brokenCaseFamily.length + brokenCaseParcel.length > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Missing Approvals" value={approvedCasesNoApprover.length + approvedParcelsNoApprover.length} color={approvedCasesNoApprover.length + approvedParcelsNoApprover.length > 0 ? "text-amber-600" : "text-emerald-700"} />
        <StatBox label="Ownership Conflicts" value={conflictingParcels.length + multiOwnerParcels.length} color={conflictingParcels.length + multiOwnerParcels.length > 0 ? "text-red-600" : "text-emerald-700"} />
      </div>
      <SectionCard title="Ownership History Continuity" icon={Link} iconColor="text-blue-600" rows={continuityRows} summary={`${ownershipHistory.length} transfer records across ${Object.keys(histByParcel).length} parcels`} />
      <SectionCard title="Broken Inheritance Chains" icon={GitBranch} iconColor="text-red-600" rows={brokenChainRows} summary={`${cases.length} inheritance cases checked for chain integrity`} />
      <SectionCard title="Missing Approvals" icon={Shield} iconColor="text-amber-600" rows={missingApprovalRows} summary="Approved records verified to have approver and date recorded" />
      <SectionCard title="Missing Supporting Documents" icon={FileText} iconColor="text-indigo-600" rows={missingDocRows} summary={`${surveyDocs.length} survey docs checked across ${approvedParcels.length} approved parcels`} />
      <SectionCard title="Ownership Conflicts" icon={AlertTriangle} iconColor="text-red-600" rows={conflictRows} summary="Duplicate registrations, multi-claim parcels and spatial conflicts" />
    </div>
  );
}