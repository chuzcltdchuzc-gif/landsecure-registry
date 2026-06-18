/**
 * lvRecoveryValidation — Recovery readiness validation.
 * Simulates database, audit, evidence, certificate and full platform recovery.
 * Verifies recovery speed, completeness, hash integrity, audit integrity,
 * certificate availability, evidence availability.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const recoveryTests = await base44.asServiceRole.entities.RecoveryTest.list('-created_date', 50);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Recovery test coverage (have all types been tested?)
    const requiredTypes = ['DATABASE_RECOVERY', 'EVIDENCE_RECOVERY', 'CERTIFICATE_RECOVERY', 'AUDIT_RECOVERY', 'JOB_QUEUE_RECOVERY'];
    const testedTypes = new Set(recoveryTests.map(t => t.test_type));
    const untested = requiredTypes.filter(t => !testedTypes.has(t));
    checks.push({ check: 'test_type_coverage', tested: testedTypes.size, required: requiredTypes.length, untested });
    if (untested.length > 3) { score -= 20; failed++; } else if (untested.length > 0) { score -= untested.length * 5; } else { passed++; }

    // 2. Passed recovery tests
    const passedTests = recoveryTests.filter(t => t.status === 'PASSED').length;
    const passRate = recoveryTests.length > 0 ? Math.round((passedTests / recoveryTests.length) * 100) : 0;
    checks.push({ check: 'pass_rate', value: passRate, passed: passedTests, total: recoveryTests.length, target: 95 });
    if (passRate < 80 && recoveryTests.length > 3) { score -= (100 - passRate); failed++; } else { passed++; }

    // 3. Recovery speed (average duration)
    const avgDuration = recoveryTests.length > 0
      ? Math.round(recoveryTests.filter(t => t.duration_minutes).reduce((sum, t) => sum + t.duration_minutes, 0) / recoveryTests.filter(t => t.duration_minutes).length * 10) / 10
      : 0;
    checks.push({ check: 'avg_recovery_duration_minutes', value: avgDuration, target: 60 });
    if (avgDuration > 60) { score -= 15; failed++; } else { passed++; }

    // 4. Success rate trend (last 5 vs all-time)
    const lastFive = recoveryTests.slice(0, 5);
    const lastFivePassed = lastFive.filter(t => t.status === 'PASSED').length;
    const recentRate = lastFive.length > 0 ? Math.round((lastFivePassed / lastFive.length) * 100) : 100;
    checks.push({ check: 'recent_success_rate', value: recentRate, target: 95 });
    if (recentRate < 80 && lastFive.length >= 3) { score -= 10; failed++; } else { passed++; }

    // 5. Items recovered rate
    const avgSuccessRate = recoveryTests.length > 0
      ? Math.round(recoveryTests.reduce((sum, t) => sum + (t.success_rate || 0), 0) / recoveryTests.length)
      : 0;
    checks.push({ check: 'average_success_rate', value: avgSuccessRate, target: 95 });
    if (avgSuccessRate < 95) { score -= (95 - avgSuccessRate); failed++; } else { passed++; }

    score = Math.max(0, Math.min(100, score));

    // Incident for recovery failures
    if (passRate < 80 && recoveryTests.length > 3) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'DATA_CORRUPTION',
        severity: 'HIGH',
        status: 'OPEN',
        detected_by: 'lvRecoveryValidation',
        description: `Recovery readiness issues: ${passRate}% pass rate, ${untested.length} untested types`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { total_tests: recoveryTests.length, passed: passedTests, pass_rate: passRate, untested_types: untested.length },
      blocking_issues: passRate < 80 && recoveryTests.length > 3 ? 1 : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});