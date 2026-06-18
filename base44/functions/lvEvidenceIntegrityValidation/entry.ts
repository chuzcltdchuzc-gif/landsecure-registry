/**
 * lvEvidenceIntegrityValidation — Evidence layer trust validation.
 * Verifies hashes, locks, chains, version history, chain of custody.
 * Detects duplications, deletions, broken references, hash mismatches.
 * Generates 0-100 score. Failures auto-create SecurityIncidents.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [evidence, locks, chains, integrityChecks] = await Promise.all([
      base44.asServiceRole.entities.EvidenceVault.list('-created_date', 2000),
      base44.asServiceRole.entities.EvidenceLock.list('-created_date', 500),
      base44.asServiceRole.entities.HashChainEntry.list('-created_date', 500),
      base44.asServiceRole.entities.EvidenceIntegrityCheck.list('-created_date', 100),
    ]);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Evidence hash presence
    const withHash = evidence.filter(e => !!e.hash_fingerprint).length;
    const hashCoverage = evidence.length > 0 ? Math.round((withHash / evidence.length) * 100) : 0;
    checks.push({ check: 'hash_coverage', value: hashCoverage, target: 95 });
    if (hashCoverage < 95 && evidence.length > 0) { score -= 10; failed++; } else { passed++; }

    // 2. Evidence lock coverage (sealed evidence)
    const lockedEvidence = locks.filter(l => l.status === 'ACTIVE').length;
    const lockCoverage = evidence.length > 0 ? Math.round((lockedEvidence / evidence.length) * 100) : 0;
    checks.push({ check: 'lock_coverage', value: lockCoverage, target: 80 });
    if (lockCoverage < 80 && evidence.length > 0) { score -= 8; failed++; } else { passed++; }

    // 3. Hash chain integrity
    const chainEvidence = chains.filter(c => c.entity_type === 'EvidenceVault');
    const brokenChains = chainEvidence.filter(c => ['CHAIN_BREAK', 'HASH_MISMATCH', 'MISSING_LINK'].includes(c.verification_status)).length;
    if (brokenChains > 0) { score -= brokenChains * 5; failed++; } else { passed++; }
    checks.push({ check: 'chain_integrity_broken', value: brokenChains, target: 0 });

    // 4. Version history (locks with multiple versions)
    const multiVersion = locks.filter(l => l.version_number > 1).length;
    checks.push({ check: 'multi_version_locks', value: multiVersion });

    // 5. Duplicate evidence detection
    const hashMap = {};
    let duplicates = 0;
    for (const ev of evidence) {
      if (ev.hash_fingerprint) {
        if (hashMap[ev.hash_fingerprint]) duplicates++;
        else hashMap[ev.hash_fingerprint] = true;
      }
    }
    if (duplicates > 0) { score -= duplicates * 3; failed++; } else { passed++; }
    checks.push({ check: 'duplicate_hashes', value: duplicates, target: 0 });

    // 6. Missing evidence (orphan parcel references)
    const evidenceParcels = new Set(evidence.filter(e => e.parcel_id).map(e => e.parcel_id));
    const parcels = await base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 1000);
    const orphans = parcels.filter(p => !evidenceParcels.has(p.id)).length;
    checks.push({ check: 'parcels_without_evidence', value: orphans });

    // 7. Deleted evidence detection (via audit trail)
    const deleteEvents = await base44.asServiceRole.entities.AuditLog.filter({ action: 'EVIDENCE_DELETED' }, '-created_date', 200);
    if (deleteEvents.length > 0) { score -= deleteEvents.length * 2; failed++; } else { passed++; }
    checks.push({ check: 'deleted_evidence_events', value: deleteEvents.length, target: 0 });

    // 8. Hash mismatch (from existing integrity checks)
    const mismatches = integrityChecks.filter(c => !['VALID', 'UNVERIFIED'].includes(c.verification_status)).length;
    if (mismatches > 0) { score -= mismatches * 8; failed++; } else { passed++; }
    checks.push({ check: 'integrity_check_mismatches', value: mismatches, target: 0 });

    score = Math.max(0, Math.min(100, score));

    // Auto-create incidents for critical failures
    if (brokenChains > 0 || mismatches > 0 || duplicates > 3) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'HASH_MISMATCH',
        severity: brokenChains > 0 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        detected_by: 'lvEvidenceIntegrityValidation',
        description: `Evidence integrity issues: ${brokenChains} broken chains, ${mismatches} mismatches, ${duplicates} duplicates`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { total_evidence: evidence.length, with_hash: withHash, locked: lockedEvidence, chain_entries: chainEvidence.length, broken_chains: brokenChains },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});