/**
 * PHASE 1 TAKE-OFF — LandVault Duplicate Detection Engine v2
 * Triggered by entity automation on LandVaultParcel create/update
 * and EvidenceVault create.
 *
 * Enhanced with:
 * - Configurable GPS proximity radius (default 50m, param: 10-200m)
 * - Confidence scoring (0-100) for every alert
 * - Boundary/GeoJSON centroid proximity overlap check
 * - Duplicate parcel reference check
 * - Duplicate survey reference number check
 * - Survey plan URL cross-parcel matching
 * - Evidence SHA-256 hash matching
 * - Representative phone + NIN conflicts
 * - Family name + ward conflicts
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Haversine distance in metres ──
function haversineM(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── GeoJSON centroid extraction ──
function extractCentroid(geojsonStr) {
  try {
    const geo = typeof geojsonStr === 'string' ? JSON.parse(geojsonStr) : geojsonStr;
    if (!geo || geo.type !== 'Polygon' || !geo.coordinates?.[0]?.length) return null;
    const ring = geo.coordinates[0];
    let sumLat = 0, sumLng = 0;
    for (const [lng, lat] of ring) { sumLat += lat; sumLng += lng; }
    return { lat: sumLat / ring.length, lng: sumLng / ring.length };
  } catch { return null; }
}

// ── Confidence score calculator ──
function calcConfidence(alertType, distanceM, overlapPct) {
  switch (alertType) {
    case 'gps_proximity':
      if (distanceM === undefined || distanceM === null) return 50;
      if (distanceM < 5) return 98;
      if (distanceM < 15) return 90;
      if (distanceM < 30) return 80;
      if (distanceM < 50) return 70;
      return Math.max(50, 100 - distanceM); // decays beyond 50m
    case 'boundary_overlap':
      if (overlapPct === undefined || overlapPct === null) return 50;
      if (overlapPct > 90) return 99;
      if (overlapPct > 70) return 92;
      if (overlapPct > 50) return 85;
      return Math.max(60, overlapPct + 10);
    case 'survey_plan_duplicate':
    case 'evidence_hash_duplicate':
      return 99; // exact match = near-certain duplicate
    case 'survey_reference_duplicate':
      return 93;
    case 'parcel_reference_duplicate':
      return 96;
    case 'owner_duplicate':
      return 88; // NIN exact match is strong but could be legitimate multi-parcel owner
    case 'family_duplicate':
      return 72; // family+ward match is moderate evidence
    default:
      return 70;
  }
}

function confidenceLevel(score) {
  if (score >= 90) return 'HIGH';
  if (score >= 70) return 'MEDIUM';
  return 'LOW';
}

function alertTemplate(overrides) {
  return {
    detected_by: 'lvDuplicateDetection_v2',
    detected_at: new Date().toISOString(),
    status: 'open',
    ...overrides,
  };
}

// ── PARCEL-TO-PARCEL CHECKS ──
async function runParcelChecks(base44, parcel, allParcels, configRadius = 50) {
  const alerts = [];
  const others = allParcels.filter(p => p.id !== parcel.id);
  const srcCentroid = extractCentroid(parcel.geojson_polygon);

  for (const other of others) {
    // 1. GPS proximity
    if (parcel.gps_lat && other.gps_lat) {
      const dist = haversineM(parcel.gps_lat, parcel.gps_lng, other.gps_lat, other.gps_lng);
      if (dist < configRadius) {
        const conf = calcConfidence('gps_proximity', dist);
        alerts.push(alertTemplate({
          alert_type: 'gps_proximity',
          severity: dist < 10 ? 'critical' : 'high',
          confidence_score: conf,
          confidence_level: confidenceLevel(conf),
          source_parcel_id: parcel.id,
          source_parcel_number: parcel.parcel_number,
          conflicting_parcel_id: other.id,
          conflicting_parcel_number: other.parcel_number,
          gps_distance_m: Math.round(dist),
          detection_details: JSON.stringify({ distance_m: Math.round(dist), threshold_m: configRadius, algorithm: 'haversine' }),
          risk_score_impact: dist < 10 ? 40 : 25,
        }));
      }
    }

    // 2. Boundary overlap via GeoJSON centroid proximity
    if (parcel.geojson_polygon && other.geojson_polygon) {
      const otherCentroid = extractCentroid(other.geojson_polygon);
      if (srcCentroid && otherCentroid) {
        const centroidDist = haversineM(srcCentroid.lat, srcCentroid.lng, otherCentroid.lat, otherCentroid.lng);
        // Estimate overlap: closer centroids = higher likelihood of overlap
        if (centroidDist < 100) {
          const overlapEst = centroidDist < 10 ? 95 : centroidDist < 30 ? 80 : centroidDist < 60 ? 60 : 40;
          const conf = calcConfidence('boundary_overlap', null, overlapEst);
          alerts.push(alertTemplate({
            alert_type: 'boundary_overlap',
            severity: centroidDist < 30 ? 'critical' : 'high',
            confidence_score: conf,
            confidence_level: confidenceLevel(conf),
            source_parcel_id: parcel.id,
            source_parcel_number: parcel.parcel_number,
            conflicting_parcel_id: other.id,
            conflicting_parcel_number: other.parcel_number,
            overlap_percentage: overlapEst,
            gps_distance_m: Math.round(centroidDist),
            detection_details: JSON.stringify({ centroid_distance_m: Math.round(centroidDist), overlap_estimate_pct: overlapEst, algorithm: 'centroid_proximity' }),
            risk_score_impact: centroidDist < 30 ? 50 : 30,
          }));
        }
      }
    }

    // 3. Survey plan URL duplicate
    if (parcel.survey_plan_url && other.survey_plan_url && parcel.survey_plan_url === other.survey_plan_url) {
      const conf = calcConfidence('survey_plan_duplicate');
      alerts.push(alertTemplate({
        alert_type: 'survey_plan_duplicate',
        severity: 'critical',
        confidence_score: conf,
        confidence_level: confidenceLevel(conf),
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'survey_plan_url',
        duplicate_value_hint: parcel.survey_plan_url.slice(-20),
        detection_details: JSON.stringify({ field: 'survey_plan_url', match_type: 'exact' }),
        risk_score_impact: 50,
      }));
    }

    // 4. Parcel reference duplicate (same parcel_number segment)
    if (parcel.parcel_number && other.parcel_number) {
      const srcSegments = parcel.parcel_number.split('-');
      const otherSegments = other.parcel_number.split('-');
      if (srcSegments.length >= 3 && otherSegments.length >= 3) {
        const srcKey = srcSegments.slice(0, 3).join('-');
        const otherKey = otherSegments.slice(0, 3).join('-');
        if (srcKey === otherKey && srcSegments[3] === otherSegments[3]) {
          // Same STATE-LGA-WARD-PROPTYPE prefix — same sequence key
          const conf = calcConfidence('parcel_reference_duplicate');
          alerts.push(alertTemplate({
            alert_type: 'parcel_reference_duplicate',
            severity: 'high',
            confidence_score: conf,
            confidence_level: confidenceLevel(conf),
            source_parcel_id: parcel.id,
            source_parcel_number: parcel.parcel_number,
            conflicting_parcel_id: other.id,
            conflicting_parcel_number: other.parcel_number,
            duplicate_field: 'parcel_number_prefix',
            duplicate_value_hint: srcKey,
            detection_details: JSON.stringify({ prefix: srcKey, source_sequence: srcSegments[4], conflict_sequence: otherSegments[4] }),
            risk_score_impact: 30,
          }));
        }
      }
    }

    // 5. Duplicate survey reference check
    if (parcel.surveyor_id && other.surveyor_id && parcel.surveyor_id === other.surveyor_id &&
        parcel.survey_date && other.survey_date && parcel.survey_date === other.survey_date) {
      const conf = calcConfidence('survey_reference_duplicate');
      alerts.push(alertTemplate({
        alert_type: 'survey_reference_duplicate',
        severity: 'high',
        confidence_score: conf,
        confidence_level: confidenceLevel(conf),
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'surveyor_id+survey_date',
        duplicate_value_hint: `${parcel.surveyor_id} / ${parcel.survey_date}`,
        detection_details: JSON.stringify({ surveyor_id: parcel.surveyor_id, survey_date: parcel.survey_date }),
        risk_score_impact: 45,
      }));
    }

    // 6. Family name + ward conflict
    if (parcel.family_name && other.family_name &&
        parcel.family_name.toLowerCase().trim() === other.family_name.toLowerCase().trim() &&
        parcel.ward && other.ward &&
        parcel.ward.toLowerCase().trim() === other.ward.toLowerCase().trim()) {
      const conf = calcConfidence('family_duplicate');
      alerts.push(alertTemplate({
        alert_type: 'family_duplicate',
        severity: 'medium',
        confidence_score: conf,
        confidence_level: confidenceLevel(conf),
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'family_name+ward',
        duplicate_value_hint: `${parcel.family_name} / ${parcel.ward}`,
        detection_details: JSON.stringify({ family_name: parcel.family_name, ward: parcel.ward }),
        risk_score_impact: 15,
      }));
    }

    // 7. Owner NIN duplicate
    if (parcel.owner_nin && other.owner_nin && parcel.owner_nin === other.owner_nin) {
      const conf = calcConfidence('owner_duplicate');
      alerts.push(alertTemplate({
        alert_type: 'owner_duplicate',
        severity: 'high',
        confidence_score: conf,
        confidence_level: confidenceLevel(conf),
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'owner_nin',
        duplicate_value_hint: `NIN: ***${parcel.owner_nin.slice(-4)}`,
        detection_details: JSON.stringify({ field: 'owner_nin' }),
        risk_score_impact: 35,
      }));
    }

    // 8. Representative phone conflict
    if (parcel.owner_phone && other.owner_phone && parcel.owner_phone === other.owner_phone) {
      const conf = calcConfidence('owner_duplicate');
      alerts.push(alertTemplate({
        alert_type: 'owner_duplicate',
        severity: 'medium',
        confidence_score: conf,
        confidence_level: confidenceLevel(conf),
        source_parcel_id: parcel.id,
        source_parcel_number: parcel.parcel_number,
        conflicting_parcel_id: other.id,
        conflicting_parcel_number: other.parcel_number,
        duplicate_field: 'owner_phone',
        duplicate_value_hint: `Phone: ${parcel.owner_phone.slice(0,4)}***`,
        detection_details: JSON.stringify({ field: 'owner_phone' }),
        risk_score_impact: 20,
      }));
    }
  }
  return alerts;
}

// ── EVIDENCE HASH CHECK ──
async function runEvidenceHashCheck(base44, evidence, allEvidence) {
  if (!evidence.hash_fingerprint) return [];
  const conflicts = allEvidence.filter(e =>
    e.id !== evidence.id &&
    e.hash_fingerprint &&
    e.hash_fingerprint === evidence.hash_fingerprint
  );
  if (conflicts.length === 0) return [];

  const conf = calcConfidence('evidence_hash_duplicate');
  return [alertTemplate({
    alert_type: 'evidence_hash_duplicate',
    severity: 'critical',
    confidence_score: conf,
    confidence_level: confidenceLevel(conf),
    source_parcel_id: evidence.parcel_id,
    source_parcel_number: evidence.parcel_number,
    source_evidence_id: evidence.id,
    conflicting_evidence_id: conflicts[0].id,
    conflicting_parcel_id: conflicts[0].parcel_id,
    conflicting_parcel_number: conflicts[0].parcel_number,
    duplicate_field: 'hash_fingerprint',
    duplicate_value_hint: `SHA-256: ${evidence.hash_fingerprint.slice(0,16)}…`,
    detection_details: JSON.stringify({ hash_prefix: evidence.hash_fingerprint.slice(0,16), match_count: conflicts.length, algorithm: 'SHA-256' }),
    risk_score_impact: 60,
  })];
}

// ── MAIN ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const eventType = body.event_type || (body.data?.hash_fingerprint ? 'evidence' : 'parcel');
    const entityId = body.entity_id || body.event?.entity_id;
    const configRadius = body.gps_radius_m || 50;

    if (!entityId) return Response.json({ status: 'no_entity_id', version: 'v2' });

    let newAlerts = [];

    if (eventType === 'evidence') {
      const evidenceList = await base44.asServiceRole.entities.EvidenceVault.filter({ id: entityId });
      const evidence = evidenceList[0];
      if (!evidence) return Response.json({ status: 'no_record', entity_id: entityId, version: 'v2' });
      const allEvidence = await base44.asServiceRole.entities.EvidenceVault.list('-created_date', 2000);
      newAlerts = await runEvidenceHashCheck(base44, evidence, allEvidence);
    } else {
      const parcelList = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: entityId });
      const parcel = parcelList[0];
      if (!parcel) return Response.json({ status: 'no_record', entity_id: entityId, version: 'v2' });
      const allParcels = await base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 2000);
      newAlerts = await runParcelChecks(base44, parcel, allParcels, configRadius);
    }

    // Deduplicate against existing open alerts
    const existingAlerts = await base44.asServiceRole.entities.DuplicateAlert.filter({ status: 'open' });

    let created = 0;
    const generated = [];

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
        generated.push({
          alert_type: alert.alert_type,
          confidence_score: alert.confidence_score,
          confidence_level: alert.confidence_level,
          source: alert.source_parcel_number,
          conflict: alert.conflicting_parcel_number,
        });
      }
    }

    // Log usage event
    try {
      await base44.asServiceRole.entities.UsageEvent.create({
        user_id: 'system',
        user_email: 'system@landvault',
        user_role: 'system',
        event_type: 'duplicate_review',
        timestamp: new Date().toISOString(),
        parcel_id: entityId,
        parcel_number: eventType === 'parcel' ? (await base44.asServiceRole.entities.LandVaultParcel.filter({ id: entityId }))[0]?.parcel_number : null,
        credits_consumed: 1,
        metadata: JSON.stringify({ alerts_created: created, alerts_checked: newAlerts.length, event_type: eventType }),
      });
    } catch { /* usage tracking is best-effort */ }

    return Response.json({
      status: 'completed',
      version: 'v2',
      alerts_created: created,
      alerts_checked: newAlerts.length,
      alerts: generated,
      engine_version: '2.0.0',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});