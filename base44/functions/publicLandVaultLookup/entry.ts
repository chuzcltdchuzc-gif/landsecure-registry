/**
 * publicLandVaultLookup — Public LandVault parcel verification endpoint.
 *
 * SECTION J — Strictly no PII. No auth required.
 * Payload: { parcel_number: string }
 *
 * STRICTLY EXCLUDED from response:
 *   owner_name, owner_phone, owner_nin, family_representative, representative_name,
 *   field_agent_email, field_agent_name, gps_lat, gps_lng, gps_accuracy_m,
 *   consent_*, payment_history, outstanding_balance, total_fee, amount_paid,
 *   survey_plan_url, authority_document_url, supporting_docs, photos,
 *   family_history_notes, inheritance_notes, founder_name, duplicate_*,
 *   risk_factors, device_id
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ipRateStore = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkIpRateLimit(ip) {
  const now = Date.now();
  if (!ipRateStore.has(ip)) {
    ipRateStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  const entry = ipRateStore.get(ip);
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1; entry.windowStart = now;
    return { allowed: true };
  }
  entry.count++;
  return { allowed: entry.count <= RATE_LIMIT_MAX };
}

// SECTION J — strict public allowlist for LandVaultParcel
const PUBLIC_FIELDS = [
  'parcel_number', 'status', 'verification_status',
  'community', 'village', 'ward', 'lga', 'state',
  'ownership_type', 'land_use',
  'size_sqm', 'size_hectares',
  'survey_status', 'survey_date', 'surveyor_licence', 'surveyor_name',
  'certificate_status', 'protected_in_registry',
  'community_validation_status', 'community_confirmed', 'community_confirmed_at',
  'consent_strength_score', 'consent_confidence',
  'risk_level',
  'created_date', 'updated_date',
];

function sanitize(parcel) {
  const safe = {};
  for (const f of PUBLIC_FIELDS) {
    if (parcel[f] !== undefined && parcel[f] !== null) safe[f] = parcel[f];
  }
  return safe;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim() || 'unknown';
    if (ip !== 'unknown') {
      if (!checkIpRateLimit(ip).allowed) {
        return Response.json({ error: 'Too many requests.' }, { status: 429 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parcel_number = (body.parcel_number || '').trim().toUpperCase();
    if (!parcel_number) {
      return Response.json({ error: 'parcel_number is required' }, { status: 400 });
    }

    const results = await base44.asServiceRole.entities.LandVaultParcel.filter({ parcel_number });
    if (!results || results.length === 0) {
      base44.asServiceRole.entities.AuditLog.create({
        user_email: 'public@landvault', user_name: 'Public LV Lookup',
        action: 'PUBLIC_LV_LOOKUP_NOT_FOUND', entity_type: 'LandVaultParcel',
        entity_id: parcel_number, ip_address: ip,
        details: JSON.stringify({ searched: parcel_number, found: false }),
      }).catch(() => {});
      return Response.json({ found: false, parcel_number });
    }

    const parcel = results[0];
    const safe = sanitize(parcel);

    // Computed labels
    safe.status_label = {
      draft: 'Draft', submitted: 'Submitted', survey_assigned: 'Survey Assigned',
      survey_in_progress: 'Survey In Progress', survey_complete: 'Survey Complete',
      documentation_complete: 'Documentation Complete', certificate_ready: 'Certificate Ready',
      certificate_issued: 'Certificate Issued', disputed: 'Disputed', archived: 'Archived',
    }[parcel.status] || parcel.status;

    safe.verification_label = {
      unverified: 'Not Yet Verified', field_verified: 'Field Verified',
      survey_verified: 'Survey Verified', community_validated: 'Community Validated',
      fully_verified: 'Fully Verified',
    }[parcel.verification_status] || parcel.verification_status;

    safe.certificate_valid = parcel.certificate_status === 'RELEASED' || parcel.certificate_status === 'ACTIVE';
    safe.has_community_validation = parcel.community_validation_status === 'confirmed';
    safe.verified_at = new Date().toISOString();

    base44.asServiceRole.entities.AuditLog.create({
      user_email: 'public@landvault', user_name: 'Public LV Lookup',
      action: 'PUBLIC_LV_LOOKUP', entity_type: 'LandVaultParcel',
      entity_id: parcel.id, ip_address: ip,
      details: JSON.stringify({ searched: parcel_number, found: true }),
    }).catch(() => {});

    return Response.json({ found: true, parcel: safe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});