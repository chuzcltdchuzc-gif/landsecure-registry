import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Download } from "lucide-react";
import { S } from "./PilotShared";

function parseCoords(raw) {
  try {
    const geo = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!geo) return null;
    if (geo.type === "Polygon") return geo.coordinates?.[0] ?? null;
    if (geo.type === "Feature") return geo.geometry?.coordinates?.[0] ?? null;
    if (Array.isArray(geo)) return geo;
    return null;
  } catch { return null; }
}

function issueRow(severity, id, description, evidence, corrective) {
  return { severity, id, description, evidence, corrective };
}

function IssueTable({ issues, severity }) {
  const filtered = issues.filter(i => i.severity === severity);
  if (filtered.length === 0) return <p className="text-xs text-muted-foreground italic px-2">No {severity} issues found.</p>;
  const bg = severity === "critical" ? "border-red-200" : severity === "high" ? "border-orange-200" : "border-amber-200";
  const headerBg = severity === "critical" ? "bg-red-50" : severity === "high" ? "bg-orange-50" : "bg-amber-50";
  return (
    <div className={`overflow-x-auto rounded border ${bg}`}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className={`${headerBg} border-b`}>
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-8">#</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Issue</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Evidence</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Corrective Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((issue, i) => (
            <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : headerBg}`}>
              <td className="px-3 py-2 text-gray-400 font-mono">{issue.id}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{issue.description}</td>
              <td className="px-3 py-2 text-gray-600">{issue.evidence}</td>
              <td className="px-3 py-2 text-gray-700 font-medium">{issue.corrective}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AcceptanceReportTab({ data, onDownload }) {
  const {
    parcels, families, beneficiaries, cases, disputes, fraud, audits,
    fieldReports, surveyDocs, ownershipHistory, communityVal, tradVal,
    plotAllocations, witnesses
  } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // ── Compute all key metrics ────────────────────────────────────────────
  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));
  const caseIds = new Set(cases.map(c => c.id));

  // Parcel duplicates
  const parcelNumMap = {};
  parcels.forEach(p => { parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || 0) + 1; });
  const dupNumbers = Object.values(parcelNumMap).filter(v => v > 1).length;

  // FK orphans
  const orphanFamilies = families.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length;
  const orphanCases = cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id)).length;

  // Share violations
  const sharesByFamily = {};
  beneficiaries.filter(b => !b.is_deleted).forEach(b => {
    sharesByFamily[b.family_ownership_id] = (sharesByFamily[b.family_ownership_id] || 0) + (Number(b.percentage_share) || 0);
  });
  const shareViolations = Object.values(sharesByFamily).filter(t => Math.abs(t - 100) > 1).length;
  const overShares = Object.values(sharesByFamily).filter(t => t > 101).length;

  // Beneficiary NIN duplicates
  const benefByNin = {};
  beneficiaries.filter(b => b.national_id).forEach(b => {
    benefByNin[b.national_id] = (benefByNin[b.national_id] || 0) + 1;
  });
  const dupNins = Object.values(benefByNin).filter(v => v > 1).length;

  // Witness issues
  const witnessByCase = {};
  witnesses.forEach(w => {
    witnessByCase[w.inheritance_case_id] = (witnessByCase[w.inheritance_case_id] || 0) + 1;
  });
  const casesNoWitness = cases.filter(c => c.status !== "draft" && !witnessByCase[c.id]).length;

  // GIS
  const withBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
  const overlapParcels = gfl.filter(p => p.spatial_validation_status === "overlap_warning");
  const conflictBlocked = gfl.filter(p => p.spatial_validation_status === "conflict_blocked");
  let openRings = 0;
  withBoundary.forEach(p => {
    const coords = parseCoords(p.parcel_boundary);
    if (coords && coords.length >= 4) {
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) openRings++;
    }
  });

  // Survey
  const gflNoSurvey = gfl.filter(p => !surveyDocs.find(s => s.parcel_id === p.id)).length;
  const dupSurveyUrls = (() => {
    const m = {};
    surveyDocs.filter(s => s.file_url).forEach(s => { m[s.file_url] = (m[s.file_url] || 0) + 1; });
    return Object.values(m).filter(v => v > 1).length;
  })();

  // Field ops
  const offlineCaptured = fieldReports.filter(r => r.network_status === "offline" || r.network_status === "synced_offline");
  const unsyncedReports = fieldReports.filter(r => r.network_status === "offline").length;
  const noGps = fieldReports.filter(r => !(r.latitude && r.longitude)).length;
  const failedQuality = fieldReports.filter(r => r.quality_flag === "fail").length;

  // Fraud
  const criticalUnresolved = fraud.filter(f => f.severity === "critical" && !["resolved", "dismissed"].includes(f.status)).length;
  const transfersOnFrozen = ownershipHistory.filter(h => {
    const p = parcels.find(p => p.id === h.parcel_id);
    return p && (p.status === "frozen" || p.spatial_validation_status === "conflict_blocked");
  }).length;

  // Workflow
  const certCases = cases.filter(c => c.certificate_generated).length;
  const resolvedDisputes = disputes.filter(d => d.status === "resolved").length;
  const resolvedFraud = fraud.filter(f => ["resolved", "dismissed"].includes(f.status)).length;
  const tradApproved = tradVal.filter(t => t.validation_status === "approved").length;
  const commApproved = communityVal.filter(c => c.status === "approved").length;

  // Chain of title
  const missingFromOwner = ownershipHistory.filter(h => !h.from_owner).length;
  const missingToOwner = ownershipHistory.filter(h => !h.to_owner).length;
  const approvedNoCert = cases.filter(c => c.status === "approved" && !c.certificate_generated).length;

  // ── Build issues list ─────────────────────────────────────────────────
  const issues = [];

  // CRITICAL
  if (dupNumbers > 0) issues.push(issueRow("critical", "C-01", `${dupNumbers} duplicate parcel numbers detected`, "Multiple records share identical parcel_number — double registration confirmed", "De-duplicate immediately: merge or delete one record per conflicting pair"));
  if (overShares > 0) issues.push(issueRow("critical", "C-02", `${overShares} families with beneficiary shares >100%`, "Impossible over-allocation of parcel ownership — potential fraudulent claim", "Recalculate and reconcile beneficiary shares; obtain family consensus"));
  if (conflictBlocked.length > 0) issues.push(issueRow("critical", "C-03", `${conflictBlocked.length} parcels in conflict_blocked state`, "Parcels locked due to unresolved boundary conflict", "Resolve each conflict: re-survey boundary, obtain agreement, unblock parcel"));
  if (orphanFamilies > 0) issues.push(issueRow("critical", "C-04", `${orphanFamilies} FamilyOwnership records with broken parcel link`, "Family ownership records reference non-existent parcels — data corruption", "Identify and link to correct parcel, or remove orphan records"));
  if (orphanCases > 0) issues.push(issueRow("critical", "C-05", `${orphanCases} InheritanceCase records with broken parcel link`, "Inheritance cases cannot complete without a valid parcel link", "Relink cases to correct parcel or archive unresolvable cases"));
  if (transfersOnFrozen > 0) issues.push(issueRow("critical", "C-06", `${transfersOnFrozen} ownership transfers attempted on frozen parcels`, "Attempted transfers on locked/blocked parcels — possible fraudulent activity", "Investigate each transfer, freeze perpetrator accounts, report to compliance"));
  if (dupNins > 0) issues.push(issueRow("critical", "C-07", `${dupNins} beneficiaries sharing a NIN`, "Same national ID used by multiple beneficiaries — identity fraud indicator", "Verify NIN records, remove duplicates, escalate to compliance"));
  if (criticalUnresolved > 0) issues.push(issueRow("critical", "C-08", `${criticalUnresolved} critical fraud alerts unresolved`, "Active critical fraud indicators with no resolution", "Assign to senior compliance officer immediately; freeze affected parcels"));
  if (dupSurveyUrls > 0) issues.push(issueRow("critical", "C-09", `${dupSurveyUrls} survey documents share identical file URLs`, "Same physical file submitted for multiple parcels — survey forgery indicator", "Reject duplicate submissions, require original survey plans per parcel"));
  if (missingFromOwner > 0) issues.push(issueRow("critical", "C-10", `${missingFromOwner} ownership history records missing from_owner`, "Ownership chain cannot be established — chain-of-title broken", "Retrieve original title documentation to populate missing from_owner fields"));
  if (missingToOwner > 0) issues.push(issueRow("critical", "C-11", `${missingToOwner} ownership history records missing to_owner`, "Destination of ownership transfer unknown — invalid transfer record", "Verify each transfer with supporting documentation, update or delete record"));

  // HIGH
  if (overlapParcels.length > 10) issues.push(issueRow("high", "H-01", `${overlapParcels.length} parcels with overlap_warning`, ">10 spatial overlaps indicate systemic boundary data quality issue", "Re-survey overlapping parcels; resolve each conflict before pilot go-live"));
  if (shareViolations > 0) issues.push(issueRow("high", "H-02", `${shareViolations} families with share totals ≠ 100%`, "Beneficiary percentages do not total 100% — incomplete inheritance records", "Obtain family consensus on shares, correct allocations to sum to 100%"));
  if (casesNoWitness > 0) issues.push(issueRow("high", "H-03", `${casesNoWitness} active inheritance cases with no witnesses`, "Customary law requires witnesses for valid inheritance proceedings", "Register minimum 2 witnesses per active case before proceeding"));
  if (openRings > 5) issues.push(issueRow("high", "H-04", `${openRings} polygon boundaries are not closed rings`, "Unclosed boundaries will fail GIS analysis and title mapping", "Correct GeoJSON to ensure first = last coordinate for each polygon"));
  if (certCases === 0) issues.push(issueRow("high", "H-05", "Zero inheritance certificates generated", "End-to-end inheritance workflow has not been completed in the pilot", "Complete at least one full inheritance case cycle including certificate generation"));
  if (gflNoSurvey > gfl.length * 0.3) issues.push(issueRow("high", "H-06", `${gflNoSurvey} GFL parcels (${Math.round(gflNoSurvey / gfl.length * 100)}%) lack survey documents`, "Large proportion of registered parcels have no survey documentation", "Prioritise survey document collection before scaling to 1,000 parcels"));
  if (noGps > fieldReports.length * 0.2) issues.push(issueRow("high", "H-07", `${noGps} field reports (${Math.round(noGps / Math.max(fieldReports.length, 1) * 100)}%) have no GPS`, "High rate of non-geolocated field reports undermines boundary verification", "Enable GPS capture on all field devices; reject reports without coordinates"));
  if (unsyncedReports > 0) issues.push(issueRow("high", "H-08", `${unsyncedReports} offline reports not yet synced`, "Data captured offline but not returned to server — risk of data loss", "Force sync on all field devices; investigate sync failures"));
  if (approvedNoCert > 0) issues.push(issueRow("high", "H-09", `${approvedNoCert} approved inheritance cases with no certificate`, "Approved cases without certificate — title confirmation incomplete", "Generate certificates for all approved cases immediately"));

  // MEDIUM (warn)
  if (tradApproved === 0) issues.push(issueRow("medium", "M-01", "No traditional authority approvals recorded", "Customary law requires traditional ruler sign-off for land transfers in LGA", "Engage local traditional institutions to validate pilot land records"));
  if (commApproved === 0) issues.push(issueRow("medium", "M-02", "No community validations approved", "Community consent process has not been completed for any parcel", "Begin community validation sessions with village heads and elders"));
  if (resolvedDisputes === 0) issues.push(issueRow("medium", "M-03", "No land disputes resolved", "Dispute resolution workflow not yet exercised end-to-end", "Process at least one complete dispute cycle to validate the workflow"));
  if (failedQuality > 0) issues.push(issueRow("medium", "M-04", `${failedQuality} field reports with quality_flag=fail`, "Some field data capture failed quality checks", "Re-capture or discard failed quality reports; retrain field agents"));
  if (families.filter(f => !f.family_lineage).length > families.length * 0.3) issues.push(issueRow("medium", "M-05", `${families.filter(f => !f.family_lineage).length} families missing customary lineage type`, "Lineage type (patrilineal/matrilineal) is required for succession determination", "Update family records with correct lineage classification"));

  // ── Acceptance criteria ────────────────────────────────────────────────
  const criteria = [
    { id: "AC-01", label: "≥ 100 parcels registered in Greenfield LGA", ok: gfl.length >= 100, value: `${gfl.length}`, evidence: `${gfl.length} parcels in GFL` },
    { id: "AC-02", label: "≥ 50% of registered parcels approved", ok: gfl.filter(p => p.status === "approved").length / Math.max(gfl.length, 1) >= 0.5, value: `${Math.round(gfl.filter(p => p.status === "approved").length / Math.max(gfl.length, 1) * 100)}%`, evidence: `${gfl.filter(p => p.status === "approved").length} approved` },
    { id: "AC-03", label: "Zero critical unresolved fraud alerts", ok: criticalUnresolved === 0, value: criticalUnresolved, evidence: `${criticalUnresolved} critical alerts active` },
    { id: "AC-04", label: "Zero duplicate parcel numbers", ok: dupNumbers === 0, value: dupNumbers, evidence: `${dupNumbers} duplicates found` },
    { id: "AC-05", label: "Inheritance end-to-end workflow completed (≥1 cert)", ok: certCases >= 1, value: certCases, evidence: `${certCases} certificates generated` },
    { id: "AC-06", label: "Dispute resolution workflow demonstrated", ok: resolvedDisputes >= 1, value: resolvedDisputes, evidence: `${resolvedDisputes} disputes resolved` },
    { id: "AC-07", label: "Fraud detection demonstrated (≥1 resolved)", ok: resolvedFraud >= 1, value: resolvedFraud, evidence: `${resolvedFraud} fraud alerts resolved` },
    { id: "AC-08", label: "GIS boundary coverage ≥ 70%", ok: withBoundary.length / Math.max(gfl.length, 1) >= 0.7, value: `${Math.round(withBoundary.length / Math.max(gfl.length, 1) * 100)}%`, evidence: `${withBoundary.length}/${gfl.length} parcels with GeoJSON` },
    { id: "AC-09", label: "No conflict_blocked parcels", ok: conflictBlocked.length === 0, value: conflictBlocked.length, evidence: `${conflictBlocked.length} parcels locked` },
    { id: "AC-10", label: "Audit log ≥ 200 entries", ok: audits.length >= 200, value: audits.length, evidence: `${audits.length} audit entries` },
    { id: "AC-11", label: "Field reports ≥ 50 with GPS", ok: fieldReports.filter(r => r.latitude && r.longitude).length >= 50, value: fieldReports.filter(r => r.latitude && r.longitude).length, evidence: "GPS-equipped field reports" },
    { id: "AC-12", label: "Traditional authority validation demonstrated", ok: tradApproved >= 1, value: tradApproved, evidence: `${tradApproved} trad. authority approvals` },
    { id: "AC-13", label: "Community validation approved", ok: commApproved >= 1, value: commApproved, evidence: `${commApproved} community validations approved` },
    { id: "AC-14", label: "Zero broken FK chains (orphan records)", ok: orphanFamilies === 0 && orphanCases === 0, value: orphanFamilies + orphanCases, evidence: `${orphanFamilies} orphan families + ${orphanCases} orphan cases` },
    { id: "AC-15", label: "Beneficiary share totals valid (≤ 3 violations)", ok: shareViolations <= 3, value: shareViolations, evidence: `${shareViolations} families with shares ≠ 100%` },
    { id: "AC-16", label: "Offline field capture demonstrated", ok: offlineCaptured.length > 0, value: offlineCaptured.length, evidence: `${offlineCaptured.length} offline-captured reports` },
    { id: "AC-17", label: "Zero transfers on frozen/blocked parcels", ok: transfersOnFrozen === 0, value: transfersOnFrozen, evidence: `${transfersOnFrozen} suspicious transfers` },
    { id: "AC-18", label: "Survey documents present (≥ 30% GFL parcels)", ok: (gfl.length - gflNoSurvey) / Math.max(gfl.length, 1) >= 0.3, value: `${Math.round((gfl.length - gflNoSurvey) / Math.max(gfl.length, 1) * 100)}%`, evidence: `${gfl.length - gflNoSurvey} GFL parcels with survey docs` },
    { id: "AC-19", label: "No unsynced offline reports", ok: unsyncedReports === 0, value: unsyncedReports, evidence: `${unsyncedReports} reports pending sync` },
    { id: "AC-20", label: "Zero duplicate beneficiary NINs", ok: dupNins === 0, value: dupNins, evidence: `${dupNins} NIN duplicates found` },
  ];

  const passedCriteria = criteria.filter(c => c.ok).length;
  const failedCriteria = criteria.length - passedCriteria;
  const criticalIssues = issues.filter(i => i.severity === "critical");
  const highIssues = issues.filter(i => i.severity === "high");
  const mediumIssues = issues.filter(i => i.severity === "medium");

  // Overall deployment recommendation
  const deploymentReady = criticalIssues.length === 0 && failedCriteria <= 3 && highIssues.length <= 3;
  const deploymentConditional = criticalIssues.length <= 3 && failedCriteria <= 7;
  const recommendation = deploymentReady ? "APPROVED FOR CONTROLLED PILOT DEPLOYMENT" :
    deploymentConditional ? "CONDITIONAL APPROVAL — RESOLVE CRITICAL ISSUES FIRST" :
    "NOT APPROVED — SIGNIFICANT REMEDIATION REQUIRED";
  const recColor = deploymentReady ? "bg-emerald-50 border-emerald-400 text-emerald-900" :
    deploymentConditional ? "bg-amber-50 border-amber-400 text-amber-900" :
    "bg-red-50 border-red-400 text-red-900";
  const recIcon = deploymentReady ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> :
    deploymentConditional ? <AlertTriangle className="w-6 h-6 text-amber-600" /> :
    <XCircle className="w-6 h-6 text-red-600" />;

  return (
    <div className="space-y-5">
      {/* Overall verdict */}
      <Card className={`border-2 ${recColor}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {recIcon}
            <div>
              <p className="text-lg font-black">{recommendation}</p>
              <p className="text-sm mt-1">Greenfield LGA Pilot — {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className="text-xs mt-1 opacity-80">
                {passedCriteria}/{criteria.length} acceptance criteria met · {criticalIssues.length} critical · {highIssues.length} high · {mediumIssues.length} medium issues
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance criteria table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">Acceptance Criteria Assessment ({criteria.length} criteria)</CardTitle>
            <Badge variant="outline" className={passedCriteria === criteria.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {passedCriteria} / {criteria.length} PASS
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 w-14">ID</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Acceptance Criterion</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Result</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Value</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Supporting Evidence</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${!c.ok ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 font-mono text-gray-500">{c.id}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{c.label}</td>
                    <td className="px-3 py-2 text-center">{c.ok
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" />PASS</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800"><XCircle className="w-3 h-3" />FAIL</span>}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-gray-700">{c.value}</td>
                    <td className="px-3 py-2 text-gray-600">{c.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      <Card className="border-red-200">
        <CardHeader className="pb-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <CardTitle className="text-sm font-bold text-red-800">Critical Issues ({criticalIssues.length}) — Must Resolve Before Deployment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <IssueTable issues={issues} severity="critical" />
        </CardContent>
      </Card>

      {/* High-risk Issues */}
      <Card className="border-orange-200">
        <CardHeader className="pb-2 bg-orange-50 border-b border-orange-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <CardTitle className="text-sm font-bold text-orange-800">High-Risk Issues ({highIssues.length}) — Resolve Before Full Scale-Up</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <IssueTable issues={issues} severity="high" />
        </CardContent>
      </Card>

      {/* Medium Issues */}
      {mediumIssues.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-bold text-amber-800">Medium Issues ({mediumIssues.length}) — Recommended Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <IssueTable issues={issues} severity="medium" />
          </CardContent>
        </Card>
      )}

      {/* Corrective Actions Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Recommended Corrective Actions (Priority Order)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 text-xs">
                <span className={`flex-shrink-0 w-16 text-center px-1.5 py-0.5 rounded font-bold text-[10px] ${issue.severity === "critical" ? "bg-red-100 text-red-800" : issue.severity === "high" ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800"}`}>
                  [{issue.id}]
                </span>
                <span className="text-gray-800"><span className="font-semibold">{issue.description}:</span> {issue.corrective}</span>
              </li>
            ))}
            {issues.length === 0 && <li className="text-xs text-emerald-700 font-medium">✓ No corrective actions required — system is deployment ready.</li>}
          </ol>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">All findings from live database. Generated {new Date().toLocaleString()}.</p>
    </div>
  );
}