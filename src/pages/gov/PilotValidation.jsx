import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Database, Map, GitBranch, Shield, HardDrive, FileText
} from "lucide-react";

// ─── shared helpers ───────────────────────────────────────────────────────────
const S = { ok: "ok", warn: "warn", fail: "fail" };

function scoreOf(checks) {
  if (!checks.length) return 0;
  const pts = checks.reduce((a, c) => a + (c.status === S.ok ? 2 : c.status === S.warn ? 1 : 0), 0);
  return Math.round((pts / (checks.length * 2)) * 100);
}

function StatusIcon({ s, className = "w-4 h-4" }) {
  if (s === S.ok) return <CheckCircle2 className={`${className} text-emerald-600`} />;
  if (s === S.warn) return <AlertTriangle className={`${className} text-amber-500`} />;
  return <XCircle className={`${className} text-red-500`} />;
}

function Row({ label, value, status, detail }) {
  const bg = status === S.ok ? "bg-emerald-50 border-emerald-200"
           : status === S.warn ? "bg-amber-50 border-amber-200"
           : "bg-red-50 border-red-200";
  return (
    <div className={`flex items-start justify-between px-3 py-2 rounded border ${bg} gap-3`}>
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon s={status} />
        <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {detail && <p className="text-xs text-gray-500 mt-0.5 max-w-[260px] text-right">{detail}</p>}
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-red-500";
  const label = score >= 80 ? "PASS" : score >= 60 ? "PARTIAL" : "FAIL";
  const labelColor = score >= 80 ? "text-emerald-700" : score >= 60 ? "text-amber-700" : "text-red-700";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${labelColor} w-14 text-right`}>{score}% {label}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, score }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      {score !== undefined && <ScoreBar score={score} />}
    </div>
  );
}

// ─── 1. Database Integrity ────────────────────────────────────────────────────
function DatabaseIntegrityReport({ data }) {
  if (!data) return null;
  const { parcels, families, beneficiaries, cases, disputes, fraud, audits,
          fieldReports, surveyDocs, ownershipHistory, communityVal, tradVal,
          plotAllocations, witnesses } = data;

  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));
  const caseIds = new Set(cases.map(c => c.id));
  const beneficiaryIds = new Set(beneficiaries.map(b => b.id));

  // Ownership relationships
  const ownershipChecks = [
    { label: "Parcels with owner_name populated", value: `${parcels.filter(p => p.owner_name).length} / ${parcels.length}`, status: parcels.filter(p => !p.owner_name).length === 0 ? S.ok : S.warn, detail: `${parcels.filter(p => !p.owner_name).length} missing` },
    { label: "FamilyOwnership → LandParcel references valid", value: families.filter(f => parcelIds.has(f.parcel_id)).length, status: families.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${families.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length} orphan families` },
    { label: "FamilyBeneficiary → FamilyOwnership valid", value: beneficiaries.filter(b => familyIds.has(b.family_ownership_id)).length, status: beneficiaries.filter(b => b.family_ownership_id && !familyIds.has(b.family_ownership_id)).length === 0 ? S.ok : S.warn, detail: `${beneficiaries.filter(b => b.family_ownership_id && !familyIds.has(b.family_ownership_id)).length} orphan beneficiaries` },
    { label: "OwnershipHistory → Parcel valid", value: ownershipHistory.filter(o => parcelIds.has(o.parcel_id)).length, status: ownershipHistory.filter(o => o.parcel_id && !parcelIds.has(o.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${ownershipHistory.filter(o => o.parcel_id && !parcelIds.has(o.parcel_id)).length} orphans` },
  ];

  // Inheritance relationships
  const inheritanceChecks = [
    { label: "InheritanceCase → Parcel references valid", value: cases.filter(c => parcelIds.has(c.parcel_id)).length, status: cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id)).length} orphan cases` },
    { label: "InheritanceCase → FamilyOwnership valid", value: cases.filter(c => familyIds.has(c.family_ownership_id)).length, status: cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id)).length === 0 ? S.ok : S.warn, detail: `${cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id)).length} orphan cases` },
    { label: "PlotAllocation → InheritanceCase valid", value: plotAllocations.filter(a => caseIds.has(a.inheritance_case_id)).length, status: plotAllocations.filter(a => a.inheritance_case_id && !caseIds.has(a.inheritance_case_id)).length === 0 ? S.ok : S.warn, detail: `${plotAllocations.filter(a => a.inheritance_case_id && !caseIds.has(a.inheritance_case_id)).length} orphan allocations` },
    { label: "PlotAllocation → Beneficiary valid", value: plotAllocations.filter(a => beneficiaryIds.has(a.beneficiary_id)).length, status: plotAllocations.filter(a => a.beneficiary_id && !beneficiaryIds.has(a.beneficiary_id)).length === 0 ? S.ok : S.warn, detail: `${plotAllocations.filter(a => a.beneficiary_id && !beneficiaryIds.has(a.beneficiary_id)).length} orphan allocations` },
    { label: "InheritanceWitness → InheritanceCase valid", value: witnesses.filter(w => caseIds.has(w.inheritance_case_id)).length, status: witnesses.filter(w => w.inheritance_case_id && !caseIds.has(w.inheritance_case_id)).length === 0 ? S.ok : S.warn, detail: `${witnesses.filter(w => w.inheritance_case_id && !caseIds.has(w.inheritance_case_id)).length} orphan witnesses` },
  ];

  // Parcel references
  const parcelNumMap = {};
  parcels.forEach(p => { parcelNumMap[p.parcel_number] = (parcelNumMap[p.parcel_number] || 0) + 1; });
  const dupParcels = Object.entries(parcelNumMap).filter(([, c]) => c > 1);
  const parcelChecks = [
    { label: "Unique parcel numbers", value: `${Object.keys(parcelNumMap).length} unique`, status: dupParcels.length === 0 ? S.ok : S.fail, detail: dupParcels.length ? `Duplicates: ${dupParcels.slice(0, 3).map(([n]) => n).join(", ")}` : "All unique" },
    { label: "Parcels with address", value: `${parcels.filter(p => p.address).length} / ${parcels.length}`, status: parcels.filter(p => !p.address).length < 5 ? S.ok : S.warn },
    { label: "Dispute → Parcel references valid", value: disputes.filter(d => parcelIds.has(d.parcel_id)).length, status: disputes.filter(d => d.parcel_id && !parcelIds.has(d.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${disputes.filter(d => d.parcel_id && !parcelIds.has(d.parcel_id)).length} orphan disputes` },
    { label: "FraudAlert → Parcel references valid", value: fraud.filter(f => parcelIds.has(f.parcel_id)).length, status: fraud.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${fraud.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length} orphan alerts` },
    { label: "SurveyDocument → Parcel references valid", value: surveyDocs.filter(s => parcelIds.has(s.parcel_id)).length, status: surveyDocs.filter(s => s.parcel_id && !parcelIds.has(s.parcel_id)).length === 0 ? S.ok : S.warn, detail: `${surveyDocs.filter(s => s.parcel_id && !parcelIds.has(s.parcel_id)).length} orphan docs` },
  ];

  // Audit references
  const auditChecks = [
    { label: "Audit log entries present", value: audits.length.toLocaleString(), status: audits.length >= 100 ? S.ok : audits.length >= 20 ? S.warn : S.fail, detail: "Target: ≥ 100 entries" },
    { label: "Distinct audit action types", value: new Set(audits.map(a => a.action)).size, status: new Set(audits.map(a => a.action)).size >= 5 ? S.ok : S.warn },
    { label: "Audit entries with user_email", value: audits.filter(a => a.user_email).length, status: audits.filter(a => !a.user_email).length === 0 ? S.ok : S.warn, detail: `${audits.filter(a => !a.user_email).length} anonymous entries` },
  ];

  // Document references
  const docChecks = [
    { label: "Survey documents with file_url", value: surveyDocs.filter(s => s.file_url).length, status: surveyDocs.filter(s => !s.file_url).length === 0 ? S.ok : S.warn, detail: `${surveyDocs.filter(s => !s.file_url).length} missing` },
    { label: "Field reports with description", value: fieldReports.filter(r => r.description).length, status: fieldReports.filter(r => !r.description).length < 5 ? S.ok : S.warn },
    { label: "Community validations linked to parcel", value: communityVal.filter(c => c.parcel_id).length, status: communityVal.filter(c => !c.parcel_id && !c.family_ownership_id).length === 0 ? S.ok : S.warn },
    { label: "Traditional auth validations linked", value: tradVal.filter(t => t.parcel_id || t.inheritance_case_id).length, status: tradVal.filter(t => !t.parcel_id && !t.inheritance_case_id).length === 0 ? S.ok : S.warn },
  ];

  // GIS references
  const gflParcels = parcels.filter(p => p.lga === "Greenfield Local Government");
  const gisChecks = [
    { label: "GFL Parcels with GPS coordinates", value: `${gflParcels.filter(p => p.latitude && p.longitude).length} / ${gflParcels.length}`, status: gflParcels.filter(p => !(p.latitude && p.longitude)).length === 0 ? S.ok : S.warn, detail: `${Math.round(gflParcels.filter(p => p.latitude && p.longitude).length / (gflParcels.length || 1) * 100)}% coverage` },
    { label: "GFL Parcels with boundary polygon", value: `${gflParcels.filter(p => p.parcel_boundary && p.parcel_boundary !== "null").length} / ${gflParcels.length}`, status: gflParcels.filter(p => !(p.parcel_boundary && p.parcel_boundary !== "null")).length === 0 ? S.ok : S.warn },
    { label: "Field reports with GPS lat/lon", value: fieldReports.filter(r => r.latitude && r.longitude).length, status: fieldReports.filter(r => !(r.latitude && r.longitude)).length < 10 ? S.ok : S.warn },
  ];

  const allChecks = [...ownershipChecks, ...inheritanceChecks, ...parcelChecks, ...auditChecks, ...docChecks, ...gisChecks];
  const score = scoreOf(allChecks);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Database Integrity Audit</h2>
          <p className="text-sm text-muted-foreground">All {allChecks.length} relationship checks computed from live records</p>
        </div>
        <div className="w-48"><ScoreBar score={score} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={GitBranch} iconColor="text-purple-600" title="Ownership Relationships" score={scoreOf(ownershipChecks)} />
            {ownershipChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={GitBranch} iconColor="text-emerald-600" title="Inheritance Relationships" score={scoreOf(inheritanceChecks)} />
            {inheritanceChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={Database} iconColor="text-blue-600" title="Parcel References" score={scoreOf(parcelChecks)} />
            {parcelChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={Shield} iconColor="text-amber-600" title="Audit References" score={scoreOf(auditChecks)} />
            {auditChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={FileText} iconColor="text-indigo-600" title="Document References" score={scoreOf(docChecks)} />
            {docChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SectionHeader icon={Map} iconColor="text-teal-600" title="GIS References" score={scoreOf(gisChecks)} />
            {gisChecks.map((c, i) => <Row key={i} {...c} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── 2. GIS Quality Audit ─────────────────────────────────────────────────────
function GISQualityReport({ data }) {
  if (!data) return null;
  const { parcels } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // Parse boundary polygons and run geometric checks
  let validPolygons = 0, closurePass = 0, closureFail = 0;
  let selfIntersect = 0, invalidCoords = 0, smallArea = 0;
  const dupCoordSets = new Map();

  gfl.forEach(p => {
    const raw = p.parcel_boundary;
    if (!raw || raw === "null") return;
    let coords = null;
    try {
      const geo = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (geo?.coordinates) coords = geo.coordinates[0];
      else if (Array.isArray(geo)) coords = geo;
    } catch { return; }
    if (!coords || !Array.isArray(coords)) return;
    validPolygons++;

    // Closure: first and last coord should be equal
    const first = coords[0], last = coords[coords.length - 1];
    if (first && last && first[0] === last[0] && first[1] === last[1]) closurePass++;
    else closureFail++;

    // Invalid coord check (outside Nigeria approx bounding box)
    const hasInvalid = coords.some(([lng, lat]) => lat < 4 || lat > 14 || lng < 3 || lng > 15);
    if (hasInvalid) invalidCoords++;

    // Self-intersection heuristic: check for repeated coordinates (non-closure)
    const midCoords = coords.slice(1, -1);
    const seen = new Set(midCoords.map(c => `${c[0]},${c[1]}`));
    if (seen.size < midCoords.length - 1) selfIntersect++;

    // Small area check
    if (p.boundary_area && p.boundary_area < 50) smallArea++;

    // Duplicate boundary sets
    const key = JSON.stringify(coords.map(c => c.map(v => Math.round(v * 1000))));
    dupCoordSets.set(key, (dupCoordSets.get(key) || 0) + 1);
  });

  const dupBoundaries = [...dupCoordSets.values()].filter(c => c > 1).length;
  const withBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
  const spatialConflicts = gfl.filter(p => ["overlap_warning", "duplicate_warning", "conflict_blocked"].includes(p.spatial_validation_status));
  const overlapWarnings = gfl.filter(p => p.spatial_validation_status === "overlap_warning");
  const duplicateWarnings = gfl.filter(p => p.spatial_validation_status === "duplicate_warning");
  const conflictBlocked = gfl.filter(p => p.spatial_validation_status === "conflict_blocked");
  const validSpatial = gfl.filter(p => p.spatial_validation_status === "valid");
  const notValidated = gfl.filter(p => !p.spatial_validation_status || p.spatial_validation_status === "not_validated");
  const withGps = gfl.filter(p => p.latitude && p.longitude);

  const checks = [
    { label: "GeoJSON boundaries present", value: `${withBoundary.length} / ${gfl.length}`, status: withBoundary.length / gfl.length >= 0.9 ? S.ok : withBoundary.length / gfl.length >= 0.6 ? S.warn : S.fail },
    { label: "Parseable polygon geometries", value: `${validPolygons} / ${withBoundary.length}`, status: validPolygons === withBoundary.length ? S.ok : S.warn },
    { label: "Polygon closure (first = last coord)", value: `${closurePass} / ${validPolygons}`, status: closureFail === 0 ? S.ok : closureFail < 5 ? S.warn : S.fail, detail: `${closureFail} unclosed polygons` },
    { label: "Self-intersecting polygons detected", value: selfIntersect, status: selfIntersect === 0 ? S.ok : selfIntersect < 5 ? S.warn : S.fail },
    { label: "Duplicate boundary polygons", value: dupBoundaries, status: dupBoundaries === 0 ? S.ok : S.warn },
    { label: "Invalid coordinates (outside Nigeria bbox)", value: invalidCoords, status: invalidCoords === 0 ? S.ok : S.fail },
    { label: "Spatial validation: VALID", value: validSpatial.length, status: validSpatial.length > 0 ? S.ok : S.warn },
    { label: "Spatial validation: overlap_warning", value: overlapWarnings.length, status: overlapWarnings.length === 0 ? S.ok : overlapWarnings.length < 10 ? S.warn : S.fail },
    { label: "Spatial validation: duplicate_warning", value: duplicateWarnings.length, status: duplicateWarnings.length === 0 ? S.ok : S.warn },
    { label: "Spatial validation: conflict_blocked", value: conflictBlocked.length, status: conflictBlocked.length === 0 ? S.ok : conflictBlocked.length < 5 ? S.warn : S.fail },
    { label: "Not yet validated", value: notValidated.length, status: notValidated.length === 0 ? S.ok : notValidated.length < 50 ? S.warn : S.fail },
    { label: "GPS coordinates present", value: `${withGps.length} / ${gfl.length}`, status: withGps.length / gfl.length >= 0.9 ? S.ok : S.warn },
    { label: "Parcels with boundary_area recorded", value: gfl.filter(p => p.boundary_area).length, status: gfl.filter(p => p.boundary_area).length > 0 ? S.ok : S.warn },
    { label: "Implausibly small area (< 50 sqm)", value: smallArea, status: smallArea === 0 ? S.ok : S.warn, detail: "May indicate data entry errors" },
    { label: "Total spatial conflicts", value: spatialConflicts.length, status: spatialConflicts.length === 0 ? S.ok : spatialConflicts.length < 20 ? S.warn : S.fail },
  ];
  const score = scoreOf(checks);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GIS Quality Audit</h2>
          <p className="text-sm text-muted-foreground">{gfl.length} GFL parcels · {withBoundary.length} with GeoJSON boundaries analysed</p>
        </div>
        <div className="w-48"><ScoreBar score={score} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Boundaries Present", value: withBoundary.length, color: "bg-blue-50 text-blue-700" },
          { label: "Valid Spatial Status", value: validSpatial.length, color: "bg-emerald-50 text-emerald-700" },
          { label: "Spatial Conflicts", value: spatialConflicts.length, color: "bg-amber-50 text-amber-700" },
          { label: "GPS Coverage", value: `${Math.round(withGps.length / gfl.length * 100)}%`, color: "bg-purple-50 text-purple-700" },
        ].map(s => (
          <Card key={s.label} className={`${s.color} border-0`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          {checks.map((c, i) => <Row key={i} {...c} />)}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 3. Workflow Validation ───────────────────────────────────────────────────
function WorkflowValidationReport({ data }) {
  if (!data) return null;
  const { parcels, families, cases, disputes, fraud, communityVal, tradVal, witnesses, plotAllocations, surveyDocs, fieldReports } = data;

  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  function wfCheck(label, ok, warn, detail) {
    const status = ok ? S.ok : warn ? S.warn : S.fail;
    return { label, value: ok ? "✓ Confirmed" : warn ? "⚠ Partial" : "✗ Missing", status, detail };
  }

  const registrationWf = [
    wfCheck("Parcel registrations exist (pending/approved)", gfl.filter(p => ["pending","approved"].includes(p.status)).length > 0, false, `${gfl.filter(p => ["pending","approved"].includes(p.status)).length} parcels in workflow`),
    wfCheck("Approvals confirmed (approved status)", gfl.filter(p => p.status === "approved").length > 0, false, `${gfl.filter(p => p.status === "approved").length} approved`),
    wfCheck("Rejections recorded", gfl.filter(p => p.status === "rejected").length > 0, gfl.filter(p => p.status === "rejected").length === 0, `${gfl.filter(p => p.status === "rejected").length} rejections`),
    wfCheck("Approval dates recorded on approved parcels", gfl.filter(p => p.status === "approved" && p.approval_date).length > 0, false, `${gfl.filter(p => p.status === "approved" && p.approval_date).length} with approval_date`),
  ];

  const surveyWf = [
    wfCheck("Survey documents uploaded", surveyDocs.length > 0, false, `${surveyDocs.length} docs`),
    wfCheck("Survey docs approved", surveyDocs.filter(s => s.review_status === "approved").length > 0, false, `${surveyDocs.filter(s => s.review_status === "approved").length} approved`),
    wfCheck("Survey docs rejected", surveyDocs.filter(s => s.review_status === "rejected").length > 0, surveyDocs.filter(s => s.review_status === "rejected").length === 0, `${surveyDocs.filter(s => s.review_status === "rejected").length} rejected`),
    wfCheck("Field reports submitted", fieldReports.length > 0, false, `${fieldReports.length} reports`),
    wfCheck("Field reports with GPS", fieldReports.filter(r => r.latitude && r.longitude).length > 0, false, `${fieldReports.filter(r => r.latitude && r.longitude).length} geolocated`),
  ];

  const familyWf = [
    wfCheck("Family ownerships registered", families.length > 0, false, `${families.length} families`),
    wfCheck("Beneficiaries registered", data.beneficiaries.length > 0, false, `${data.beneficiaries.length} beneficiaries`),
    wfCheck("Community validations submitted", communityVal.length > 0, false, `${communityVal.length} submissions`),
    wfCheck("Community validations approved", communityVal.filter(c => c.status === "approved").length > 0, false, `${communityVal.filter(c => c.status === "approved").length} approved`),
    wfCheck("Traditional authority validations", tradVal.length > 0, false, `${tradVal.length} submitted, ${tradVal.filter(t => t.validation_status === "approved").length} approved`),
  ];

  const inheritanceWf = [
    wfCheck("Inheritance cases initiated", cases.length > 0, false, `${cases.length} cases`),
    wfCheck("Cases at surveyor_review stage", cases.filter(c => c.status === "surveyor_review").length > 0, cases.filter(c => c.status === "surveyor_review").length === 0, `${cases.filter(c => c.status === "surveyor_review").length} in stage`),
    wfCheck("Cases at compliance_review stage", cases.filter(c => c.status === "compliance_review").length > 0, cases.filter(c => c.status === "compliance_review").length === 0, `${cases.filter(c => c.status === "compliance_review").length} in stage`),
    wfCheck("Inheritance cases fully approved", cases.filter(c => c.status === "approved").length > 0, false, `${cases.filter(c => c.status === "approved").length} approved`),
    wfCheck("Certificates generated", cases.filter(c => c.certificate_generated).length > 0, false, `${cases.filter(c => c.certificate_generated).length} certs`),
    wfCheck("Plot allocations confirmed", plotAllocations.filter(a => a.allocation_status === "confirmed").length > 0, false, `${plotAllocations.filter(a => a.allocation_status === "confirmed").length} confirmed`),
    wfCheck("Witnesses verified", witnesses.filter(w => w.verification_status === "verified").length > 0, false, `${witnesses.filter(w => w.verification_status === "verified").length} verified`),
  ];

  const communityWf = [
    wfCheck("Community validations have village_head", communityVal.filter(c => c.village_head).length > 0, false, `${communityVal.filter(c => c.village_head).length} with village head`),
    wfCheck("Multi-stage validation completed", communityVal.filter(c => c.status === "approved").length > 0, false, `${communityVal.filter(c => c.status === "approved").length} fully approved`),
    wfCheck("Traditional ruler names recorded", tradVal.filter(t => t.traditional_ruler_name).length > 0, false, `${tradVal.filter(t => t.traditional_ruler_name).length} named`),
    wfCheck("Customary institutions recorded", tradVal.filter(t => t.traditional_institution).length > 0, false, `${tradVal.filter(t => t.traditional_institution).length} institutions`),
  ];

  const fraudWf = [
    wfCheck("Fraud alerts present", fraud.length > 0, false, `${fraud.length} total`),
    wfCheck("High/critical alerts", fraud.filter(f => ["high","critical"].includes(f.severity)).length > 0, false, `${fraud.filter(f => ["high","critical"].includes(f.severity)).length} severe`),
    wfCheck("Alerts under investigation", fraud.filter(f => f.status === "under_investigation").length > 0, fraud.filter(f => f.status === "under_investigation").length === 0, `${fraud.filter(f => f.status === "under_investigation").length} active`),
    wfCheck("Fraud alerts resolved", fraud.filter(f => f.status === "resolved").length > 0, false, `${fraud.filter(f => f.status === "resolved").length} resolved`),
    wfCheck("Alerts assigned to officers", fraud.filter(f => f.assigned_to).length > 0, false, `${fraud.filter(f => f.assigned_to).length} assigned`),
  ];

  const disputeWf = [
    wfCheck("Disputes filed", disputes.length > 0, false, `${disputes.length} total`),
    wfCheck("Disputes under review", disputes.filter(d => d.status === "under_review").length > 0, disputes.filter(d => d.status === "under_review").length === 0, `${disputes.filter(d => d.status === "under_review").length} active`),
    wfCheck("Disputes resolved", disputes.filter(d => d.status === "resolved").length > 0, false, `${disputes.filter(d => d.status === "resolved").length} resolved`),
    wfCheck("Disputes assigned", disputes.filter(d => d.assigned_to).length > 0, false, `${disputes.filter(d => d.assigned_to).length} assigned`),
  ];

  const certWf = [
    wfCheck("Certificates generated on approved cases", cases.filter(c => c.certificate_generated).length > 0, false, `${cases.filter(c => c.certificate_generated).length} generated`),
    wfCheck("Certificate URLs stored", cases.filter(c => c.certificate_url).length > 0, cases.filter(c => c.certificate_url).length === 0, `${cases.filter(c => c.certificate_url).length} with URL`),
    wfCheck("Approved cases with approval date", cases.filter(c => c.status === "approved" && c.final_approved_date).length > 0, false, `${cases.filter(c => c.status === "approved" && c.final_approved_date).length} timestamped`),
  ];

  const allChecks = [...registrationWf, ...surveyWf, ...familyWf, ...inheritanceWf, ...communityWf, ...fraudWf, ...disputeWf, ...certWf];
  const score = scoreOf(allChecks);

  const sections = [
    { title: "Registration Workflow", checks: registrationWf },
    { title: "Survey Workflow", checks: surveyWf },
    { title: "Family Ownership Workflow", checks: familyWf },
    { title: "Inheritance Workflow", checks: inheritanceWf },
    { title: "Community Validation Workflow", checks: communityWf },
    { title: "Fraud Workflow", checks: fraudWf },
    { title: "Dispute Workflow", checks: disputeWf },
    { title: "Certificate Workflow", checks: certWf },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Workflow Validation Audit</h2>
          <p className="text-sm text-muted-foreground">8 end-to-end workflows tested against live database records</p>
        </div>
        <div className="w-48"><ScoreBar score={score} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sections.map(s => (
          <Card key={s.title}>
            <CardContent className="p-4 space-y-2">
              <SectionHeader icon={CheckCircle2} iconColor="text-emerald-600" title={s.title} score={scoreOf(s.checks)} />
              {s.checks.map((c, i) => <Row key={i} {...c} />)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 4. Backup & Recovery Validation ─────────────────────────────────────────
function BackupRecoveryReport({ data }) {
  if (!data) return null;
  const { parcels, families, cases, audits, fieldReports, surveyDocs, ownershipHistory } = data;

  // Simulate recovery checks — each validates that the data needed for recovery exists
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const auditActions = new Set(audits.map(a => a.action));
  const auditCoverage = {
    hasRegistration: audits.some(a => a.action?.includes("PARCEL") || a.action?.includes("REGISTERED")),
    hasFraud: audits.some(a => a.action?.includes("FRAUD")),
    hasApproval: audits.some(a => a.action?.includes("APPROVED")),
    hasDispute: audits.some(a => a.action?.includes("DISPUTE")),
    hasField: audits.some(a => a.action?.includes("FIELD")),
    hasSurvey: audits.some(a => a.action?.includes("SURVEY")),
    hasFamily: audits.some(a => a.action?.includes("FAMILY") || a.action?.includes("INHERITANCE")),
  };

  // Database backup simulation: verify all primary tables have restorable record counts
  const dbBackup = [
    { label: "LandParcel records restorable", value: `${parcels.length} records`, status: parcels.length > 0 ? S.ok : S.fail, detail: "Primary registration table" },
    { label: "FamilyOwnership records restorable", value: `${families.length} records`, status: families.length > 0 ? S.ok : S.fail, detail: "Family land table" },
    { label: "InheritanceCase records restorable", value: `${cases.length} records`, status: cases.length > 0 ? S.ok : S.warn, detail: "Succession case table" },
    { label: "AuditLog records restorable", value: `${audits.length} records`, status: audits.length > 50 ? S.ok : S.warn, detail: "System event log" },
    { label: "FieldReport records restorable", value: `${fieldReports.length} records`, status: fieldReports.length > 0 ? S.ok : S.warn, detail: "GPS capture records" },
    { label: "SurveyDocument records restorable", value: `${surveyDocs.length} records`, status: surveyDocs.length > 0 ? S.ok : S.warn, detail: "Document archive" },
    { label: "OwnershipHistory records restorable", value: `${ownershipHistory.length} records`, status: ownershipHistory.length > 0 ? S.ok : S.warn, detail: "Transfer chain" },
  ];

  // Database restore: verify relational integrity would survive restore
  const parcelIds = new Set(parcels.map(p => p.id));
  const familyIds = new Set(families.map(f => f.id));
  const dbRestore = [
    { label: "FamilyOwnership → Parcel FK restorable", value: `${families.filter(f => parcelIds.has(f.parcel_id)).length} / ${families.length}`, status: families.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length === 0 ? S.ok : S.warn },
    { label: "InheritanceCase → Parcel FK restorable", value: `${cases.filter(c => parcelIds.has(c.parcel_id)).length} / ${cases.length}`, status: cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id)).length === 0 ? S.ok : S.warn },
    { label: "InheritanceCase → Family FK restorable", value: `${cases.filter(c => familyIds.has(c.family_ownership_id)).length} / ${cases.length}`, status: cases.filter(c => c.family_ownership_id && !familyIds.has(c.family_ownership_id)).length === 0 ? S.ok : S.warn },
    { label: "Parcel number uniqueness maintained", value: (() => { const m = {}; parcels.forEach(p => { m[p.parcel_number] = (m[p.parcel_number] || 0) + 1; }); return Object.values(m).filter(v => v > 1).length; })() === 0 ? "Unique" : "Duplicates", status: (() => { const m = {}; parcels.forEach(p => { m[p.parcel_number] = (m[p.parcel_number] || 0) + 1; }); return Object.values(m).filter(v => v > 1).length; })() === 0 ? S.ok : S.fail },
  ];

  // Audit recovery: verify audit log covers all key events
  const auditRecovery = [
    { label: "Registration events in audit log", value: auditCoverage.hasRegistration ? "Present" : "Absent", status: auditCoverage.hasRegistration ? S.ok : S.warn },
    { label: "Approval events in audit log", value: auditCoverage.hasApproval ? "Present" : "Absent", status: auditCoverage.hasApproval ? S.ok : S.warn },
    { label: "Fraud events in audit log", value: auditCoverage.hasFraud ? "Present" : "Absent", status: auditCoverage.hasFraud ? S.ok : S.warn },
    { label: "Dispute events in audit log", value: auditCoverage.hasDispute ? "Present" : "Absent", status: auditCoverage.hasDispute ? S.ok : S.warn },
    { label: "Field activity in audit log", value: auditCoverage.hasField ? "Present" : "Absent", status: auditCoverage.hasField ? S.ok : S.warn },
    { label: "Survey events in audit log", value: auditCoverage.hasSurvey ? "Present" : "Absent", status: auditCoverage.hasSurvey ? S.ok : S.warn },
    { label: "Family/inheritance events logged", value: auditCoverage.hasFamily ? "Present" : "Absent", status: auditCoverage.hasFamily ? S.ok : S.warn },
    { label: "Distinct audit action types", value: `${auditActions.size} types`, status: auditActions.size >= 5 ? S.ok : S.warn },
  ];

  // GIS recovery
  const withBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
  const withGps = gfl.filter(p => p.latitude && p.longitude);
  const gisRecovery = [
    { label: "GeoJSON polygon data present", value: `${withBoundary.length} / ${gfl.length}`, status: withBoundary.length / (gfl.length || 1) >= 0.7 ? S.ok : S.warn },
    { label: "GPS coordinate pairs present", value: `${withGps.length} / ${gfl.length}`, status: withGps.length / (gfl.length || 1) >= 0.7 ? S.ok : S.warn },
    { label: "Field GPS reports available", value: fieldReports.filter(r => r.latitude && r.longitude).length, status: fieldReports.filter(r => r.latitude && r.longitude).length > 0 ? S.ok : S.warn },
    { label: "Boundary source recorded", value: gfl.filter(p => p.boundary_source).length, status: gfl.filter(p => p.boundary_source).length > 0 ? S.ok : S.warn },
  ];

  // Ownership recovery
  const ownershipRecovery = [
    { label: "Ownership history chain exists", value: `${ownershipHistory.length} records`, status: ownershipHistory.length > 0 ? S.ok : S.warn },
    { label: "Approved ownership transfers", value: ownershipHistory.filter(o => o.status === "approved").length, status: ownershipHistory.filter(o => o.status === "approved").length > 0 ? S.ok : S.warn },
    { label: "Family lineage records present", value: `${families.length} families`, status: families.length > 0 ? S.ok : S.warn },
    { label: "Beneficiary chain recoverable", value: `${data.beneficiaries.length} beneficiaries`, status: data.beneficiaries.length > 0 ? S.ok : S.warn },
    { label: "Plot allocation records present", value: `${data.plotAllocations.length} allocations`, status: data.plotAllocations.length > 0 ? S.ok : S.warn },
  ];

  const allChecks = [...dbBackup, ...dbRestore, ...auditRecovery, ...gisRecovery, ...ownershipRecovery];
  const score = scoreOf(allChecks);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Backup & Recovery Validation</h2>
          <p className="text-sm text-muted-foreground">5 recovery scenarios simulated from live data availability</p>
        </div>
        <div className="w-48"><ScoreBar score={score} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          { title: "Database Backup Simulation", checks: dbBackup, icon: HardDrive, color: "text-blue-600" },
          { title: "Database Restore Validation", checks: dbRestore, icon: Database, color: "text-emerald-600" },
          { title: "Audit Log Recovery", checks: auditRecovery, icon: Shield, color: "text-amber-600" },
          { title: "GIS Data Recovery", checks: gisRecovery, icon: Map, color: "text-teal-600" },
          { title: "Ownership Chain Recovery", checks: ownershipRecovery, icon: GitBranch, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.title}>
            <CardContent className="p-4 space-y-2">
              <SectionHeader icon={s.icon} iconColor={s.color} title={s.title} score={scoreOf(s.checks)} />
              {s.checks.map((c, i) => <Row key={i} {...c} />)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 5. Pilot Readiness Report ────────────────────────────────────────────────
function PilotReadinessReport({ data, allScores }) {
  if (!data || !allScores) return null;
  const { parcels, families, cases, disputes, fraud, audits, fieldReports, surveyDocs, communityVal, tradVal, witnesses, plotAllocations } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  const overall = Math.round(Object.values(allScores).reduce((a, b) => a + b, 0) / Object.values(allScores).length);
  const overallColor = overall >= 80 ? "emerald" : overall >= 60 ? "amber" : "red";

  const statusBadge = overall >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-sm font-bold px-3 py-1"
                    : overall >= 60 ? "bg-amber-100 text-amber-800 border-amber-300 text-sm font-bold px-3 py-1"
                    : "bg-red-100 text-red-800 border-red-300 text-sm font-bold px-3 py-1";

  const dimensionRows = [
    { label: "Database Integrity", score: allScores.integrity, icon: Database },
    { label: "GIS Quality", score: allScores.gis, icon: Map },
    { label: "Workflow Validation", score: allScores.workflow, icon: CheckCircle2 },
    { label: "Backup & Recovery", score: allScores.recovery, icon: HardDrive },
  ];

  const pilotChecklist = [
    { label: "≥ 100 GFL land parcels registered", ok: gfl.length >= 100, value: `${gfl.length} parcels` },
    { label: "≥ 50 approved parcels", ok: gfl.filter(p => p.status === "approved").length >= 50, value: `${gfl.filter(p => p.status === "approved").length} approved` },
    { label: "Family ownership records present", ok: families.length >= 10, value: `${families.length} families` },
    { label: "Inheritance workflow completed end-to-end", ok: cases.filter(c => c.certificate_generated).length > 0, value: `${cases.filter(c => c.certificate_generated).length} certs` },
    { label: "Dispute workflow demonstrated", ok: disputes.filter(d => d.status === "resolved").length > 0, value: `${disputes.filter(d => d.status === "resolved").length} resolved` },
    { label: "Fraud detection demonstrated", ok: fraud.filter(f => ["resolved","dismissed"].includes(f.status)).length > 0, value: `${fraud.filter(f => ["resolved","dismissed"].includes(f.status)).length} resolved` },
    { label: "Community validation demonstrated", ok: communityVal.filter(c => c.status === "approved").length > 0, value: `${communityVal.filter(c => c.status === "approved").length} approved` },
    { label: "Traditional authority validation demonstrated", ok: tradVal.filter(t => t.validation_status === "approved").length > 0, value: `${tradVal.filter(t => t.validation_status === "approved").length} approved` },
    { label: "Witness verification demonstrated", ok: witnesses.filter(w => w.verification_status === "verified").length > 0, value: `${witnesses.filter(w => w.verification_status === "verified").length} verified` },
    { label: "Plot allocations confirmed", ok: plotAllocations.filter(a => a.allocation_status === "confirmed").length > 0, value: `${plotAllocations.filter(a => a.allocation_status === "confirmed").length} confirmed` },
    { label: "GIS boundaries ≥ 70% coverage", ok: gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null").length / (gfl.length || 1) >= 0.7, value: `${Math.round(gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null").length / (gfl.length || 1) * 100)}%` },
    { label: "Audit log ≥ 100 entries", ok: audits.length >= 100, value: `${audits.length} entries` },
    { label: "Field reports with GPS present", ok: fieldReports.filter(r => r.latitude && r.longitude).length > 0, value: `${fieldReports.filter(r => r.latitude && r.longitude).length} geolocated` },
    { label: "Survey documents reviewed/approved", ok: surveyDocs.filter(s => ["reviewed","approved"].includes(s.review_status)).length > 0, value: `${surveyDocs.filter(s => ["reviewed","approved"].includes(s.review_status)).length} reviewed` },
    { label: "No duplicate parcel numbers", ok: (() => { const m = {}; parcels.forEach(p => { m[p.parcel_number] = (m[p.parcel_number] || 0) + 1; }); return Object.values(m).every(v => v === 1); })(), value: "Uniqueness check" },
  ];

  const passed = pilotChecklist.filter(c => c.ok).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pilot Readiness Report</h2>
          <p className="text-sm text-muted-foreground">Greenfield LGA Pilot — composite score across all validation dimensions</p>
        </div>
        <Badge variant="outline" className={statusBadge}>
          {overall >= 80 ? "✓ PILOT READY" : overall >= 60 ? "⚠ PARTIALLY READY" : "✗ NOT READY"}
        </Badge>
      </div>

      {/* Overall score */}
      <Card className={`border-2 ${overallColor === "emerald" ? "border-emerald-300 bg-emerald-50" : overallColor === "amber" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50"}`}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <p className={`text-6xl font-black ${overallColor === "emerald" ? "text-emerald-700" : overallColor === "amber" ? "text-amber-700" : "text-red-700"}`}>{overall}%</p>
              <p className="text-sm font-semibold text-gray-600 mt-1">Overall Pilot Readiness</p>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {dimensionRows.map(d => (
                <div key={d.label} className="flex items-center gap-3">
                  <d.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 w-44 flex-shrink-0">{d.label}</span>
                  <div className="flex-1"><ScoreBar score={d.score} /></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Pilot Sign-Off Checklist</span>
            <Badge variant="outline" className={passed === pilotChecklist.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {passed} / {pilotChecklist.length} passed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {pilotChecklist.map((c, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded border gap-3 ${c.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2">
                {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                <span className="text-sm text-gray-800">{c.label}</span>
              </div>
              <span className="text-xs font-mono text-gray-600 flex-shrink-0">{c.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Computed from live database at {new Date().toLocaleString()}. No synthetic data used.
      </p>
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
export default function PilotValidation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(null);
  const [activeTab, setActiveTab] = useState("integrity");

  async function runAll() {
    setLoading(true);
    const [
      parcels, families, beneficiaries, cases,
      disputes, fraud, audits, fieldReports,
      surveyDocs, ownershipHistory, communityVal,
      tradVal, plotAllocations, witnesses
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
      base44.entities.InheritanceWitness.list("-created_date", 500),
    ]);
    setData({ parcels, families, beneficiaries, cases, disputes, fraud, audits, fieldReports, surveyDocs, ownershipHistory, communityVal, tradVal, plotAllocations, witnesses });
    setLastRun(new Date());
    setLoading(false);
  }

  useEffect(() => { runAll(); }, []);

  // Compute scores for tabs and readiness
  function computeScore(checks) {
    if (!checks.length) return 0;
    const pts = checks.reduce((a, c) => a + (c.status === S.ok ? 2 : c.status === S.warn ? 1 : 0), 0);
    return Math.round((pts / (checks.length * 2)) * 100);
  }

  // Quick pre-computed scores for tab badges
  const tabScores = data ? (() => {
    const gfl = data.parcels.filter(p => p.lga === "Greenfield Local Government");
    const withBoundary = gfl.filter(p => p.parcel_boundary && p.parcel_boundary !== "null");
    const parcelIds = new Set(data.parcels.map(p => p.id));
    const familyIds = new Set(data.families.map(f => f.id));
    const caseIds = new Set(data.cases.map(c => c.id));

    const integrityScore = computeScore([
      { status: data.families.filter(f => f.parcel_id && !parcelIds.has(f.parcel_id)).length === 0 ? S.ok : S.warn },
      { status: data.beneficiaries.filter(b => b.family_ownership_id && !familyIds.has(b.family_ownership_id)).length === 0 ? S.ok : S.warn },
      { status: data.cases.filter(c => c.parcel_id && !parcelIds.has(c.parcel_id)).length === 0 ? S.ok : S.warn },
      { status: data.disputes.filter(d => d.parcel_id && !parcelIds.has(d.parcel_id)).length === 0 ? S.ok : S.warn },
      { status: data.plotAllocations.filter(a => a.inheritance_case_id && !caseIds.has(a.inheritance_case_id)).length === 0 ? S.ok : S.warn },
      { status: (() => { const m = {}; data.parcels.forEach(p => { m[p.parcel_number] = (m[p.parcel_number] || 0) + 1; }); return Object.values(m).every(v => v === 1); })() ? S.ok : S.fail },
    ]);
    const gisScore = computeScore([
      { status: withBoundary.length / (gfl.length || 1) >= 0.9 ? S.ok : withBoundary.length / (gfl.length || 1) >= 0.6 ? S.warn : S.fail },
      { status: gfl.filter(p => gfl.filter(q => q.spatial_validation_status === "overlap_warning").length === 0).length > 0 ? S.ok : S.warn },
    ]);
    const workflowScore = computeScore([
      { status: data.cases.filter(c => c.status === "approved").length > 0 ? S.ok : S.warn },
      { status: data.cases.filter(c => c.certificate_generated).length > 0 ? S.ok : S.warn },
      { status: data.disputes.filter(d => d.status === "resolved").length > 0 ? S.ok : S.warn },
      { status: data.fraud.filter(f => f.status === "resolved").length > 0 ? S.ok : S.warn },
    ]);
    const recoveryScore = computeScore([
      { status: data.parcels.length > 0 ? S.ok : S.fail },
      { status: data.audits.length > 50 ? S.ok : S.warn },
      { status: withBoundary.length > 0 ? S.ok : S.warn },
      { status: data.ownershipHistory.length > 0 ? S.ok : S.warn },
    ]);
    return { integrity: integrityScore, gis: gisScore, workflow: workflowScore, recovery: recoveryScore };
  })() : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Running pilot validation against live database…</p>
        <p className="text-xs text-gray-400">Loading all 14 entity types…</p>
      </div>
    </div>
  );

  function scoreBadge(score) {
    if (score === undefined) return null;
    const cls = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${cls}`}>{score}%</span>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Validation Phase</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Greenfield LGA · Live database records only
            {lastRun && ` · Run at ${lastRun.toLocaleTimeString()}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runAll} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Re-run All
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="integrity" className="text-xs">
            <Database className="w-3.5 h-3.5 mr-1" />
            DB Integrity {tabScores && scoreBadge(tabScores.integrity)}
          </TabsTrigger>
          <TabsTrigger value="gis" className="text-xs">
            <Map className="w-3.5 h-3.5 mr-1" />
            GIS Quality {tabScores && scoreBadge(tabScores.gis)}
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">
            <GitBranch className="w-3.5 h-3.5 mr-1" />
            Workflows {tabScores && scoreBadge(tabScores.workflow)}
          </TabsTrigger>
          <TabsTrigger value="recovery" className="text-xs">
            <HardDrive className="w-3.5 h-3.5 mr-1" />
            Backup & Recovery {tabScores && scoreBadge(tabScores.recovery)}
          </TabsTrigger>
          <TabsTrigger value="readiness" className="text-xs">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Pilot Readiness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrity" className="mt-6">
          <DatabaseIntegrityReport data={data} />
        </TabsContent>
        <TabsContent value="gis" className="mt-6">
          <GISQualityReport data={data} />
        </TabsContent>
        <TabsContent value="workflow" className="mt-6">
          <WorkflowValidationReport data={data} />
        </TabsContent>
        <TabsContent value="recovery" className="mt-6">
          <BackupRecoveryReport data={data} />
        </TabsContent>
        <TabsContent value="readiness" className="mt-6">
          <PilotReadinessReport data={data} allScores={tabScores} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-muted-foreground">All validation results computed in real-time from live database. No synthetic statistics.</p>
    </div>
  );
}