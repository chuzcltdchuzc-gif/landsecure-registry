/**
 * lvTrustValidationEngine — Master trust validation orchestrator.
 * Executes all 8 validation engines, collects results, produces operational trust score,
 * stores immutable TrustValidationRun, generates pilot readiness certification.
 * This is the final operational trust layer.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcTrustGrade(score) {
  if (score >= 95) return 'A_PLUS';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'FAIL';
}

function calcRiskLevel(score) {
  if (score >= 90) return 'LOW';
  if (score >= 75) return 'MODERATE';
  if (score >= 55) return 'HIGH';
  return 'CRITICAL';
}

function calcPilotRecommendation(score, failures, blocking) {
  if (blocking > 0) return 'CRITICAL_REMEDIATION_REQUIRED';
  if (score < 60 || failures > 3) return 'NOT_READY';
  if (score < 80 || failures > 1) return 'GO_WITH_MONITORING';
  return 'GO';
}

Deno.serve(async (req) => {
  const startTime = new Date();

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const validationType = body.validation_type || 'FULL_PLATFORM';
    const generatedBy = body.generated_by || 'system';

    const subscores = {};
    let passedTests = 0;
    let failedTests = 0;
    let warningTests = 0;
    let blockingIssues = 0;
    let totalTests = 0;

    // Helper: run a sub-validation and collect results
    async function runValidation(name, fnName, payload) {
      try {
        const result = await base44.asServiceRole.functions.invoke(fnName, payload);
        const data = result?.data || result || {};
        const score = data.score || data.overall_score || data.success_rate || 0;
        subscores[name] = { score, ...data };
        if (data.passed !== undefined) { passedTests += data.passed || 0; failedTests += data.failed || 0; totalTests += (data.passed || 0) + (data.failed || 0); }
        if (data.blocking_issues > 0 || (!data.passed && data.passed !== undefined)) blockingIssues++;
        return data;
      } catch (e) {
        subscores[name] = { score: 0, error: e.message };
        failedTests++;
        blockingIssues++;
        return { score: 0 };
      }
    }

    // ── Execute all 8 validation engines ──
    const results = await Promise.allSettled([
      runValidation('evidence_integrity', 'lvEvidenceIntegrityValidation', { mode: 'full' }),
      runValidation('audit_integrity', 'lvAuditIntegrityValidation', { mode: 'full' }),
      runValidation('permission_integrity', 'lvPermissionIntegrityValidation', { mode: 'full' }),
      runValidation('community_trust', 'lvCommunityTrustValidation', { mode: 'full' }),
      runValidation('certificate_trust', 'lvCertificateTrustValidation', { mode: 'full' }),
      runValidation('fraud_resilience', 'lvFraudResilienceValidation', { mode: 'full' }),
      runValidation('background_job', 'lvBackgroundJobValidation', { mode: 'full' }),
      runValidation('recovery', 'lvRecoveryValidation', { mode: 'full' }),
    ]);

    // Extract scores from settled promises
    for (const r of results) {
      if (r.status === 'rejected') {
        failedTests++;
        blockingIssues++;
      }
    }

    // ── Calculate Operational Trust Score (weighted) ──
    const weights = {
      evidence_integrity: 0.20,
      audit_integrity: 0.15,
      permission_integrity: 0.15,
      community_trust: 0.10,
      certificate_trust: 0.10,
      fraud_resilience: 0.10,
      background_job: 0.10,
      recovery: 0.10,
    };

    let overallScore = 0;
    for (const [name, weight] of Object.entries(weights)) {
      const s = subscores[name]?.score || 0;
      overallScore += s * weight;
    }
    overallScore = Math.round(overallScore);

    const trustGrade = calcTrustGrade(overallScore);
    const riskLevel = calcRiskLevel(overallScore);
    const pilotRec = calcPilotRecommendation(overallScore, failedTests, blockingIssues);

    const completedAt = new Date();
    const durationSec = Math.round((completedAt - startTime) / 1000);

    // ── Create immutable validation run record ──
    const run = await base44.asServiceRole.entities.TrustValidationRun.create({
      validation_type: validationType,
      validation_scope: `Automated ${validationType.replace(/_/g, ' ')} trust validation run`,
      started_at: startTime.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSec,
      status: blockingIssues > 2 ? 'FAILED' : blockingIssues > 0 ? 'PARTIAL' : 'COMPLETED',
      passed_tests: passedTests,
      failed_tests: failedTests,
      warning_tests: warningTests,
      overall_score: overallScore,
      trust_grade: trustGrade,
      risk_level: riskLevel,
      subscores: JSON.stringify(subscores),
      validation_report_json: JSON.stringify({ subscores, weights, overallScore, trustGrade, riskLevel, pilotRec, durationSec }),
      recommendation: `Operational trust: ${overallScore}/100. Blocking issues: ${blockingIssues}. Recommendation: ${pilotRec}`,
      pilot_recommendation: pilotRec,
      generated_by: generatedBy,
    });
    const runId = run.id;

    // ── Generate audit event ──
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: generatedBy,
      user_name: 'Trust Validation Engine',
      action: 'TRUST_VALIDATION_COMPLETED',
      entity_type: 'TrustValidationRun',
      entity_id: runId,
      details: JSON.stringify({ overallScore, trustGrade, riskLevel, pilotRec, blockingIssues }),
    });

    // ── Critical failures: create SecurityIncidents ──
    if (blockingIssues > 0) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'DATA_CORRUPTION',
        severity: blockingIssues > 2 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        detected_by: 'lvTrustValidationEngine',
        description: `Trust validation found ${blockingIssues} blocking issues. Overall score: ${overallScore}/100. Grade: ${trustGrade}. Recommendation: ${pilotRec}`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      validation_run_id: runId,
      status: blockingIssues > 0 ? 'issues_found' : 'all_clear',
      overall_score: overallScore,
      trust_grade: trustGrade,
      risk_level: riskLevel,
      pilot_recommendation: pilotRec,
      passed_tests: passedTests,
      failed_tests: failedTests,
      blocking_issues: blockingIssues,
      duration_seconds: durationSec,
      subscores: Object.fromEntries(Object.entries(subscores).map(([k, v]) => [k, v.score])),
      timestamp: completedAt.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, status: 'ORCHESTRATOR_FAILED' }, { status: 500 });
  }
});