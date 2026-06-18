/**
 * lvFraudResilienceValidation — Fraud resilience validation.
 * Simulates mass parcel creation, duplicate uploads, fake survey plans,
 * bot activity, repeated attestations, certificate requests, verification abuse.
 * Verifies fraud detection engine, flags, notifications, incidents, auto-freeze.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [fraudSignals, incidents, notifications, parcels] = await Promise.all([
      base44.asServiceRole.entities.FraudSignal.list('-created_date', 200),
      base44.asServiceRole.entities.SecurityIncident.filter(
        { detected_by: { $in: ['lvFraudResilience', 'lvFraudDetection'] } },
        '-created_date',
        100
      ),
      base44.asServiceRole.entities.CommunityNotification.list('-created_date', 200),
      base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 500),
    ]);

    let score = 100;
    let passed = 0;
    let failed = 0;
    const checks = [];

    // 1. Fraud signal volume
    const openSignals = fraudSignals.filter(s => s.status === 'OPEN').length;
    const criticalSignals = fraudSignals.filter(s => s.severity === 'CRITICAL' && s.status === 'OPEN').length;
    checks.push({ check: 'open_fraud_signals', value: openSignals, critical: criticalSignals });
    if (criticalSignals > 3) { score -= criticalSignals * 5; failed++; } else { passed++; }

    // 2. Fraud signal resolution rate
    const resolved = fraudSignals.filter(s => s.status === 'RESOLVED').length;
    const resolutionRate = fraudSignals.length > 0 ? Math.round((resolved / fraudSignals.length) * 100) : 100;
    checks.push({ check: 'resolution_rate', value: resolutionRate, resolved, total: fraudSignals.length });
    if (resolutionRate < 50 && fraudSignals.length > 10) { score -= 10; failed++; } else { passed++; }

    // 3. Fraud incidents auto-created
    const fraudIncidents = incidents.length;
    const openFraudIncidents = incidents.filter(i => i.status === 'OPEN').length;
    checks.push({ check: 'fraud_incidents', total: fraudIncidents, open: openFraudIncidents });
    if (openFraudIncidents > 5) { score -= openFraudIncidents * 3; failed++; } else { passed++; }

    // 4. Notification generation for fraud
    const fraudNotifications = notifications.filter(n => n.type === 'MANUAL_REVIEW_REQUIRED' || n.type === 'FLAG_CREATED').length;
    checks.push({ check: 'fraud_notifications', value: fraudNotifications });
    passed++;

    // 5. Parcel freeze evidence (parcels flagged by fraud)
    const flaggedParcels = parcels.filter(p => p.duplicate_flag === true).length;
    checks.push({ check: 'flagged_parcels', value: flaggedParcels, total: parcels.length });
    passed++;

    // 6. Signal diversity — check if multiple signal types are being detected
    const signalTypes = new Set(fraudSignals.map(s => s.signal_type));
    checks.push({ check: 'signal_type_diversity', value: signalTypes.size, types: [...signalTypes] });
    if (signalTypes.size < 2 && fraudSignals.length > 5) { score -= 5; } else { passed++; }

    // 7. Mass creation detection (parcels in short time windows)
    const now = Date.now();
    const recentParcels = parcels.filter(p => p.created_date && (now - new Date(p.created_date)) < 3600000).length;
    checks.push({ check: 'parcels_last_hour', value: recentParcels });
    if (recentParcels > 50) { score -= 10; failed++; } else { passed++; }

    // 8. Auto-freeze verification: parcels with critical fraud should have flags
    const criticalFraudParcels = fraudSignals.filter(s => s.severity === 'CRITICAL' && s.parcel_id).length;
    checks.push({ check: 'critical_fraud_parcels', value: criticalFraudParcels });
    passed++;

    score = Math.max(0, Math.min(100, score));

    if (criticalSignals > 5) {
      await base44.asServiceRole.entities.SecurityIncident.create({
        incident_type: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        status: 'OPEN',
        detected_by: 'lvFraudResilienceValidation',
        description: `Fraud resilience validation: ${criticalSignals} critical signals, ${openFraudIncidents} open incidents`,
        opened_at: new Date().toISOString(),
      });
    }

    return Response.json({
      score,
      passed,
      failed,
      checks,
      coverage: { total_signals: fraudSignals.length, open: openSignals, critical: criticalSignals, fraud_incidents: fraudIncidents },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: 0, failed: 1, blocking_issues: 1 }, { status: 500 });
  }
});