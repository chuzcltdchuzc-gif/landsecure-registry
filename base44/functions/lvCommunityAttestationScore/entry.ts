/**
 * PRIORITY 2 — Community Attestation Engine
 *
 * Scores the depth and quality of community attestation for every LandVaultParcel.
 * Attestation is MULTIPLICATIVE, not additive:
 *   - 1 attestation layer = 15 (weak corroboration)
 *   - 2 attestation layers = 35 (cross-corroboration begins)
 *   - 3 attestation layers = 60 (strong community consensus)
 *   - 4+ attestation layers = 85 (comprehensive community validation)
 *
 * Layers: community_elder, village_head, ward_head, traditional_ruler, cdc_chairman
 *
 * Additional scoring factors:
 *   - Traditional authority validation (separate entity) = +15
 *   - Community consent formally granted = +10
 *   - Family representative attested = +5
 *
 * Maximum score: 100
 *
 * Attestation Depth Levels:
 *   85–100 = DEEP (comprehensive multi-layer attestation)
 *   60–84  = STRONG (multiple independent attestations)
 *   35–59  = MODERATE (at least two attestation sources)
 *   15–34  = LIGHT (single attestation layer)
 *   0–14   = NONE (no community attestation)
 *
 * Called by: entity automation (CommunityValidation create/update, TraditionalAuthorityValidation create/update)
 * Also callable manually for batch recalculation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcAttestationScore(communityValidations, tradAuthorityValidations, parcel, communityConsents) {
  let score = 0;
  const layers = [];
  const reasons = [];

  // Count distinct attestation layers completed on CommunityValidation records
  const completedValidations = communityValidations.filter(cv =>
    cv.status === 'approved' || cv.status === 'community_review'
  );

  for (const cv of completedValidations) {
    if (cv.community_elder && !layers.includes('community_elder')) {
      layers.push('community_elder');
      reasons.push('community_elder_attested');
    }
    if (cv.village_head && !layers.includes('village_head')) {
      layers.push('village_head');
      reasons.push('village_head_attested');
    }
    if (cv.ward_head && !layers.includes('ward_head')) {
      layers.push('ward_head');
      reasons.push('ward_head_attested');
    }
    if (cv.traditional_ruler && !layers.includes('traditional_ruler')) {
      layers.push('traditional_ruler');
      reasons.push('traditional_ruler_attested');
    }
    if (cv.cdc_chairman && !layers.includes('cdc_chairman')) {
      layers.push('cdc_chairman');
      reasons.push('cdc_chairman_attested');
    }
  }

  // Multiplicative scoring based on distinct layer count
  const layerCount = layers.length;
  if (layerCount >= 4) {
    score += 85;
    reasons.push('comprehensive_attestation_4plus_layers');
  } else if (layerCount === 3) {
    score += 60;
    reasons.push('strong_attestation_3_layers');
  } else if (layerCount === 2) {
    score += 35;
    reasons.push('moderate_attestation_2_layers');
  } else if (layerCount === 1) {
    score += 15;
    reasons.push('light_attestation_1_layer');
  }

  // Traditional authority validation (separate entity) - bonus on top of layer scoring
  const approvedTrad = tradAuthorityValidations.filter(tv =>
    tv.validation_status === 'approved' || tv.validation_status === 'conditionally_approved'
  );
  if (approvedTrad.length > 0) {
    score += 15;
    reasons.push('traditional_authority_formal_validation');
  }

  // Community consent formally granted
  const grantedConsents = communityConsents.filter(cc =>
    cc.status === 'granted' && cc.parcel_id === parcel.id
  );
  if (grantedConsents.length > 0) {
    score += 10;
    reasons.push('community_consent_granted');
  }

  // Family representative attested (from CommunityValidation)
  const hasFamilyRep = completedValidations.some(cv => cv.family_representative);
  if (hasFamilyRep) {
    score += 5;
    reasons.push('family_representative_attested');
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine attestation depth level
  let level;
  if (score >= 85) level = 'DEEP';
  else if (score >= 60) level = 'STRONG';
  else if (score >= 35) level = 'MODERATE';
  else if (score >= 15) level = 'LIGHT';
  else level = 'NONE';

  return {
    attestation_score: score,
    attestation_level: level,
    attestation_layers: layers,
    attestation_layer_count: layerCount,
    scoring_factors: reasons,
    max_possible: 115,
    capped: score >= 100,
    trad_authority_count: approvedTrad.length,
    consent_count: grantedConsents.length,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    let results = [];

    // Batch mode: recalculate all parcels
    if (body.mode === 'batch') {
      const allParcels = await base44.asServiceRole.entities.LandVaultParcel.list('-updated_date', 2000);
      const allCommunityValidations = await base44.asServiceRole.entities.CommunityValidation.list('-updated_date', 5000);
      const allTradAuthority = await base44.asServiceRole.entities.TraditionalAuthorityValidation.list('-updated_date', 3000);
      const allConsents = await base44.asServiceRole.entities.CommunityConsent.filter({ status: 'granted' });

      for (const parcel of allParcels) {
        const parcelCVs = allCommunityValidations.filter(cv => cv.parcel_id === parcel.id);
        const parcelTrad = allTradAuthority.filter(tv => tv.parcel_id === parcel.id);
        const parcelConsents = allConsents.filter(cc => cc.parcel_id === parcel.id);

        const { attestation_score, attestation_level, attestation_layers, attestation_layer_count, scoring_factors } =
          calcAttestationScore(parcelCVs, parcelTrad, parcel, parcelConsents);

        await base44.asServiceRole.entities.LandVaultParcel.update(parcel.id, {
          community_validation_status: attestation_level === 'NONE' ? 'pending' : 'confirmed',
          community_confirmed: attestation_level !== 'NONE',
          community_confirmed_by: attestation_level !== 'NONE' ? 'attestation_engine' : undefined,
          community_confirmed_at: attestation_level !== 'NONE' ? new Date().toISOString() : undefined,
          attestation_score,
          attestation_level,
          attestation_layer_count,
        });

        results.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          attestation_score,
          attestation_level,
          attestation_layer_count,
          layers: attestation_layers,
        });
      }

      return Response.json({
        status: 'batch_completed',
        parcels_processed: results.length,
        distribution: {
          DEEP: results.filter(r => r.attestation_level === 'DEEP').length,
          STRONG: results.filter(r => r.attestation_level === 'STRONG').length,
          MODERATE: results.filter(r => r.attestation_level === 'MODERATE').length,
          LIGHT: results.filter(r => r.attestation_level === 'LIGHT').length,
          NONE: results.filter(r => r.attestation_level === 'NONE').length,
        },
        total_layers_found: results.reduce((s, r) => s + r.attestation_layer_count, 0),
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

    const communityValidations = await base44.asServiceRole.entities.CommunityValidation.filter({ parcel_id: entityId });
    const tradAuthority = await base44.asServiceRole.entities.TraditionalAuthorityValidation.filter({ parcel_id: entityId });
    const consents = await base44.asServiceRole.entities.CommunityConsent.filter({ parcel_id: entityId, status: 'granted' });

    const { attestation_score, attestation_level, attestation_layers, attestation_layer_count, scoring_factors, trad_authority_count, consent_count } =
      calcAttestationScore(communityValidations, tradAuthority, parcel, consents);

    // Update parcel attestation status
    await base44.asServiceRole.entities.LandVaultParcel.update(entityId, {
      community_validation_status: attestation_level === 'NONE' ? 'pending' : 'confirmed',
      community_confirmed: attestation_level !== 'NONE',
      community_confirmed_by: attestation_level !== 'NONE' ? 'attestation_engine' : undefined,
      community_confirmed_at: attestation_level !== 'NONE' ? new Date().toISOString() : undefined,
    });

    return Response.json({
      status: 'completed',
      parcel_id: entityId,
      parcel_number: parcel.parcel_number,
      attestation_score,
      attestation_level,
      attestation_layer_count,
      attestation_layers,
      scoring_factors,
      trad_authority_validations: trad_authority_count,
      community_consents: consent_count,
      community_validation_records: communityValidations.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});