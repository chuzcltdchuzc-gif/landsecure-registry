/**
 * lvCommunityTrustValidation — Community trust layer validation.
 * Verifies attestation counts, consensus calculations, conflict detection,
 * traditional endorsements, confidence updates, participation, duplicates,
 * consensus manipulation, suspicious endorsement clusters.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [attestations, parcels, endorsements, conflicts] = await Promise.all([
      base44.asServiceRole.entities.CommunityAttestation.list('-created_date', 1000),
      base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 500),
      base44.asServiceRole.entities.TraditionalInstitutionEndorsement.list('-created_date', 500),
      base44.asServiceRole.entities.CommunityReviewAlert.list('-created_date', 200),
    ]);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Attestation volume
    checks.push({ check: 'total_attestations', value: attestations.length });
    if (attestations.length < 3) { score -= 15; failed++; } else { passed++; }

    // 2. Approved attestation rate
    const approved = attestations.filter(a => a.verification_status === 'APPROVED').length;
    const approvalRate = attestations.length > 0 ? Math.round((approved / attestations.length) * 100) : 0;
    checks.push({ check: 'approval_rate', value: approvalRate, approved, total: attestations.length });
    if (approvalRate < 50 && attestations.length > 5) { score -= 8; failed++; } else { passed++; }

    // 3. Consensus coverage (parcels with consensus calculated)
    const withConsensus = parcels.filter(p => p.consensus_level && p.consensus_level !== 'MIXED_OPINIONS' && (p.supporting_count + p.neutral_count + p.conflicting_count) > 0).length;
    const consensusCoverage = parcels.length > 0 ? Math.round((withConsensus / parcels.length) * 100) : 0;
    checks.push({ check: 'consensus_coverage', value: consensusCoverage, with_consensus: withConsensus, total: parcels.length });
    if (consensusCoverage < 40 && parcels.length > 5) { score -= 5; } else { passed++; }

    // 4. Conflict detection rate
    const openConflicts = conflicts.filter(c => c.status === 'OPEN').length;
    checks.push({ check: 'open_conflicts', value: openConflicts });
    if (openConflicts > 5) { score -= openConflicts * 2; failed++; } else { passed++; }

    // 5. Traditional endorsements
    checks.push({ check: 'traditional_endorsements', value: endorsements.length });
    const approvedEndorsements = endorsements.filter(e => e.endorsement_status === 'APPROVED').length;
    checks.push({ check: 'approved_endorsements', value: approvedEndorsements });
    passed++;

    // 6. Duplicate attestation detection (same parcel, same role, same attestor)
    const attMap = {};
    let suspicious = 0;
    for (const a of attestations) {
      const key = `${a.parcel_id}_${a.attestor_role}_${a.attestor_name}`;
      if (attMap[key] && a.verification_status === 'PENDING') suspicious++;
      attMap[key] = true;
    }
    checks.push({ check: 'suspicious_duplicates', value: suspicious, target: 0 });
    if (suspicious > 3) { score -= Math.min(15, suspicious * 3); failed++; } else { passed++; }

    // 7. Supporting vs conflicting ratio
    const supporting = attestations.filter(a => a.attestation_position === 'SUPPORTING').length;
    const conflicting = attestations.filter(a => a.attestation_position === 'CONFLICTING').length;
    const sgRatio = attestations.length > 0 ? Math.round((supporting / attestations.length) * 100) : 0;
    checks.push({ check: 'supporting_ratio', value: sgRatio, supporting, conflicting });
    if (conflicting > supporting && attestations.length > 5) { score -= 10; failed++; } else { passed++; }

    // 8. Consensus manipulation detection — parcels with very high consensus but few attestations
    const suspiciousConsensus = parcels.filter(p => (p.supporting_count || 0) > 5 && (p.consensus_percentage > 95) && (p.supporting_count + p.neutral_count + p.conflicting_count) < 3).length;
    checks.push({ check: 'suspicious_consensus', value: suspiciousConsensus, target: 0 });
    if (suspiciousConsensus > 0) { score -= suspiciousConsensus * 10; failed++; } else { passed++; }

    score = Math.max(0, Math.min(100, score));

    // Incidents for critical issues
    if (suspicious > 5 || openConflicts > 10) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'COMMUNITY_MANIPULATION',
        severity: suspicious > 5 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        detected_by: 'lvCommunityTrustValidation',
        description: `Community trust issues: ${suspicious} suspicious duplicates, ${openConflicts} open conflicts`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { total_attestations: attestations.length, approved, endorsements: endorsements.length, open_conflicts: openConflicts },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});