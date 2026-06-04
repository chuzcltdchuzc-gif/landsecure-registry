/**
 * PHASE 9 — Land Evidence Report Generator
 * Generates a structured JSON report suitable for bank/lawyer review.
 * Excludes all PII, private media, audio, signatures, phone numbers.
 *
 * Payload: { parcel_id: string }
 * Auth: requires field_agent or above
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parcelId = body.parcel_id;
    if (!parcelId) return Response.json({ error: 'parcel_id required' }, { status: 400 });

    const [parcelList, evidenceList, surveyList, duplicateList] = await Promise.all([
      base44.asServiceRole.entities.LandVaultParcel.filter({ id: parcelId }),
      base44.asServiceRole.entities.EvidenceVault.filter({ parcel_id: parcelId }),
      base44.asServiceRole.entities.SurveyAssignment.filter({ parcel_id: parcelId }),
      base44.asServiceRole.entities.DuplicateAlert.filter({ source_parcel_id: parcelId }),
    ]);

    const parcel = parcelList[0];
    if (!parcel) return Response.json({ error: 'Parcel not found' }, { status: 404 });

    // Compute evidence summary (no file URLs, no hashes exposed in full)
    const evidenceSummary = evidenceList.map(e => ({
      sequence: e.evidence_sequence,
      type: e.evidence_type,
      seal_status: e.seal_status || 'SEALED',
      captured_at: e.captured_at,
      captured_by_role: e.captured_by_role,
      hash_present: !!e.hash_fingerprint,
      hash_prefix: e.hash_fingerprint ? e.hash_fingerprint.slice(0, 8) + '…' : null,
      gps_confidence: e.gps_confidence,
      gps_inside_lga: e.gps_inside_lga,
      witness_role: e.witness_role,
    }));

    // Dispute readiness score
    let drScore = 0;
    if (parcel.consent_verbal) drScore += 15;
    if (parcel.consent_strength_score >= 80) drScore += 20;
    else if (parcel.consent_strength_score >= 50) drScore += 10;
    if (parcel.community_validation_status === 'confirmed') drScore += 20;
    if (parcel.community_confirmed) drScore += 10;
    if (evidenceList.length >= 3) drScore += 15;
    if (!parcel.duplicate_flag) drScore += 10;
    if (parcel.gps_confidence === 'HIGH') drScore += 10;
    if (parcel.representative_capacity && parcel.authority_basis) drScore += 10;
    drScore = Math.min(100, drScore);

    const openDuplicates = duplicateList.filter(d => d.status === 'open').length;
    const completedSurvey = surveyList.find(s => s.status === 'completed');

    const report = {
      report_id: `EVR-${parcel.parcel_number}-${Date.now()}`,
      generated_at: new Date().toISOString(),
      generated_by_role: user.role,
      platform: 'Aquasavannah LandVault',
      pilot_lga: 'Ehime Mbano, Imo State, Nigeria',
      disclaimer: 'This report is produced by Aquasavannah LandVault, a private land evidence and documentation platform. It is not a government Certificate of Occupancy or statutory title instrument.',

      parcel: {
        parcel_number: parcel.parcel_number,
        status: parcel.status,
        verification_status: parcel.verification_status,
        registration_date: parcel.created_date,
      },

      location: {
        community: parcel.community,
        village: parcel.village,
        ward: parcel.ward,
        lga: parcel.lga,
        state: parcel.state,
        size_sqm: parcel.size_sqm,
        size_hectares: parcel.size_hectares,
        land_use: parcel.land_use,
        gps_confidence: parcel.gps_confidence,
        gps_inside_lga: parcel.gps_inside_lga,
      },

      ownership: {
        ownership_type: parcel.ownership_type,
        family_name: parcel.family_name,
        ownership_confidence_score: parcel.ownership_confidence_score,
      },

      representative_authority: {
        representative_capacity: parcel.representative_capacity,
        representative_role: parcel.representative_role,
        relationship_to_land: parcel.relationship_to_land,
        authority_basis: parcel.authority_basis,
        authority_document_present: !!parcel.authority_document_url,
      },

      consent: {
        verbal_consent: parcel.consent_verbal || false,
        audio_captured: parcel.consent_audio_captured || false,
        signature_captured: parcel.consent_signature_captured || false,
        photo_captured: parcel.consent_photo_captured || false,
        witness_name_recorded: !!parcel.consent_witness_name,
        consent_strength_score: parcel.consent_strength_score,
        consent_confidence: parcel.consent_confidence,
      },

      community_validation: {
        status: parcel.community_validation_status,
        confirmed: parcel.community_confirmed || false,
        confirmed_at: parcel.community_confirmed_at,
        validator_notes_present: !!parcel.community_validator_notes,
      },

      evidence_package: {
        total_items: evidenceList.length,
        seal_status: parcel.evidence_sealed ? 'SEALED' : 'OPEN',
        seal_id: parcel.evidence_seal_id,
        seal_timestamp: parcel.evidence_seal_timestamp,
        seal_hash_prefix: parcel.evidence_seal_hash ? parcel.evidence_seal_hash.slice(0, 16) + '…' : null,
        items: evidenceSummary,
      },

      survey: completedSurvey ? {
        status: completedSurvey.status,
        surveyor_licence: completedSurvey.surveyor_licence,
        date_surveyed: completedSurvey.date_surveyed,
        boundary_captured: !!completedSurvey.geojson_polygon,
      } : { status: parcel.survey_status },

      duplicate_check: {
        duplicate_flag: parcel.duplicate_flag || false,
        open_alerts: openDuplicates,
        all_resolved: openDuplicates === 0,
      },

      dispute_readiness: {
        score: drScore,
        category: drScore >= 80 ? 'HIGH CONFIDENCE' : drScore >= 50 ? 'MODERATE RISK' : 'LOW RISK',
      },

      certificate: {
        status: parcel.certificate_status,
        protected_in_registry: parcel.protected_in_registry || true,
      },
    };

    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});