/**
 * PHASE 2 — Evidence Confidence Engine
 *
 * Calculates an Evidence Confidence Score (0-100) for every LandVaultParcel
 * based on the completeness and quality of captured evidence.
 *
 * Scoring factors:
 *   Surveyor verified        = +25
 *   Valid surveyor licence   = +10
 *   GPS coordinates present  = +10
 *   Consent captured         = +10
 *   Signature captured       = +10
 *   Photo evidence present   = +10
 *   Witness recorded         = +10
 *   Community confirmed      = +10
 *   Evidence hash generated  = +5
 *   Chain-of-custody complete = +10
 *   MAX: 100
 *
 * Confidence Levels:
 *   90–100 = VERIFIED
 *   70–89  = STRONG
 *   50–69  = MODERATE
 *   0–49   = LIMITED
 *
 * Called by: entity automation (LandVaultParcel create/update)
 * Also callable manually for batch recalculation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcEvidenceConfidence(parcel, evidenceItems) {
  let score = 0;
  const reasons = [];

  // Surveyor verified (+25)
  if (parcel.survey_status === 'completed' && parcel.surveyor_name) {
    score += 25;
    reasons.push('surveyor_verified');
  }

  // Valid surveyor licence (+10)
  if (parcel.surveyor_licence && parcel.surveyor_licence.trim().length > 3) {
    score += 10;
    reasons.push('valid_surveyor_licence');
  }

  // GPS coordinates present (+10)
  if (parcel.gps_lat && parcel.gps_lng) {
    score += 10;
    reasons.push('gps_coordinates_present');
  }

  // Consent captured — verbal consent recorded (+10)
  if (parcel.consent_verbal) {
    score += 10;
    reasons.push('consent_captured');
  }

  // Signature captured (+10)
  if (parcel.consent_signature_captured) {
    score += 10;
    reasons.push('signature_captured');
  }

  // Photo evidence present (+10)
  if (parcel.consent_photo_captured || (parcel.photos && parcel.photos.length > 0)) {
    score += 10;
    reasons.push('photo_evidence_present');
  }

  // Witness recorded (+10)
  if (parcel.consent_witness_name && parcel.consent_witness_name.trim().length > 0) {
    score += 10;
    reasons.push('witness_recorded');
  }

  // Community attested — weighted by attestation depth
  // DEEP attestation = +25, STRONG = +20, MODERATE = +15, LIGHT = +10
  // Uses attestation_score calculated by lvCommunityAttestationScore
  if (parcel.community_confirmed) {
    const attestationScore = parcel.attestation_score || 0;
    if (attestationScore >= 85) {
      score += 25;
      reasons.push('community_attestation_deep');
    } else if (attestationScore >= 60) {
      score += 20;
      reasons.push('community_attestation_strong');
    } else if (attestationScore >= 35) {
      score += 15;
      reasons.push('community_attestation_moderate');
    } else {
      score += 10;
      reasons.push('community_attestation_light');
    }
  }

  // Evidence hash generated — check if any sealed evidence exists (+5)
  const hasHashedEvidence = evidenceItems.some(e => e.hash_fingerprint && e.seal_status === 'SEALED');
  if (hasHashedEvidence) {
    score += 5;
    reasons.push('evidence_hash_generated');
  }

  // Chain-of-custody complete — at least 2 custody events (+10)
  const hasCompleteCustody = evidenceItems.some(e => {
    if (!e.custody_chain) return false;
    try {
      const chain = typeof e.custody_chain === 'string' ? JSON.parse(e.custody_chain) : e.custody_chain;
      return Array.isArray(chain) && chain.length >= 2;
    } catch { return false; }
  });
  if (hasCompleteCustody) {
    score += 10;
    reasons.push('chain_of_custody_complete');
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine level
  let level;
  if (score >= 90) level = 'VERIFIED';
  else if (score >= 70) level = 'STRONG';
  else if (score >= 50) level = 'MODERATE';
  else level = 'LIMITED';

  return { score, level, reasons, max_possible: 110, capped: score >= 100 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    let results = [];

    // Batch mode: recalculate all parcels
    if (body.mode === 'batch') {
      const allParcels = await base44.asServiceRole.entities.LandVaultParcel.list('-updated_date', 2000);
      const allEvidence = await base44.asServiceRole.entities.EvidenceVault.list('-created_date', 5000);

      for (const parcel of allParcels) {
        const parcelEvidence = allEvidence.filter(e => e.parcel_id === parcel.id);
        const { score, level, reasons } = calcEvidenceConfidence(parcel, parcelEvidence);

        await base44.asServiceRole.entities.LandVaultParcel.update(parcel.id, {
          evidence_confidence_score: score,
          evidence_confidence_level: level,
          risk_score: score, // risk_score tracks evidence confidence inversely
        });

        results.push({ parcel_id: parcel.id, parcel_number: parcel.parcel_number, score, level });
      }

      return Response.json({
        status: 'batch_completed',
        parcels_processed: results.length,
        distribution: {
          VERIFIED: results.filter(r => r.level === 'VERIFIED').length,
          STRONG: results.filter(r => r.level === 'STRONG').length,
          MODERATE: results.filter(r => r.level === 'MODERATE').length,
          LIMITED: results.filter(r => r.level === 'LIMITED').length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Single parcel mode — from entity automation or manual call
    const entityId = body.entity_id || body.event?.entity_id || body.parcel_id;
    if (!entityId) {
      return Response.json({ error: 'entity_id or parcel_id required' }, { status: 400 });
    }

    const parcelList = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: entityId });
    const parcel = parcelList[0];
    if (!parcel) return Response.json({ error: 'Parcel not found' }, { status: 404 });

    const evidence = await base44.asServiceRole.entities.EvidenceVault.filter({ parcel_id: entityId });
    const { score, level, reasons } = calcEvidenceConfidence(parcel, evidence);

    await base44.asServiceRole.entities.LandVaultParcel.update(entityId, {
      evidence_confidence_score: score,
      evidence_confidence_level: level,
    });

    return Response.json({
      status: 'completed',
      parcel_id: entityId,
      parcel_number: parcel.parcel_number,
      evidence_confidence_score: score,
      evidence_confidence_level: level,
      scoring_factors: reasons,
      evidence_count: evidence.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});