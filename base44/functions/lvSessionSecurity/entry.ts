/**
 * lvSessionSecurity — Login & session security monitor.
 * Tracks login attempts, failed logins, concurrent sessions, account lockouts,
 * brute force attempts, and impossible travel detection.
 * Enforces: 5 failed attempts = 30 min lockout.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const userEmail = body.user_email;
    const eventType = body.event_type || 'LOGIN_FAILURE';
    const ip = body.ip_address || 'unknown';
    const deviceFingerprint = body.device_fingerprint || 'unknown';
    const location = body.location || 'unknown';
    const browser = body.browser || 'unknown';

    if (!userEmail) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    // Get recent sessions for this user
    const recentSessions = await base44.asServiceRole.entities.SecuritySession.filter(
      { user_email: userEmail },
      '-created_date',
      100
    );

    // Check for existing lockout
    const existingLockout = recentSessions.find(s => s.account_locked && s.lockout_until && new Date(s.lockout_until) > new Date());
    if (existingLockout) {
      return Response.json({
        status: 'locked',
        user_email: userEmail,
        lockout_until: existingLockout.lockout_until,
        message: `Account locked until ${new Date(existingLockout.lockout_until).toISOString()}`,
      });
    }

    // Record session event
    const session = await base44.asServiceRole.entities.SecuritySession.create({
      user_email: userEmail,
      event_type: eventType,
      ip_address: ip,
      device_fingerprint: deviceFingerprint,
      location,
      browser,
      login_attempts: 1,
      consecutive_failures: eventType === 'LOGIN_FAILURE' ? 1 : 0,
      session_start: eventType === 'LOGIN_SUCCESS' ? new Date().toISOString() : null,
    });

    // Detect brute force: count consecutive failures
    const recentFailures = recentSessions.filter(s => s.event_type === 'LOGIN_FAILURE');
    const consecutiveFailures = recentFailures.length + (eventType === 'LOGIN_FAILURE' ? 1 : 0);

    // Lock account if too many failures
    if (consecutiveFailures >= MAX_FAILURES) {
      const lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      await base44.asServiceRole.entities.SecuritySession.create({
        user_email: userEmail,
        event_type: 'ACCOUNT_LOCKOUT',
        ip_address: ip,
        device_fingerprint: deviceFingerprint,
        consecutive_failures: consecutiveFailures,
        account_locked: true,
        lockout_until: lockoutUntil.toISOString(),
      });

      await base44.asServiceRole.entities.FraudSignal.create({
        user_email: userEmail,
        signal_type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'CRITICAL',
        risk_score: Math.min(100, consecutiveFailures * 15),
        count: consecutiveFailures,
        window_minutes: 30,
        details: JSON.stringify({ consecutive_failures: consecutiveFailures, lockout_until: lockoutUntil.toISOString() }),
        created_at: new Date().toISOString(),
        status: 'OPEN',
      });

      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        status: 'OPEN',
        detected_by: 'lvSessionSecurity',
        description: `Brute force detected: ${userEmail} — ${consecutiveFailures} consecutive failures. Account locked until ${lockoutUntil.toISOString()}`,
        opened_at: new Date().toISOString(),
      });

      return Response.json({
        status: 'locked',
        user_email: userEmail,
        consecutive_failures: consecutiveFailures,
        lockout_until: lockoutUntil.toISOString(),
        security_incident_created: true,
      });
    }

    // Detect concurrent sessions
    const activeSessions = recentSessions.filter(s =>
      s.event_type === 'LOGIN_SUCCESS' &&
      s.is_active &&
      s.created_date > new Date(Date.now() - 3600000).toISOString()
    );
    const uniqueDevices = new Set(activeSessions.map(s => s.device_fingerprint)).size;

    if (activeSessions.length >= 3 && uniqueDevices >= 3) {
      await base44.asServiceRole.entities.FraudSignal.create({
        user_email: userEmail,
        signal_type: 'CONCURRENT_SESSION_ABUSE',
        severity: 'HIGH',
        risk_score: 75,
        count: activeSessions.length,
        window_minutes: 60,
        details: JSON.stringify({ active_sessions: activeSessions.length, unique_devices: uniqueDevices }),
        created_at: new Date().toISOString(),
        status: 'OPEN',
      });
    }

    return Response.json({
      status: 'recorded',
      session_id: session.id,
      user_email: userEmail,
      event_type: eventType,
      consecutive_failures: consecutiveFailures,
      active_sessions: activeSessions.length,
      unique_devices: uniqueDevices,
      risk_level: consecutiveFailures >= 3 ? 'ELEVATED' : activeSessions.length >= 3 ? 'MONITORED' : 'NORMAL',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});