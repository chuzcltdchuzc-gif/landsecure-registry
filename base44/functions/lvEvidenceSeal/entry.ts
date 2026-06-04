/**
 * PHASE 3 — Evidence Sealing Engine
 * Triggered when a LandVaultParcel reaches verification_status = 'fully_verified'
 * or manually via admin action.
 *
 * Actions:
 * - Generates evidence_seal_id (UUID-style)
 * - Records seal_timestamp, sealed_by
 * - Computes seal_hash (SHA-256 of all evidence fingerprints concatenated)
 * - Updates parcel with evidence_sealed = true, evidence_seal_id, seal_timestamp
 * - Creates immutable AuditLog entry
 * - Marks all EvidenceVault records for the parcel as SEALED
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateSealId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SEAL-';
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 8 || i === 12) result += '-';
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: must be admin or triggered from automation (no user session)
    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation */ }
    if (user && !['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parcelId = body.parcel_id || body.event?.entity_id;
    if (!parcelId) return Response.json({ error: 'parcel_id required' }, { status: 400 });

    // Load parcel
    const parcelList = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: parcelId });
    const parcel = parcelList[0];
    if (!parcel) return Response.json({ error: 'Parcel not found' }, { status: 404 });

    // Already sealed?
    if (parcel.evidence_sealed) {
      return Response.json({ status: 'already_sealed', seal_id: parcel.evidence_seal_id });
    }

    // Load all evidence for this parcel
    const evidence = await base44.asServiceRole.entities.EvidenceVault.filter({ parcel_id: parcelId });

    // Build seal hash from all evidence hashes
    const hashInput = evidence
      .filter(e => e.hash_fingerprint)
      .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))
      .map(e => `${e.id}:${e.hash_fingerprint}:${e.captured_at}`)
      .join('|');
    const sealHash = await sha256Hex(`${parcelId}:${hashInput}:${new Date().toISOString()}`);
    const sealId = generateSealId();
    const sealTimestamp = new Date().toISOString();
    const sealedBy = user?.email || 'system@landvault';

    // Update parcel with seal
    await base44.asServiceRole.entities.LandVaultParcel.update(parcelId, {
      evidence_sealed: true,
      evidence_seal_id: sealId,
      evidence_seal_timestamp: sealTimestamp,
      evidence_sealed_by: sealedBy,
      evidence_seal_hash: sealHash,
      evidence_count_at_seal: evidence.length,
    });

    // Update all evidence records to SEALED
    for (const ev of evidence) {
      if (ev.seal_status !== 'SEALED') {
        await base44.asServiceRole.entities.EvidenceVault.update(ev.id, {
          seal_status: 'SEALED',
          sealed_at: sealTimestamp,
          sealed_by: sealedBy,
        });
      }
    }

    // Immutable audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: sealedBy,
      user_name: user?.full_name || 'System',
      action: 'EVIDENCE_PACKAGE_SEALED',
      entity_type: 'LandVaultParcel',
      entity_id: parcelId,
      details: JSON.stringify({
        seal_id: sealId,
        seal_hash: sealHash,
        evidence_count: evidence.length,
        sealed_by: sealedBy,
        timestamp: sealTimestamp,
      }),
    });

    return Response.json({
      status: 'sealed',
      seal_id: sealId,
      seal_hash: sealHash,
      seal_timestamp: sealTimestamp,
      evidence_count: evidence.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});