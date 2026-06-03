/**
 * generateParcelId — Atomically generates the next parcel ID for a given combination.
 *
 * Format: STATE-LGA-WARD-PROPTYPE-SEQUENCE
 * Example: IMO-EHM-UME-RES-000001
 *
 * Rules:
 * - Sequence NEVER resets or reuses deleted numbers
 * - One sequence counter per (state + lga + ward + property_type)
 * - System-generated only — no manual editing
 *
 * Payload: { state_code, lga_code, ward_code, property_type }
 * Returns: { parcel_number, sequence_key, sequence_number }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Per-user rate limit store ─────────────────────────────────────────────────
// 50 parcel ID generations per authenticated user per hour.
// In-memory — effective for burst protection within a single isolate.
const userRateStore = new Map();
const PARCEL_ID_RATE_LIMIT = 50;
const PARCEL_ID_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkUserRateLimit(userEmail) {
  const now = Date.now();
  if (!userRateStore.has(userEmail)) {
    userRateStore.set(userEmail, { count: 1, windowStart: now });
    return { allowed: true, remaining: PARCEL_ID_RATE_LIMIT - 1 };
  }
  const entry = userRateStore.get(userEmail);
  if (now - entry.windowStart > PARCEL_ID_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return { allowed: true, remaining: PARCEL_ID_RATE_LIMIT - 1 };
  }
  entry.count++;
  const allowed = entry.count <= PARCEL_ID_RATE_LIMIT;
  return { allowed, remaining: Math.max(0, PARCEL_ID_RATE_LIMIT - entry.count) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated as a government officer.
    // user.email is obtained from the verified session token — never from client payload.
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowedRoles = ['super_admin', 'surveyor_general', 'compliance_officer', 'surveyor'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: only government officers can generate parcel IDs' }, { status: 403 });
    }

    // ── Rate limit check (uses session-authenticated user.email — not client-supplied) ──
    const { allowed, remaining } = checkUserRateLimit(user.email);
    if (!allowed) {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name,
        action: 'PARCEL_ID_RATE_LIMITED',
        entity_type: 'RateLimiter',
        entity_id: 'generateParcelId',
        details: JSON.stringify({ reason: 'user_rate_limit', limit: PARCEL_ID_RATE_LIMIT, window_hours: 1 }),
      });
      return Response.json(
        { error: 'Rate limit exceeded. Maximum 50 parcel IDs per user per hour.' },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': String(PARCEL_ID_RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await req.json();
    const { state_code, lga_code, ward_code, property_type } = body;

    if (!state_code || !lga_code || !ward_code || !property_type) {
      return Response.json({
        error: 'Missing required fields: state_code, lga_code, ward_code, property_type'
      }, { status: 400 });
    }

    const sc = state_code.toUpperCase().trim();
    const lc = lga_code.toUpperCase().trim();
    const wc = ward_code.toUpperCase().trim();
    const pt = property_type.toUpperCase().trim();
    const sequence_key = `${sc}-${lc}-${wc}-${pt}`;

    // Find existing sequence record
    const existing = await base44.asServiceRole.entities.ParcelSequence.filter({ sequence_key });
    
    let nextSeq;
    if (existing.length === 0) {
      // Create new sequence starting at 1
      nextSeq = 1;
      await base44.asServiceRole.entities.ParcelSequence.create({
        sequence_key,
        last_sequence: nextSeq,
        state_code: sc,
        lga_code: lc,
        ward_code: wc,
        property_type: pt,
      });
    } else {
      const record = existing[0];
      nextSeq = (record.last_sequence || 0) + 1;
      await base44.asServiceRole.entities.ParcelSequence.update(record.id, {
        last_sequence: nextSeq,
      });
    }

    const sequencePadded = String(nextSeq).padStart(6, '0');
    const parcel_number = `${sc}-${lc}-${wc}-${pt}-${sequencePadded}`;

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'PARCEL_ID_GENERATED',
      entity_type: 'ParcelSequence',
      entity_id: sequence_key,
      details: JSON.stringify({ parcel_number, sequence_key, sequence_number: nextSeq }),
    });

    return Response.json({
      parcel_number,
      sequence_key,
      sequence_number: nextSeq,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});