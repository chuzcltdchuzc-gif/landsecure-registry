import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Download } from "lucide-react";

function computeAllFindings(data) {
  const { parcels, families, beneficiaries, cases, disputes, fraud, audits,
          fieldReports, surveyDocs, ownershipHistory, communityVal, tradVal,
          plotAllocations, witnesses } = data;

  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));
  const caseIds = new Set(cases.map(c => c.id));
  const beneficiaryIds = new Set(beneficiaries.map(b => b.id));

  const findings = [];

  function add(category, label, ok, warn, evidence, recommendation) {
    const severity = !ok && !warn ? "critical" : !ok ? "high" : "ok";
    findings.push({ category, label, severity, ok, warn, evidence, recommendation });
  }

  // Chain of title
  const histParcelIds = new Set(ownershipHistory.map(o => o.parcel_id));
  const approved = gfl.filter(p => p.status === "approved");
  const approvedNoHistory = approved.filter(p => !histParcelIds.has(p.id));
  const brokenCases = cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id));
  const missingApprover = cases.filter(c => c.status === "approved" && !c.final_approved_by);
  const parcelNumMap = {};
  parcels.forEach(p => { parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || 0) + 1; });
  const dupNumbers = Object.entries(parcelNumMap).filter(([, c]) => c > 1);

  add("Chain of Title", "Approved parcels with ownership history", approvedNoHistory.length === 0, approvedNoHistory.length < 10, `${approvedNoHistory.length} approved parcels lack any ownership history record`, "Backfill ownership history for all approved parcels before pilot launch");
  add("Chain of Title", "Broken inheritance chain references", brokenCases.length === 0, brokenCases.length < 3, `${brokenCases.length} inheritance cases link to non-existent family ownership records`, "Resolve orphan inheritance cases — either recreate the FamilyOwnership record or delete the case");
  add("Chain of Title", "Duplicate parcel numbers", dupNumbers.length === 0, false, `${dupNumbers.length} parcel number(s) appear on multiple registry records`, "Deduplicate all parcel numbers — enforce uniqueness constraint before launch");
  add("Chain of Title", "Approved cases with approver recorded", missingApprover.length === 0, missingApprover.length < 3, `${missingApprover.length} approved cases missing final_approved_by field`, "Ensure all approval actions are attributed to a specific officer");

  // Customary ownership
  const shareByFamily = {};
  beneficiaries.filter(b => !b.is_deleted).forEach(b => { shareByFamily[b.family_ownership_id] = (shareByFamily[b.family_ownership_id] || 0) + (b.percentage_share || 0); });
  const shareErrors = Object.values(shareByFamily).filter(t => Math.abs(t - 100) > 0.01).length;
  const benefIds = new Set(beneficiaries.map(b => b.id));
  const brokenSuccessors = beneficiaries.filter(b => b.parent_beneficiary_id && !benefIds.has(b.parent_beneficiary_id));
  const benefByNin = {};
  beneficiaries.filter(b => b.national_id).forEach(b => { benefByNin[b.national_id] = (benefByNin[b.national_id] || []).concat(b); });
  const dupNin = Object.values(benefByNin).filter(list => list.length > 1);
  const tradApproved = tradVal.filter(t => t.validation_status === "approved");

  add("Customary Ownership", "Beneficiary share totals = 100%", shareErrors === 0, shareErrors < 3, `${shareErrors} family ownership groups have beneficiary shares not totalling 100%`, "Correct share allocations — shares must equal exactly 100% per family");
  add("Customary Ownership", "Successor chain integrity", brokenSuccessors.length === 0, brokenSuccessors.length < 3, `${brokenSuccessors.length} beneficiaries reference a non-existent parent beneficiary`, "Repair broken successor chains before handling deceased-estate cases");
  add("Customary Ownership", "Duplicate beneficiary national IDs", dupNin.length === 0, dupNin.length < 2, `${dupNin.length} national IDs shared across multiple beneficiary records`, "Investigate and deduplicate — possible double-claim fraud attempt");
  add("Customary Ownership", "Traditional authority approvals present", tradApproved.length > 0, false, `${tradApproved.length} traditional authority approvals recorded`, tradApproved.length === 0 ? "Obtain at least one traditional authority approval before pilot" : "");

  // Survey accuracy
  const surveyParcelIds = new Set(surveyDocs.map(s => s.parcel_id));
  const approvedNoDoc = approved.filter(p => !surveyParcelIds.has(p.id));
  const criticalAlerts = fraud.filter(f => f.severity === "critical" && f.status !== "resolved");
  const overlapFlags = gfl.filter(p => p.spatial_validation_status === "overlap_warning");
  const conflictBlocked = gfl.filter(p => p.spatial_validation_status === "conflict_blocked");

  add("Survey Accuracy", "Approved parcels with survey document", approvedNoDoc.length === 0, approvedNoDoc.length < 10, `${approvedNoDoc.length} approved parcels have no survey document on record`, "Require mandatory survey document upload before parcel approval");
  add("Survey Accuracy", "Boundary overlap warnings resolved", overlapFlags.length === 0, overlapFlags.length < 5, `${overlapFlags.length} parcels carry overlap_warning spatial status`, "Resolve all overlap warnings before pilot — ambiguous boundaries cannot be registered");
  add("Survey Accuracy", "Conflict-blocked parcels cleared", conflictBlocked.length === 0, false, `${conflictBlocked.length} parcels are conflict_blocked and cannot be processed`, "Clear all conflict_blocked parcels — these are registration blockers");

  // Fraud
  const surveyOrphan = surveyDocs.filter(s => s.parcel_id && !parcelIds.has(s.parcel_id));
  const dupGpsMap = {};
  gfl.filter(p => p.latitude && p.longitude).forEach(p => { const k = `${Math.round(p.latitude * 10000)},${Math.round(p.longitude * 10000)}`; dupGpsMap[k] = (dupGpsMap[k] || 0) + 1; });
  const dupGpsCount = Object.values(dupGpsMap).filter(c => c > 1).length;

  add("Fraud Simulation", "No critical fraud alerts open", criticalAlerts.length === 0, false, `${criticalAlerts.length} critical severity fraud alerts remain unresolved`, "Resolve all critical fraud alerts before pilot deployment");
  add("Fraud Simulation", "Survey docs reference valid parcels", surveyOrphan.length === 0, surveyOrphan.length < 2, `${surveyOrphan.length} survey documents reference non-existent parcels`, "Remove or relink orphan survey documents");
  add("Fraud Simulation", "No duplicate GPS locations", dupGpsCount === 0, dupGpsCount < 3, `${dupGpsCount} GPS coordinates used by multiple parcels`, "Investigate duplicate GPS — may indicate coordinate copying or fraud");

  // Field operations
  const offlineReports = fieldReports.filter(r => r.network_status === "offline" || r.network_status === "synced_offline");
  const unsynced = fieldReports.filter(r => r.network_status === "offline");
  const uniqueDevices = new Set(fieldReports.map(r => r.device_identifier).filter(Boolean));
  const gpsReports = fieldReports.filter(r => r.latitude && r.longitude);
  const fullyComplete = fieldReports.filter(r => r.description && r.report_type && r.agent_email && r.parcel_id && r.latitude && r.longitude);
  const completenessScore = Math.round(fullyComplete.length / Math.max(fieldReports.length, 1) * 100);

  add("Field Operations", "Offline capture demonstrated", offlineReports.length > 0, false, `${offlineReports.length} offline reports captured · ${unsynced.length} not yet synced`, offlineReports.length === 0 ? "Demonstrate offline capture before field deployment" : "");
  add("Field Operations", "GPS coverage ≥ 90%", gpsReports.length / Math.max(fieldReports.length, 1) >= 0.9, gpsReports.length / Math.max(fieldReports.length, 1) >= 0.7, `${Math.round(gpsReports.length / Math.max(fieldReports.length, 1) * 100)}% of field reports have GPS`, "Ensure all field agents capture GPS on every report");
  add("Field Operations", "Field report completeness ≥ 90%", completenessScore >= 90, completenessScore >= 70, `${completenessScore}% of field reports are fully complete`, completenessScore < 90 ? "Brief field agents on required fields — target 100% completeness" : "");
  add("Field Operations", "Multiple field devices registered", uniqueDevices.size >= 3, uniqueDevices.size >= 1, `${uniqueDevices.size} distinct devices have submitted field reports`, uniqueDevices.size < 3 ? "Register and test ≥3 field devices before pilot launch" : "");

  // System readiness
  const auditTotal = audits.length;
  const communityApproved = communityVal.filter(c => c.status === "approved");
  const certCases = cases.filter(c => c.certificate_generated);

  add("System Readiness", "Audit log ≥ 100 entries", auditTotal >= 100, auditTotal >= 50, `${auditTotal} audit log entries present`, auditTotal < 100 ? "Audit log volume insufficient — run more system operations to build history" : "");
  add("System Readiness", "Community validation workflow complete", communityApproved.length > 0, false, `${communityApproved.length} community validations approved end-to-end`, communityApproved.length === 0 ? "Complete at least one community validation workflow before pilot" : "");
  add("System Readiness", "Certificate generation demonstrated", certCases.length > 0, false, `${certCases.length} inheritance certificates generated`, certCases.length === 0 ? "Test certificate generation — this is required for inheritance completion" : "");

  return findings;
}

