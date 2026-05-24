import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, Link, FileText, AlertTriangle } from "lucide-react";
import { SectionCard } from "./PilotShared";
import { S } from "./PilotShared";

export default function ChainOfTitleTab({ data }) {
  const { parcels, families, ownershipHistory, cases, audits, surveyDocs, tradVal, communityVal } = data;
  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));

  // ── Ownership history continuity ──────────────────────────────────────
  // A parcel has continuity if its ownership history records form a complete chain
  // (each record has from_owner → to_owner → transfer_date)
  const historyByParcel = {};
  ownershipHistory.forEach(h => {
    if (!historyByParcel[h.parcel_id]) historyByParcel[h.parcel_id] = [];
    historyByParcel[h.parcel_id].push(h);
  });

  const parcelsWithHistory = parcels.filter(p => historyByParcel[p.id]?.length > 0);
  const brokenChains = parcelsWithHistory.filter(p => {
    const chain = historyByParcel[p.id];
    return chain.some(h => !h.from_owner || !h.to_owner || !h.transfer_date);
  });
  const missingFromOwner = ownershipHistory.filter(h => !h.from_owner);
  const missingToOwner = ownershipHistory.filter(h => !h.to_owner);
  const missingTransferDate = ownershipHistory.filter(h => !h.transfer_date);
  const unlinkedHistory = ownershipHistory.filter(h => h.parcel_id && !parcelIds.has(h.parcel_id));

  // ── Broken inheritance chains ─────────────────────────────────────────
  const casesNoFamily = cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id));
  const casesNoParcel = cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id));
  const approvedCasesNoCert = cases.filter(c => c.status === "approved" && !c.certificate_generated);
  const casesNoApprover = cases.filter(c => c.status === "approved" && !c.final_approved_by);
  const casesNoApprovalDate = cases.filter(c => c.status === "approved" && !c.final_approved_date);

  // ── Missing approvals ─────────────────────────────────────────────────
  const approvedParcels = parcels.filter(p => p.status === "approved");
  const approvedNoApprover = approvedParcels.filter(p => !p.approved_by);
  const approvedNoDate = approvedParcels.filter(p => !p.approval_date);
  const historyNotApproved = ownershipHistory.filter(h => h.status !== "approved");
  const tradValPending = tradVal.filter(t => t.validation_status === "pending");
  const communityValPending = communityVal.filter(c => c.status !== "approved" && c.status !== "rejected");

  // ── Missing supporting documents ─────────────────────────────────────
  const parcelsNoSurveyDoc = parcels.filter(p => !surveyDocs.find(s => s.parcel_id === p.id));
  const gflParcels = parcels.filter(p => p.lga === "Greenfield Local Government");
  const gflNoSurvey = gflParcels.filter(p => !surveyDocs.find(s => s.parcel_id === p.id));
  const surveyNoFile = surveyDocs.filter(s => !s.file_url);
  const histNoDoc = ownershipHistory.filter(h => !h.document_url);

  // ── Ownership conflicts ────────────────────────────────────────────────
  // Multiple families claiming the same parcel
  const familiesByParcel = {};
  families.forEach(f => {
    if (!familiesByParcel[f.parcel_id]) familiesByParcel[f.parcel_id] = [];
    familiesByParcel[f.parcel_id].push(f.id);
  });
  const conflictParcels = Object.entries(familiesByParcel).filter(([, ids]) => ids.length > 1);
  const conflictParcelIds = conflictParcels.map(([pid]) => pid);
  const disputedParcels = parcels.filter(p => p.status === "disputed");
  const fraudHighRisk = parcels.filter(p => p.fraud_risk_level === "high" || p.fraud_risk_level === "medium");

  const continuityRows = [
    { label: "Parcels with ownership history records", checked: parcels.length, passed: parcelsWithHistory.length, failed: parcels.length - parcelsWithHistory.length, sampleIds: parcels.filter(p => !historyByParcel[p.id]).slice(0, 4).map(p => p.id), evidence: `${parcelsWithHistory.length} parcels have at least one ownership history record`, status: parcelsWithHistory.length / Math.max(parcels.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "Ownership history chains complete (from→to→date)", checked: ownershipHistory.length, passed: ownershipHistory.filter(h => h.from_owner && h.to_owner && h.transfer_date).length, failed: brokenChains.length, sampleIds: brokenChains.slice(0, 5).map(p => p.id), evidence: `${brokenChains.length} parcels have incomplete chain records`, status: brokenChains.length === 0 ? S.ok : brokenChains.length < 5 ? S.warn : S.fail },
    { label: "OwnershipHistory: from_owner present", checked: ownershipHistory.length, passed: ownershipHistory.length - missingFromOwner.length, failed: missingFromOwner.length, sampleIds: missingFromOwner.slice(0, 5).map(h => h.id), evidence: `${missingFromOwner.length} records missing from_owner — chain broken`, status: missingFromOwner.length === 0 ? S.ok : S.fail },
    { label: "OwnershipHistory: to_owner present", checked: ownershipHistory.length, passed: ownershipHistory.length - missingToOwner.length, failed: missingToOwner.length, sampleIds: missingToOwner.slice(0, 5).map(h => h.id), evidence: `${missingToOwner.length} records missing to_owner`, status: missingToOwner.length === 0 ? S.ok : S.fail },
    { label: "OwnershipHistory: transfer_date present", checked: ownershipHistory.length, passed: ownershipHistory.length - missingTransferDate.length, failed: missingTransferDate.length, sampleIds: missingTransferDate.slice(0, 5).map(h => h.id), evidence: `${missingTransferDate.length} transfers undated — cannot establish temporal chain`, status: missingTransferDate.length === 0 ? S.ok : missingTransferDate.length < 5 ? S.warn : S.fail },
    { label: "OwnershipHistory → Parcel references valid", checked: ownershipHistory.length, passed: ownershipHistory.length - unlinkedHistory.length, failed: unlinkedHistory.length, sampleIds: unlinkedHistory.slice(0, 5).map(h => h.id), evidence: `${unlinkedHistory.length} history records point to non-existent parcels`, status: unlinkedHistory.length === 0 ? S.ok : S.fail },
  ];

  const inheritanceChainRows = [
    { label: "InheritanceCase → LandParcel link valid", checked: cases.length, passed: cases.length - casesNoParcel.length, failed: casesNoParcel.length, sampleIds: casesNoParcel.slice(0, 5).map(c => c.id), evidence: `${casesNoParcel.length} cases reference non-existent parcels — broken inheritance chain`, status: casesNoParcel.length === 0 ? S.ok : S.fail },
    { label: "InheritanceCase → FamilyOwnership link valid", checked: cases.length, passed: cases.length - casesNoFamily.length, failed: casesNoFamily.length, sampleIds: casesNoFamily.slice(0, 5).map(c => c.id), evidence: `${casesNoFamily.length} cases have no parent FamilyOwnership record`, status: casesNoFamily.length === 0 ? S.ok : S.fail },
    { label: "Approved cases have final approver recorded", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.status === "approved").length - casesNoApprover.length, failed: casesNoApprover.length, sampleIds: casesNoApprover.slice(0, 5).map(c => c.id), evidence: `${casesNoApprover.length} approved cases missing final_approved_by`, status: casesNoApprover.length === 0 ? S.ok : S.warn },
    { label: "Approved cases have final approval date", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.status === "approved").length - casesNoApprovalDate.length, failed: casesNoApprovalDate.length, sampleIds: casesNoApprovalDate.slice(0, 5).map(c => c.id), evidence: `${casesNoApprovalDate.length} approved cases missing final_approved_date`, status: casesNoApprovalDate.length === 0 ? S.ok : S.warn },
    { label: "Approved cases: certificate generated", checked: cases.filter(c => c.status === "approved").length, passed: cases.filter(c => c.certificate_generated).length, failed: approvedCasesNoCert.length, sampleIds: approvedCasesNoCert.slice(0, 5).map(c => c.id), evidence: `${approvedCasesNoCert.length} approved cases have no certificate — title chain incomplete`, status: approvedCasesNoCert.length === 0 ? S.ok : S.warn },
  ];

  const approvalRows = [
    { label: "Approved parcels have approved_by recorded", checked: approvedParcels.length, passed: approvedParcels.length - approvedNoApprover.length, failed: approvedNoApprover.length, sampleIds: approvedNoApprover.slice(0, 5).map(p => p.id), evidence: `${approvedNoApprover.length} parcels approved without recorded approver`, status: approvedNoApprover.length === 0 ? S.ok : S.warn },
    { label: "Approved parcels have approval_date", checked: approvedParcels.length, passed: approvedParcels.length - approvedNoDate.length, failed: approvedNoDate.length, sampleIds: approvedNoDate.slice(0, 5).map(p => p.id), evidence: `${approvedNoDate.length} approved parcels lack approval date — audit trail gap`, status: approvedNoDate.length === 0 ? S.ok : S.warn },
    { label: "OwnershipHistory records approved", checked: ownershipHistory.length, passed: ownershipHistory.filter(h => h.status === "approved").length, failed: historyNotApproved.length, sampleIds: historyNotApproved.slice(0, 5).map(h => h.id), evidence: `${historyNotApproved.length} history records pending/rejected — transfer not finalised`, status: historyNotApproved.length === 0 ? S.ok : historyNotApproved.length < 5 ? S.warn : S.fail },
    { label: "Traditional authority validations completed", checked: tradVal.length, passed: tradVal.filter(t => t.validation_status !== "pending").length, failed: tradValPending.length, sampleIds: tradValPending.slice(0, 5).map(t => t.id), evidence: `${tradValPending.length} validations still pending — customary approval missing`, status: tradValPending.length === 0 ? S.ok : S.warn },
    { label: "Community validations not abandoned mid-process", checked: communityVal.length, passed: communityVal.filter(c => c.status === "approved" || c.status === "rejected").length, failed: communityValPending.length, sampleIds: communityValPending.slice(0, 5).map(c => c.id), evidence: `${communityValPending.length} community validations stalled in intermediate stage`, status: communityValPending.length === 0 ? S.ok : S.warn },
  ];

  const docRows = [
    { label: "GFL parcels with at least one survey document", checked: gflParcels.length, passed: gflParcels.length - gflNoSurvey.length, failed: gflNoSurvey.length, sampleIds: gflNoSurvey.slice(0, 5).map(p => p.id), evidence: `${gflNoSurvey.length} GFL parcels have no survey document on record`, status: gflNoSurvey.length === 0 ? S.ok : gflNoSurvey.length / Math.max(gflParcels.length, 1) < 0.2 ? S.warn : S.fail },
    { label: "Survey documents with file_url", checked: surveyDocs.length, passed: surveyDocs.length - surveyNoFile.length, failed: surveyNoFile.length, sampleIds: surveyNoFile.slice(0, 5).map(s => s.id), evidence: `${surveyNoFile.length} survey doc records have no attached file`, status: surveyNoFile.length === 0 ? S.ok : S.warn },
    { label: "OwnershipHistory records with supporting document", checked: ownershipHistory.length, passed: ownershipHistory.length - histNoDoc.length, failed: histNoDoc.length, sampleIds: histNoDoc.slice(0, 5).map(h => h.id), evidence: `${histNoDoc.length} ownership transfers have no supporting document URL`, status: histNoDoc.length / Math.max(ownershipHistory.length, 1) < 0.3 ? S.ok : S.warn },
  ];

  const conflictRows = [
    { label: "Parcels with multiple FamilyOwnership claims", checked: Object.keys(familiesByParcel).length, passed: Object.keys(familiesByParcel).length - conflictParcels.length, failed: conflictParcels.length, sampleIds: conflictParcelIds.slice(0, 5), evidence: `${conflictParcels.length} parcels claimed by more than one FamilyOwnership record`, status: conflictParcels.length === 0 ? S.ok : S.fail },
    { label: "Parcels with 'disputed' status", checked: parcels.length, passed: parcels.length - disputedParcels.length, failed: disputedParcels.length, sampleIds: disputedParcels.slice(0, 5).map(p => p.id), evidence: `${disputedParcels.length} parcels currently in disputed status — ownership unresolved`, status: disputedParcels.length === 0 ? S.ok : disputedParcels.length < 5 ? S.warn : S.fail },
    { label: "Parcels with medium/high fraud risk score", checked: parcels.length, passed: parcels.length - fraudHighRisk.length, failed: fraudHighRisk.length, sampleIds: fraudHighRisk.slice(0, 5).map(p => p.id), evidence: `${fraudHighRisk.length} parcels have elevated fraud risk — possible ownership manipulation`, status: fraudHighRisk.length === 0 ? S.ok : fraudHighRisk.length < 10 ? S.warn : S.fail },
  ];

  const totalChecked = [...continuityRows, ...inheritanceChainRows, ...approvalRows, ...docRows, ...conflictRows].reduce((a, r) => a + (r.checked ?? 0), 0);
  const totalFailed = [...continuityRows, ...inheritanceChainRows, ...approvalRows, ...docRows, ...conflictRows].reduce((a, r) => a + (r.failed ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-2">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-gray-900">{totalChecked.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-0.5">Records Checked</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-emerald-700">{(totalChecked - totalFailed).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-0.5">Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black text-red-600">{totalFailed.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-0.5">Failed</p></CardContent></Card>
      </div>
      <SectionCard title="Ownership History Continuity" icon={Link} iconColor="text-blue-600" rows={continuityRows} summary={`${ownershipHistory.length} ownership history records checked for chain completeness`} />
      <SectionCard title="Broken Inheritance Chains" icon={GitBranch} iconColor="text-red-600" rows={inheritanceChainRows} summary={`${cases.length} inheritance cases checked for broken links`} />
      <SectionCard title="Missing Approvals" icon={AlertTriangle} iconColor="text-amber-600" rows={approvalRows} summary={`${approvedParcels.length} approved parcels and ${ownershipHistory.length} history records checked`} />
      <SectionCard title="Missing Supporting Documents" icon={FileText} iconColor="text-indigo-600" rows={docRows} summary={`${gflParcels.length} GFL parcels checked for survey document coverage`} />
      <SectionCard title="Ownership Conflicts" icon={AlertTriangle} iconColor="text-red-700" rows={conflictRows} summary={`${parcels.length} parcels checked for competing ownership claims`} />
    </div>
  );
}