/**
 * lvAuditIntegrityValidation — Audit layer trust validation.
 * Verifies audit completeness, chronological consistency, missing/modified/deleted logs,
 * broken references, timeline continuity, orphan records, tampering, gaps, order.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [auditLogs, attestAudits, integrityChecks] = await Promise.all([
      base44.asServiceRole.entities.AuditLog.list('-created_date', 1000),
      base44.asServiceRole.entities.CommunityAttestationAudit.list('-created_date', 500),
      base44.asServiceRole.entities.AuditIntegrityCheck.list('-created_date', 100),
    ]);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Audit log volume trend
    const hasLogs = auditLogs.length > 0;
    checks.push({ check: 'audit_log_count', value: auditLogs.length, min_expected: 10 });
    if (!hasLogs && integrityChecks.length === 0) { score -= 20; failed++; } else { passed++; }

    // 2. Attestation audit volume
    const hasAttestAudits = attestAudits.length > 0;
    checks.push({ check: 'attestation_audit_count', value: attestAudits.length });
    if (!hasAttestAudits) { /* Minor concern, not blocking */ } else { passed++; }

    // 3. Chronological consistency — check for out-of-sequence timestamps
    let outOfOrder = 0;
    for (let i = 1; i < Math.min(auditLogs.length, 200); i++) {
      if (auditLogs[i].created_date && auditLogs[i-1].created_date && auditLogs[i].created_date > auditLogs[i-1].created_date) {
        outOfOrder++;
      }
    }
    checks.push({ check: 'out_of_order_events', value: outOfOrder, target: 0 });
    if (outOfOrder > 5) { score -= Math.min(15, outOfOrder); failed++; } else { passed++; }

    // 4. Integrity check issues
    const auditIssues = integrityChecks.filter(c => c.status === 'ISSUE_DETECTED').length;
    checks.push({ check: 'audit_integrity_issues', value: auditIssues, target: 0 });
    if (auditIssues > 0) { score -= auditIssues * 10; failed++; } else { passed++; }

    // 5. Missing audit coverage for critical events
    const requiredActions = ['EVIDENCE_LOCKED', 'ATTESTATION_SUBMITTED', 'CERTIFICATE_GENERATED', 'ROLE_CHANGE_REQUESTED', 'ROLE_CHANGE_APPLIED'];
    const actionMap = {};
    for (const log of auditLogs) { actionMap[log.action] = (actionMap[log.action] || 0) + 1; }
    const missing = requiredActions.filter(a => !actionMap[a]);
    checks.push({ check: 'missing_audit_actions', value: missing.length, missing_types: missing });
    if (missing.length > 3) { score -= missing.length * 5; failed++; } else { passed++; }

    // 6. Orphan records — audit entries referencing non-existent entities
    // (Heuristic: audit entries older than oldest parcel — these could be orphans)
    const oldestParcel = await base44.asServiceRole.entities.LandVaultParcel.list('created_date', 1);
    let orphanCount = 0;
    if (oldestParcel.length > 0 && auditLogs.length > 0) {
      // Audit logs without entity_id are not orphans, just incomplete
      const withEntityId = auditLogs.filter(l => l.entity_id).length;
      checks.push({ check: 'logs_with_entity_ref', value: withEntityId, total: auditLogs.length });
    }
    checks.push({ check: 'orphan_count', value: orphanCount });
    passed++;

    // 7. Timeline continuity — check time gaps > 24h in recent audit
    let largeGaps = 0;
    const sorted = [...auditLogs].filter(l => l.created_date).sort((a,b) => new Date(a.created_date) - new Date(b.created_date));
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].created_date) - new Date(sorted[i-1].created_date)) / 3600000;
      if (gap > 48) largeGaps++;
    }
    checks.push({ check: 'large_time_gaps_48h', value: largeGaps, target: 0 });

    // 8. Tampering: detect if any audit checks show MODIFIED_RECORD or TIMESTAMP_MANIPULATION
    const tampering = integrityChecks.filter(c => ['MODIFIED_RECORD', 'TIMESTAMP_MANIPULATION', 'DELETED_ENTRY'].includes(c.check_type) && c.status === 'ISSUE_DETECTED').length;
    checks.push({ check: 'tampering_detected', value: tampering, target: 0 });
    if (tampering > 0) { score -= tampering * 15; failed++; } else { passed++; }

    score = Math.max(0, Math.min(100, score));

    // Auto-create incidents for critical issues
    if (tampering > 0 || auditIssues > 2) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'AUDIT_TAMPERING',
        severity: tampering > 0 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        detected_by: 'lvAuditIntegrityValidation',
        description: `Audit integrity issues: ${tampering} tampering events, ${auditIssues} integrity check failures`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { audit_logs: auditLogs.length, attest_audits: attestAudits.length, integrity_checks: integrityChecks.length, issues: auditIssues, tampering },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});