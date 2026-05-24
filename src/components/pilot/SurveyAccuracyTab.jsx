import { Card, CardContent } from "@/components/ui/card";
import { Map, Ruler, Navigation, FileText } from "lucide-react";
import { SectionCard, S } from "./PilotShared";

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

// Shoelace formula — area in square degrees (approximate)
function polygonArea(coords) {
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  return Math.abs(area / 2);
}

// Convert square degrees to sqm at Nigeria's latitude (~7°N): 1° lat ≈ 111,000m, 1° lng ≈ 95,000m
function sqDegreesToSqm(sqDeg) {
  return sqDeg * 111000 * 95000;
}

export default function SurveyAccuracyTab({ data }) {
  const { parcels, fieldReports, surveyDocs } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // ── Declared area vs polygon area comparison ───────────────────────────
  const areaComparisons = [];
  const largeAreaDivergence = [];
  gfl.forEach(p => {
    if (!p.parcel_boundary || p.parcel_boundary === "null") return;
    const coords = parseCoords(p.parcel_boundary);
    if (!coords || coords.length < 4) return;
    const polyAreaSqm = sqDegreesToSqm(polygonArea(coords));
    // declared area in hectares → sqm
    const declaredSqm = p.size_hectares ? p.size_hectares * 10000 : null;
    if (declaredSqm && declaredSqm > 0) {
      const ratio = Math.abs(polyAreaSqm - declaredSqm) / declaredSqm;
      areaComparisons.push({ id: p.id, parcel_number: p.parcel_number, ratio, polyAreaSqm, declaredSqm });
      if (ratio > 0.25) largeAreaDivergence.push(p);
    }
  });

  // ── Boundary closure ──────────────────────────────────────────────────
  const withBoundary = [];
  const openRings = [];
  const notClosed = [];
  gfl.forEach(p => {
    if (!p.parcel_boundary || p.parcel_boundary === "null") return;
    const coords = parseCoords(p.parcel_boundary);
    if (!coords) return;
    withBoundary.push(p);
    const first = coords[0], last = coords[coords.length - 1];
    if (!first || !last) return;
    const dx = Math.abs(first[0] - last[0]);
    const dy = Math.abs(first[1] - last[1]);
    if (dx > 0 || dy > 0) {
      openRings.push({ id: p.id, dx, dy });
      notClosed.push(p);
    }
  });
  const closureErrorMeters = openRings.map(r => ({
    ...r,
    errorM: Math.sqrt((r.dx * 111000) ** 2 + (r.dy * 95000) ** 2)
  }));
  const highClosureError = closureErrorMeters.filter(r => r.errorM > 1); // >1m error
  const lowClosureError = closureErrorMeters.filter(r => r.errorM <= 1 && r.errorM > 0);

  // ── GPS precision scoring ─────────────────────────────────────────────
  // Precision: count decimal places on lat/lng (more = higher precision)
  const gpsReports = fieldReports.filter(r => r.latitude && r.longitude);
  const highPrecision = gpsReports.filter(r => {
    const latStr = String(r.latitude);
    const decimals = latStr.includes(".") ? latStr.split(".")[1].length : 0;
    return decimals >= 5; // ≥5 decimal places ≈ <1m precision
  });
  const lowPrecision = gpsReports.filter(r => {
    const latStr = String(r.latitude);
    const decimals = latStr.includes(".") ? latStr.split(".")[1].length : 0;
    return decimals < 4;
  });

  // GPS accuracy field (lower = better, in meters)
  const gpsWithAccuracy = fieldReports.filter(r => r.gps_accuracy !== null && r.gps_accuracy !== undefined);
  const highAccuracy = gpsWithAccuracy.filter(r => r.gps_accuracy <= 5); // ≤5m
  const poorAccuracy = gpsWithAccuracy.filter(r => r.gps_accuracy > 10); // >10m

  // ── Coordinate consistency ─────────────────────────────────────────────
  // Check if parcel centroid (lat/lng) is inside its own boundary bbox
  const centroidOutsideBbox = [];
  gfl.forEach(p => {
    if (!p.latitude || !p.longitude || !p.parcel_boundary) return;
    const coords = parseCoords(p.parcel_boundary);
    if (!coords) return;
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    if (p.longitude < minLng || p.longitude > maxLng || p.latitude < minLat || p.latitude > maxLat) {
      centroidOutsideBbox.push(p);
    }
  });

  // Parcels where boundary_area field diverges wildly from polygon area
  const areaFieldDivergence = areaComparisons.filter(c => c.ratio > 0.5).map(c => ({ id: c.id }));

  // ── Survey document completeness ───────────────────────────────────────
  const surveyByParcel = {};
  surveyDocs.forEach(s => {
    if (!surveyByParcel[s.parcel_id]) surveyByParcel[s.parcel_id] = [];
    surveyByParcel[s.parcel_id].push(s);
  });
  const gflWithSurvey = gfl.filter(p => surveyByParcel[p.id]?.length > 0);
  const gflNoSurvey = gfl.filter(p => !surveyByParcel[p.id]);
  const surveyPending = surveyDocs.filter(s => s.review_status === "pending");
  const surveyApproved = surveyDocs.filter(s => s.review_status === "approved");
  const surveyRejected = surveyDocs.filter(s => s.review_status === "rejected");
  const surveyNoSurveyor = surveyDocs.filter(s => !s.surveyor_email);
  const surveyPlanOnly = gfl.filter(p => {
    const docs = surveyByParcel[p.id] || [];
    return docs.some(d => d.document_type === "survey_plan");
  });

  const areaRows = [
    { label: "Parcels with declared size (hectares)", checked: gfl.length, passed: gfl.filter(p => p.size_hectares > 0).length, failed: gfl.filter(p => !p.size_hectares || p.size_hectares === 0).length, sampleIds: gfl.filter(p => !p.size_hectares || p.size_hectares === 0).slice(0, 5).map(p => p.id), evidence: `${gfl.filter(p => p.size_hectares > 0).length} parcels have size_hectares declared`, status: gfl.filter(p => !p.size_hectares).length === 0 ? S.ok : S.warn },
    { label: "Parcels compared: declared vs polygon area", checked: areaComparisons.length, passed: areaComparisons.filter(c => c.ratio <= 0.25).length, failed: largeAreaDivergence.length, sampleIds: largeAreaDivergence.slice(0, 5).map(p => p.id), evidence: `${largeAreaDivergence.length} parcels have >25% divergence between declared and polygon area — data entry error or manipulated boundary`, status: largeAreaDivergence.length === 0 ? S.ok : largeAreaDivergence.length < 5 ? S.warn : S.fail },
    { label: "Severe area divergence (>50%)", checked: areaComparisons.length, passed: areaComparisons.length - areaFieldDivergence.length, failed: areaFieldDivergence.length, sampleIds: areaFieldDivergence.slice(0, 5).map(c => c.id), evidence: `${areaFieldDivergence.length} parcels with >50% discrepancy between declared and computed area`, status: areaFieldDivergence.length === 0 ? S.ok : S.fail },
  ];

  const closureRows = [
    { label: "Polygon rings with boundary closure error", checked: withBoundary.length, passed: withBoundary.length - notClosed.length, failed: notClosed.length, sampleIds: notClosed.slice(0, 5).map(p => p.id), evidence: `${notClosed.length} polygons where first ≠ last coordinate`, status: notClosed.length === 0 ? S.ok : notClosed.length < 5 ? S.warn : S.fail },
    { label: "High closure error (>1m gap)", checked: withBoundary.length, passed: withBoundary.length - highClosureError.length, failed: highClosureError.length, sampleIds: highClosureError.slice(0, 5).map(r => r.id), evidence: `${highClosureError.length} polygons have a closure gap >1 metre — survey measurement error`, status: highClosureError.length === 0 ? S.ok : S.fail },
    { label: "Low closure error (≤1m gap, tolerable)", checked: withBoundary.length, passed: withBoundary.length - lowClosureError.length, failed: lowClosureError.length, sampleIds: [], evidence: `${lowClosureError.length} polygons have sub-metre closure error — within acceptable tolerance`, status: lowClosureError.length < 10 ? S.ok : S.warn },
    { label: "Parcel centroid inside polygon bounding box", checked: gfl.filter(p => p.latitude && p.parcel_boundary).length, passed: gfl.filter(p => p.latitude && p.parcel_boundary).length - centroidOutsideBbox.length, failed: centroidOutsideBbox.length, sampleIds: centroidOutsideBbox.slice(0, 5).map(p => p.id), evidence: `${centroidOutsideBbox.length} parcels have GPS centroid outside their own polygon bounding box`, status: centroidOutsideBbox.length === 0 ? S.ok : S.fail },
  ];

  const gpsRows = [
    { label: "Field reports with GPS coordinates", checked: fieldReports.length, passed: gpsReports.length, failed: fieldReports.length - gpsReports.length, sampleIds: fieldReports.filter(r => !(r.latitude && r.longitude)).slice(0, 5).map(r => r.id), evidence: `${gpsReports.length} of ${fieldReports.length} field reports have GPS`, status: gpsReports.length / Math.max(fieldReports.length, 1) >= 0.8 ? S.ok : S.warn },
    { label: "High-precision GPS (≥5 decimal places, <1m)", checked: gpsReports.length, passed: highPrecision.length, failed: lowPrecision.length, sampleIds: lowPrecision.slice(0, 5).map(r => r.id), evidence: `${highPrecision.length} reports at high precision · ${lowPrecision.length} at low precision (<4 decimals)`, status: highPrecision.length / Math.max(gpsReports.length, 1) >= 0.7 ? S.ok : S.warn },
    { label: "GPS accuracy field recorded (meters)", checked: fieldReports.length, passed: gpsWithAccuracy.length, failed: fieldReports.length - gpsWithAccuracy.length, sampleIds: fieldReports.filter(r => r.gps_accuracy === null || r.gps_accuracy === undefined).slice(0, 5).map(r => r.id), evidence: `${gpsWithAccuracy.length} reports have gps_accuracy field set`, status: gpsWithAccuracy.length / Math.max(fieldReports.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "Reports with poor GPS accuracy (>10m)", checked: gpsWithAccuracy.length, passed: gpsWithAccuracy.length - poorAccuracy.length, failed: poorAccuracy.length, sampleIds: poorAccuracy.slice(0, 5).map(r => r.id), evidence: `${poorAccuracy.length} reports with GPS accuracy worse than 10 metres`, status: poorAccuracy.length === 0 ? S.ok : poorAccuracy.length < 5 ? S.warn : S.fail },
    { label: "Reports with high GPS accuracy (≤5m)", checked: gpsWithAccuracy.length, passed: highAccuracy.length, failed: 0, sampleIds: [], evidence: `${highAccuracy.length} field reports have GPS accuracy ≤5m — survey-grade`, status: highAccuracy.length > 0 ? S.ok : S.warn },
  ];

  const coordRows = [
    { label: "GPS centroid / boundary consistency", checked: gfl.filter(p => p.latitude && p.parcel_boundary).length, passed: gfl.filter(p => p.latitude && p.parcel_boundary).length - centroidOutsideBbox.length, failed: centroidOutsideBbox.length, sampleIds: centroidOutsideBbox.slice(0, 5).map(p => p.id), evidence: `${centroidOutsideBbox.length} centroid coordinates lie outside the parcel polygon bbox`, status: centroidOutsideBbox.length === 0 ? S.ok : S.fail },
    { label: "boundary_area field matches computed polygon area", checked: areaComparisons.length, passed: areaComparisons.filter(c => c.ratio <= 0.1).length, failed: areaComparisons.filter(c => c.ratio > 0.5).length, sampleIds: areaComparisons.filter(c => c.ratio > 0.5).slice(0, 5).map(c => ({ id: c.id })).map(c => c.id), evidence: `${areaComparisons.filter(c => c.ratio > 0.1).length} parcels have some divergence · ${areaComparisons.filter(c => c.ratio > 0.5).length} critical (>50%)`, status: areaComparisons.filter(c => c.ratio > 0.5).length === 0 ? S.ok : S.warn },
  ];

  const docCompletenessRows = [
    { label: "GFL parcels with survey document", checked: gfl.length, passed: gflWithSurvey.length, failed: gflNoSurvey.length, sampleIds: gflNoSurvey.slice(0, 5).map(p => p.id), evidence: `${gflNoSurvey.length} GFL parcels have no survey document on record`, status: gflNoSurvey.length / Math.max(gfl.length, 1) < 0.1 ? S.ok : gflNoSurvey.length / Math.max(gfl.length, 1) < 0.3 ? S.warn : S.fail },
    { label: "Survey docs with survey_plan type", checked: surveyDocs.length, passed: surveyDocs.filter(s => s.document_type === "survey_plan").length, failed: 0, sampleIds: [], evidence: `${surveyDocs.filter(s => s.document_type === "survey_plan").length} survey plan docs · ${surveyDocs.filter(s => s.document_type === "cad_drawing").length} CAD drawings`, status: surveyDocs.filter(s => s.document_type === "survey_plan").length > 0 ? S.ok : S.warn },
    { label: "Survey docs approved", checked: surveyDocs.length, passed: surveyApproved.length, failed: surveyRejected.length, sampleIds: surveyRejected.slice(0, 5).map(s => s.id), evidence: `${surveyApproved.length} approved · ${surveyPending.length} pending · ${surveyRejected.length} rejected`, status: surveyApproved.length >= 5 ? S.ok : S.warn },
    { label: "Survey docs with surveyor email recorded", checked: surveyDocs.length, passed: surveyDocs.length - surveyNoSurveyor.length, failed: surveyNoSurveyor.length, sampleIds: surveyNoSurveyor.slice(0, 5).map(s => s.id), evidence: `${surveyNoSurveyor.length} documents have no surveyor_email — unattributed submissions`, status: surveyNoSurveyor.length === 0 ? S.ok : S.warn },
    { label: "GFL parcels with survey plan specifically", checked: gfl.length, passed: surveyPlanOnly.length, failed: gfl.length - surveyPlanOnly.length, sampleIds: gfl.filter(p => !surveyByParcel[p.id]?.some(d => d.document_type === "survey_plan")).slice(0, 5).map(p => p.id), evidence: `${surveyPlanOnly.length} of ${gfl.length} GFL parcels have a formal survey plan document`, status: surveyPlanOnly.length / Math.max(gfl.length, 1) >= 0.5 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {[
          { label: "Area Comparisons Run", value: areaComparisons.length, color: "text-blue-700" },
          { label: "Area Divergence (>25%)", value: largeAreaDivergence.length, color: largeAreaDivergence.length === 0 ? "text-emerald-700" : "text-red-600" },
          { label: "GPS Reports", value: gpsReports.length, color: "text-teal-700" },
          { label: "Closure Errors", value: notClosed.length, color: notClosed.length === 0 ? "text-emerald-700" : "text-amber-700" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center"><p className={`text-2xl font-black ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <SectionCard title="Declared Area vs Polygon Area" icon={Ruler} iconColor="text-blue-600" rows={areaRows} summary={`${areaComparisons.length} parcels with declared size compared to computed polygon area`} />
      <SectionCard title="Boundary Closure Error Checks" icon={Map} iconColor="text-red-600" rows={closureRows} summary={`${withBoundary.length} polygon boundaries checked for closure and coordinate errors`} />
      <SectionCard title="GPS Precision Scoring" icon={Navigation} iconColor="text-teal-600" rows={gpsRows} summary={`${gpsReports.length} geolocated field reports precision-scored`} />
      <SectionCard title="Coordinate Consistency" icon={Map} iconColor="text-amber-600" rows={coordRows} summary="Centroid vs boundary consistency + area field validation" />
      <SectionCard title="Survey Document Completeness" icon={FileText} iconColor="text-indigo-600" rows={docCompletenessRows} summary={`${surveyDocs.length} survey documents checked for completeness and review status`} />
    </div>
  );
}