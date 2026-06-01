/**
 * publicParcelLookup — Public-facing parcel verification endpoint.
 *
 * NO AUTHENTICATION REQUIRED — this is a public transparency endpoint.
 *
 * Payload: { parcel_number: string }
 *
 * Returns ONLY public-safe data:
 *   parcel_number, status, state, lga, ward, community, property_type,
 *   size_sqm, spatial_validation_status, verification_status,
 *   encumbrance_status, registration_date, parcel_boundary (for map)
 *
 * STRICTLY EXCLUDED:
 *   owner_name, owner_email, owner_phone, owner_nin,
 *   family beneficiaries, financial data, internal documents,
 *   fraud scores, internal notes
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PUBLIC_FIELDS = [
  'parcel_number', 'status', 'state', 'lga', 'ward', 'ward_code',
  'community', 'property_type', 'size_sqm', 'size_hectares',
  'spatial_validation_status', 'verification_status', 'encumbrance_status',
  'registration_date', 'approval_date', 'latitude', 'longitude',
  'parcel_boundary', 'boundary_area', 'id', 'land_use', 'address',
  'ownership_type',
  // Certificate status — public safe (no payment amounts, no balances)
  'certificate_release_status',
  'registration_completed',
  'survey_completed',
  'protected_in_registry',
  'ownership_verified',
];

// NEVER include in public response — strictly private
const PRIVATE_FIELDS = [
  'owner_name', 'owner_email', 'owner_phone', 'owner_nin',
  'outstanding_certificate_fee', 'certificate_hold_reason', 'certificate_released_date',
  'registration_package_id',
  'consent_audio', 'consent_signature', 'consent_photo',
  'verbal_consent_gps', 'verbal_consent_agent_id',
  'sign_declined_agent_id', 'sign_declined_gps', 'sign_declined_notes',
  'witness_phone', 'fraud_risk_score', 'fraud_risk_reasons',
  'notes', 'import_source',
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const parcel_number = (body.parcel_number || '').trim().toUpperCase();
    if (!parcel_number) {
      return Response.json({ error: 'parcel_number is required' }, { status: 400 });
    }

    // Basic format validation: should look like XX-XX-XX-XX-XXXXXX
    const formatOk = /^[A-Z]{2,5}-[A-Z]{2,5}-[A-Z]{2,5}-[A-Z]{2,5}-\d{4,8}$/.test(parcel_number);
    if (!formatOk) {
      return Response.json({
        found: false,
        error: 'Invalid parcel number format. Expected format: STATE-LGA-WARD-TYPE-SEQUENCE (e.g. IMO-EHM-UME-RES-000001)',
      }, { status: 400 });
    }

    // Service role lookup (bypasses RLS since this is public)
    const results = await base44.asServiceRole.entities.LandParcel.filter({ parcel_number });

    if (!results || results.length === 0) {
      // Log the lookup attempt (best-effort, non-blocking)
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

    // Compute human-readable status labels
    safe.status_label = {
      pending: 'Pending Review',
      approved: 'Registered',
      approved_locked: 'Registered (Locked)',
      rejected: 'Rejected',
      disputed: 'Under Dispute',
      transferred: 'Transferred',
      frozen: 'Frozen',
      archived: 'Archived',
    }[parcel.status] || parcel.status;

    safe.verification_label = {
      unverified: 'Unverified',
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

    // Certificate status label — public safe, no financial detail
    safe.certificate_status_label = parcel.certificate_release_status === 'released'
      ? 'Certificate Issued'
      : 'Certificate Pending Release';

    safe.property_type_label = {
      RES: 'Residential', COM: 'Commercial', FRM: 'Farm',
      MKT: 'Market', SHP: 'Shop', STL: 'Stall',
      KSK: 'Kiosk', GOV: 'Government', INS: 'Institutional',
    }[parcel.property_type] || parcel.property_type;

    // Log the successful public lookup (best-effort, non-blocking)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    base44.asServiceRole.entities.AuditLog.create({
      user_email: 'public@lookup',
      user_name: 'Public Lookup',
      action: 'PUBLIC_PARCEL_LOOKUP',
      entity_type: 'LandParcel',
      entity_id: parcel.id,
      ip_address: ip,
      details: JSON.stringify({ searched: parcel_number, found: true }),
    }).catch(() => {});

    return Response.json({ found: true, parcel: safe });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});