function buildAcceptanceReportText(data, findings, timestamp) {
  const critical = findings.filter(f => f.severity === "critical");
  const high = findings.filter(f => f.severity === "high");
  const passed = findings.filter(f => f.ok);
  const score = Math.round(passed.length / findings.length * 100);
  const recommendation = score >= 85 && critical.length === 0 ? "APPROVED FOR CONTROLLED PILOT DEPLOYMENT"
    : score >= 70 && critical.length === 0 ? "CONDITIONAL APPROVAL — resolve high-risk items first"
    : "NOT APPROVED — resolve critical issues before pilot";

  let out = `PILOT ACCEPTANCE TESTING REPORT\nGreenfield LGA Land Registry — Controlled Deployment Assessment\nGenerated: ${timestamp}\n${"=".repeat(70)}\n\n`;
  out += `OVERALL ASSESSMENT: ${recommendation}\n`;
  out += `Score: ${score}%  |  Passed: ${passed.length}/${findings.length}  |  Critical: ${critical.length}  |  High Risk: ${high.length}\n\n`;
  out += `${"=".repeat(70)}\nCRITICAL ISSUES (must resolve before deployment)\n${"-".repeat(60)}\n`;
  if (critical.length === 0) out += "  None identified.\n";
  critical.forEach((f, i) => { out += `${i + 1}. [${f.category}] ${f.label}\n   Evidence: ${f.evidence}\n   Action: ${f.recommendation}\n\n`; });
  out += `\n${"=".repeat(70)}\nHIGH-RISK ISSUES (recommended to resolve before deployment)\n${"-".repeat(60)}\n`;
  if (high.length === 0) out += "  None identified.\n";
  high.forEach((f, i) => { out += `${i + 1}. [${f.category}] ${f.label}\n   Evidence: ${f.evidence}\n   Action: ${f.recommendation}\n\n`; });
  out += `\n${"=".repeat(70)}\nFULL FINDINGS BY CATEGORY\n${"-".repeat(60)}\n`;
  const categories = [...new Set(findings.map(f => f.category))];
  categories.forEach(cat => {
    out += `\n## ${cat.toUpperCase()}\n`;
    findings.filter(f => f.category === cat).forEach((f, i) => {
      const status = f.ok ? "PASS" : f.severity === "critical" ? "CRITICAL" : "HIGH";
      out += `  ${i + 1}. [${status}] ${f.label}\n     ${f.evidence}\n`;
      if (f.recommendation) out += `     → ${f.recommendation}\n`;
    });
  });
  return out;
}

