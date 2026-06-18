/**
 * lvHashChainProtection — Blockchain-style audit linkage.
 * Generates previous_hash, current_hash, chain_position for every evidence,
 * attestation, certificate, verification event, and audit entry.
 * Any modification breaks chain integrity — detected by security scans.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function computeHash(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const entityType = body.entity_type;
    const entityId = body.entity_id;
    const fieldsForHash = body.fields || {};

    if (!entityType || !entityId) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    // Get the previous chain entry for this entity
    const prevChains = await base44.asServiceRole.entities.HashChainEntry.filter(
      { entity_type: entityType },
      '-chain_position',
      1
    );

    const previousHash = prevChains.length > 0 ? prevChains[0].current_hash : 'GENESIS_' + entityType;
    const chainPosition = prevChains.length > 0 ? (prevChains[0].chain_position || 0) + 1 : 1;

    // Compute current hash from entity data + previous hash
    const dataSnapshot = JSON.stringify({ ...fieldsForHash, entity_type: entityType, entity_id: entityId });
    const currentHash = await computeHash(dataSnapshot + previousHash + chainPosition);

    // Create chain entry
    const entry = await base44.asServiceRole.entities.HashChainEntry.create({
      entity_type: entityType,
      entity_id: entityId,
      parcel_id: body.parcel_id || '',
      parcel_number: body.parcel_number || '',
      previous_hash: previousHash,
      current_hash: currentHash,
      chain_position: chainPosition,
      chain_parent_id: prevChains.length > 0 ? prevChains[0].id : null,
      data_snapshot: dataSnapshot.substring(0, 4000),
      computed_at: new Date().toISOString(),
      verification_status: 'UNVERIFIED',
    });

    return Response.json({
      status: 'chained',
      chain_id: entry.id,
      entry_id: entry.chain_id || entry.id,
      entity_type: entityType,
      entity_id: entityId,
      chain_position: chainPosition,
      previous_hash: previousHash.substring(0, 16) + '...',
      current_hash: currentHash.substring(0, 16) + '...',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});