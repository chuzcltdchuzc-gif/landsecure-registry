/**
 * lvSecurityScan — Unified security scanner (Priority 9).
 * Runs every 6 hours via scheduled automation.
 * Orchestrates: integrity scan, fraud scan, audit scan, permission scan, certificate scan, trust score recalculation.
 * All results stored in respective entities. Never overwrites historical data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation context */ }
    if (user && !['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = {};

    // 1. Evidence Integrity Scan
    try {
      const evResult = await base44.asServiceRole.functions.invoke('lvEvidenceIntegrityCheck', { mode: 'batch' });
      results.evidence_integrity = evResult;
    } catch (e) { results.evidence_integrity = { error: e.message }; }

    // 2. Fraud Detection Scan
    try {
      const fraudResult = await base44.asServiceRole.functions.invoke('lvFraudDetection', { mode: 'batch' });
      results.fraud_detection = fraudResult;
    } catch (e) { results.fraud_detection = { error: e.message }; }

    // 3. Audit Integrity Scan
    try {
      const auditResult = await base44.asServiceRole.functions.invoke('lvAuditIntegrityCheck', { mode: 'batch' });
      results.audit_integrity = auditResult;
    } catch (e) { results.audit_integrity = { error: e.message }; }

    // 4. Permission Audit Scan
    try {
      const permResult = await base44.asServiceRole.functions.invoke('lvPermissionAuditor', { mode: 'batch' });
      results.permission_audit = permResult;
    } catch (e) { results.permission_audit = { error: e.message }; }

    // 5. Certificate Integrity Scan
    try {
      const certResult = await base44.asServiceRole.functions.invoke('lvCertificateIntegrityCheck', { mode: 'batch' });
      results.certificate_integrity = certResult;
    } catch (e) { results.certificate_integrity = { error: e.message }; }

    // 6. Trust Score Recalculation
    try {
      const trustResult = await base44.asServiceRole.functions.invoke('lvTrustScoreCalculation', { mode: 'snapshot' });
      results.trust_score = trustResult;
    } catch (e) { results.trust_score = { error: e.message }; }

    // 7. Fraud Resilience Scan
    try {
      const fraudResilienceResult = await base44.asServiceRole.functions.invoke('lvFraudResilience', { mode: 'batch' });
      results.fraud_resilience = fraudResilienceResult;
    } catch (e) { results.fraud_resilience = { error: e.message }; }

    // 8. Hash Chain Verification
    try {
      const chainResult = await base44.asServiceRole.entities.HashChainEntry.list('-created_date', 500);
      const broken = chainResult.filter(c => ['CHAIN_BREAK', 'HASH_MISMATCH', 'MISSING_LINK'].includes(c.verification_status));
      results.hash_chain = { total: chainResult.length, valid: chainResult.length - broken.length, broken: broken.length };
      if (broken.length > 0) {
        for (const b of broken) {
          await base44.asServiceRole.entities.SecurityIncident.create({
            incident_type: 'DATA_CORRUPTION',
            severity: 'CRITICAL',
            status: 'OPEN',
            detected_by: 'lvSecurityScan',
            description: `Hash chain integrity broken: ${b.entity_type}/${b.entity_id} — status: ${b.verification_status}`,
            opened_at: new Date().toISOString(),
          });
        }
      }
    } catch (e) { results.hash_chain = { error: e.message }; }

    // 9. Penetration Testing
    try {
      const pentestResult = await base44.asServiceRole.functions.invoke('lvPenetrationTest', { test_name: 'all' });
      results.penetration_test = pentestResult;
    } catch (e) { results.penetration_test = { error: e.message }; }

    // 10. Takeoff Readiness Assessment
    try {
      const readinessResult = await base44.asServiceRole.functions.invoke('lvTakeoffReadiness', {});
      results.takeoff_readiness = readinessResult;
    } catch (e) { results.takeoff_readiness = { error: e.message }; }

    // Log completion
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: 'system@landvault',
      user_name: 'Security Scanner',
      action: 'SECURITY_SCAN_COMPLETED',
      entity_type: 'SecurityScan',
      entity_id: 'batch-' + Date.now(),
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        scans_completed: Object.keys(results).filter(k => !results[k].error).length,
        summary: results,
      }),
    });

    return Response.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});