import { S, SectionCard, StatBox, parseCoords, polygonAreaSqm } from "./PilotShared";
import { Map, AlertTriangle, Crosshair, FileText, Ruler } from "lucide-react";

export default function SurveyAccuracyTab({ data }) {
  const { parcels, fieldReports, surveyDocs } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // ── Area comparison: declared vs polygon ──
  const areaComparisons = [];
  let areaMatchCount = 0, areaMinorDiff = 0, areaMajorDiff = 0, areaNoCompare = 0;

  gfl.forEach(p => {
    const declaredHa = p.size_hectares;
    const recordedSqm = p.boundary_area;
    const coords = parseCoords(p.parcel_boundary);
    const computedSqm = coords ? polygonAreaSqm(coords) : null;

    const referenceSqm = recordedSqm || (computedSqm ?? null);
    if (!declaredHa || !referenceSqm) { areaNoCompare++; return; }

    const declaredSqm = declaredHa * 10000;
    const diffPct = Math.abs(declaredSqm - referenceSqm) / declaredSqm * 100;

    if (diffPct <= 5) { areaMatchCount++; }
    else if (diffPct <= 20) { areaMinorDiff++; areaComparisons.push({ id: p.id, pct: Math.round(diffPct), parcel: p.parcel_number }); }
    else { areaMajorDiff++; areaComparisons.push({ id: p.id, pct: Math.round(diffPct), parcel: p.parcel_number }); }
  });

  const withBothAreas = gfl.length - areaNoCompare;

  const areaRows = [
    { label: "Parcels with declared area (size_hectares) recorded", checked: gfl.length, passed: gfl.filter(p => p.size_hectares).length, failed: gfl.filter(p => !p.size_hectares).length, sampleIds: gfl.filter(p => !p.size_hectares).slice(0, 5).map(p => p.id), evidence: `${gfl.filter(p => p.size_hectares).length} of ${gfl.length} GFL parcels have size_hectares populated`, status: gfl.filter(p => !p.size_hectares).length / Math.max(gfl.length, 1) < 0.1 ? S.ok : S.warn },
    { label: "Parcels with polygon area (boundary_area or computed) available", checked: gfl.length, passed: gfl.filter(p => p.boundary_area || p.parcel_boundary).length, failed: gfl.filter(p => !p.boundary_area && !p.parcel_boundary).length, sampleIds: gfl.filter(p => !p.boundary_area && !p.parcel_boundary).slice(0, 5).map(p => p.id), evidence: `${gfl.filter(p => p.boundary_area).length} have boundary_area field · ${gfl.filter(p => p.parcel_boundary).length} have polygon for computation`, status: gfl.filter(p => p.boundary_area || p.parcel_boundary).length / Math.max(gfl.length, 1) >= 0.7 ? S.ok : S.warn },
    { label: "Declared vs polygon area: within 5% tolerance (MATCH)", checked: withBothAreas, passed: areaMatchCount, failed: areaMajorDiff, sampleIds: areaComparisons.filter(a => a.pct > 20).slice(0, 5).map(a => a.id), evidence: `${areaMatchCount} match · ${areaMinorDiff} minor diff (5-20%) · ${areaMajorDiff} major diff (>20%) · ${areaNoCompare} not comparable`, status: areaMajorDiff === 0 ? S.ok : areaMajorDiff < 5 ? S.warn : S.fail },
    { label: "Minor area discrepancies (5–20% deviation)", checked: withBothAreas, passed: withBothAreas - areaMinorDiff, failed: areaMinorDiff, sampleIds: areaComparisons.filter(a => a.pct > 5 && a.pct <= 20).slice(0, 5).map(a => a.id), evidence: `${areaMinorDiff} parcels have a 5–20% difference between declared and measured area`, status: areaMinorDiff === 0 ? S.ok : S.warn },
  ];

  // ── Boundary closure error checks ──
  const closureResults = [];
  gfl.forEach(p => {
    const coords = parseCoords(p.parcel_boundary);
    if (!coords || coords.length < 4) return;
    const first = coords[0], last = coords[coords.length - 1];
    const dx = Math.abs(first[0] - last[0]);
    const dy = Math.abs(first[1] - last[1]);
    const errorM = Math.sqrt(dx * dx + dy * dy) * 111320; // degrees → metres (approx)
    closureResults.push({ id: p.id, errorM, parcel: p.parcel_number });
  });
  const closurePerfect = closureResults.filter(r => r.errorM < 0.01);
  const closureMinor = closureResults.filter(r => r.errorM >= 0.01 && r.errorM < 1);
  const closureMajor = closureResults.filter(r => r.errorM >= 1);

  const closureRows = [
    { label: "Polygon rings with perfect closure (error < 0.01m)", checked: closureResults.length, passed: closurePerfect.length, failed: closureMajor.length, sampleIds: closureMajor.slice(0, 5).map(r => r.id), evidence: `${closurePerfect.length} perfect · ${closureMinor.length} minor error (0.01–1m) · ${closureMajor.length} major error (>1m)`, status: closureMajor.length === 0 ? S.ok : closureMajor.length < 5 ? S.warn : S.fail },
    { label: "Polygon rings with closure error < 1 metre", checked: closureResults.length, passed: closurePerfect.length + closureMinor.length, failed: closureMajor.length, sampleIds: closureMajor.slice(0, 5).map(r => r.id), evidence: `Acceptable industry standard ≤1m. ${closureMajor.length} polygons exceed this threshold.`, status: closureMajor.length === 0 ? S.ok : S.warn },
  ];

  // ── GPS precision scoring ──
  const gpsReports = fieldReports.filter(r => r.latitude && r.longitude);
  const highPrecision = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy <= 5);
  const acceptablePrecision = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy > 5 && r.gps_accuracy <= 15);
  const lowPrecision = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy > 15);
  const noAccuracyRecord = fieldReports.filter(r => r.latitude && r.longitude && !r.gps_accuracy);

  const gpsRows = [
    { label: "Field reports with GPS coordinates captured", checked: fieldReports.length, passed: gpsReports.length, failed: fieldReports.length - gpsReports.length, sampleIds: fieldReports.filter(r => !(r.latitude && r.longitude)).slice(0, 5).map(r => r.id), evidence: `${gpsReports.length} of ${fieldReports.length} field reports have lat/lon`, status: gpsReports.length / Math.max(fieldReports.length, 1) >= 0.9 ? S.ok : S.warn },
    { label: "GPS accuracy ≤ 5m (high precision — survey grade)", checked: fieldReports.filter(r => r.gps_accuracy).length, passed: highPrecision.length, failed: lowPrecision.length, sampleIds: lowPrecision.slice(0, 5).map(r => r.id), evidence: `${highPrecision.length} high (≤5m) · ${acceptablePrecision.length} acceptable (5–15m) · ${lowPrecision.length} low (>15m) · ${noAccuracyRecord.length} no accuracy recorded`, status: lowPrecision.length === 0 ? S.ok : lowPrecision.length < 5 ? S.warn : S.fail },
    { label: "Field reports with gps_accuracy value recorded", checked: gpsReports.length, passed: gpsReports.length - noAccuracyRecord.length, failed: noAccuracyRecord.length, sampleIds: noAccuracyRecord.slice(0, 5).map(r => r.id), evidence: `${noAccuracyRecord.length} GPS-captured reports have no accuracy metadata`, status: noAccuracyRecord.length / Math.max(gpsReports.length, 1) < 0.1 ? S.ok : S.warn },
    { label: "Capture method recorded (gps_auto preferred)", checked: fieldReports.length, passed: fieldReports.filter(r => r.capture_method === "gps_auto").length, failed: fieldReports.filter(r => r.capture_method === "manual_entry").length, sampleIds: [], evidence: `Capture methods: ${[...new Set(fieldReports.map(r => r.capture_method).filter(Boolean))].join(", ")} · ${fieldReports.filter(r => r.capture_method === "gps_auto").length} auto-captured`, status: fieldReports.filter(r => r.capture_method === "gps_auto").length > 0 ? S.ok : S.warn },
  ];

  // ── Coordinate consistency checks ──
  // Compare field report GPS vs parcel GPS for same parcel
  const frByParcel = {};
  fieldReports.forEach(r => { if (r.parcel_id && r.latitude && r.longitude) frByParcel[r.parcel_id] = r; });
  const coordInconsistencies = [];
  gfl.forEach(p => {
    const fr = frByParcel[p.id];
    if (!fr || !p.latitude || !p.longitude) return;
    const dLat = Math.abs(p.latitude - fr.latitude);
    const dLng = Math.abs(p.longitude - fr.longitude);
    const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
    if (distM > 100) coordInconsistencies.push({ id: p.id, distM: Math.round(distM) });
  });
  const coordChecked = gfl.filter(p => frByParcel[p.id] && p.latitude && p.longitude).length;

  const coordRows = [
    { label: "Parcel GPS vs field report GPS cross-check (< 100m tolerance)", checked: coordChecked, passed: coordChecked - coordInconsistencies.length, failed: coordInconsistencies.length, sampleIds: coordInconsistencies.slice(0, 5).map(c => c.id), evidence: `${coordInconsistencies.length} parcels have >100m discrepancy between parcel GPS and field report GPS`, status: coordInconsistencies.length === 0 ? S.ok : coordInconsistencies.length < 3 ? S.warn : S.fail },
    { label: "Parcels with both parcel-level and field GPS recorded", checked: gfl.length, passed: coordChecked, failed: gfl.length - coordChecked, sampleIds: [], evidence: `${coordChecked} parcels can be cross-referenced between parcel and field report GPS`, status: coordChecked / Math.max(gfl.length, 1) >= 0.5 ? S.ok : S.warn },
  ];

  // ── Survey document completeness ──
  const surveyParcelIds = new Set(surveyDocs.map(s => s.parcel_id));
  const approved = gfl.filter(p => p.status === "approved");
  const approvedNoDoc = approved.filter(p => !surveyParcelIds.has(p.id));
  const surveyWithAllFields = surveyDocs.filter(s => s.file_url && s.surveyor_email && s.document_type);
  const surveyApproved = surveyDocs.filter(s => s.review_status === "approved");
  const surveyRejected = surveyDocs.filter(s => s.review_status === "rejected");
  const byType = {};
  surveyDocs.forEach(s => { byType[s.document_type] = (byType[s.document_type] || 0) + 1; });

  const docRows = [
    { label: "Approved parcels with survey document on file", checked: approved.length, passed: approved.length - approvedNoDoc.length, failed: approvedNoDoc.length, sampleIds: approvedNoDoc.slice(0, 5).map(p => p.id), evidence: `${approved.length - approvedNoDoc.length} approved parcels have at least one survey document`, status: approvedNoDoc.length === 0 ? S.ok : approvedNoDoc.length < 10 ? S.warn : S.fail },
    { label: "Survey docs with file_url + surveyor_email + document_type", checked: surveyDocs.length, passed: surveyWithAllFields.length, failed: surveyDocs.length - surveyWithAllFields.length, sampleIds: surveyDocs.filter(s => !(s.file_url && s.surveyor_email && s.document_type)).slice(0, 5).map(s => s.id), evidence: `${surveyWithAllFields.length} fully-documented survey records`, status: surveyDocs.length - surveyWithAllFields.length === 0 ? S.ok : S.warn },
    { label: "Survey documents with approved review status", checked: surveyDocs.length, passed: surveyApproved.length, failed: surveyRejected.length, sampleIds: surveyRejected.slice(0, 5).map(s => s.id), evidence: `${surveyApproved.length} approved · ${surveyRejected.length} rejected · ${surveyDocs.filter(s => s.review_status === "pending").length} pending`, status: surveyApproved.length / Math.max(surveyDocs.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "Document type coverage (survey_plan present)", checked: surveyDocs.length, passed: byType["survey_plan"] || 0, failed: 0, sampleIds: [], evidence: `Types: ${Object.entries(byType).map(([t, c]) => `${t}×${c}`).join(", ")}`, status: (byType["survey_plan"] || 0) > 0 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Area Discrepancies (>20%)" value={areaMajorDiff} color={areaMajorDiff > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Closure Errors (>1m)" value={closureMajor.length} color={closureMajor.length > 0 ? "text-amber-600" : "text-emerald-700"} />
        <StatBox label="Low GPS Precision" value={lowPrecision.length} color={lowPrecision.length > 0 ? "text-amber-600" : "text-emerald-700"} />
        <StatBox label="Coord Inconsistencies" value={coordInconsistencies.length} color={coordInconsistencies.length > 0 ? "text-red-600" : "text-emerald-700"} />
      </div>
      <SectionCard title="Declared Area vs Polygon Area" icon={Ruler} iconColor="text-blue-600" rows={areaRows} summary={`${withBothAreas} parcels compared · ${areaNoCompare} could not be compared`} />
      <SectionCard title="Boundary Closure Error Checks" icon={Map} iconColor="text-teal-600" rows={closureRows} summary={`${closureResults.length} polygon rings analysed for closure error`} />
      <SectionCard title="GPS Precision Scoring" icon={Crosshair} iconColor="text-emerald-600" rows={gpsRows} summary={`${gpsReports.length} GPS-captured field reports scored`} />
      <SectionCard title="Coordinate Consistency Checks" icon={AlertTriangle} iconColor="text-amber-600" rows={coordRows} summary={`Parcel GPS vs field report GPS cross-referenced for ${coordChecked} parcels`} />
      <SectionCard title="Survey Document Completeness" icon={FileText} iconColor="text-indigo-600" rows={docRows} summary={`${surveyDocs.length} survey documents checked for completeness`} />
    </div>
  );
}