export default function AcceptanceReportTab({ data, lastRun }) {
  const findings = computeAllFindings(data);
  const critical = findings.filter(f => f.severity === "critical");
  const high = findings.filter(f => f.severity === "high");
  const passed = findings.filter(f => f.ok);
  const score = Math.round(passed.length / findings.length * 100);

  const recommendation = score >= 85 && critical.length === 0
    ? { label: "APPROVED FOR CONTROLLED PILOT DEPLOYMENT", color: "bg-emerald-100 text-emerald-900 border-emerald-400", icon: CheckCircle2, iconColor: "text-emerald-600" }
    : score >= 70 && critical.length === 0
    ? { label: "CONDITIONAL APPROVAL — resolve high-risk items first", color: "bg-amber-100 text-amber-900 border-amber-400", icon: AlertTriangle, iconColor: "text-amber-600" }
    : { label: "NOT APPROVED FOR PILOT — resolve critical issues first", color: "bg-red-100 text-red-900 border-red-400", icon: XCircle, iconColor: "text-red-600" };

  const Icon = recommendation.icon;

  function handleDownload() {
    const timestamp = lastRun?.toLocaleString() ?? new Date().toLocaleString();
    const text = buildAcceptanceReportText(data, findings, timestamp);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot_acceptance_report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const categories = [...new Set(findings.map(f => f.category))];

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <Card className={`border-2 ${recommendation.color}`}>
        <CardContent className="p-5 flex items-center gap-4">
          <Icon className={`w-10 h-10 flex-shrink-0 ${recommendation.iconColor}`} />
          <div className="flex-1">
            <p className="text-lg font-black text-gray-900">{recommendation.label}</p>
            <p className="text-sm text-gray-700 mt-1">Greenfield LGA Controlled Pilot — 1,000 parcel capacity assessment</p>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-50 flex-shrink-0">
            <Download className="w-4 h-4" /> Download Report
          </button>
        </CardContent>
      </Card>

      {/* Score grid */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className={`text-3xl font-black ${score >= 85 ? "text-emerald-700" : score >= 70 ? "text-amber-600" : "text-red-600"}`}>{score}%</p><p className="text-xs text-muted-foreground mt-0.5">Overall Score</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-black text-emerald-700">{passed.length}</p><p className="text-xs text-muted-foreground mt-0.5">Checks Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className={`text-3xl font-black ${critical.length > 0 ? "text-red-600" : "text-emerald-700"}`}>{critical.length}</p><p className="text-xs text-muted-foreground mt-0.5">Critical Issues</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className={`text-3xl font-black ${high.length > 0 ? "text-amber-600" : "text-emerald-700"}`}>{high.length}</p><p className="text-xs text-muted-foreground mt-0.5">High-Risk Issues</p></CardContent></Card>
      </div>

      {/* Critical issues */}
      {critical.length > 0 && (
        <Card className="border-2 border-red-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4" />Critical Issues — Must Resolve Before Deployment ({critical.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {critical.map((f, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded-full">{f.category}</span><span className="text-sm font-bold text-gray-900">{f.label}</span></div>
                <p className="text-xs text-red-800">Evidence: {f.evidence}</p>
                {f.recommendation && <p className="text-xs font-semibold text-red-900">→ Action: {f.recommendation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High risk issues */}
      {high.length > 0 && (
        <Card className="border-2 border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />High-Risk Issues — Recommended Actions ({high.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {high.map((f, i) => (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">{f.category}</span><span className="text-sm font-bold text-gray-900">{f.label}</span></div>
                <p className="text-xs text-amber-800">Evidence: {f.evidence}</p>
                {f.recommendation && <p className="text-xs font-semibold text-amber-900">→ Action: {f.recommendation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Full findings table by category */}
      {categories.map(cat => {
        const catFindings = findings.filter(f => f.category === cat);
        return (
          <Card key={cat} className="overflow-hidden">
            <CardHeader className="pb-2 bg-gray-50">
              <CardTitle className="text-sm font-bold">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Check</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600 w-20">Result</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Evidence</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catFindings.map((f, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${f.severity === "critical" ? "bg-red-50" : f.severity === "high" ? "bg-amber-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-3 py-2 font-medium text-gray-800">{f.label}</td>
                        <td className="px-3 py-2 text-center">
                          {f.ok
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" />PASS</span>
                            : f.severity === "critical"
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800"><XCircle className="w-3 h-3" />CRITICAL</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" />HIGH</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-[11px]">{f.evidence}</td>
                        <td className="px-3 py-2 text-gray-600 text-[11px] italic">{f.recommendation || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-xs text-center text-muted-foreground pt-2">All findings derived from live platform data. No synthetic metrics. {lastRun && `Generated ${lastRun.toLocaleString()}.`}</p>
    </div>
  );
}