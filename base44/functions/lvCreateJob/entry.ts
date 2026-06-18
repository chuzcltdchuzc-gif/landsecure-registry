/**
 * lvCreateJob — Idempotent job creation with deduplication.
 *
 * Repeated identical requests return the existing active job.
 * An "active" job is one with status: pending, queued, processing, or retrying.
 *
 * Payload: { job_type, entity_type?, entity_id?, idempotency_key, priority?, payload? }
 * Returns: { job_id, status, is_new }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const IDEMPOTENT_TYPES = [
  'duplicate_scan',
  'confidence_recalculation',
  'verification_report',
  'pdf_certificate_generation',
  'qr_certificate_generation',
  'ocr_processing',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { job_type, entity_type, entity_id, idempotency_key, priority, payload } = body;

    if (!job_type) return Response.json({ error: 'job_type required' }, { status: 400 });

    // Generate idempotency key if not provided
    const ikey = idempotency_key ||
      (entity_id ? `${job_type}:${entity_id}:${Date.now()}` : `${job_type}:${Date.now()}`);

    // For idempotent job types, check for existing active job
    if (IDEMPOTENT_TYPES.includes(job_type)) {
      const activeStatuses = ['pending', 'queued', 'processing', 'retrying'];
      let existing = null;

      for (const status of activeStatuses) {
        const query = { job_type, status };
        if (entity_id) query.entity_id = entity_id;
        const batch = await base44.asServiceRole.entities.JobQueue.filter(query, '-created_date', 5);
        if (batch.length > 0) {
          existing = batch[0];
          break;
        }
      }

      if (existing) {
        return Response.json({
          job_id: existing.id,
          status: existing.status,
          is_new: false,
          message: 'An active job already exists for this operation.',
          existing_job: {
            id: existing.id,
            job_type: existing.job_type,
            status: existing.status,
            created_date: existing.created_date,
            attempts: existing.attempts || existing.retry_count || 0,
          },
        });
      }
    }

    // Create new job
    const jobData = {
      job_type,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      created_by: user.email,
      idempotency_key: ikey,
      priority: priority || 'normal',
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : '{}',
    };

    const job = await base44.asServiceRole.entities.JobQueue.create(jobData);

    // Log audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: 'JOB_CREATED',
        entity_type: 'JobQueue',
        entity_id: job.id,
        details: JSON.stringify({ job_type, entity_type, entity_id }),
      });
    } catch { /* best-effort */ }

    return Response.json({
      job_id: job.id,
      status: 'pending',
      is_new: true,
      message: 'Job created successfully.',
      idempotency_key: ikey,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});