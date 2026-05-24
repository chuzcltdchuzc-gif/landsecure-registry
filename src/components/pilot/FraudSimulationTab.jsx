import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Copy, Map, FileText, Shield } from "lucide-react";
import { SectionCard, S } from "./PilotShared";

export default function FraudSimulationTab({ data }) {
  const { parcels, families, beneficiaries, cases, fraud, audits, surveyDocs, ownershipHistory } = data;
  const parcelIds = new Set(parcels.map(p => p.id));

  // ── Duplicate parcel ownership ──────────────────────────────────────────
  const parcelNumMap = {};
  parcels.forEach(p => {
    parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || []).concat(p.id);
  });
  const dupNumberEntries = Object.entries(parcelNumMap).filter(([, ids]) => ids.length > 1);
  const dupNumberIds = dupNumberEntries.flatMap(([, ids]) => ids);

  // Multiple families claiming same parcel
  const familyByParcel = {};
  families.forEach(f => {
    if (f.parcel_id) familyByParcel[f.parcel_id] = (familyByParcel[f.parcel_id] || 0) + 1;
  });
  const multiClaimParcels = Object.entries(familyByParcel).filter(([, n]) => n > 1).map(([pid]) => pid);

  // Parcels with multiple OwnershipHistory records at same date
  const histByParcelDate = {};
  ownershipHistory.forEach(h => {
    const key = `${h.parcel_id}|${h.transfer_date}`;
    histByParcelDate[key] = (histByParcelDate[key] || []).concat(h.id);
  });
  const doubleTransfers = Object.entries(histByParcelDate).filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids);

  // ── Boundary overlap ────────────────────────────────────────────────────
  const overlapParcels = parcels.filter(p => p.spatial_validation_status === "overlap_warning");
  const conflictBlockedParcels = parcels.filter(p => p.spatial_validation_status === "conflict_blocked");
  const dupWarnParcels = parcels.filter(p => p.spatial_validation_status === "duplicate_warning");
  const highFraudRisk = parcels.filter(p => ["high"].includes(p.fraud_risk_level));
  const mediumFraudRisk = parcels.filter(p => p.fraud_risk_level === "medium");
  const duplicateBoundaryAlerts = fraud.filter(f => f.alert_type === "duplicate_registration" || f.alert_type === "boundary_manipulation");

  // ── Duplicate beneficiary claims ────────────────────────────────────────
  // Same NIN on multiple beneficiaries
  const benefByNin = {};
  beneficiaries.filter(b => b.national_id).forEach(b => {
    benefByNin[b.national_id] = (benefByNin[b.national_id] || []).concat(b.id);
  });
  const dupNinBenef = Object.entries(benefByNin).filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids);

  // Same beneficiary name in multiple families
  const benefByName = {};
  beneficiaries.forEach(b => {
    const name = b.full_name?.toLowerCase().trim();
    if (name) benefByName[name] = (benefByName[name] || []).concat(b.id);
  });
  const dupNameBenef = Object.entries(benefByName).filter(([, ids]) => ids.length > 3).flatMap(([, ids]) => ids); // >3 threshold (common names)

  // Beneficiaries with >100% share
  const overShareBenef = beneficiaries.filter(b => b.percentage_share > 100);

  // ── Forged survey submissions ────────────────────────────────────────────
  // Survey docs with duplicate file URLs (resubmitted)
  const surveyUrlMap = {};
  surveyDocs.filter(s => s.file_url).forEach(s => {
    surveyUrlMap[s.file_url] = (surveyUrlMap[s.file_url] || []).concat(s.id);
  });
  const dupSurveyUrls = Object.entries(surveyUrlMap).filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids);

  // Survey docs rejected (potential forged/manipulated)
  const rejectedSurveys = surveyDocs.filter(s => s.review_status === "rejected");

  // Survey docs without surveyor email (anonymous submission)
  const anonSurveys = surveyDocs.filter(s => !s.surveyor_email);

  // FraudAlerts of type forged_document
  const forgedDocAlerts = fraud.filter(f => f.alert_type === "forged_document");

  // ── Unauthorized transfer attempts ──────────────────────────────────────
  // Ownership transfers where parcel is in "frozen" or "conflict_blocked" state
  const frozenParcels = new Set(parcels.filter(p => p.status === "frozen" || p.status === "archived" || p.spatial_validation_status === "conflict_blocked").map(p => p.id));
  const transfersOnFrozen = ownershipHistory.filter(h => frozenParcels.has(h.parcel_id));

  // Transfers not approved
  const pendingTransfers = ownershipHistory.filter(h => h.status === "pending");
  const rejectedTransfers = ownershipHistory.filter(h => h.status === "rejected");

  // Fraudulent transfer type alerts
  const suspiciousTransferAlerts = fraud.filter(f => f.alert_type === "suspicious_transfer" || f.alert_type === "ownership_fraud");

  // ── Alert generation verification ──────────────────────────────────────
  const auditWithFraud = audits.filter(a => a.action?.toUpperCase().includes("FRAUD") || a.action?.toUpperCase().includes("ALERT"));
  const auditWithApproval = audits.filter(a => a.action?.toUpperCase().includes("APPROVED"));
  const auditWithDispute = audits.filter(a => a.action?.toUpperCase().includes("DISPUTE"));
  const totalFraudAlerts = fraud.length;
  const assignedAlerts = fraud.filter(f => f.assigned_to);
  const resolvedAlerts = fraud.filter(f => ["resolved", "dismissed"].includes(f.status));
  const criticalUnresolved = fraud.filter(f => f.severity === "critical" && !["resolved", "dismissed"].includes(f.status));

  const dupOwnershipRows = [
    { label: "Duplicate parcel numbers detected", checked: parcels.length, passed: parcels.length - dupNumberIds.length, failed: dupNumberIds.length, sampleIds: dupNumberIds.slice(0, 5), evidence: `${dupNumberEntries.length} parcel numbers registered more than once: ${dupNumberEntries.slice(0, 2).map(([n]) => n).join(", ")}`, status: dupNumberEntries.length === 0 ? S.ok : S.fail },
    { label: "Parcels with multiple family ownership claims", checked: Object.keys(familyByParcel).length, passed: Object.keys(familyByParcel).length - multiClaimParcels.length, failed: multiClaimParcels.length, sampleIds: multiClaimParcels.slice(0, 5), evidence: `${multiClaimParcels.length} parcels claimed by >1 FamilyOwnership record`, status: multiClaimParcels.length === 0 ? S.ok : S.fail },
    { label: "Same-date double transfers on one parcel", checked: ownershipHistory.length, passed: ownershipHistory.length - doubleTransfers.length, failed: doubleTransfers.length, sampleIds: doubleTransfers.slice(0, 5), evidence: `${doubleTransfers.length} history records share the same parcel_id + transfer_date`, status: doubleTransfers.length === 0 ? S.ok : S.fail },
    { label: "Parcels with high fraud_risk_level", checked: parcels.length, passed: parcels.length - highFraudRisk.length, failed: highFraudRisk.length, sampleIds: highFraudRisk.slice(0, 5).map(p => p.id), evidence: `${highFraudRisk.length} parcels flagged HIGH risk · ${mediumFraudRisk.length} MEDIUM risk by automated engine`, status: highFraudRisk.length === 0 ? S.ok : highFraudRisk.length < 5 ? S.warn : S.fail },
  ];

  const overlapRows = [
    { label: "Boundary overlap_warning flags", checked: parcels.length, passed: 0, failed: overlapParcels.length, sampleIds: overlapParcels.slice(0, 5).map(p => p.id), evidence: `${overlapParcels.length} parcels flagged with overlap_warning by spatial validation engine`, status: overlapParcels.length === 0 ? S.ok : overlapParcels.length < 10 ? S.warn : S.fail },
    { label: "Boundary conflict_blocked (highest severity)", checked: parcels.length, passed: 0, failed: conflictBlockedParcels.length, sampleIds: conflictBlockedParcels.slice(0, 5).map(p => p.id), evidence: `${conflictBlockedParcels.length} parcels locked due to unresolved boundary conflict`, status: conflictBlockedParcels.length === 0 ? S.ok : S.fail },
    { label: "Duplicate geometry warnings", checked: parcels.length, passed: 0, failed: dupWarnParcels.length, sampleIds: dupWarnParcels.slice(0, 5).map(p => p.id), evidence: `${dupWarnParcels.length} parcels share identical or near-identical boundary geometry`, status: dupWarnParcels.length === 0 ? S.ok : S.warn },
    { label: "Fraud alerts for boundary manipulation", checked: fraud.length, passed: fraud.length - duplicateBoundaryAlerts.length, failed: duplicateBoundaryAlerts.length, sampleIds: duplicateBoundaryAlerts.slice(0, 5).map(f => f.id), evidence: `${duplicateBoundaryAlerts.length} alerts of type duplicate_registration or boundary_manipulation`, status: duplicateBoundaryAlerts.length === 0 ? S.ok : duplicateBoundaryAlerts.length < 5 ? S.warn : S.fail },
  ];

  const dupBenefRows = [
    { label: "Beneficiaries with duplicate NIN", checked: beneficiaries.filter(b => b.national_id).length, passed: beneficiaries.filter(b => b.national_id).length - dupNinBenef.length, failed: dupNinBenef.length, sampleIds: dupNinBenef.slice(0, 5), evidence: `${dupNinBenef.length} beneficiary records share an identical national_id (NIN)`, status: dupNinBenef.length === 0 ? S.ok : S.fail },
    { label: "Beneficiaries with >100% share (impossible)", checked: beneficiaries.length, passed: beneficiaries.length - overShareBenef.length, failed: overShareBenef.length, sampleIds: overShareBenef.slice(0, 5).map(b => b.id), evidence: `${overShareBenef.length} beneficiaries assigned more than 100% of parcel — impossible value`, status: overShareBenef.length === 0 ? S.ok : S.fail },
    { label: "Beneficiaries with frequently duplicated name", checked: beneficiaries.length, passed: beneficiaries.length - dupNameBenef.length, failed: dupNameBenef.length, sampleIds: dupNameBenef.slice(0, 5), evidence: `${Object.entries(benefByName).filter(([, ids]) => ids.length > 3).length} names appear >3 times — possible identity reuse (${dupNameBenef.length} records)`, status: dupNameBenef.length === 0 ? S.ok : S.warn },
  ];

  const forgedSurveyRows = [
    { label: "Survey docs with duplicate file URLs (resubmission)", checked: surveyDocs.length, passed: surveyDocs.length - dupSurveyUrls.length, failed: dupSurveyUrls.length, sampleIds: dupSurveyUrls.slice(0, 5), evidence: `${dupSurveyUrls.length} survey documents share the same file_url — same file resubmitted for different parcels`, status: dupSurveyUrls.length === 0 ? S.ok : S.fail },
    { label: "Survey docs rejected by reviewer", checked: surveyDocs.length, passed: surveyDocs.length - rejectedSurveys.length, failed: rejectedSurveys.length, sampleIds: rejectedSurveys.slice(0, 5).map(s => s.id), evidence: `${rejectedSurveys.length} survey documents rejected — possible forged or inaccurate submissions`, status: rejectedSurveys.length === 0 ? S.ok : rejectedSurveys.length < 5 ? S.warn : S.fail },
    { label: "Anonymous survey submissions (no surveyor email)", checked: surveyDocs.length, passed: surveyDocs.length - anonSurveys.length, failed: anonSurveys.length, sampleIds: anonSurveys.slice(0, 5).map(s => s.id), evidence: `${anonSurveys.length} survey documents have no surveyor_email — unattributed and unaccountable`, status: anonSurveys.length === 0 ? S.ok : S.warn },
    { label: "Fraud alerts for forged documents", checked: fraud.length, passed: fraud.length - forgedDocAlerts.length, failed: forgedDocAlerts.length, sampleIds: forgedDocAlerts.slice(0, 5).map(f => f.id), evidence: `${forgedDocAlerts.length} alerts of type forged_document logged by compliance`, status: forgedDocAlerts.length === 0 ? S.ok : forgedDocAlerts.length < 5 ? S.warn : S.fail },
  ];

  const transferRows = [
    { label: "Ownership transfers on frozen/conflict parcels", checked: ownershipHistory.length, passed: ownershipHistory.length - transfersOnFrozen.length, failed: transfersOnFrozen.length, sampleIds: transfersOnFrozen.slice(0, 5).map(h => h.id), evidence: `${transfersOnFrozen.length} ownership history records linked to frozen or conflict-blocked parcels`, status: transfersOnFrozen.length === 0 ? S.ok : S.fail },
    { label: "Transfers pending approval (unconfirmed)", checked: ownershipHistory.length, passed: ownershipHistory.filter(h => h.status === "approved").length, failed: pendingTransfers.length, sampleIds: pendingTransfers.slice(0, 5).map(h => h.id), evidence: `${pendingTransfers.length} transfers still pending approval — title not yet confirmed`, status: pendingTransfers.length === 0 ? S.ok : pendingTransfers.length < 5 ? S.warn : S.fail },
    { label: "Transfers rejected by approver", checked: ownershipHistory.length, passed: ownershipHistory.length - rejectedTransfers.length, failed: rejectedTransfers.length, sampleIds: rejectedTransfers.slice(0, 5).map(h => h.id), evidence: `${rejectedTransfers.length} ownership transfers rejected — may indicate fraudulent attempt`, status: rejectedTransfers.length === 0 ? S.ok : S.warn },
    { label: "Suspicious transfer / ownership fraud alerts", checked: fraud.length, passed: fraud.length - suspiciousTransferAlerts.length, failed: suspiciousTransferAlerts.length, sampleIds: suspiciousTransferAlerts.slice(0, 5).map(f => f.id), evidence: `${suspiciousTransferAlerts.length} alerts of type suspicious_transfer or ownership_fraud`, status: suspiciousTransferAlerts.length === 0 ? S.ok : suspiciousTransferAlerts.length < 3 ? S.warn : S.fail },
  ];

  const alertRows = [
    { label: "Total fraud alerts generated", checked: totalFraudAlerts, passed: resolvedAlerts.length, failed: criticalUnresolved.length, sampleIds: criticalUnresolved.slice(0, 5).map(f => f.id), evidence: `${totalFraudAlerts} alerts · ${resolvedAlerts.length} resolved · ${criticalUnresolved.length} critical unresolved`, status: criticalUnresolved.length === 0 ? S.ok : criticalUnresolved.length < 3 ? S.warn : S.fail },
    { label: "Fraud alerts assigned to officer", checked: totalFraudAlerts, passed: assignedAlerts.length, failed: totalFraudAlerts - assignedAlerts.length, sampleIds: fraud.filter(f => !f.assigned_to).slice(0, 5).map(f => f.id), evidence: `${totalFraudAlerts - assignedAlerts.length} unassigned alerts — no officer accountability`, status: totalFraudAlerts - assignedAlerts.length === 0 ? S.ok : S.warn },
    { label: "Audit log entries for fraud events", checked: audits.length, passed: auditWithFraud.length, failed: 0, sampleIds: [], evidence: `${auditWithFraud.length} audit entries mention FRAUD/ALERT actions — trail confirmed`, status: auditWithFraud.length > 0 ? S.ok : S.fail },
    { label: "Audit log entries for approvals", checked: audits.length, passed: auditWithApproval.length, failed: 0, sampleIds: [], evidence: `${auditWithApproval.length} approval events in audit trail`, status: auditWithApproval.length > 0 ? S.ok : S.warn },
    { label: "Audit log entries for disputes", checked: audits.length, passed: auditWithDispute.length, failed: 0, sampleIds: [], evidence: `${auditWithDispute.length} dispute events in audit trail`, status: auditWithDispute.length > 0 ? S.ok : S.warn },
  ];

  const totalIssues = dupNumberEntries.length + multiClaimParcels.length + overlapParcels.length + conflictBlockedParcels.length + dupNinBenef.length + dupSurveyUrls.length + transfersOnFrozen.length + criticalUnresolved.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {[
          { label: "Total Fraud Alerts", value: totalFraudAlerts, color: "text-red-700" },
          { label: "Critical Unresolved", value: criticalUnresolved.length, color: criticalUnresolved.length === 0 ? "text-emerald-700" : "text-red-600" },
          { label: "Boundary Conflicts", value: overlapParcels.length + conflictBlockedParcels.length, color: "text-amber-700" },
          { label: "Total Fraud Signals", value: totalIssues, color: totalIssues === 0 ? "text-emerald-700" : "text-red-700" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center"><p className={`text-2xl font-black ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <SectionCard title="Duplicate Parcel Ownership Scenarios" icon={Copy} iconColor="text-red-600" rows={dupOwnershipRows} summary={`${parcels.length} parcels scanned for duplicate registration and multi-claim scenarios`} />
      <SectionCard title="Boundary Overlap Attempts" icon={Map} iconColor="text-amber-600" rows={overlapRows} summary={`${parcels.length} parcels checked for spatial overlap and conflict signals`} />
      <SectionCard title="Duplicate Beneficiary Claims" icon={AlertTriangle} iconColor="text-orange-600" rows={dupBenefRows} summary={`${beneficiaries.length} beneficiaries checked for identity and share duplication`} />
      <SectionCard title="Forged Survey Submission Scenarios" icon={FileText} iconColor="text-purple-600" rows={forgedSurveyRows} summary={`${surveyDocs.length} survey documents checked for forgery indicators`} />
      <SectionCard title="Unauthorized Ownership Transfer Attempts" icon={AlertTriangle} iconColor="text-red-700" rows={transferRows} summary={`${ownershipHistory.length} ownership history records checked for unauthorised transfers`} />
      <SectionCard title="Alert Generation & Audit Logging" icon={Shield} iconColor="text-blue-600" rows={alertRows} summary={`${totalFraudAlerts} alerts + ${audits.length} audit entries verified`} />
    </div>
  );
}