/**
 * backupEntityExport — Disaster Recovery Backup Function.
 * Exports all critical entities to JSON and uploads to Base44 storage.
 * Returns signed URLs for each backup file.
 *
 * Called by: scheduled automation (daily at 02:00 UTC)
 * Also callable manually by super_admin.
 *
 * Returns: { status, timestamp, files: [{entity, records, url}] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ENTITIES_TO_BACKUP = [
  // Original registry entities
  'LandParcel',
  'FamilyOwnership',
  'FamilyBeneficiary',
  'InheritanceCase',
  'OwnershipHistory',
  'Dispute',
  'FraudAlert',
  'AuditLog',
  'SurveyDocument',
  'FieldReport',
  'EvidenceChain',
  'Notification',
  // LandVault pilot entities — added 2026-06-07
  'LandVaultParcel',
  'EvidenceVault',
  'DuplicateAlert',
  'SurveyAssignment',
  'LandVaultPayment',
  'CommunityLead',
  'CommunityValidation',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow: scheduled automation (no user session) OR super_admin
    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation context */ }
    if (user && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    const dateTag = timestamp.slice(0, 10);
    const results = [];
    const errors = [];

    for (const entityName of ENTITIES_TO_BACKUP) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list('-created_date', 5000);

        const payload = {
          entity: entityName,
          exported_at: timestamp,
          record_count: records.length,
          records,
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });

        const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: blob });
        const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 604800 });

        results.push({ entity: entityName, records: records.length, file_uri, signed_url, size_kb: Math.round(jsonStr.length / 1024) });
      } catch (err) {
        errors.push({ entity: entityName, error: err.message });
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: 'system@landvault',
      user_name: 'Automated Backup System',
      action: 'BACKUP_EXPORT_COMPLETED',
      entity_type: 'System',
      entity_id: dateTag,
      details: JSON.stringify({
        entities_backed_up: results.length,
        total_records: results.reduce((s, r) => s + r.records, 0),
        errors: errors.length,
        timestamp,
      }),
    });

    return Response.json({
      status: errors.length === 0 ? 'success' : 'partial',
      timestamp,
      date_tag: dateTag,
      entities_backed_up: results.length,
      total_records: results.reduce((s, r) => s + r.records, 0),
      files: results,
      errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});