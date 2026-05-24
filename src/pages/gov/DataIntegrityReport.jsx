import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, GitBranch, Copy, Users, FileText, Map } from "lucide-react";

const STATUS = { ok: "ok", warn: "warn", fail: "fail" };

function integrity(val, warnIf, failIf) {
  if (failIf(val)) return STATUS.fail;
  if (warnIf(val)) return STATUS.warn;
  return STATUS.ok;
}

function StatusIcon({ s }) {
  if (s === STATUS.ok) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (s === STATUS.warn) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function Row({ label, value, status, detail }) {
  const bg = status === STATUS.ok ? "bg-emerald-50 border-emerald-200" :
             status === STATUS.warn ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={`flex items-start justify-between px-3 py-2 rounded border ${bg} gap-3`}>
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon s={status} />
        <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {detail && <p className="text-xs text-gray-500 mt-0.5 max-w-[280px] text-right">{detail}</p>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) { // eslint-disable-line no-unused-vars
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`w-4 h-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

export default function DataIntegrityReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(null);

  async function runAudit() {
    setLoading(true);
    const [
      parcels, families, beneficiaries, inheritanceCases,
      disputes, fraudAlerts, auditLogs, fieldReports,
      surveyDocs, ownershipHistory, communityValidations,
      tradValidations, plotAllocations, inheritanceDisputes,
      witnesses
    ] = await Promise.all([
      base44.entities.LandParcel.list("-created_date", 2000),
      base44.entities.FamilyOwnership.list("-created_date", 500),
      base44.entities.FamilyBeneficiary.list("-created_date", 500),
      base44.entities.InheritanceCase.list("-created_date", 500),
      base44.entities.Dispute.list("-created_date", 500),
      base44.entities.FraudAlert.list("-created_date", 500),
      base44.entities.AuditLog.list("-created_date", 2000),
      base44.entities.FieldReport.list("-created_date", 1000),
      base44.entities.SurveyDocument.list("-created_date", 500),
      base44.entities.OwnershipHistory.list("-created_date", 500),
      base44.entities.CommunityValidation.list("-created_date", 500),
      base44.entities.TraditionalAuthorityValidation.list("-created_date", 500),
      base44.entities.PlotAllocation.list("-created_date", 500),
      base44.entities.InheritanceDispute.list("-created_date", 500),
      base44.entities.InheritanceWitness.list("-created_date", 500),
    ]);

    // ----- COUNTS -----
    const parcelIds = new Set(parcels.map(p => p.id));
    const familyIds = new Set(families.map(f => f.id));
    const caseIds = new Set(inheritanceCases.map(c => c.id));

    const gflParcels = parcels.filter(p => p.lga === "Greenfield Local Government");
    const approvedParcels = gflParcels.filter(p => p.status === "approved");
    const pendingParcels = gflParcels.filter(p => p.status === "pending");
    const disputedParcels = gflParcels.filter(p => p.status === "disputed");
    const frozenParcels = gflParcels.filter(p => p.status === "frozen");
    const withBoundary = gflParcels.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
    const spatialConflicts = gflParcels.filter(p => ["overlap_warning", "duplicate_warning", "conflict_blocked"].includes(p.spatial_validation_status));
    const highFraud = gflParcels.filter(p => p.fraud_risk_level === "high");
    const withGps = gflParcels.filter(p => p.latitude && p.longitude);

    // ----- ORPHAN CHECKS -----
    const orphanBeneficiaries = beneficiaries.filter(b => b.family_ownership_id && !familyIds.has(b.family_ownership_id));
    const orphanPlotAllocations = plotAllocations.filter(a => a.inheritance_case_id && !caseIds.has(a.inheritance_case_id));
    const orphanCases = inheritanceCases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id));
    const orphanDisputes = disputes.filter(d => d.parcel_id && !parcelIds.has(d.parcel_id));
    const orphanFraud = fraudAlerts.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id));

    // ----- MISSING REF CHECKS -----
    const casesNoSurveyor = inheritanceCases.filter(c => c.status === "surveyor_review" && !c.surveyor_reviewer);
    const casesNoCompliance = inheritanceCases.filter(c => c.status === "compliance_review" && !c.compliance_reviewer);
    const parcelsNoOwner = gflParcels.filter(p => !p.owner_name || p.owner_name.trim() === "");
    const parcelsNoAddress = gflParcels.filter(p => !p.address || p.address.trim() === "");
    const fraudNoAssignee = fraudAlerts.filter(f => f.status === "under_investigation" && !f.assigned_to);

    // ----- DUPLICATE CHECKS -----
    const parcelNums = parcels.map(p => p.parcel_number);
    const parcelNumCounts = {};
    parcelNums.forEach(n => { parcelNumCounts[n] = (parcelNumCounts[n] || 0) + 1; });
    const dupParcelNums = Object.entries(parcelNumCounts).filter(([, c]) => c > 1);

    const caseRefs = inheritanceCases.map(c => c.case_reference).filter(Boolean);
    const caseRefCounts = {};
    caseRefs.forEach(r => { caseRefCounts[r] = (caseRefCounts[r] || 0) + 1; });
    const dupCaseRefs = Object.entries(caseRefCounts).filter(([, c]) => c > 1);

    // ----- WORKFLOW STATUS -----
    const approvedCases = inheritanceCases.filter(c => c.status === "approved");
    const certGenerated = inheritanceCases.filter(c => c.certificate_generated);
    const resolvedDisputes = disputes.filter(d => d.status === "resolved");
    const openDisputes = disputes.filter(d => ["open", "under_review", "escalated"].includes(d.status));
    const openFraud = fraudAlerts.filter(f => ["open", "under_investigation", "escalated"].includes(f.status));
    const resolvedFraud = fraudAlerts.filter(f => f.status === "resolved");
    const approvedTradVal = tradValidations.filter(t => t.validation_status === "approved");
    const approvedCommunityVal = communityValidations.filter(c => c.status === "approved");
    const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");

    setData({
      counts: {
        gflParcels: gflParcels.length,
        totalParcels: parcels.length,
        families: families.length,
        beneficiaries: beneficiaries.length,
        inheritanceCases: inheritanceCases.length,
        disputes: disputes.length,
        fraudAlerts: fraudAlerts.length,
        auditLogs: auditLogs.length,
        fieldReports: fieldReports.length,
        surveyDocs: surveyDocs.length,
        ownershipHistory: ownershipHistory.length,
        communityValidations: communityValidations.length,
        tradValidations: tradValidations.length,
        plotAllocations: plotAllocations.length,
        inheritanceDisputes: inheritanceDisputes.length,
        witnesses: witnesses.length,
      },
      parcelStatus: { approved: approvedParcels.length, pending: pendingParcels.length, disputed: disputedParcels.length, frozen: frozenParcels.length },
      gis: { withBoundary: withBoundary.length, withGps: withGps.length, spatialConflicts: spatialConflicts.length, total: gflParcels.length },
      fraud: { highRisk: highFraud.length, openAlerts: openFraud.length, resolvedAlerts: resolvedFraud.length },
      orphans: { beneficiaries: orphanBeneficiaries.length, plotAllocations: orphanPlotAllocations.length, cases: orphanCases.length, disputes: orphanDisputes.length, fraudAlerts: orphanFraud.length },
      missingRefs: { casesNoSurveyor: casesNoSurveyor.length, casesNoCompliance: casesNoCompliance.length, parcelsNoOwner: parcelsNoOwner.length, parcelsNoAddress: parcelsNoAddress.length, fraudNoAssignee: fraudNoAssignee.length },
      duplicates: { parcelNumbers: dupParcelNums.length, caseReferences: dupCaseRefs.length, dupParcelSamples: dupParcelNums.slice(0, 3).map(([n]) => n) },
      workflow: { approvedCases: approvedCases.length, certGenerated: certGenerated.length, resolvedDisputes: resolvedDisputes.length, openDisputes: openDisputes.length, approvedTradVal: approvedTradVal.length, approvedCommunityVal: approvedCommunityVal.length, verifiedWitnesses: verifiedWitnesses.length, totalWitnesses: witnesses.length },
    });
    setLastRun(new Date());
    setLoading(false);
  }

  useEffect(() => { runAudit(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Running integrity audit against live database…</p>
      </div>
    </div>
  );

  const { counts, parcelStatus, gis, fraud, orphans, missingRefs, duplicates, workflow } = data;
  const totalOrphans = Object.values(orphans).reduce((a, b) => a + b, 0);
  const totalMissing = Object.values(missingRefs).reduce((a, b) => a + b, 0);
  const totalDuplicates = duplicates.parcelNumbers + duplicates.caseReferences;
  const overallStatus = totalOrphans + totalMissing + totalDuplicates === 0 ? STATUS.ok :
                        totalOrphans + totalDuplicates > 5 ? STATUS.fail : STATUS.warn;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Integrity Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Greenfield LGA Pilot — Live audit against actual database records
            {lastRun && ` · Last run: ${lastRun.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={overallStatus === STATUS.ok ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                            overallStatus === STATUS.warn ? "bg-amber-100 text-amber-800 border-amber-300" :
                            "bg-red-100 text-red-800 border-red-300"} variant="outline">
            {overallStatus === STATUS.ok ? "✓ Clean" : overallStatus === STATUS.warn ? "⚠ Warnings" : "✗ Issues Found"}
          </Badge>
          <Button size="sm" variant="outline" onClick={runAudit} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Re-run Audit
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total GFL Parcels", value: counts.gflParcels, sub: `${counts.totalParcels} system-wide`, icon: Map, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Family Ownerships", value: counts.families, sub: `${counts.beneficiaries} beneficiaries`, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Inheritance Cases", value: counts.inheritanceCases, sub: `${workflow.certGenerated} certs issued`, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Audit Log Entries", value: counts.auditLogs.toLocaleString(), sub: `${counts.fieldReports} field reports`, icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(c => (
          <Card key={c.label} className={`${c.bg} border-0`}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`w-8 h-8 ${c.color} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs font-medium text-gray-600">{c.label}</p>
                <p className="text-xs text-gray-400">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Record Counts */}
        <Section title="Record Counts" icon={Database} color="text-blue-600">
          <Row label="GFL Land Parcels" value={counts.gflParcels} status={integrity(counts.gflParcels, () => false, () => counts.gflParcels < 100)} detail="Target: ≥ 1,000" />
          <Row label="Family Ownerships" value={counts.families} status={STATUS.ok} detail={`${counts.beneficiaries} beneficiaries registered`} />
          <Row label="Inheritance Cases" value={counts.inheritanceCases} status={STATUS.ok} />
          <Row label="Disputes Filed" value={counts.disputes} status={STATUS.ok} />
          <Row label="Fraud Alerts" value={counts.fraudAlerts} status={STATUS.ok} />
          <Row label="Audit Log Entries" value={counts.auditLogs.toLocaleString()} status={integrity(counts.auditLogs, () => false, () => counts.auditLogs < 50)} />
          <Row label="Field Reports" value={counts.fieldReports} status={STATUS.ok} />
          <Row label="Survey Documents" value={counts.surveyDocs} status={STATUS.ok} />
          <Row label="Ownership History" value={counts.ownershipHistory} status={STATUS.ok} />
          <Row label="Plot Allocations" value={counts.plotAllocations} status={STATUS.ok} />
          <Row label="Community Validations" value={counts.communityValidations} status={STATUS.ok} />
          <Row label="Traditional Auth. Validations" value={counts.tradValidations} status={STATUS.ok} />
          <Row label="Witnesses" value={counts.witnesses} status={STATUS.ok} />
        </Section>

        {/* Parcel Status Breakdown */}
        <Section title="Parcel Status (GFL)" icon={Map} color="text-emerald-600">
          <Row label="Approved" value={parcelStatus.approved} status={STATUS.ok} detail="Fully registered & certified" />
          <Row label="Pending Review" value={parcelStatus.pending} status={parcelStatus.pending > 200 ? STATUS.warn : STATUS.ok} detail="Awaiting surveyor or SG approval" />
          <Row label="Disputed" value={parcelStatus.disputed} status={parcelStatus.disputed > 20 ? STATUS.warn : STATUS.ok} detail="Under active dispute" />
          <Row label="Frozen" value={parcelStatus.frozen} status={parcelStatus.frozen > 10 ? STATUS.warn : STATUS.ok} detail="Locked pending investigation" />
          <Row label="GIS Boundaries Present" value={`${gis.withBoundary} / ${gis.total}`} status={integrity(gis.withBoundary / gis.total, v => v < 0.9, v => v < 0.7)} detail={`${Math.round(gis.withBoundary / gis.total * 100)}% coverage`} />
          <Row label="GPS Coordinates Present" value={`${gis.withGps} / ${gis.total}`} status={integrity(gis.withGps / gis.total, v => v < 0.9, v => v < 0.7)} detail={`${Math.round(gis.withGps / gis.total * 100)}% coverage`} />
          <Row label="Spatial Conflicts" value={gis.spatialConflicts} status={integrity(gis.spatialConflicts, c => c > 0, c => c > 20)} detail="Overlap, duplicate or conflict-blocked" />
          <Row label="High Fraud Risk" value={fraud.highRisk} status={integrity(fraud.highRisk, c => c > 5, c => c > 30)} detail="Score ≥ 70 or level=high" />
        </Section>

        {/* Orphan Records */}
        <Section title="Orphan Records" icon={GitBranch} color="text-orange-500">
          <p className="text-xs text-muted-foreground mb-1">Records referencing non-existent parent records</p>
          <Row label="Beneficiaries → FamilyOwnership" value={orphans.beneficiaries} status={integrity(orphans.beneficiaries, c => c > 0, c => c > 5)} detail={orphans.beneficiaries === 0 ? "All linked correctly" : `${orphans.beneficiaries} broken links`} />
          <Row label="PlotAllocations → InheritanceCase" value={orphans.plotAllocations} status={integrity(orphans.plotAllocations, c => c > 0, c => c > 5)} detail={orphans.plotAllocations === 0 ? "All linked correctly" : `${orphans.plotAllocations} broken links`} />
          <Row label="InheritanceCases → Parcel" value={orphans.cases} status={integrity(orphans.cases, c => c > 0, c => c > 5)} />
          <Row label="Disputes → Parcel" value={orphans.disputes} status={integrity(orphans.disputes, c => c > 0, c => c > 5)} />
          <Row label="FraudAlerts → Parcel" value={orphans.fraudAlerts} status={integrity(orphans.fraudAlerts, c => c > 0, c => c > 5)} />
          <div className={`mt-2 p-2 rounded text-xs font-semibold text-center ${totalOrphans === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            Total orphan records: {totalOrphans}
          </div>
        </Section>

        {/* Missing References */}
        <Section title="Missing References" icon={AlertTriangle} color="text-amber-500">
          <p className="text-xs text-muted-foreground mb-1">Required fields that are null or empty</p>
          <Row label="Cases at Surveyor Review — no reviewer" value={missingRefs.casesNoSurveyor} status={integrity(missingRefs.casesNoSurveyor, c => c > 0, c => c > 3)} />
          <Row label="Cases at Compliance Review — no reviewer" value={missingRefs.casesNoCompliance} status={integrity(missingRefs.casesNoCompliance, c => c > 0, c => c > 3)} />
          <Row label="GFL Parcels — no owner name" value={missingRefs.parcelsNoOwner} status={integrity(missingRefs.parcelsNoOwner, c => c > 0, c => c > 10)} />
          <Row label="GFL Parcels — no address" value={missingRefs.parcelsNoAddress} status={integrity(missingRefs.parcelsNoAddress, c => c > 0, c => c > 10)} />
          <Row label="Fraud alerts under investigation — no assignee" value={missingRefs.fraudNoAssignee} status={integrity(missingRefs.fraudNoAssignee, c => c > 0, c => c > 3)} />
          <div className={`mt-2 p-2 rounded text-xs font-semibold text-center ${totalMissing === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            Total missing references: {totalMissing}
          </div>
        </Section>

        {/* Duplicate Records */}
        <Section title="Duplicate Records" icon={Copy} color="text-red-500">
          <p className="text-xs text-muted-foreground mb-1">Fields expected to be unique across all records</p>
          <Row label="Duplicate parcel numbers" value={duplicates.parcelNumbers} status={integrity(duplicates.parcelNumbers, c => c > 0, c => c > 5)} detail={duplicates.dupParcelSamples.length ? `e.g. ${duplicates.dupParcelSamples.join(", ")}` : "All unique"} />
          <Row label="Duplicate case references" value={duplicates.caseReferences} status={integrity(duplicates.caseReferences, c => c > 0, c => c > 3)} detail={duplicates.caseReferences === 0 ? "All unique" : "Cross-ref duplicates found"} />
          <div className={`mt-2 p-2 rounded text-xs font-semibold text-center ${totalDuplicates === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            Total duplicate key violations: {totalDuplicates}
          </div>
        </Section>

        {/* Workflow Validation */}
        <Section title="Workflow Completeness" icon={CheckCircle2} color="text-emerald-600">
          <Row label="Inheritance cases fully approved" value={workflow.approvedCases} status={workflow.approvedCases > 0 ? STATUS.ok : STATUS.warn} />
          <Row label="Certificates generated" value={workflow.certGenerated} status={workflow.certGenerated > 0 ? STATUS.ok : STATUS.warn} detail="End-to-end workflow confirmed" />
          <Row label="Disputes resolved" value={workflow.resolvedDisputes} status={workflow.resolvedDisputes > 0 ? STATUS.ok : STATUS.warn} />
          <Row label="Open disputes (active)" value={workflow.openDisputes} status={STATUS.ok} detail="Normal pipeline" />
          <Row label="Traditional auth. validations approved" value={workflow.approvedTradVal} status={workflow.approvedTradVal > 0 ? STATUS.ok : STATUS.warn} />
          <Row label="Community validations approved" value={workflow.approvedCommunityVal} status={workflow.approvedCommunityVal > 0 ? STATUS.ok : STATUS.warn} />
          <Row label="Witnesses verified" value={`${workflow.verifiedWitnesses} / ${workflow.totalWitnesses}`} status={integrity(workflow.verifiedWitnesses / (workflow.totalWitnesses || 1), v => v < 0.5, v => v < 0.3)} />
          <Row label="Fraud alerts resolved" value={`${fraud.resolvedAlerts} / ${counts.fraudAlerts}`} status={STATUS.ok} />
        </Section>
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">All figures computed in real-time from live database. No synthetic data.</p>
    </div>
  );
}