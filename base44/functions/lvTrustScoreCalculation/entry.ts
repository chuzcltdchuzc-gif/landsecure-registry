/**
 * lvTrustScoreCalculation — Trust Score Engine.
 * Calculates platform trust score from: evidence integrity, audit integrity,
 * certificate validity, fraud activity, duplicate risk, system health.
 * Creates TrustScoreSnapshot — never overwrites historical data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcTrustLevel(score) {
  if (score >= 90) return 'TRUSTED';
  if (score >= 75) return 'STRONG';
  if (score >= 60) return 'MONITORED';
  return 'AT_RISK';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Fetch all relevant data
    const [parcels, evidence, attestations, integrityChecks, incidents, fraudSignals, certChecks, auditChecks] = await Promise.all([
      base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 2000),
      base44.asServiceRole.entities.EvidenceVault.list('-created_date', 2000),
      base44.asServiceRole.entities.CommunityAttestation.list('-created_date', 2000),
      base44.asServiceRole.entities.EvidenceIntegrityCheck.list('-created_date', 500),
      base44.asServiceRole.entities.SecurityIncident.list('-created_date', 500),
      base44.asServiceRole.entities.FraudSignal.list('-created_date', 200),
      base44.asServiceRole.entities.CertificateIntegrityCheck.list('-created_date', 200),
      base44.asServiceRole.entities.AuditIntegrityCheck.list('-created_date', 200),
    ]);

    // 1. Evidence Integrity Score (0-100)
    const totalEvidence = evidence.length;
    const sealedEvidence = evidence.filter(e => e.seal_status === 'SEALED' && e.hash_fingerprint).length;
    const validChecks = integrityChecks.filter(c => c.verification_status === 'VALID').length;
    const mismatched = integrityChecks.filter(c => ['MODIFIED', 'CORRUPTED'].includes(c.verification_status)).length;
    const integrityScore = totalEvidence > 0
      ? Math.round(((sealedEvidence + validChecks - mismatched * 5) / Math.max(totalEvidence, 1)) * 100)
      : 50;
    const cappedIntegrity = Math.max(0, Math.min(100, integrityScore));

    // 2. Audit Integrity Score (0-100)
    const cleanAuditChecks = auditChecks.filter(c => c.status === 'CLEAN').length;
    const auditIssues = auditChecks.filter(c => c.status === 'ISSUE_DETECTED').length;
    const totalAuditChecks = Math.max(1, auditChecks.length);
    const auditScore = Math.round(((cleanAuditChecks - auditIssues * 10) / totalAuditChecks) * 100);
    const cappedAudit = Math.max(0, Math.min(100, auditScore));

    // 3. Certificate Score (0-100)
    const validCerts = certChecks.filter(c => c.status === 'VALID').length;
    const invalidCerts = certChecks.filter(c => ['INVALID', 'SUSPICIOUS', 'REVOKED'].includes(c.status)).length;
    const totalCertChecks = Math.max(1, certChecks.length);
    const certScore = Math.round(((validCerts - invalidCerts * 10) / totalCertChecks) * 100);
    const cappedCert = Math.max(0, Math.min(100, certScore));

    // 4. Fraud Score (inverted: 100 = no fraud)
    const openFraud = fraudSignals.filter(f => f.status === 'OPEN').length;
    const criticalFraud = fraudSignals.filter(f => f.severity === 'CRITICAL' && f.status === 'OPEN').length;
    const fraudScore = 100 - Math.min(100, (openFraud * 5 + criticalFraud * 15));
    const cappedFraud = Math.max(0, Math.min(100, fraudScore));

    // 5. System Score (incident-based)
    const openIncidents = incidents.filter(i => i.status === 'OPEN').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
    const systemScore = 100 - Math.min(100, (openIncidents * 3 + criticalIncidents * 10));
    const cappedSystem = Math.max(0, Math.min(100, systemScore));

    // Weighted overall trust score
    const trustScore = Math.round(
      cappedIntegrity * 0.30 +
      cappedAudit * 0.20 +
      cappedCert * 0.20 +
      cappedFraud * 0.15 +
      cappedSystem * 0.15
    );

    const trustLevel = calcTrustLevel(trustScore);

    const verifiedParcels = parcels.filter(p =>
      ['field_verified', 'survey_verified', 'community_validated', 'fully_verified'].includes(p.verification_status)
    ).length;

    // Create snapshot
    const snapshot = await base44.asServiceRole.entities.TrustScoreSnapshot.create({
      trust_score: trustScore,
      integrity_score: cappedIntegrity,
      audit_score: cappedAudit,
      fraud_score: cappedFraud,
      certificate_score: cappedCert,
      system_score: cappedSystem,
      trust_level: trustLevel,
      total_parcels: parcels.length,
      verified_parcels: verifiedParcels,
      open_incidents: openIncidents,
      open_alerts: openFraud,
      snapshot_at: new Date().toISOString(),
      calculation_version: '1.0.0',
    });

    return Response.json({
      status: 'completed',
      snapshot_id: snapshot.id,
      trust_score: trustScore,
      trust_level: trustLevel,
      subscores: {
        integrity: cappedIntegrity,
        audit: cappedAudit,
        certificate: cappedCert,
        fraud: cappedFraud,
        system: cappedSystem,
      },
      metrics: {
        total_parcels: parcels.length,
        verified_parcels: verifiedParcels,
        sealed_evidence: sealedEvidence,
        open_incidents: openIncidents,
        open_fraud_signals: openFraud,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});