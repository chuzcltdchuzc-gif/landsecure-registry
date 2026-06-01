/**
 * publicParcelLookup — Government-grade public parcel verification endpoint.
 *
 * NO AUTHENTICATION REQUIRED — public transparency endpoint.
 * Payload: { parcel_number: string }
 *
 * STRICTLY EXCLUDED from response:
 *   owner_name, owner_email, owner_phone, owner_nin, owner_photo,
 *   consent_photo, consent_signature, consent_audio,
 *   payment_history, outstanding_balance, registration_package_id,
 *   internal_notes, fraud_risk_score, fraud_risk_reasons,
 *   audit_logs, family beneficiaries
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PUBLIC_FIELDS = [
  'parcel_number', 'status', 'state', 'lga', 'ward', 'ward_code',
  'community', 'property_type', 'size_sqm', 'size_hectares',
  'spatial_validation_status', 'verification_status', 'encumbrance_status',
  'registration_date', 'approval_date', 'updated_date', 'latitude', 'longitude',
  'parcel_boundary', 'boundary_area', 'id', 'land_use', 'address',
  'ownership_type',
  'certificate_release_status',
  'registration_completed',
  'survey_completed',
  'protected_in_registry',
  'ownership_verified',
  'community_confirmed',
  'verbal_consent',
  'consent_strength_score',
  'consent_confidence',
];

function sanitizeParcel(parcel) {
  const safe = {};
  for (const field of PUBLIC_FIELDS) {
    if (parcel[field] !== undefined && parcel[field] !== null) {
      safe[field] = parcel[field];
    }
  }
  return safe;
}

/**
 * Compute certificate_validity_status from parcel data.
 */
function computeCertificateValidity(parcel) {
  const status = parcel.status;
  const certStatus = parcel.certificate_release_status;

  if (status === 'disputed' || parcel.encumbrance_status === 'dispute') return 'DISPUTED';
  if (status === 'frozen' || status === 'frozen' || parcel.encumbrance_status === 'court_order') return 'FROZEN';
  if (status === 'rejected') return 'REVOKED';
  if (status === 'archived') return 'SUPERSEDED';
  if (certStatus === 'released' && (status === 'approved' || status === 'approved_locked')) return 'VALID';
  if (status === 'approved' || status === 'approved_locked') return 'PENDING_RELEASE';
  if (status === 'pending') return 'PENDING_RELEASE';
  return 'UNDER_REVIEW';
}

/**
 * Compute registry_confidence_score (0–100) from available signals.
 * Scoring is computed server-side only; breakdown is not exposed.
 */
function computeConfidenceScore(parcel) {
  let score = 0;

  // Survey / GIS (25 pts)
  if (parcel.verification_status === 'fully_verified') score += 25;
  else if (parcel.verification_status === 'survey_verified') score += 20;
  else if (parcel.verification_status === 'field_verified') score += 10;

  // Registration status (20 pts)
  if (parcel.status === 'approved_locked') score += 20;
  else if (parcel.status === 'approved') score += 18;
  else if (parcel.status === 'pending') score += 8;

  // Certificate issued (15 pts)
  if (parcel.certificate_release_status === 'released') score += 15;

  // Consent captured (15 pts)
  if (parcel.consent_strength_score >= 80) score += 15;
  else if (parcel.consent_strength_score >= 50) score += 10;
  else if (parcel.verbal_consent) score += 5;

  // Community validated (15 pts)
  if (parcel.community_confirmed) score += 15;

  // No active dispute / encumbrance (10 pts)
  if (!parcel.encumbrance_status || parcel.encumbrance_status === 'none') score += 10;

  return Math.min(100, score);
}

/**
 * Compute ownership_version_count from OwnershipHistory records.
 * Returns a number — names and details are NEVER returned.
 */
