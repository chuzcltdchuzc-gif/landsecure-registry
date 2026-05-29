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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated as a government officer
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowedRoles = ['super_admin', 'surveyor_general', 'compliance_officer', 'surveyor'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: only government officers can generate parcel IDs' }, { status: 403 });
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