/**
 * lvBackgroundJobValidation — Background job reliability validation.
 * Verifies queue health, pending/failed/retry/dead jobs, duplicates,
 * idempotency, processing times, backlog. Detects stuck/hung jobs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const jobs = await base44.asServiceRole.entities.JobQueue.list('-created_date', 500);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Queue volume
    checks.push({ check: 'total_jobs', value: jobs.length });
    passed++;

    // 2. Failed job rate
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const failedRate = jobs.length > 0 ? Math.round((failedJobs / jobs.length) * 100) : 0;
    checks.push({ check: 'failed_job_rate', value: failedRate, failed: failedJobs, total: jobs.length, target: 10 });
    if (failedRate > 20 && jobs.length > 5) { score -= failedRate; failed++; } else { passed++; }

    // 3. Pending jobs (backlog)
    const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'queued').length;
    checks.push({ check: 'pending_jobs', value: pendingJobs });
    if (pendingJobs > 50) { score -= 10; failed++; } else { passed++; }

    // 4. Stuck jobs (in progress/running for > 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const stuckJobs = jobs.filter(j =>
      ['processing', 'running'].includes(j.status) &&
      j.started_at && j.started_at < oneHourAgo
    ).length;
    checks.push({ check: 'stuck_jobs', value: stuckJobs, target: 0 });
    if (stuckJobs > 0) { score -= stuckJobs * 8; failed++; } else { passed++; }

    // 5. Retry jobs
    const retryJobs = jobs.filter(j => j.status === 'retrying').length;
    const maxAttempts = jobs.filter(j => (j.attempts || 0) >= (j.max_attempts || 3)).length;
    checks.push({ check: 'retrying', value: retryJobs, max_attempts_reached: maxAttempts });
    if (maxAttempts > stuckJobs + 3) { score -= 5; } else { passed++; }

    // 6. Completion rate
    const completed = jobs.filter(j => j.status === 'completed').length;
    const completionRate = jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0;
    checks.push({ check: 'completion_rate', value: completionRate, completed, total: jobs.length, target: 70 });
    if (completionRate < 50 && jobs.length > 10) { score -= 15; failed++; } else { passed++; }

    // 7. Job type diversity
    const jobTypes = new Set(jobs.map(j => j.job_type));
    checks.push({ check: 'job_type_diversity', value: jobTypes.size, types: [...jobTypes] });
    passed++;

    // 8. Idempotency — duplicate idempotency keys
    const idemKeys = {};
    let duplicates = 0;
    for (const j of jobs) {
      if (j.idempotency_key) {
        if (idemKeys[j.idempotency_key]) duplicates++;
        else idemKeys[j.idempotency_key] = true;
      }
    }
    checks.push({ check: 'duplicate_idempotency_keys', value: duplicates, target: 0 });
    if (duplicates > 0) { score -= duplicates * 5; failed++; } else { passed++; }

    // 9. Processing time analysis (completed jobs)
    const completedJobs = jobs.filter(j => j.completed_at && j.started_at);
    const longRunning = completedJobs.filter(j => {
      const duration = (new Date(j.completed_at) - new Date(j.started_at)) / 3600000;
      return duration > 2; // > 2 hours
    }).length;
    checks.push({ check: 'long_running_jobs', value: longRunning, target: 0 });

    score = Math.max(0, Math.min(100, score));

    // Incident for critical queue issues
    if (stuckJobs > 3 || failedRate > 30 || pendingJobs > 100) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'DATA_CORRUPTION',
        severity: stuckJobs > 3 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        detected_by: 'lvBackgroundJobValidation',
        description: `Job queue health issues: ${stuckJobs} stuck, ${failedJobs} failed, ${pendingJobs} pending`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { total: jobs.length, completed, failed: failedJobs, pending: pendingJobs, stuck: stuckJobs, duplicates },
      blocking_issues: stuckJobs > 3 ? 1 : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});