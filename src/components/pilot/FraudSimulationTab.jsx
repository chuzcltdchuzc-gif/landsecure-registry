import { S, SectionCard, StatBox, parseCoords } from "./PilotShared";
import { AlertTriangle, Shield, Copy, Map, FileText, Activity } from "lucide-react";

// Re-export boundaryKey from shared if needed locally
function getBoundaryKey(coords) {
  return JSON.stringify(coords.slice(0, 4).map(p => p.map(v => Math.round(v * 1000))));
}

export default function FraudSimulationTab({ data }) {
  const { parcels, families, beneficiaries, surveyDocs, ownershipHistory, fraud, audits } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // ── Duplicate parcel ownership ──
  const parcelNumMap = {};
  parcels.forEach(p => { parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || []).concat(p); });
  const dupNumberGroups = Object.values(parcelNumMap).filter(list => list.length > 1);
  const dupNumberIds = dupNumberGroups.flatMap(list => list.map(p => p.id));

  // Same GPS location used on multiple parcels
  const gpsClusters = {};
  gfl.filter(p => p.latitude && p.longitude).forEach(p => {
    const key = `${Math.round(p.latitude * 10000)},${Math.round(p.longitude * 10000)}`;
    gpsClusters[key] = (gpsClusters[key] || []).concat(p);
  });
  const dupGpsGroups = Object.values(gpsClusters).filter(list => list.length > 1);
  const dupGpsIds = dupGpsGroups.flatMap(list => list.map(p => p.id));

  // Same owner_name on >3 parcels (potential shell ownership)
  const ownerParcelMap = {};
  gfl.forEach(p => { if (p.owner_name) ownerParcelMap[p.owner_name] = (ownerParcelMap[p.owner_name] || 0) + 1; });
  const suspiciousOwners = Object.entries(ownerParcelMap).filter(([, c]) => c > 5);

  const dupOwnershipRows = [
    { label: "Duplicate parcel numbers detected (double registration)", checked: parcels.length, passed: parcels.length - dupNumberIds.length, failed: dupNumberIds.length, sampleIds: dupNumberIds.slice(0, 5), evidence: dupNumberGroups.length === 0 ? "No duplicate parcel numbers — system rejects re-registration" : `${dupNumberGroups.length} number(s) registered more than once: ${dupNumberGroups.slice(0, 2).map(g => g[0].parcel_number).join(", ")}`, status: dupNumberGroups.length === 0 ? S.ok : S.fail },
    { label: "Duplicate GPS coordinates across parcels (same-location fraud)", checked: gfl.filter(p => p.latitude && p.longitude).length, passed: gfl.filter(p => p.latitude && p.longitude).length - dupGpsIds.length, failed: dupGpsIds.length, sampleIds: dupGpsIds.slice(0, 5), evidence: `${dupGpsGroups.length} GPS location(s) used by multiple parcels · ${dupGpsIds.length} affected records`, status: dupGpsGroups.length === 0 ? S.ok : dupGpsGroups.length < 3 ? S.warn : S.fail },
    { label: "Owners with >5 parcels (concentration risk)", checked: Object.keys(ownerParcelMap).length, passed: Object.keys(ownerParcelMap).length - suspiciousOwners.length, failed: suspiciousOwners.length, sampleIds: [], evidence: suspiciousOwners.length === 0 ? "No single owner controls >5 parcels" : `Owners: ${suspiciousOwners.slice(0, 3).map(([n, c]) => `"${n}" (${c})`).join(", ")}`, status: suspiciousOwners.length === 0 ? S.ok : S.warn },
    { label: "FraudAlert records for duplicate_registration type", checked: fraud.length, passed: fraud.filter(f => f.alert_type === "duplicate_registration").length, failed: 0, sampleIds: [], evidence: `${fraud.filter(f => f.alert_type === "duplicate_registration").length} duplicate_registration alerts raised in system`, status: fraud.filter(f => f.alert_type === "duplicate_registration").length > 0 ? S.ok : S.warn },
  ];

  // ── Boundary overlap attempts ──
  const overlapFlags = gfl.filter(p => p.spatial_validation_status === "overlap_warning");
  const conflictBlocked = gfl.filter(p => p.spatial_validation_status === "conflict_blocked");
  const dupBoundaryFlags = gfl.filter(p => p.spatial_validation_status === "duplicate_warning");

  // Compute actual duplicate geometry groups
  const boundaryMap = new Map();
  gfl.forEach(p => {
    const coords = parseCoords(p.parcel_boundary);
    if (!coords) return;
    const key = getBoundaryKey(coords);
    boundaryMap.set(key, (boundaryMap.get(key) || []).concat(p));
  });
  const exactDupGroups = [...boundaryMap.values()].filter(list => list.length > 1);
  const exactDupIds = exactDupGroups.flatMap(list => list.map(p => p.id));

  const overlapRows = [
    { label: "System-flagged boundary overlaps (overlap_warning)", checked: gfl.length, passed: gfl.length - overlapFlags.length, failed: overlapFlags.length, sampleIds: overlapFlags.slice(0, 5).map(p => p.id), evidence: `${overlapFlags.length} parcels flagged · numbers: ${overlapFlags.slice(0, 3).map(p => p.parcel_number).join(", ")}`, status: overlapFlags.length === 0 ? S.ok : overlapFlags.length < 10 ? S.warn : S.fail },
    { label: "Boundary conflict blocks (conflict_blocked — registration frozen)", checked: gfl.length, passed: gfl.length - conflictBlocked.length, failed: conflictBlocked.length, sampleIds: conflictBlocked.slice(0, 5).map(p => p.id), evidence: `${conflictBlocked.length} parcels are blocked from further approval until conflict resolved`, status: conflictBlocked.length === 0 ? S.ok : S.fail },
    { label: "Exact duplicate geometry polygons detected", checked: gfl.filter(p => p.parcel_boundary).length, passed: gfl.filter(p => p.parcel_boundary).length - exactDupIds.length, failed: exactDupIds.length, sampleIds: exactDupIds.slice(0, 5), evidence: `${exactDupGroups.length} groups of parcels share identical boundary geometry`, status: exactDupGroups.length === 0 ? S.ok : S.fail },
    { label: "System-flagged duplicate geometry (duplicate_warning)", checked: gfl.length, passed: gfl.length - dupBoundaryFlags.length, failed: dupBoundaryFlags.length, sampleIds: dupBoundaryFlags.slice(0, 5).map(p => p.id), evidence: `${dupBoundaryFlags.length} parcels carry duplicate_warning spatial status`, status: dupBoundaryFlags.length === 0 ? S.ok : S.warn },
    { label: "FraudAlert records for boundary_manipulation type", checked: fraud.length, passed: fraud.filter(f => f.alert_type === "boundary_manipulation").length, failed: 0, sampleIds: [], evidence: `${fraud.filter(f => f.alert_type === "boundary_manipulation").length} boundary manipulation alerts raised`, status: fraud.filter(f => f.alert_type === "boundary_manipulation").length > 0 ? S.ok : S.warn },
  ];

  // ── Duplicate beneficiary claims ──
  const benefByName = {};
  beneficiaries.forEach(b => { if (b.full_name) benefByName[b.full_name] = (benefByName[b.full_name] || []).concat(b); });
  const dupNameBenef = Object.values(benefByName).filter(list => list.length > 1);
  const dupNameBenefIds = dupNameBenef.flatMap(list => list.slice(1).map(b => b.id)); // keep first, flag rest

  // Same national_id on multiple beneficiaries
  const benefByNin = {};
  beneficiaries.filter(b => b.national_id).forEach(b => { benefByNin[b.national_id] = (benefByNin[b.national_id] || []).concat(b); });
  const dupNinGroups = Object.values(benefByNin).filter(list => list.length > 1);
  const dupNinIds = dupNinGroups.flatMap(list => list.map(b => b.id));

  const dupBenefRows = [
    { label: "Beneficiaries with duplicate full_name across records", checked: beneficiaries.length, passed: beneficiaries.length - dupNameBenefIds.length, failed: dupNameBenefIds.length, sampleIds: dupNameBenefIds.slice(0, 5), evidence: `${dupNameBenef.length} name(s) appear on multiple beneficiary records — possible double-claim`, status: dupNameBenef.length === 0 ? S.ok : S.warn },
    { label: "Beneficiaries with duplicate national_id (NIN/Passport)", checked: beneficiaries.filter(b => b.national_id).length, passed: beneficiaries.filter(b => b.national_id).length - dupNinIds.length, failed: dupNinIds.length, sampleIds: dupNinIds.slice(0, 5), evidence: dupNinGroups.length === 0 ? "No duplicate national IDs across beneficiary records" : `${dupNinGroups.length} national ID(s) shared between multiple beneficiaries`, status: dupNinGroups.length === 0 ? S.ok : S.fail },
    { label: "FraudAlert records for ownership_fraud type", checked: fraud.length, passed: fraud.filter(f => f.alert_type === "ownership_fraud").length, failed: 0, sampleIds: [], evidence: `${fraud.filter(f => f.alert_type === "ownership_fraud").length} ownership_fraud alerts in system`, status: fraud.filter(f => f.alert_type === "ownership_fraud").length > 0 ? S.ok : S.warn },
  ];

  // ── Forged survey submission scenarios ──
  // Survey docs with rejected status (caught forgery)
  const rejectedSurveys = surveyDocs.filter(s => s.review_status === "rejected");
  // Survey docs submitted for non-existent parcels
  const parcelIds = new Set(parcels.map(p => p.id));
  const surveyOrphan = surveyDocs.filter(s => s.parcel_id && !parcelIds.has(s.parcel_id));
  // Survey docs without surveyor_email
  const surveyNoSurveyor = surveyDocs.filter(s => !s.surveyor_email);
  // High fraud risk parcels
  const highFraudRisk = gfl.filter(p => p.fraud_risk_level === "high" || p.fraud_risk_level === "medium");

  const forgedSurveyRows = [
    { label: "Survey documents rejected (forgery/error caught by reviewer)", checked: surveyDocs.length, passed: surveyDocs.filter(s => s.review_status === "approved").length, failed: rejectedSurveys.length, sampleIds: rejectedSurveys.slice(0, 5).map(s => s.id), evidence: `${rejectedSurveys.length} surveys rejected · review_notes: ${rejectedSurveys.slice(0, 2).map(s => s.review_notes || "n/a").join(" | ")}`, status: rejectedSurveys.length < 3 ? S.ok : S.warn },
    { label: "Survey documents for non-existent parcels (orphan submissions)", checked: surveyDocs.length, passed: surveyDocs.length - surveyOrphan.length, failed: surveyOrphan.length, sampleIds: surveyOrphan.slice(0, 5).map(s => s.id), evidence: `${surveyOrphan.length} survey documents reference a parcel_id not found in the registry`, status: surveyOrphan.length === 0 ? S.ok : S.fail },
    { label: "Survey docs with no surveyor_email (unattributed submission)", checked: surveyDocs.length, passed: surveyDocs.length - surveyNoSurveyor.length, failed: surveyNoSurveyor.length, sampleIds: surveyNoSurveyor.slice(0, 5).map(s => s.id), evidence: `${surveyNoSurveyor.length} survey submissions cannot be attributed to a licensed surveyor`, status: surveyNoSurveyor.length === 0 ? S.ok : S.warn },
    { label: "FraudAlert records for forged_document type", checked: fraud.length, passed: fraud.filter(f => f.alert_type === "forged_document").length, failed: 0, sampleIds: fraud.filter(f => f.alert_type === "forged_document").slice(0, 5).map(f => f.id), evidence: `${fraud.filter(f => f.alert_type === "forged_document").length} forged_document alerts raised · system detected forgery attempts`, status: fraud.filter(f => f.alert_type === "forged_document").length > 0 ? S.ok : S.warn },
    { label: "Parcels with medium/high fraud risk score", checked: gfl.length, passed: gfl.length - highFraudRisk.length, failed: gfl.filter(p => p.fraud_risk_level === "high").length, sampleIds: gfl.filter(p => p.fraud_risk_level === "high").slice(0, 5).map(p => p.id), evidence: `${gfl.filter(p => p.fraud_risk_level === "high").length} high-risk · ${gfl.filter(p => p.fraud_risk_level === "medium").length} medium-risk · automated scoring active`, status: gfl.filter(p => p.fraud_risk_level === "high").length === 0 ? S.ok : S.warn },
  ];

  // ── Unauthorized ownership transfer attempts ──
  const suspiciousTransfers = ownershipHistory.filter(o => o.transfer_type === "purchase" && !o.document_url);
  const pendingTransfers = ownershipHistory.filter(o => o.status === "pending");
  const rejectedTransfers = ownershipHistory.filter(o => o.status === "rejected");

  const transferRows = [
    { label: "Ownership transfers with supporting document URL", checked: ownershipHistory.length, passed: ownershipHistory.filter(o => o.document_url).length, failed: ownershipHistory.filter(o => !o.document_url).length, sampleIds: ownershipHistory.filter(o => !o.document_url).slice(0, 5).map(o => o.id), evidence: `${ownershipHistory.filter(o => !o.document_url).length} transfer records lack a supporting document`, status: ownershipHistory.filter(o => !o.document_url).length / Math.max(ownershipHistory.length, 1) < 0.2 ? S.ok : S.warn },
    { label: "Purchase transfers without document (unauthorized risk)", checked: ownershipHistory.filter(o => o.transfer_type === "purchase").length, passed: ownershipHistory.filter(o => o.transfer_type === "purchase").length - suspiciousTransfers.length, failed: suspiciousTransfers.length, sampleIds: suspiciousTransfers.slice(0, 5).map(o => o.id), evidence: `${suspiciousTransfers.length} purchase transfers have no document_url — high unauthorized risk`, status: suspiciousTransfers.length === 0 ? S.ok : suspiciousTransfers.length < 3 ? S.warn : S.fail },
    { label: "Rejected ownership transfer attempts", checked: ownershipHistory.length, passed: ownershipHistory.filter(o => o.status === "approved").length, failed: rejectedTransfers.length, sampleIds: rejectedTransfers.slice(0, 5).map(o => o.id), evidence: `${rejectedTransfers.length} transfers rejected · ${pendingTransfers.length} still pending approval`, status: S.ok },
    { label: "FraudAlert records for suspicious_transfer type", checked: fraud.length, passed: fraud.filter(f => f.alert_type === "suspicious_transfer").length, failed: 0, sampleIds: fraud.filter(f => f.alert_type === "suspicious_transfer").slice(0, 5).map(f => f.id), evidence: `${fraud.filter(f => f.alert_type === "suspicious_transfer").length} suspicious_transfer alerts raised`, status: fraud.filter(f => f.alert_type === "suspicious_transfer").length > 0 ? S.ok : S.warn },
  ];

  // ── Alert generation and audit logging ──
  const fraudAlertTypes = [...new Set(fraud.map(f => f.alert_type))];
  const auditFraudEntries = audits.filter(a => a.action?.toUpperCase().includes("FRAUD"));
  const auditDisputeEntries = audits.filter(a => a.action?.toUpperCase().includes("DISPUTE"));
  const criticalUnresolved = fraud.filter(f => f.severity === "critical" && f.status !== "resolved");
  const alertsAssigned = fraud.filter(f => f.assigned_to);

  const alertAuditRows = [
    { label: "Fraud alert types generated by system", checked: fraud.length, passed: fraud.length, failed: 0, sampleIds: [], evidence: `Alert types present: ${fraudAlertTypes.join(", ")}`, status: fraudAlertTypes.length >= 3 ? S.ok : S.warn },
    { label: "Fraud events recorded in audit log", checked: audits.length, passed: auditFraudEntries.length, failed: 0, sampleIds: [], evidence: `${auditFraudEntries.length} fraud-related audit entries · actions: ${[...new Set(auditFraudEntries.map(a => a.action))].slice(0, 3).join(", ")}`, status: auditFraudEntries.length > 0 ? S.ok : S.fail },
    { label: "Dispute events recorded in audit log", checked: audits.length, passed: auditDisputeEntries.length, failed: 0, sampleIds: [], evidence: `${auditDisputeEntries.length} dispute-related audit entries`, status: auditDisputeEntries.length > 0 ? S.ok : S.warn },
    { label: "Critical unresolved fraud alerts (requires immediate action)", checked: fraud.filter(f => f.severity === "critical").length, passed: fraud.filter(f => f.severity === "critical" && f.status === "resolved").length, failed: criticalUnresolved.length, sampleIds: criticalUnresolved.slice(0, 5).map(f => f.id), evidence: `${criticalUnresolved.length} critical alerts remain unresolved`, status: criticalUnresolved.length === 0 ? S.ok : S.fail },
    { label: "Fraud alerts assigned to compliance officers", checked: fraud.length, passed: alertsAssigned.length, failed: fraud.length - alertsAssigned.length, sampleIds: fraud.filter(f => !f.assigned_to).slice(0, 5).map(f => f.id), evidence: `${alertsAssigned.length} of ${fraud.length} alerts have an assigned officer`, status: alertsAssigned.length / Math.max(fraud.length, 1) >= 0.8 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Dup. Registrations" value={dupNumberGroups.length} color={dupNumberGroups.length > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Boundary Conflicts" value={overlapFlags.length + conflictBlocked.length} color={overlapFlags.length + conflictBlocked.length > 0 ? "text-amber-600" : "text-emerald-700"} />
        <StatBox label="Critical Alerts Open" value={criticalUnresolved.length} color={criticalUnresolved.length > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Audit Trail Coverage" value={`${Math.round((auditFraudEntries.length + auditDisputeEntries.length) / Math.max(fraud.length + 1, 1) * 100)}%`} color="text-blue-700" />
      </div>
      <SectionCard title="Duplicate Parcel Ownership" icon={Copy} iconColor="text-red-600" rows={dupOwnershipRows} summary="Double registration, GPS reuse, and ownership concentration checks" />
      <SectionCard title="Boundary Overlap Attempts" icon={Map} iconColor="text-amber-600" rows={overlapRows} summary={`${gfl.length} parcels checked · ${overlapFlags.length + conflictBlocked.length + exactDupGroups.length} overlap indicators found`} />
      <SectionCard title="Duplicate Beneficiary Claims" icon={Shield} iconColor="text-orange-600" rows={dupBenefRows} summary={`${beneficiaries.length} beneficiaries checked for name and ID duplication`} />
      <SectionCard title="Forged Survey Submission Scenarios" icon={FileText} iconColor="text-purple-600" rows={forgedSurveyRows} summary={`${surveyDocs.length} survey docs checked for attribution and validity`} />
      <SectionCard title="Unauthorized Ownership Transfers" icon={AlertTriangle} iconColor="text-red-600" rows={transferRows} summary={`${ownershipHistory.length} ownership transfer records checked`} />
      <SectionCard title="Alert Generation & Audit Logging" icon={Activity} iconColor="text-blue-600" rows={alertAuditRows} summary={`${fraud.length} fraud alerts · ${audits.length} audit entries verified`} />
    </div>
  );
}