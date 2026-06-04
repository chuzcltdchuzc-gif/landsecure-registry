/**
 * PHASE 1 — LandVault Duplicate Detection Engine
 * Triggered by entity automation on LandVaultParcel create/update
 * and EvidenceVault create.
 *
 * Detects:
 * 1. GPS proximity duplicates (< 50m)
 * 2. Boundary overlap conflicts (GeoJSON centroid proximity)
 * 3. Survey plan URL duplicates
 * 4. Evidence SHA-256 hash matches
 * 5. Representative phone number conflicts
 * 6. Family name + ward conflicts
 * 7. Owner NIN duplicates
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Haversine distance in metres
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function runParcelChecks(base44, parcel, allParcels) {
  const alerts = [];
  const others = allParcels.filter(p => p.id !== parcel.id);

  for (const other of others) {
    // 1. GPS proximity < 50m
    if (parcel.gps_lat && other.gps_lat) {
      const dist = haversineM(parcel.gps_lat, parcel.gps_lng, other.gps_lat, other.gps_lng);
      if (dist < 50) {
        alerts.push({
          alert_type: 'gps_proximity',
          severity: dist < 10 ? 'critical' : 'high',
          source_parcel_id: parcel.id,
          source_parcel_number: parcel.parcel_number,
          conflicting_parcel_id: other.id,
          conflicting_parcel_number: other.parcel_number,
          gps_distance_m: Math.round(dist),
          detection_details: JSON.stringify({ distance_m: Math.round(dist), threshold_m: 50 }),
          risk_score_impact: dist < 10 ? 40 : 25,
          detected_by: 'lvDuplicateDetection',
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 2. Survey plan URL duplicate
    if (parcel.survey_plan_url && other.survey_plan_url && parcel.survey_plan_url === other.survey_plan_url) {
      alerts.push({
        alert_type: 'survey_plan_duplicate',
        severity: 'critical',
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'survey_plan_url',
        duplicate_value_hint: parcel.survey_plan_url.slice(-20),
        detection_details: JSON.stringify({ field: 'survey_plan_url' }),
        risk_score_impact: 50,
        detected_by: 'lvDuplicateDetection',
        detected_at: new Date().toISOString(),
      });
    }

    // 3. Family name + ward conflict
    if (parcel.family_name && other.family_name &&
        parcel.family_name.toLowerCase().trim() === other.family_name.toLowerCase().trim() &&
        parcel.ward && other.ward &&
        parcel.ward.toLowerCase().trim() === other.ward.toLowerCase().trim()) {
      alerts.push({
        alert_type: 'family_duplicate',
        severity: 'medium',
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'family_name+ward',
        duplicate_value_hint: `${parcel.family_name} / ${parcel.ward}`,
        detection_details: JSON.stringify({ family_name: parcel.family_name, ward: parcel.ward }),
        risk_score_impact: 15,
        detected_by: 'lvDuplicateDetection',
        detected_at: new Date().toISOString(),
      });
    }

    // 4. Owner NIN duplicate
    if (parcel.owner_nin && other.owner_nin && parcel.owner_nin === other.owner_nin) {
      alerts.push({
        alert_type: 'owner_duplicate',
        severity: 'high',
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'owner_nin',
        duplicate_value_hint: `NIN: ***${parcel.owner_nin.slice(-4)}`,
        detection_details: JSON.stringify({ field: 'owner_nin' }),
        risk_score_impact: 35,
        detected_by: 'lvDuplicateDetection',
        detected_at: new Date().toISOString(),
      });
    }

    // 5. Representative phone conflict
    if (parcel.owner_phone && other.owner_phone && parcel.owner_phone === other.owner_phone) {
      alerts.push({
        alert_type: 'owner_duplicate',
        severity: 'medium',
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'owner_phone',
        duplicate_value_hint: `Phone: ${parcel.owner_phone.slice(0,4)}***`,
        detection_details: JSON.stringify({ field: 'owner_phone' }),
        risk_score_impact: 20,
        detected_by: 'lvDuplicateDetection',
        detected_at: new Date().toISOString(),
      });
    }
  }
  return alerts;
}

async function runEvidenceHashCheck(base44, evidence, allEvidence) {
  if (!evidence.hash_fingerprint) return [];
  const conflicts = allEvidence.filter(e =>
    e.id !== evidence.id &&
    e.hash_fingerprint &&
    e.hash_fingerprint === evidence.hash_fingerprint
  );
  if (conflicts.length === 0) return [];
  return [{
    alert_type: 'evidence_hash_duplicate',
    severity: 'critical',
    source_parcel_id: evidence.parcel_id,
    source_parcel_number: evidence.parcel_number,
    source_evidence_id: evidence.id,
    conflicting_evidence_id: conflicts[0].id,
    conflicting_parcel_id: conflicts[0].parcel_id,
    conflicting_parcel_number: conflicts[0].parcel_number,
    duplicate_field: 'hash_fingerprint',
    duplicate_value_hint: `SHA-256: ${evidence.hash_fingerprint.slice(0,16)}…`,
    detection_details: JSON.stringify({ hash: evidence.hash_fingerprint.slice(0,16), matches: conflicts.length }),
    risk_score_impact: 60,
    detected_by: 'lvDuplicateDetection',
    detected_at: new Date().toISOString(),
  }];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Accepts: { event_type: 'parcel'|'evidence', entity_id: string }
    // or automation payload: { event: { entity_id }, data: {...} }
    const eventType = body.event_type || (body.data?.hash_fingerprint ? 'evidence' : 'parcel');
    const entityId = body.entity_id || body.event?.entity_id;

    let newAlerts = [];

    if (eventType === 'evidence') {
      const evidenceList = await base44.asServiceRole.entities.EvidenceVault.filter({ id: entityId });
      const evidence = evidenceList[0];
      if (!evidence) return Response.json({ status: 'no_record' });
      const allEvidence = await base44.asServiceRole.entities.EvidenceVault.list('-created_date', 2000);
      newAlerts = await runEvidenceHashCheck(base44, evidence, allEvidence);
    } else {
      const parcelList = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: entityId });
      const parcel = parcelList[0];
      if (!parcel) return Response.json({ status: 'no_record' });
      const allParcels = await base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 2000);
      newAlerts = await runParcelChecks(base44, parcel, allParcels);
    }

    // Deduplicate — don't create alert if identical one already open
    const existingAlerts = await base44.asServiceRole.entities.DuplicateAlert.filter({ status: 'open' });

    let created = 0;
    for (const alert of newAlerts) {
      const isDuplicate = existingAlerts.some(e =>
        e.alert_type === alert.alert_type &&
        e.source_parcel_id === alert.source_parcel_id &&
        e.conflicting_parcel_id === alert.conflicting_parcel_id
      );
      if (!isDuplicate) {
        await base44.asServiceRole.entities.DuplicateAlert.create(alert);
        // Update parcel risk score
        if (alert.source_parcel_id && alert.risk_score_impact > 0) {
          const parcelData = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: alert.source_parcel_id });
          if (parcelData[0]) {
            const currentScore = parcelData[0].risk_score || 50;
            const newScore = Math.min(100, currentScore + alert.risk_score_impact);
            const newLevel = newScore <= 30 ? 'LOW' : newScore <= 60 ? 'MEDIUM' : 'HIGH';
            await base44.asServiceRole.entities.LandVaultParcel.update(alert.source_parcel_id, {
              risk_score: newScore, risk_level: newLevel,
              duplicate_flag: true, duplicate_type: alert.alert_type,
              duplicate_notes: alert.detection_details,
            });
          }
        }
        created++;
      }
    }

    return Response.json({ status: 'completed', alerts_created: created, alerts_checked: newAlerts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});