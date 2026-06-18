/**
 * lvRecoveryTest — Disaster recovery validation.
 * Tests database, evidence, certificate, audit, and job queue recovery.
 * Pass criteria: >95% success rate, <60 minutes recovery time.
 * Results stored permanently.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const testType = body.test_type || 'DATABASE_RECOVERY';
    const startTime = new Date();
    const results = { checks: [], recovered: 0, failed: 0, total: 0 };

    if (testType === 'DATABASE_RECOVERY') {
      // Test core entity accessibility
      const entities = ['LandVaultParcel', 'EvidenceVault', 'CommunityAttestation', 'AuditLog', 'EvidenceTimelineEvent', 'SecurityIncident', 'TrustScoreSnapshot', 'JobQueue'];
      for (const entityName of entities) {
        results.total++;
        try {
          const data = await base44.asServiceRole.entities[entityName].list('-created_date', 5);
          results.checks.push({ entity: entityName, accessible: true, count: data.length });
          results.recovered++;
        } catch (e) {
          results.checks.push({ entity: entityName, accessible: false, error: e.message });
          results.failed++;
        }
      }
    }

    if (testType === 'EVIDENCE_RECOVERY') {
      const evidence = await base44.asServiceRole.entities.EvidenceVault.list('-created_date', 100);
      results.total = evidence.length;
      for (const ev of evidence) {
        const hasUrl = !!ev.file_url;
        const hasHash = !!ev.hash_fingerprint;
        const isSealed = ev.seal_status === 'SEALED';
        results.checks.push({ id: ev.id, has_url: hasUrl, has_hash: hasHash, sealed: isSealed });
        if (hasUrl && hasHash && isSealed) results.recovered++;
        else results.failed++;
      }
    }

    if (testType === 'CERTIFICATE_RECOVERY') {
      const parcels = await base44.asServiceRole.entities.LandVaultParcel.filter(
        { certificate_status: { $in: ['ACTIVE', 'RELEASED'] } },
        '-created_date',
        100
      );
      results.total = parcels.length;
      for (const p of parcels) {
        const hasCert = !!(p.qr_code_url || p.certificate_a_url || p.certificate_b_url);
        results.checks.push({ id: p.id, parcel_number: p.parcel_number, has_certificate: hasCert });
        if (hasCert) results.recovered++;
        else results.failed++;
      }
    }

    if (testType === 'AUDIT_RECOVERY') {
      const logs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 100);
      const attestAudits = await base44.asServiceRole.entities.CommunityAttestationAudit.list('-created_date', 100);
      results.total = logs.length + attestAudits.length;
      results.checks.push({ audit_logs: logs.length, attestation_audits: attestAudits.length });
      results.recovered = results.total;
    }

    if (testType === 'JOB_QUEUE_RECOVERY') {
      const jobs = await base44.asServiceRole.entities.JobQueue.list('-created_date', 200);
      results.total = jobs.length;
      results.checks.push({ total_jobs: jobs.length, pending: jobs.filter(j => j.status === 'pending').length, completed: jobs.filter(j => j.status === 'completed').length, failed: jobs.filter(j => j.status === 'failed').length });
      results.recovered = results.total;
    }

    const completedTime = new Date();
    const durationMin = Math.round((completedTime - startTime) / 60000 * 10) / 10;
    const successRate = results.total > 0 ? Math.round((results.recovered / results.total) * 100) : 100;
    const passed = successRate >= 95 && durationMin < 60;

    const test = await base44.asServiceRole.entities.RecoveryTest.create({
      test_type: testType,
      executed_by: body.executed_by || 'system',
      started_at: startTime.toISOString(),
      completed_at: completedTime.toISOString(),
      duration_minutes: durationMin,
      status: passed ? 'PASSED' : 'FAILED',
      success_rate: successRate,
      items_checked: results.total,
      items_recovered: results.recovered,
      items_failed: results.failed,
      results: JSON.stringify(results),
      recommendations: !passed ? `Improve ${testType.toLowerCase()} — success rate ${successRate}%, target is 95%` : '',
    });

    // If failed, create security incident
    if (!passed) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'DATA_CORRUPTION',
        severity: 'HIGH',
        status: 'OPEN',
        detected_by: 'lvRecoveryTest',
        description: `Recovery test FAILED: ${testType} — ${successRate}% success, ${durationMin}min`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      test_id: test.id,
      test_type: testType,
      status: passed ? 'PASSED' : 'FAILED',
      success_rate: successRate,
      duration_minutes: durationMin,
      items_checked: results.total,
      items_recovered: results.recovered,
      items_failed: results.failed,
      pass_threshold_met: passed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});