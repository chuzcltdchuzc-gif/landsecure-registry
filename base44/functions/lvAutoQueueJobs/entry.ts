/**
 * lvAutoQueueJobs — Entity automation bridge for automatic job creation.
 *
 * Converts entity automation events into appropriate background jobs.
 * Called by entity automations (NOT by the frontend directly).
 *
 * Events:
 *   LandVaultParcel create → duplicate_scan job
 *   LandVaultParcel update → confidence_recalculation job
 *   EvidenceVault create    → duplicate_scan + evidence_hashing jobs
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ACTIVE_STATUSES = ['pending', 'queued', 'processing', 'retrying'];

async function createIfNotActive(base44, jobData) {
  // Check for existing active job of same type on same entity
  const query = { job_type: jobData.job_type, status: ACTIVE_STATUSES[0] };
  if (jobData.entity_id) query.entity_id = jobData.entity_id;

  let existing = null;
  for (const status of ACTIVE_STATUSES) {
    query.status = status;
    const batch = await base44.asServiceRole.entities.JobQueue.filter(query, '-created_date', 3);
    if (batch.length > 0) { existing = batch[0]; break; }
  }

  if (existing) {
    return { skipped: true, existing_job_id: existing.id, reason: 'Active job already exists' };
  }

  await base44.asServiceRole.entities.JobQueue.create(jobData);
  return { created: true, job_type: jobData.job_type, entity_id: jobData.entity_id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event, data } = body;

    if (!event || !data) {
      return Response.json({ skipped: true, reason: 'No event/data in payload' });
    }

    const entityId = event.entity_id;
    const entityName = event.entity_name;
    const eventType = event.type;

    const results = [];

    if (entityName === 'LandVaultParcel' && eventType === 'create') {
      // Queue duplicate scan for new parcel
      results.push(await createIfNotActive(base44, {
        job_type: 'duplicate_scan',
        entity_type: 'LandVaultParcel',
        entity_id: entityId,
        status: 'pending',
        priority: 'high',
        attempts: 0,
        max_attempts: 3,
        created_by: 'system@landvault',
        idempotency_key: `duplicate_scan:${entityId}`,
        payload: JSON.stringify({ parcel_id: entityId, entity_id: entityId, event_type: 'parcel' }),
      }));

      // Queue confidence recalculation
      results.push(await createIfNotActive(base44, {
        job_type: 'confidence_recalculation',
        entity_type: 'LandVaultParcel',
        entity_id: entityId,
        status: 'pending',
        priority: 'normal',
        attempts: 0,
        max_attempts: 3,
        created_by: 'system@landvault',
        idempotency_key: `confidence_recalculation:${entityId}`,
        payload: JSON.stringify({ entity_id: entityId, mode: 'single' }),
      }));
    }

    if (entityName === 'LandVaultParcel' && eventType === 'update') {
      // Queue confidence recalculation on update
      results.push(await createIfNotActive(base44, {
        job_type: 'confidence_recalculation',
        entity_type: 'LandVaultParcel',
        entity_id: entityId,
        status: 'pending',
        priority: 'normal',
        attempts: 0,
        max_attempts: 3,
        created_by: 'system@landvault',
        idempotency_key: `confidence_recalculation:${entityId}`,
        payload: JSON.stringify({ entity_id: entityId, mode: 'single' }),
      }));
    }

    if (entityName === 'EvidenceVault' && eventType === 'create') {
      // Queue duplicate scan for new evidence
      const parcelId = data.parcel_id;
      results.push(await createIfNotActive(base44, {
        job_type: 'duplicate_scan',
        entity_type: 'EvidenceVault',
        entity_id: entityId,
        status: 'pending',
        priority: 'high',
        attempts: 0,
        max_attempts: 3,
        created_by: 'system@landvault',
        idempotency_key: `duplicate_scan:evidence:${entityId}`,
        payload: JSON.stringify({ entity_id: entityId, event_type: 'evidence' }),
      }));

      // Queue evidence hashing verification
      if (parcelId) {
        results.push(await createIfNotActive(base44, {
          job_type: 'evidence_hashing',
          entity_type: 'LandVaultParcel',
          entity_id: parcelId,
          status: 'pending',
          priority: 'normal',
          attempts: 0,
          max_attempts: 3,
          created_by: 'system@landvault',
          idempotency_key: `evidence_hashing:${parcelId}`,
          payload: JSON.stringify({ parcel_id: parcelId, evidence_id: entityId }),
        }));
      }
    }

    return Response.json({
      success: true,
      event: `${entityName}.${eventType}`,
      entity_id: entityId,
      jobs_created: results.filter(r => r.created).length,
      jobs_skipped: results.filter(r => r.skipped).length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});