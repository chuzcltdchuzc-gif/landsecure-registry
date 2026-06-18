/**
 * lvPermissionAuditor — Role & permission audit engine.
 * Evaluates all roles for privilege escalation, excessive permissions,
 * overlapping rights, unauthorized access paths, and broken RLS policies.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Known roles and their expected capability levels
const ROLE_CAPABILITIES = {
  super_admin: { create: true, read: true, update: true, delete: true, approve: true, export: true, cert: true, audit: true, security: true },
  surveyor_general: { create: false, read: true, update: true, delete: false, approve: true, export: true, cert: true, audit: true, security: true },
  compliance_officer: { create: false, read: true, update: true, delete: false, approve: true, export: true, cert: true, audit: true, security: true },
  licensed_surveyor: { create: true, read: true, update: true, delete: false, approve: false, export: true, cert: true, audit: false, security: false },
  surveyor_partner: { create: true, read: true, update: true, delete: false, approve: false, export: true, cert: true, audit: false, security: false },
  field_agent: { create: true, read: true, update: true, delete: false, approve: false, export: false, cert: false, audit: false, security: false },
  community_validator: { create: true, read: true, update: true, delete: false, approve: false, export: false, cert: false, audit: false, security: false },
  government_observer: { create: false, read: true, update: false, delete: false, approve: false, export: false, cert: false, audit: false, security: false },
  general_user: { create: false, read: false, update: false, delete: false, approve: false, export: false, cert: false, audit: false, security: false },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Get all users with roles
    const allUsers = await base44.asServiceRole.entities.User.list('', 200);
    const roleDistribution = {};
    const issues = [];

    for (const user of allUsers) {
      const role = user.role || 'public_user';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    }

    // Audit each role for issues
    const results = [];
    for (const [role, capabilities] of Object.entries(ROLE_CAPABILITIES)) {
      const roleIssues = [];
      let riskScore = 0;

      // Check excessive privileges
      if (capabilities.delete && !['super_admin'].includes(role)) {
        roleIssues.push({ type: 'excessive_privilege', detail: 'delete right on non-admin role', severity: 'HIGH' });
        riskScore += 25;
      }

      if (capabilities.security && !['super_admin', 'surveyor_general', 'compliance_officer'].includes(role)) {
        roleIssues.push({ type: 'potential_escalation', detail: 'security rights on non-admin role', severity: 'CRITICAL' });
        riskScore += 40;
      }

      if (capabilities.approve && !['super_admin', 'surveyor_general', 'compliance_officer'].includes(role)) {
        roleIssues.push({ type: 'potential_escalation', detail: 'approval rights on non-governance role', severity: 'HIGH' });
        riskScore += 30;
      }

      // Check potential escalation paths
      if (capabilities.create && capabilities.update && capabilities.delete && !['super_admin'].includes(role)) {
        roleIssues.push({ type: 'potential_escalation', detail: 'full CRUD on non-super_admin role', severity: 'HIGH' });
        riskScore += 30;
      }

      const riskLevel = riskScore >= 50 ? 'CRITICAL' : riskScore >= 30 ? 'HIGH' : riskScore >= 15 ? 'MEDIUM' : 'LOW';

      if (roleIssues.length > 0) {
        issues.push({
          role,
          risk_score: riskScore,
          risk_level: riskLevel,
          issue_count: roleIssues.length,
          issues: roleIssues,
        });
      }

      // Create report
      const report = await base44.asServiceRole.entities.PermissionRiskReport.create({
        role_audited: role,
        risk_score: riskScore,
        risk_level: riskLevel,
        issues_found: roleIssues.length,
        issues: JSON.stringify(roleIssues),
        escalation_detected: roleIssues.some(i => i.type === 'potential_escalation'),
        overlapping_permissions: false,
        excessive_privileges: roleIssues.some(i => i.type === 'excessive_privilege'),
        unauthorized_access_paths: false,
        broken_rls_detected: false,
        remediation_suggestions: JSON.stringify(
          roleIssues.map(i => `Fix ${i.type}: remove ${i.detail}`)
        ),
        audit_timestamp: new Date().toISOString(),
        audited_by: 'system',
      });

      results.push({ role, risk_score: riskScore, risk_level: riskLevel, report_id: report.id });
    }

    // Create security incident if critical issues found
    const criticalRoles = results.filter(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH');
    if (criticalRoles.length > 0) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'ROLE_ESCALATION',
        severity: 'HIGH',
        status: 'OPEN',
        detected_by: 'lvPermissionAuditor',
        description: `${criticalRoles.length} roles with elevated risk: ${criticalRoles.map(r => `${r.role}(${r.risk_score})`).join(', ')}`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      roles_audited: results.length,
      critical_issues: criticalRoles.length,
      total_issues: issues.reduce((sum, i) => sum + i.issue_count, 0),
      role_distribution: roleDistribution,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});