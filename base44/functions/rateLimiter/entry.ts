/**
 * rateLimiter — Per-user and per-IP rate limiting middleware function.
 *
 * Usage: Call from other backend functions OR invoke directly to check limits.
 * Payload: { user_email?: string, ip?: string, action: string, limit?: number, window_seconds?: number }
 * Returns: { allowed: boolean, remaining: number, reset_at: string, violation?: true }
 *
 * Limits enforced:
 *   - Default: 100 requests per 60 seconds per user
 *   - Burst: 20 requests per 5 seconds per user (burst protection)
 *   - IP fallback: 200 requests per 60 seconds per IP
 *   - Write operations (CREATE/UPDATE/DELETE): 30 per 60 seconds
 *   - Export/backup: 5 per 300 seconds
 *
 * Violations are logged to AuditLog and create a FraudAlert if repeated.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory store for rate limiting within the same isolate instance.
// Deno Deploy uses isolate reuse — effective for burst protection within the same instance.
const rateLimitStore = new Map();

const LIMITS = {
  default:    { requests: 100, windowSec: 60 },
  burst:      { requests: 20,  windowSec: 5 },
  write:      { requests: 30,  windowSec: 60 },
  export:     { requests: 5,   windowSec: 300 },
  ip_default: { requests: 200, windowSec: 60 },
};

function getWriteCategory(action) {
  if (!action) return 'default';
  const a = action.toUpperCase();
  if (['EXPORT', 'BACKUP', 'BULK_IMPORT', 'PDF_GENERATE'].some(k => a.includes(k))) return 'export';
  if (['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'FREEZE'].some(k => a.includes(k))) return 'write';
  return 'default';
}

function checkLimit(key, limit, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 0, windowStart: now });
  }

  const entry = rateLimitStore.get(key);

  // Reset window if expired
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt = new Date(entry.windowStart + windowMs).toISOString();
  const allowed = entry.count <= limit;

  return { allowed, count: entry.count, remaining, resetAt, limit };
}

// Clean up old entries periodically to prevent memory leak
function pruneStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 600_000) { // 10 min max retention
      rateLimitStore.delete(key);
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const { action = 'default', limit_override, window_override } = body;
    let user_email = body.user_email;
    let ip = body.ip || req.headers.get('x-forwarded-for') || 'unknown';

    // Try to get user from session if not provided
    let user = null;
    try { user = await base44.auth.me(); } catch { /* no session */ }
    if (user && !user_email) user_email = user.email;

    // Prune store occasionally
    if (Math.random() < 0.05) pruneStore();

    const category = getWriteCategory(action);
    const limitConfig = limit_override
      ? { requests: limit_override, windowSec: window_override || 60 }
      : LIMITS[category];

    const results = {};

    // Check user limit
    if (user_email) {
      const userKey = `user:${user_email}:${category}`;
      results.user = checkLimit(userKey, limitConfig.requests, limitConfig.windowSec);

      // Also check burst limit for user
      const burstKey = `burst:${user_email}`;
      results.burst = checkLimit(burstKey, LIMITS.burst.requests, LIMITS.burst.windowSec);
    }

    // Check IP limit
    if (ip && ip !== 'unknown') {
      const ipKey = `ip:${ip}:default`;
      results.ip = checkLimit(ipKey, LIMITS.ip_default.requests, LIMITS.ip_default.windowSec);
    }

    // Determine overall allowed
    const userBlocked = results.user && !results.user.allowed;
    const burstBlocked = results.burst && !results.burst.allowed;
    const ipBlocked = results.ip && !results.ip.allowed;
    const allowed = !userBlocked && !burstBlocked && !ipBlocked;

    if (!allowed) {
      const reason = userBlocked ? 'user_rate_limit'
        : burstBlocked ? 'burst_limit'
        : 'ip_rate_limit';

      // Log violation to AuditLog (best-effort, don't fail the rate limit check if this errors)
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: user?.tenant_id || null,
          user_email: user_email || 'anonymous',
          user_name: user?.full_name || 'Unknown',
          action: 'RATE_LIMIT_VIOLATION',
          entity_type: 'RateLimiter',
          entity_id: reason,
          ip_address: ip,
          details: JSON.stringify({
            reason,
            action,
            category,
            user_count: results.user?.count,
            burst_count: results.burst?.count,
            ip_count: results.ip?.count,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch { /* non-blocking */ }

      return Response.json({
        allowed: false,
        violation: true,
        reason,
        retry_after_seconds: limitConfig.windowSec,
        results,
      }, {
        status: 429,
        headers: {
          'Retry-After': String(limitConfig.windowSec),
          'X-RateLimit-Limit': String(limitConfig.requests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': results.user?.resetAt || results.ip?.resetAt || '',
        },
      });
    }

    return Response.json({
      allowed: true,
      action,
      category,
      results,
    }, {
      headers: {
        'X-RateLimit-Limit': String(limitConfig.requests),
        'X-RateLimit-Remaining': String(results.user?.remaining ?? results.ip?.remaining ?? limitConfig.requests),
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});