async function getOwnershipVersionCount(base44, parcel_id) {
  try {
    const history = await base44.asServiceRole.entities.OwnershipHistory.filter({ parcel_id });
    return history ? history.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Check for active disputes on this parcel (boolean only, no details).
 */
async function hasActiveDispute(base44, parcel_id) {
  try {
    const disputes = await base44.asServiceRole.entities.Dispute.filter({ parcel_id });
    if (!disputes || disputes.length === 0) return false;
    return disputes.some(d => ['open', 'under_review', 'escalated'].includes(d.status));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const parcel_number = (body.parcel_number || '').trim().toUpperCase();
    if (!parcel_number) {
      return Response.json({ error: 'parcel_number is required' }, { status: 400 });
    }

    // Format validation: STATE-LGA-WARD-TYPE-SEQUENCE
    const formatOk = /^[A-Z]{2,5}-[A-Z]{2,5}-[A-Z]{2,5}-[A-Z]{2,5}-\d{4,8}$/.test(parcel_number);
    if (!formatOk) {
      return Response.json({
        found: false,
        error: 'Invalid parcel number format. Expected: STATE-LGA-WARD-TYPE-SEQUENCE (e.g. IMO-EHM-UME-RES-000001)',
      }, { status: 400 });
    }

    // Service role lookup — bypasses RLS (public endpoint)
    const results = await base44.asServiceRole.entities.LandParcel.filter({ parcel_number });

    if (!results || results.length === 0) {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      base44.asServiceRole.entities.AuditLog.create({
        user_email: 'public@lookup',
        user_name: 'Public Lookup',
        action: 'PUBLIC_PARCEL_LOOKUP_NOT_FOUND',
        entity_type: 'LandParcel',
        entity_id: parcel_number,
        ip_address: ip,
        details: JSON.stringify({ searched: parcel_number, found: false }),
      }).catch(() => {});
      return Response.json({ found: false, parcel_number });
    }

    const parcel = results[0];
    const safe = sanitizeParcel(parcel);

    // ── Computed fields (server-side only, no private data exposed) ──

    // Certificate validity engine
    safe.certificate_validity_status = computeCertificateValidity(parcel);

    // Registry confidence score
    safe.registry_confidence_score = computeConfidenceScore(parcel);
    const cs = safe.registry_confidence_score;
    safe.registry_confidence_rating = cs >= 95 ? 'VERY HIGH' : cs >= 70 ? 'HIGH' : cs >= 50 ? 'MODERATE' : 'LOW';

    // Ownership history indicator (count only — zero names/details)
    const ownershipVersionCount = await getOwnershipVersionCount(base44, parcel.id);
    safe.ownership_version_count = ownershipVersionCount;
    safe.ownership_history_available = ownershipVersionCount > 0;
    safe.ownership_history_label = ownershipVersionCount > 1
      ? 'Multiple Registered Ownership Events'
      : ownershipVersionCount === 1
        ? 'Available'
        : 'Not Available';

    // Certificate version (default V1)
    safe.certificate_version = parcel.certificate_version || 'V1';

    // Active dispute indicator (boolean only)
    safe.has_active_dispute = await hasActiveDispute(base44, parcel.id);

    // ── Human-readable labels ──

    safe.status_label = {
      pending: 'Pending Review',
      approved: 'Active',
      approved_locked: 'Active (Locked)',
      rejected: 'Rejected',
      disputed: 'Under Dispute',
      transferred: 'Transferred',
      frozen: 'Frozen',
      archived: 'Archived',
    }[parcel.status] || parcel.status;

    safe.verification_label = {
      unverified: 'Not Yet Verified',
      field_verified: 'Field Verified',
      survey_verified: 'Survey Verified',
      fully_verified: 'Fully Verified',
    }[parcel.verification_status] || parcel.verification_status;

    safe.ownership_label = {
      individual: 'Individual Ownership',
      family: 'Family Ownership',
      community: 'Community Ownership',
      government: 'Government Ownership',
    }[parcel.ownership_type] || parcel.ownership_type;

    safe.certificate_validity_label = {
      VALID: 'Valid Certificate',
      PENDING_RELEASE: 'Pending Release',
      UNDER_REVIEW: 'Under Review',
      DISPUTED: 'Disputed',
      FROZEN: 'Frozen',
      REVOKED: 'Revoked',
      SUPERSEDED: 'Superseded',
    }[safe.certificate_validity_status] || safe.certificate_validity_status;

    safe.property_type_label = {
      RES: 'Residential', COM: 'Commercial', FRM: 'Farm',
      MKT: 'Market', SHP: 'Shop', STL: 'Stall',
      KSK: 'Kiosk', GOV: 'Government', INS: 'Institutional',
    }[parcel.property_type] || parcel.property_type;

    // Verification timestamp
    safe.verified_at = new Date().toISOString();

    // Log successful lookup (best-effort)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    base44.asServiceRole.entities.AuditLog.create({
      user_email: 'public@lookup',
      user_name: 'Public Lookup',
      action: 'PUBLIC_PARCEL_LOOKUP',
      entity_type: 'LandParcel',
      entity_id: parcel.id,
      ip_address: ip,
      details: JSON.stringify({ searched: parcel_number, found: true, cert_status: safe.certificate_validity_status }),
    }).catch(() => {});

    return Response.json({ found: true, parcel: safe });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});