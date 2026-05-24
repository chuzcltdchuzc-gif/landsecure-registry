import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Wifi, Navigation, FileText, CheckCircle2 } from "lucide-react";
import { SectionCard, S } from "./PilotShared";

export default function FieldOpsTab({ data }) {
  const { fieldReports, parcels } = data;

  const gfl = parcels.filter(p => p.lga === "Greenfield Local Government");
  const submitted = fieldReports.filter(r => r.status === "submitted" || r.status === "reviewed");
  const synced = fieldReports.filter(r => r.network_status === "synced_offline");
  const offline = fieldReports.filter(r => r.network_status === "offline");
  const online = fieldReports.filter(r => r.network_status === "online");
  const failedQuality = fieldReports.filter(r => r.quality_flag === "fail");
  const warnQuality = fieldReports.filter(r => r.quality_flag === "warn");
  const passQuality = fieldReports.filter(r => r.quality_flag === "pass" || !r.quality_flag);

  // ── Offline capture readiness ──────────────────────────────────────────
  const offlineCaptured = fieldReports.filter(r => r.network_status === "offline" || r.network_status === "synced_offline");
  const offlineSynced = fieldReports.filter(r => r.network_status === "synced_offline");
  const offlineFailed = offlineCaptured.filter(r => r.network_status === "offline"); // still offline = sync not yet done
  const captureMethodAuto = fieldReports.filter(r => r.capture_method === "gps_auto");
  const captureMethodManual = fieldReports.filter(r => r.capture_method === "manual_entry");
  const captureMethodImported = fieldReports.filter(r => r.capture_method === "imported");

  // ── Sync statistics ─────────────────────────────────────────────────────
  const syncSuccessRate = offlineCaptured.length > 0
    ? Math.round(offlineSynced.length / offlineCaptured.length * 100) : 100;

  const deviceIds = new Set(fieldReports.filter(r => r.device_identifier).map(r => r.device_identifier));
  const noDevice = fieldReports.filter(r => !r.device_identifier);
  const multipleDevicesPerParcel = {};
  fieldReports.forEach(r => {
    if (!multipleDevicesPerParcel[r.parcel_id]) multipleDevicesPerParcel[r.parcel_id] = new Set();
    if (r.device_identifier) multipleDevicesPerParcel[r.parcel_id].add(r.device_identifier);
  });
  const parcelsMultiDevice = Object.entries(multipleDevicesPerParcel).filter(([, devices]) => devices.size > 1).length;

  // ── GPS availability ────────────────────────────────────────────────────
  const withGps = fieldReports.filter(r => r.latitude && r.longitude);
  const noGps = fieldReports.filter(r => !(r.latitude && r.longitude));
  const gpsAutoCapture = fieldReports.filter(r => r.capture_method === "gps_auto" && r.latitude && r.longitude);
  const withAccuracy = fieldReports.filter(r => r.gps_accuracy !== null && r.gps_accuracy !== undefined);
  const highAccuracy = withAccuracy.filter(r => r.gps_accuracy <= 5);
  const medAccuracy = withAccuracy.filter(r => r.gps_accuracy > 5 && r.gps_accuracy <= 10);
  const poorAccuracy = withAccuracy.filter(r => r.gps_accuracy > 10);
  const noTimestamp = fieldReports.filter(r => !r.capture_timestamp);

  // ── Report completeness scoring ─────────────────────────────────────────
  function completenessScore(r) {
    const fields = [r.description, r.latitude, r.longitude, r.report_type, r.parcel_id, r.agent_email];
    return fields.filter(Boolean).length;
  }
  const fullyComplete = fieldReports.filter(r => completenessScore(r) >= 6);
  const mostlyComplete = fieldReports.filter(r => completenessScore(r) === 5);
  const incomplete = fieldReports.filter(r => completenessScore(r) <= 4);
  const noDescription = fieldReports.filter(r => !r.description);
  const noAgent = fieldReports.filter(r => !r.agent_email);
  const noPhotos = fieldReports.filter(r => !r.photos || r.photos.length === 0);
  const withPhotos = fieldReports.filter(r => r.photos && r.photos.length > 0);
  const noReportType = fieldReports.filter(r => !r.report_type);

  // Report type distribution
  const reportTypes = {};
  fieldReports.forEach(r => {
    if (r.report_type) reportTypes[r.report_type] = (reportTypes[r.report_type] || 0) + 1;
  });

  const offlineRows = [
    { label: "Total field reports captured", checked: fieldReports.length, passed: submitted.length, failed: fieldReports.filter(r => r.status === "flagged").length, sampleIds: fieldReports.filter(r => r.status === "flagged").slice(0, 5).map(r => r.id), evidence: `${submitted.length} submitted · ${fieldReports.filter(r => r.status === "draft").length} still draft · ${fieldReports.filter(r => r.status === "flagged").length} flagged`, status: fieldReports.length >= 50 ? S.ok : S.warn },
    { label: "Offline-captured reports present", checked: fieldReports.length, passed: offlineCaptured.length, failed: 0, sampleIds: [], evidence: `${offlineCaptured.length} reports captured offline · demonstrates offline readiness`, status: offlineCaptured.length > 0 ? S.ok : S.warn },
    { label: "Offline reports synced successfully", checked: offlineCaptured.length, passed: offlineSynced.length, failed: offlineFailed.length, sampleIds: offlineFailed.slice(0, 5).map(r => r.id), evidence: `${syncSuccessRate}% sync success rate · ${offlineFailed.length} reports remain unsynced`, status: syncSuccessRate >= 90 ? S.ok : syncSuccessRate >= 70 ? S.warn : S.fail },
    { label: "GPS auto-capture used (vs manual entry)", checked: fieldReports.length, passed: captureMethodAuto.length, failed: captureMethodManual.length, sampleIds: [], evidence: `${captureMethodAuto.length} auto-GPS · ${captureMethodManual.length} manual entry · ${captureMethodImported.length} imported`, status: captureMethodAuto.length >= captureMethodManual.length ? S.ok : S.warn },
  ];

  const syncRows = [
    { label: "Sync success rate (offline → synced)", checked: offlineCaptured.length, passed: offlineSynced.length, failed: offlineFailed.length, sampleIds: offlineFailed.slice(0, 5).map(r => r.id), evidence: `${syncSuccessRate}% of offline-captured reports successfully synced to server`, status: syncSuccessRate >= 90 ? S.ok : syncSuccessRate >= 70 ? S.warn : S.fail },
    { label: "Unique devices reporting", checked: fieldReports.length, passed: deviceIds.size, failed: noDevice.length, sampleIds: noDevice.slice(0, 5).map(r => r.id), evidence: `${deviceIds.size} unique device identifiers · ${noDevice.length} reports without device_id`, status: deviceIds.size > 0 ? S.ok : S.warn },
    { label: "Reports with device_identifier recorded", checked: fieldReports.length, passed: fieldReports.length - noDevice.length, failed: noDevice.length, sampleIds: noDevice.slice(0, 5).map(r => r.id), evidence: `${noDevice.length} reports have no device identifier — cannot trace capture source`, status: noDevice.length === 0 ? S.ok : noDevice.length < 10 ? S.warn : S.fail },
    { label: "Parcels visited by multiple devices", checked: Object.keys(multipleDevicesPerParcel).length, passed: parcelsMultiDevice, failed: 0, sampleIds: [], evidence: `${parcelsMultiDevice} parcels have field reports from multiple devices — cross-verification available`, status: S.ok },
  ];

  const gpsRows = [
    { label: "Field reports with GPS coordinates", checked: fieldReports.length, passed: withGps.length, failed: noGps.length, sampleIds: noGps.slice(0, 5).map(r => r.id), evidence: `${Math.round(withGps.length / Math.max(fieldReports.length, 1) * 100)}% GPS availability`, status: withGps.length / Math.max(fieldReports.length, 1) >= 0.8 ? S.ok : S.warn },
    { label: "Reports with capture timestamp", checked: fieldReports.length, passed: fieldReports.length - noTimestamp.length, failed: noTimestamp.length, sampleIds: noTimestamp.slice(0, 5).map(r => r.id), evidence: `${noTimestamp.length} reports missing capture_timestamp — cannot verify time of capture`, status: noTimestamp.length === 0 ? S.ok : S.warn },
    { label: "GPS accuracy ≤5m (survey-grade)", checked: withAccuracy.length, passed: highAccuracy.length, failed: poorAccuracy.length, sampleIds: poorAccuracy.slice(0, 5).map(r => r.id), evidence: `${highAccuracy.length} high · ${medAccuracy.length} medium · ${poorAccuracy.length} poor (>10m) accuracy`, status: poorAccuracy.length === 0 ? S.ok : poorAccuracy.length < 5 ? S.warn : S.fail },
    { label: "GPS auto-capture method used", checked: fieldReports.length, passed: gpsAutoCapture.length, failed: 0, sampleIds: [], evidence: `${gpsAutoCapture.length} reports with gps_auto capture — device GPS functioning`, status: gpsAutoCapture.length > 0 ? S.ok : S.warn },
  ];

  const completenessRows = [
    { label: "Fully complete field reports (all 6 core fields)", checked: fieldReports.length, passed: fullyComplete.length, failed: incomplete.length, sampleIds: incomplete.slice(0, 5).map(r => r.id), evidence: `${fullyComplete.length} fully complete · ${mostlyComplete.length} mostly complete · ${incomplete.length} incomplete (<5 fields)`, status: fullyComplete.length / Math.max(fieldReports.length, 1) >= 0.7 ? S.ok : S.warn },
    { label: "Reports with description", checked: fieldReports.length, passed: fieldReports.length - noDescription.length, failed: noDescription.length, sampleIds: noDescription.slice(0, 5).map(r => r.id), evidence: `${noDescription.length} reports missing description field`, status: noDescription.length === 0 ? S.ok : S.warn },
    { label: "Reports with agent email", checked: fieldReports.length, passed: fieldReports.length - noAgent.length, failed: noAgent.length, sampleIds: noAgent.slice(0, 5).map(r => r.id), evidence: `${noAgent.length} reports not attributed to an agent`, status: noAgent.length === 0 ? S.ok : S.warn },
    { label: "Reports with photos attached", checked: fieldReports.length, passed: withPhotos.length, failed: noPhotos.length, sampleIds: noPhotos.slice(0, 5).map(r => r.id), evidence: `${withPhotos.length} reports have photos · ${noPhotos.length} have no photographic evidence`, status: withPhotos.length / Math.max(fieldReports.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "Report type diversity (types in use)", checked: fieldReports.length, passed: Object.keys(reportTypes).length, failed: noReportType.length, sampleIds: noReportType.slice(0, 5).map(r => r.id), evidence: `Types: ${Object.entries(reportTypes).map(([t, n]) => `${t}(${n})`).join(", ")}`, status: Object.keys(reportTypes).length >= 3 ? S.ok : S.warn },
    { label: "Quality flag: PASS", checked: fieldReports.length, passed: passQuality.length, failed: failedQuality.length, sampleIds: failedQuality.slice(0, 5).map(r => r.id), evidence: `${passQuality.length} pass · ${warnQuality.length} warn · ${failedQuality.length} fail quality flag`, status: failedQuality.length === 0 ? S.ok : failedQuality.length < 5 ? S.warn : S.fail },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {[
          { label: "Total Field Reports", value: fieldReports.length, color: "text-blue-700" },
          { label: "Offline Captured", value: offlineCaptured.length, color: "text-purple-700" },
          { label: "Sync Success Rate", value: `${syncSuccessRate}%`, color: syncSuccessRate >= 90 ? "text-emerald-700" : "text-amber-700" },
          { label: "GPS Available", value: `${Math.round(withGps.length / Math.max(fieldReports.length, 1) * 100)}%`, color: "text-teal-700" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center"><p className={`text-2xl font-black ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <SectionCard title="Offline Capture Readiness" icon={Wifi} iconColor="text-purple-600" rows={offlineRows} summary={`${offlineCaptured.length} offline-captured reports · sync success: ${syncSuccessRate}%`} />
      <SectionCard title="Sync Success / Failure Statistics" icon={Smartphone} iconColor="text-blue-600" rows={syncRows} summary={`${deviceIds.size} unique devices · ${offlineSynced.length} successfully synced`} />
      <SectionCard title="GPS Availability Checks" icon={Navigation} iconColor="text-teal-600" rows={gpsRows} summary={`${withGps.length} of ${fieldReports.length} reports have GPS coordinates`} />
      <SectionCard title="Field Report Completeness Scoring" icon={FileText} iconColor="text-indigo-600" rows={completenessRows} summary={`${fullyComplete.length} fully complete · ${incomplete.length} incomplete reports`} />
    </div>
  );
}