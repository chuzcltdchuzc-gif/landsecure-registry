import { S, SectionCard, StatBox } from "./PilotShared";
import { Wifi, Smartphone, Crosshair, FileText, Activity } from "lucide-react";

export default function FieldOperationsTab({ data }) {
  const { fieldReports, parcels } = data;
  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");

  // ── Offline capture readiness ──
  const offlineReports = fieldReports.filter(r => r.network_status === "offline" || r.network_status === "synced_offline");
  const onlineReports = fieldReports.filter(r => r.network_status === "online");
  const syncedOffline = fieldReports.filter(r => r.network_status === "synced_offline");
  const unsynced = fieldReports.filter(r => r.network_status === "offline"); // created offline but no sync status yet

  const offlineRows = [
    { label: "Field reports captured offline or synced from offline", checked: fieldReports.length, passed: offlineReports.length, failed: 0, sampleIds: [], evidence: `${offlineReports.length} offline-origin reports · ${syncedOffline.length} synced · ${unsynced.length} still offline · ${onlineReports.length} online`, status: offlineReports.length > 0 ? S.ok : S.warn },
    { label: "Offline reports successfully synced (synced_offline)", checked: offlineReports.length, passed: syncedOffline.length, failed: unsynced.length, sampleIds: unsynced.slice(0, 5).map(r => r.id), evidence: syncedOffline.length === offlineReports.length ? "All offline reports have been synced to server" : `${unsynced.length} reports captured offline but not yet synced`, status: unsynced.length === 0 ? S.ok : unsynced.length < 5 ? S.warn : S.fail },
    { label: "Network status field populated on all reports", checked: fieldReports.length, passed: fieldReports.filter(r => r.network_status).length, failed: fieldReports.filter(r => !r.network_status).length, sampleIds: fieldReports.filter(r => !r.network_status).slice(0, 5).map(r => r.id), evidence: `${fieldReports.filter(r => r.network_status).length} reports have network_status recorded`, status: fieldReports.filter(r => !r.network_status).length === 0 ? S.ok : S.warn },
    { label: "Offline capture rate (proves field readiness)", checked: fieldReports.length, passed: offlineReports.length, failed: 0, sampleIds: [], evidence: `${Math.round(offlineReports.length / Math.max(fieldReports.length, 1) * 100)}% of field reports originated offline — validates offline-first capability`, status: offlineReports.length / Math.max(fieldReports.length, 1) >= 0.1 ? S.ok : S.warn },
  ];

  // ── Sync success/failure statistics ──
  const captureByMethod = {};
  fieldReports.forEach(r => { captureByMethod[r.capture_method || "unknown"] = (captureByMethod[r.capture_method || "unknown"] || 0) + 1; });
  const qualityByFlag = {};
  fieldReports.forEach(r => { qualityByFlag[r.quality_flag || "unknown"] = (qualityByFlag[r.quality_flag || "unknown"] || 0) + 1; });

  const syncRows = [
    { label: "Field reports with capture_timestamp recorded", checked: fieldReports.length, passed: fieldReports.filter(r => r.capture_timestamp).length, failed: fieldReports.filter(r => !r.capture_timestamp).length, sampleIds: fieldReports.filter(r => !r.capture_timestamp).slice(0, 5).map(r => r.id), evidence: `${fieldReports.filter(r => r.capture_timestamp).length} reports have exact device capture timestamp (essential for sync ordering)`, status: fieldReports.filter(r => !r.capture_timestamp).length === 0 ? S.ok : S.warn },
    { label: "Capture method breakdown (gps_auto / manual / imported)", checked: fieldReports.length, passed: fieldReports.filter(r => r.capture_method === "gps_auto").length, failed: 0, sampleIds: [], evidence: `${Object.entries(captureByMethod).map(([m, c]) => `${m}: ${c}`).join(" · ")}`, status: (captureByMethod["gps_auto"] || 0) > 0 ? S.ok : S.warn },
    { label: "Quality flag PASS on submitted reports", checked: fieldReports.filter(r => r.status === "submitted" || r.status === "reviewed").length, passed: fieldReports.filter(r => ["submitted", "reviewed"].includes(r.status) && r.quality_flag === "pass").length, failed: fieldReports.filter(r => ["submitted", "reviewed"].includes(r.status) && r.quality_flag === "fail").length, sampleIds: fieldReports.filter(r => r.quality_flag === "fail").slice(0, 5).map(r => r.id), evidence: `Quality flags: ${Object.entries(qualityByFlag).map(([f, c]) => `${f}: ${c}`).join(" · ")}`, status: (qualityByFlag["fail"] || 0) === 0 ? S.ok : S.warn },
    { label: "Device identifier recorded on field reports", checked: fieldReports.length, passed: fieldReports.filter(r => r.device_identifier).length, failed: fieldReports.filter(r => !r.device_identifier).length, sampleIds: fieldReports.filter(r => !r.device_identifier).slice(0, 5).map(r => r.id), evidence: `${fieldReports.filter(r => r.device_identifier).length} reports carry device_identifier for audit trail · ${[...new Set(fieldReports.map(r => r.device_identifier).filter(Boolean))].length} unique devices`, status: fieldReports.filter(r => !r.device_identifier).length / Math.max(fieldReports.length, 1) < 0.2 ? S.ok : S.warn },
  ];

  // ── Device capability validation ──
  const uniqueDevices = new Set(fieldReports.map(r => r.device_identifier).filter(Boolean));
  const devicesWithGps = new Set(fieldReports.filter(r => r.latitude && r.longitude && r.device_identifier).map(r => r.device_identifier));
  const devicesWithAccuracy = new Set(fieldReports.filter(r => r.gps_accuracy && r.device_identifier).map(r => r.device_identifier));
  const devicesWithOffline = new Set(fieldReports.filter(r => r.network_status !== "online" && r.device_identifier).map(r => r.device_identifier));

  const deviceRows = [
    { label: "Distinct field devices registered in system", checked: uniqueDevices.size, passed: uniqueDevices.size, failed: 0, sampleIds: [], evidence: `${uniqueDevices.size} unique device identifiers across all field reports`, status: uniqueDevices.size >= 3 ? S.ok : S.warn },
    { label: "Devices with GPS capability demonstrated", checked: uniqueDevices.size, passed: devicesWithGps.size, failed: uniqueDevices.size - devicesWithGps.size, sampleIds: [], evidence: `${devicesWithGps.size} of ${uniqueDevices.size} devices have submitted at least one GPS-captured report`, status: devicesWithGps.size / Math.max(uniqueDevices.size, 1) >= 0.9 ? S.ok : S.warn },
    { label: "Devices reporting GPS accuracy metadata", checked: uniqueDevices.size, passed: devicesWithAccuracy.size, failed: uniqueDevices.size - devicesWithAccuracy.size, sampleIds: [], evidence: `${devicesWithAccuracy.size} devices report gps_accuracy values — required for precision scoring`, status: devicesWithAccuracy.size / Math.max(uniqueDevices.size, 1) >= 0.7 ? S.ok : S.warn },
    { label: "Devices with offline capture capability demonstrated", checked: uniqueDevices.size, passed: devicesWithOffline.size, failed: uniqueDevices.size - devicesWithOffline.size, sampleIds: [], evidence: `${devicesWithOffline.size} devices have submitted at least one offline-captured report`, status: devicesWithOffline.size / Math.max(uniqueDevices.size, 1) >= 0.5 ? S.ok : S.warn },
  ];

  // ── GPS availability checks ──
  const gpsReports = fieldReports.filter(r => r.latitude && r.longitude);
  const highPrecision = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy <= 5);
  const acceptable = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy > 5 && r.gps_accuracy <= 15);
  const lowPrecision = fieldReports.filter(r => r.gps_accuracy && r.gps_accuracy > 15);
  const gflWithGps = gfl.filter(p => p.latitude && p.longitude);

  const gpsRows = [
    { label: "Field reports with GPS coordinates", checked: fieldReports.length, passed: gpsReports.length, failed: fieldReports.length - gpsReports.length, sampleIds: fieldReports.filter(r => !(r.latitude && r.longitude)).slice(0, 5).map(r => r.id), evidence: `${Math.round(gpsReports.length / Math.max(fieldReports.length, 1) * 100)}% GPS capture rate`, status: gpsReports.length / Math.max(fieldReports.length, 1) >= 0.9 ? S.ok : S.warn },
    { label: "GPS precision ≤ 5m (survey grade)", checked: fieldReports.filter(r => r.gps_accuracy).length, passed: highPrecision.length, failed: lowPrecision.length, sampleIds: lowPrecision.slice(0, 5).map(r => r.id), evidence: `${highPrecision.length} high (≤5m) · ${acceptable.length} acceptable (5–15m) · ${lowPrecision.length} low (>15m)`, status: lowPrecision.length === 0 ? S.ok : lowPrecision.length < 3 ? S.warn : S.fail },
    { label: "GFL parcels with GPS coordinates registered", checked: gfl.length, passed: gflWithGps.length, failed: gfl.length - gflWithGps.length, sampleIds: gfl.filter(p => !(p.latitude && p.longitude)).slice(0, 5).map(p => p.id), evidence: `${Math.round(gflWithGps.length / Math.max(gfl.length, 1) * 100)}% of GFL parcels have registered GPS coordinates`, status: gflWithGps.length / Math.max(gfl.length, 1) >= 0.9 ? S.ok : S.warn },
    { label: "Report types with GPS (boundary_check / gps_survey)", checked: fieldReports.length, passed: fieldReports.filter(r => ["boundary_check", "gps_survey"].includes(r.report_type) && r.latitude).length, failed: fieldReports.filter(r => ["boundary_check", "gps_survey"].includes(r.report_type) && !r.latitude).length, sampleIds: fieldReports.filter(r => ["boundary_check", "gps_survey"].includes(r.report_type) && !r.latitude).slice(0, 5).map(r => r.id), evidence: `${fieldReports.filter(r => ["boundary_check", "gps_survey"].includes(r.report_type)).length} boundary/survey reports · ${fieldReports.filter(r => ["boundary_check", "gps_survey"].includes(r.report_type) && r.latitude).length} have GPS`, status: S.ok },
  ];

  // ── Field report completeness scoring ──
  const fullyComplete = fieldReports.filter(r =>
    r.description && r.report_type && r.agent_email && r.parcel_id &&
    r.latitude && r.longitude && r.capture_timestamp && r.status !== "draft"
  );
  const missingDescription = fieldReports.filter(r => !r.description);
  const missingParcelLink = fieldReports.filter(r => !r.parcel_id);
  const missingAgent = fieldReports.filter(r => !r.agent_email);
  const draftReports = fieldReports.filter(r => r.status === "draft");
  const submittedReports = fieldReports.filter(r => r.status === "submitted" || r.status === "reviewed");
  const completenessScore = Math.round(fullyComplete.length / Math.max(fieldReports.length, 1) * 100);

  const completenessRows = [
    { label: "Field reports with all required fields (completeness score)", checked: fieldReports.length, passed: fullyComplete.length, failed: fieldReports.length - fullyComplete.length, sampleIds: fieldReports.filter(r => !(r.description && r.report_type && r.parcel_id && r.latitude)).slice(0, 5).map(r => r.id), evidence: `Completeness score: ${completenessScore}% · ${fullyComplete.length} of ${fieldReports.length} reports fully complete`, status: completenessScore >= 90 ? S.ok : completenessScore >= 70 ? S.warn : S.fail },
    { label: "Field reports with description populated", checked: fieldReports.length, passed: fieldReports.length - missingDescription.length, failed: missingDescription.length, sampleIds: missingDescription.slice(0, 5).map(r => r.id), evidence: `${missingDescription.length} reports lack a field description`, status: missingDescription.length === 0 ? S.ok : S.warn },
    { label: "Field reports linked to a parcel (parcel_id set)", checked: fieldReports.length, passed: fieldReports.length - missingParcelLink.length, failed: missingParcelLink.length, sampleIds: missingParcelLink.slice(0, 5).map(r => r.id), evidence: `${missingParcelLink.length} reports are not linked to any parcel`, status: missingParcelLink.length === 0 ? S.ok : S.warn },
    { label: "Field reports with agent_email recorded", checked: fieldReports.length, passed: fieldReports.length - missingAgent.length, failed: missingAgent.length, sampleIds: missingAgent.slice(0, 5).map(r => r.id), evidence: `${missingAgent.length} reports cannot be attributed to a field agent`, status: missingAgent.length === 0 ? S.ok : S.warn },
    { label: "Draft reports (not yet submitted)", checked: fieldReports.length, passed: submittedReports.length, failed: draftReports.length, sampleIds: draftReports.slice(0, 5).map(r => r.id), evidence: `${draftReports.length} reports remain in draft · ${submittedReports.length} submitted/reviewed`, status: draftReports.length / Math.max(fieldReports.length, 1) < 0.1 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Offline Reports" value={offlineReports.length} color="text-blue-700" />
        <StatBox label="Sync Failures" value={unsynced.length} color={unsynced.length > 0 ? "text-amber-600" : "text-emerald-700"} />
        <StatBox label="Unique Devices" value={uniqueDevices.size} color="text-purple-700" />
        <StatBox label="Completeness Score" value={`${completenessScore}%`} color={completenessScore >= 90 ? "text-emerald-700" : completenessScore >= 70 ? "text-amber-600" : "text-red-600"} />
      </div>
      <SectionCard title="Offline Capture Readiness" icon={Wifi} iconColor="text-blue-600" rows={offlineRows} summary={`${fieldReports.length} reports · ${offlineReports.length} offline-origin · ${syncedOffline.length} synced`} />
      <SectionCard title="Sync Success / Failure Statistics" icon={Activity} iconColor="text-emerald-600" rows={syncRows} summary={`Capture method and quality breakdown across all reports`} />
      <SectionCard title="Device Capability Validation" icon={Smartphone} iconColor="text-teal-600" rows={deviceRows} summary={`${uniqueDevices.size} distinct field devices assessed`} />
      <SectionCard title="GPS Availability Checks" icon={Crosshair} iconColor="text-amber-600" rows={gpsRows} summary={`${gpsReports.length} GPS-enabled reports · ${gflWithGps.length} GFL parcels with coordinates`} />
      <SectionCard title="Field Report Completeness Scoring" icon={FileText} iconColor="text-indigo-600" rows={completenessRows} summary={`${completenessScore}% overall completeness across ${fieldReports.length} reports`} />
    </div>
  );
}