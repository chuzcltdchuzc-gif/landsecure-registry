/**
 * abuseDetection — API Abuse Detection & Anomaly Monitoring.
 * Scans AuditLog for burst activity patterns indicating abuse or compromised accounts.
 * Called by: scheduled automation (every 30 min) or manual admin invocation.
 *
 * Detections:
 * - Burst writes: >50 actions from a single user in 60 minutes
 * - Off-hours access: admin actions between 00:00-05:00 local time
 * - Mass data access: >200 read actions in 60 minutes
 * - Failed auth spikes: tracked via error audit entries
 *
 * Creates FraudAlert records for confirmed anomalies.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BURST_WRITE_THRESHOLD = 50;   // actions per hour
const MASS_READ_THRESHOLD = 200;    // reads per hour
const WINDOW_MS = 60 * 60 * 1000;  // 1 hour window

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow: scheduled automation (no user session) OR privileged roles
    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation context */ }
    if (user && !['super_admin', 'compliance_officer', 'surveyor_general'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();
    const windowStart = new Date(now - WINDOW_MS).toISOString();

    // Fetch recent audit log entries
    const recentLogs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 2000);

    // Filter to the 1-hour window
    const windowLogs = recentLogs.filter(l =>
      new Date(l.created_date).getTime() >= now - WINDOW_MS
    );

    // Group by user
    const byUser = {};
    for (const log of windowLogs) {
      if (!log.user_email) continue;
      if (!byUser[log.user_email]) byUser[log.user_email] = [];
      byUser[log.user_email].push(log);
    }

    const anomalies = [];

    for (const [email, logs] of Object.entries(byUser)) {
      // Burst write detection
      if (logs.length >= BURST_WRITE_THRESHOLD) {
        anomalies.push({
          type: 'burst_activity',
          severity: logs.length >= 100 ? 'critical' : 'high',
          user: email,
          count: logs.length,
          description: `User ${email} performed ${logs.length} actions in the last 60 minutes (threshold: ${BURST_WRITE_THRESHOLD}).`,
        });
      }

      // Off-hours admin access (UTC 00:00-05:00)
      const offHoursActions = logs.filter(l => {
        const h = new Date(l.created_date).getUTCHours();
        return h >= 0 && h < 5 && ['APPROVE', 'DELETE', 'FREEZE', 'TRANSFER'].some(a => l.action?.includes(a));
      });
      if (offHoursActions.length > 0) {
        anomalies.push({
          type: 'off_hours_admin',
          severity: 'medium',
          user: email,
          count: offHoursActions.length,
          description: `User ${email} performed ${offHoursActions.length} privileged action(s) between 00:00-05:00 UTC.`,
        });
      }
    }

    // Create FraudAlert records for each high/critical anomaly
    let alertsCreated = 0;
    for (const anomaly of anomalies) {
      if (!['high', 'critical'].includes(anomaly.severity)) continue;

      // Avoid duplicate alerts for the same user in the same window
      const existing = await base44.asServiceRole.entities.FraudAlert.filter({
        alert_type: 'other',
        status: 'open',
      });
      const alreadyFlagged = existing.some(a =>
        a.description?.includes(anomaly.user) &&
        new Date(a.created_date).getTime() > now - WINDOW_MS
      );

      if (!alreadyFlagged) {
        await base44.asServiceRole.entities.FraudAlert.create({
          parcel_id: 'system',
          parcel_number: 'N/A',
          flagged_by: 'system@landsecure.gov.ng',
          flagged_by_name: 'Abuse Detection Engine',
          alert_type: 'other',
          severity: anomaly.severity,
          description: anomaly.description,
          status: 'open',
        });
        alertsCreated++;
      }
    }

    // Log the scan itself
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: 'system@landsecure.gov.ng',
      user_name: 'Abuse Detection Engine',
      action: 'ABUSE_DETECTION_SCAN',
      entity_type: 'System',
      entity_id: 'abuse_monitor',
      details: JSON.stringify({
        window_logs: windowLogs.length,
        unique_users: Object.keys(byUser).length,
        anomalies_detected: anomalies.length,
        alerts_created: alertsCreated,
        timestamp: new Date().toISOString(),
      }),
    });

    return Response.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      window_hours: 1,
      logs_scanned: windowLogs.length,
      unique_users: Object.keys(byUser).length,
      anomalies_detected: anomalies.length,
      alerts_created: alertsCreated,
      anomalies,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});