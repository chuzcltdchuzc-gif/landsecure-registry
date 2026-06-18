/**
 * lvTakeoffReadiness — Pilot takeoff readiness assessment.
 * Calculates 0-100 score from: infrastructure, trust, security, evidence integrity,
 * community participation, verification quality, surveyor adoption, disaster recovery,
 * fraud resilience, and operational health.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcReadinessLevel(score) {
  if (score >= 95) return 'SCALE_READY';
  if (score >= 85) return 'TAKEOFF_READY';
  if (score >= 70) return 'PILOT_READY';
  if (score >= 50) return 'EARLY_PILOT';
  return 'NOT_READY';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all metrics in parallel
    const [
      parcels, evidence, attestations, surveyors,
      trustSnapshots, incidents, fraudSignals,
      integrityChecks, auditChecks, certChecks,
      evidenceLocks, hashChains, recoveryTests,
      penetrationTests, jobs
    ] = await Promise.all([
      base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 2000),
      base44.asServiceRole.entities.EvidenceVault.list('-created_date', 2000),
      base44.asServiceRole.entities.CommunityAttestation.list('-created_date', 500),
      base44.asServiceRole.entities.SurveyorPartner.list('-created_date', 100),
      base44.asServiceRole.entities.TrustScoreSnapshot.list('-created_date', 1),
      base44.asServiceRole.entities.SecurityIncident.list('-created_date', 500),
      base44.asServiceRole.entities.FraudSignal.list('-created_date', 200),
      base44.asServiceRole.entities.EvidenceIntegrityCheck.list('-created_date', 100),
      base44.asServiceRole.entities.AuditIntegrityCheck.list('-created_date', 100),
      base44.asServiceRole.entities.CertificateIntegrityCheck.list('-created_date', 100),
      base44.asServiceRole.entities.EvidenceLock.list('-created_date', 200),
      base44.asServiceRole.entities.HashChainEntry.list('-created_date', 200),
      base44.asServiceRole.entities.RecoveryTest.list('-created_date', 50),
      base44.asServiceRole.entities.PenetrationTestResult.list('-created_date', 50),
      base44.asServiceRole.entities.JobQueue.list('-created_date', 200),
    ]);

    // 1. Infrastructure (0-100)
    const totalParcels = parcels.length;
    const verifiedParcels = parcels.filter(p => ['field_verified', 'survey_verified', 'community_validated', 'fully_verified'].includes(p.verification_status)).length;
    const infrastructureScore = totalParcels > 0
      ? Math.min(100, Math.round((verifiedParcels / totalParcels) * 50 + (totalParcels > 10 ? 30 : totalParcels * 3) + (jobs.length > 0 ? 20 : 0)))
      : 10;

    // 2. Trust (from latest snapshot)
    const latestTrust = trustSnapshots[0];
    const trustScoreVal = latestTrust?.trust_score || 0;

    // 3. Security
    const openIncidents = incidents.filter(i => i.status === 'OPEN').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
    const securityScoreVal = Math.max(0, Math.min(100, 100 - (openIncidents * 5 + criticalIncidents * 15)));

    // 4. Evidence Integrity
    const sealedEvidence = evidence.filter(e => e.seal_status === 'SEALED' && e.hash_fingerprint).length;
    const evidenceIntegrityScore = totalParcels > 0
      ? Math.min(100, Math.round((sealedEvidence / Math.max(1, evidence.length)) * 80 + (integrityChecks.filter(c => c.verification_status === 'VALID').length > 0 ? 20 : 0)))
      : 25;

    // 5. Community Participation
    const approvedAttestations = attestations.filter(a => a.verification_status === 'APPROVED').length;
    const communityScore = attestations.length > 0
      ? Math.min(100, Math.round((approvedAttestations / attestations.length) * 70 + (attestations.length > 5 ? 30 : attestations.length * 10)))
      : 0;

    // 6. Verification Quality
    const fullyVerified = parcels.filter(p => p.verification_status === 'fully_verified').length;
    const verificationScore = totalParcels > 0
      ? Math.min(100, Math.round((fullyVerified / totalParcels) * 60 + (verifiedParcels / totalParcels) * 40))
      : 0;

    // 7. Surveyor Adoption
    const activeSurveyors = surveyors.filter(s => s.verification_status === 'VERIFIED_SURVEYOR').length;
    const surveyorScore = Math.min(100, activeSurveyors * 20 + 10);

    // 8. Disaster Recovery
    const passedRecovery = recoveryTests.filter(t => t.status === 'PASSED').length;
    const disasterScore = recoveryTests.length > 0
      ? Math.min(100, Math.round((passedRecovery / recoveryTests.length) * 100))
      : 0;

    // 9. Fraud Resilience
    const openFraud = fraudSignals.filter(f => f.status === 'OPEN').length;
    const fraudScore = Math.max(0, Math.min(100, 100 - (openFraud * 4)));

    // 10. Operational Health
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const operationalScore = jobs.length > 0
      ? Math.max(0, Math.min(100, Math.round((completedJobs / jobs.length) * 80 - (failedJobs / jobs.length) * 20 + 20)))
      : 20;

    // Weighted overall score
    const overallScore = Math.round(
      infrastructureScore * 0.15 +
      trustScoreVal * 0.15 +
      securityScoreVal * 0.15 +
      evidenceIntegrityScore * 0.15 +
      communityScore * 0.10 +
      verificationScore * 0.10 +
      surveyorScore * 0.05 +
      disasterScore * 0.05 +
      fraudScore * 0.05 +
      operationalScore * 0.05
    );

    const readinessLevel = calcReadinessLevel(overallScore);

    // Identify gaps
    const gaps = [];
    if (totalParcels < 10) gaps.push({ area: 'Parcel Volume', severity: 'HIGH', detail: 'Less than 10 parcels — insufficient for pilot', recommendation: 'Increase parcel registrations' });
    if (activeSurveyors < 1) gaps.push({ area: 'Surveyor Network', severity: 'HIGH', detail: 'No verified surveyors', recommendation: 'Recruit and verify surveyor partners' });
    if (approvedAttestations < 5) gaps.push({ area: 'Community Participation', severity: 'MEDIUM', detail: 'Less than 5 approved attestations', recommendation: 'Engage community validators' });
    if (openIncidents > 5) gaps.push({ area: 'Security Incidents', severity: 'HIGH', detail: `${openIncidents} open security incidents`, recommendation: 'Resolve open incidents' });
    if (passedRecovery < 3) gaps.push({ area: 'Disaster Recovery', severity: 'CRITICAL', detail: 'Recovery tests not passing', recommendation: 'Complete all recovery test types' });
    if (sealedEvidence < totalParcels * 2) gaps.push({ area: 'Evidence Integrity', severity: 'MEDIUM', detail: 'Evidence sealing coverage low', recommendation: 'Complete evidence sealing for all parcels' });

    // Store assessment
    const assessment = await base44.asServiceRole.entities.TakeoffReadinessAssessment.create({
      overall_score: overallScore,
      readiness_level: readinessLevel,
      infrastructure_score: infrastructureScore,
      trust_score: trustScoreVal,
      security_score: securityScoreVal,
      evidence_integrity_score: evidenceIntegrityScore,
      community_participation_score: communityScore,
      verification_quality_score: verificationScore,
      surveyor_adoption_score: surveyorScore,
      disaster_recovery_score: disasterScore,
      fraud_resilience_score: fraudScore,
      operational_health_score: operationalScore,
      total_parcels: totalParcels,
      verified_parcels: verifiedParcels,
      total_attestations: attestations.length,
      approved_attestations: approvedAttestations,
      active_surveyors: activeSurveyors,
      evidence_locks_active: evidenceLocks.filter(l => l.status === 'ACTIVE').length,
      hash_chains_valid: hashChains.filter(c => c.verification_status === 'VALID').length,
      open_security_incidents: openIncidents,
      fraud_signals_open: openFraud,
      recovery_tests_passed: passedRecovery,
      penetration_tests_passed: penetrationTests.filter(t => t.result === 'PASSED').length,
      penetration_tests_failed: penetrationTests.filter(t => t.result === 'FAILED').length,
      gaps: JSON.stringify(gaps),
      assessed_at: new Date().toISOString(),
      assessed_by: 'system',
      assessment_version: '1.0.0',
    });

    return Response.json({
      assessment_id: assessment.id,
      overall_score: overallScore,
      readiness_level: readinessLevel,
      subscores: {
        infrastructure: infrastructureScore,
        trust: trustScoreVal,
        security: securityScoreVal,
        evidence_integrity: evidenceIntegrityScore,
        community_participation: communityScore,
        verification_quality: verificationScore,
        surveyor_adoption: surveyorScore,
        disaster_recovery: disasterScore,
        fraud_resilience: fraudScore,
        operational_health: operationalScore,
      },
      gaps: gaps.length,
      gap_details: gaps.map(g => g.detail),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});