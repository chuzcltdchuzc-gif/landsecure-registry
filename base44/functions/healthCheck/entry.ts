import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const start = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Probe entity layer latency
    const dbStart = Date.now();
    await base44.asServiceRole.entities.AuditLog.list('-created_date', 1);
    const dbLatencyMs = Date.now() - dbStart;

    const totalMs = Date.now() - start;

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency: {
        total_ms: totalMs,
        db_ms: dbLatencyMs,
      },
      checks: {
        api: 'pass',
        database: dbLatencyMs < 2000 ? 'pass' : 'degraded',
        auth: 'pass',
      },
      version: '1.0.0',
      environment: Deno.env.get('APP_ENV') || 'production',
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      latency: { total_ms: Date.now() - start },
    }, { status: 503 });
  }
});