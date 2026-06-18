/**
 * lvEvidenceLock — Evidence immutability enforcement.
 * Automatically creates locks when survey plans are approved, attestations approved,
 * verification reports issued, or certificates generated.
 * Prevents direct editing — corrections require new versions.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const entityType = body.entity_type;
    const entityId = body.entity_id;
    const lockReason = body.lock_reason;

    if (!entityType || !entityId || !lockReason) {
      return Response.json({ error: 'entity_type, entity_id, and lock_reason required' }, { status: 400 });
    }

    // Fetch the entity to get its hash
    let entity = null;
    let evidenceHash = '';
    let parcelId = '';
    let parcelNumber = '';

    if (entityType === 'EvidenceVault') {
      const list = await base44.asServiceRole.entities.EvidenceVault.filter({ id: entityId });
      entity = list[0];
      if (!entity) return Response.json({ error: 'EvidenceVault record not found' }, { status: 404 });
      evidenceHash = entity.hash_fingerprint || '';
      parcelId = entity.parcel_id || '';
      parcelNumber = entity.parcel_number || '';
    } else if (entityType === 'CommunityAttestation') {
      const list = await base44.asServiceRole.entities.CommunityAttestation.filter({ id: entityId });
      entity = list[0];
      if (!entity) return Response.json({ error: 'CommunityAttestation not found' }, { status: 404 });
      evidenceHash = entity.voice_recording_hash || entity.video_recording_hash || '';
      parcelId = entity.parcel_id || '';
      parcelNumber = entity.parcel_number || '';
    } else if (entityType === 'LandVaultParcel') {
      const list = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: entityId });
      entity = list[0];
      if (!entity) return Response.json({ error: 'LandVaultParcel not found' }, { status: 404 });
      evidenceHash = entity.evidence_seal_hash || entity.gps_lat + '_' + entity.gps_lng || '';
      parcelId = entityId;
      parcelNumber = entity.parcel_number || '';
    } else {
      // Generic: try to look up
      evidenceHash = body.evidence_hash || `no-hash-${Date.now()}`;
    }

    // Check if there's already an active lock — supersede it
    const existingLocks = await base44.asServiceRole.entities.EvidenceLock.filter({
      entity_type: entityType,
      entity_id: entityId,
      status: 'ACTIVE',
    });

    let previousLockId = null;
    let versionNumber = 1;

    if (existingLocks.length > 0) {
      const prevLock = existingLocks[0];
      previousLockId = prevLock.id;
      versionNumber = (prevLock.version_number || 0) + 1;
      await base44.asServiceRole.entities.EvidenceLock.update(prevLock.id, {
        status: 'SUPERSEDED',
        superseded_by: 'pending',
      });
    }

    // Create new lock
    const lock = await base44.asServiceRole.entities.EvidenceLock.create({
      entity_type: entityType,
      entity_id: entityId,
      parcel_id: parcelId,
      parcel_number: parcelNumber,
      evidence_hash: evidenceHash,
      locked_by: body.locked_by || 'system',
      locked_at: new Date().toISOString(),
      lock_reason: lockReason,
      verification_hash: await computeHash(evidenceHash + lockReason + Date.now()),
      previous_lock_id: previousLockId,
      version_number: versionNumber,
      status: 'ACTIVE',
    });

    // Update superseded lock with new lock ID
    if (previousLockId) {
      await base44.asServiceRole.entities.EvidenceLock.update(previousLockId, {
        superseded_by: lock.id,
      });
    }

    // Record audit event
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: body.locked_by || 'system@landvault',
      user_name: 'EvidenceLock Engine',
      action: 'EVIDENCE_LOCKED',
      entity_type: 'EvidenceLock',
      entity_id: lock.id,
      details: JSON.stringify({
        lock_id: lock.lock_id,
        entity_type: entityType,
        entity_id: entityId,
        lock_reason: lockReason,
        version: versionNumber,
        previous_lock: previousLockId,
      }),
    });

    return Response.json({
      status: 'locked',
      lock_id: lock.id,
      entity_type: entityType,
      entity_id: entityId,
      lock_reason: lockReason,
      evidence_hash: evidenceHash,
      version_number: versionNumber,
      previous_lock_id: previousLockId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function computeHash(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}