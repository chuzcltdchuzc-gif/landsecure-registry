/**
 * lvFraudDetection — Behavioural fraud signal detector.
 * Scans for mass uploads, bulk requests, fake endorsements, attestation abuse,
 * certificate fraud, surveyor manipulation, and unusual activity patterns.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Time windows for detection
    const WINDOW_5MIN = 5;
    const WINDOW_30MIN = 30;
    const WINDOW_1H = 60;

    const signals = [];
    const now = new Date();
    const cutoff5Min = new Date(now.getTime() - WINDOW_5MIN * 60000).toISOString();
    const cutoff30Min = new Date(now.getTime() - WINDOW_30MIN * 60000).toISOString();
    const cutoff1H = new Date(now.getTime() - WINDOW_1H * 60000).toISOString();

    // Fetch recent activity
    const [recentParcels, recentAttestations, recentEvidence, recentAudit] = await Promise.all([
      base44.asServiceRole.entities.LandVaultParcel.filter({ created_date: { $gte: cutoff1H } }, '-created_date', 500),
      base44.asServiceRole.entities.CommunityAttestation.filter({ created_date: { $gte: cutoff1H } }, '-created_date', 500),
      base44.asServiceRole.entities.EvidenceVault.filter({ created_date: { $gte: cutoff1H } }, '-created_date', 500),
      base44.asServiceRole.entities.AuditLog.filter({ created_date: { $gte: cutoff30Min } }, '-created_date', 500),
    ]);

    // 1. Mass Parcel Upload Detection
    const userParcelCounts = {};
    for (const p of recentParcels) {
      const email = p.created_by || 'unknown';
      userParcelCounts[email] = (userParcelCounts[email] || 0) + 1;
    }
    for (const [email, count] of Object.entries(userParcelCounts)) {
      if (count >= 10) {
        signals.push({
          user_email: email, signal_type: 'MASS_PARCEL_UPLOAD',
          severity: count >= 20 ? 'CRITICAL' : 'HIGH',
          risk_score: Math.min(100, count * 5),
          count, window_minutes: WINDOW_1H,
          details: JSON.stringify({ parcels_created: count, window: '1 hour' }),
        });
      }
    }

    // 2. Multiple Attestations Same User
    const userAttestationCounts = {};
    for (const a of recentAttestations) {
      const email = a.created_by || a.attestor_name || 'unknown';
      userAttestationCounts[email] = (userAttestationCounts[email] || 0) + 1;
    }
    for (const [email, count] of Object.entries(userAttestationCounts)) {
      if (count >= 5) {
        signals.push({
          user_email: email, signal_type: 'MULTIPLE_ATTESTATIONS_SAME_EMAIL',
          severity: count >= 10 ? 'CRITICAL' : 'HIGH',
          risk_score: Math.min(100, count * 10),
          count, window_minutes: WINDOW_1H,
          details: JSON.stringify({ attestations_created: count, window: '1 hour' }),
        });
      }
    }

    // 3. Repeated Evidence Uploads Same User
    const userEvidenceCounts = {};
    for (const ev of recentEvidence) {
      const email = ev.created_by || ev.captured_by_email || 'unknown';
      userEvidenceCounts[email] = (userEvidenceCounts[email] || 0) + 1;
    }
    for (const [email, count] of Object.entries(userEvidenceCounts)) {
      if (count >= 8) {
        signals.push({
          user_email: email, signal_type: 'REPEATED_EVIDENCE_UPLOAD',
          severity: count >= 15 ? 'CRITICAL' : 'HIGH',
          risk_score: Math.min(100, count * 7),
          count, window_minutes: WINDOW_1H,
          details: JSON.stringify({ evidence_uploads: count, window: '1 hour' }),
        });
      }
    }

    // 4. Bulk Certificate Requests (from AuditLog)
    const certRequests = recentAudit.filter(a => a.action && ['JOB_CREATED', 'CERTIFICATE_GENERATED'].includes(a.action.toUpperCase()));
    const userCertCounts = {};
    for (const c of certRequests) {
      const email = c.user_email || c.created_by || 'unknown';
      userCertCounts[email] = (userCertCounts[email] || 0) + 1;
    }
    for (const [email, count] of Object.entries(userCertCounts)) {
      if (count >= 5) {
        signals.push({
          user_email: email, signal_type: 'BULK_CERTIFICATE_REQUEST',
          severity: count >= 10 ? 'CRITICAL' : 'HIGH',
          risk_score: Math.min(100, count * 10),
          count, window_minutes: WINDOW_30MIN,
          details: JSON.stringify({ cert_requests: count, window: '30 minutes' }),
        });
      }
    }

    // 5. Audit Integrity Violations
    const bulkAuditActions = recentAudit.filter(a => a.action === 'DELETE' || a.action === 'UPDATE');
    const userAuditCounts = {};
    for (const a of bulkAuditActions) {
      const email = a.user_email || a.created_by || 'unknown';
      userAuditCounts[email] = (userAuditCounts[email] || 0) + 1;
    }
    for (const [email, count] of Object.entries(userAuditCounts)) {
      if (count >= 5) {
        signals.push({
          user_email: email, signal_type: 'BULK_MANIPULATION',
          severity: 'CRITICAL',
          risk_score: Math.min(100, count * 15),
          count, window_minutes: WINDOW_30MIN,
          details: JSON.stringify({ audit_actions: count, types: 'DELETE/UPDATE', window: '30 minutes' }),
        });
      }
    }

    // Create FraudSignal records and SecurityIncidents
    let created = 0;
    for (const signal of signals) {
      // Deduplicate against existing open signals
      const existing = await base44.asServiceRole.entities.FraudSignal.filter({
        user_email: signal.user_email,
        signal_type: signal.signal_type,
        status: 'OPEN',
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.FraudSignal.create({
          ...signal,
          created_at: new Date().toISOString(),
          status: 'OPEN',
        });

        // Create security incident for CRITICAL/HIGH signals
        if (signal.severity === 'CRITICAL' || signal.severity === 'HIGH') {
          await base44.asServiceRole.entities.SecurityIncident.create({
            incident_type: 'SUSPICIOUS_ACTIVITY',
            severity: signal.severity,
            status: 'OPEN',
            detected_by: 'lvFraudDetection',
            description: `${signal.signal_type}: ${signal.user_email} — ${signal.count} events in ${signal.window_minutes} min`,
            opened_at: new Date().toISOString(),
          });
        }
        created++;
      }
    }

    return Response.json({
      status: 'completed',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      signals_detected: signals.length,
      signals_created: created,
      coverage: {
        parcels_scanned: recentParcels.length,
        attestations_scanned: recentAttestations.length,
        evidence_scanned: recentEvidence.length,
        audit_entries_scanned: recentAudit.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});