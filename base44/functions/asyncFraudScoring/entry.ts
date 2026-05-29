/**
 * asyncFraudScoring — Background fraud risk scoring for land parcels.
 * Runs on a schedule (every 15 min via automation) or triggered manually.
 * Fetches parcels with no fraud score, applies rule-based scoring, updates records.
 *
 * Called by: scheduled automation (no user auth required — validates via service role)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fraud scoring rules — returns { score: 0-100, reasons: string[] }
function scoreParcels(parcel, allParcels) {
  let score = 0;
  const reasons = [];

  // Rule 1: Duplicate parcel number
  const dups = allParcels.filter(p => p.parcel_number === parcel.parcel_number && p.id !== parcel.id);
  if (dups.length > 0) {
    score += 40;
    reasons.push(`Duplicate parcel number (${dups.length} other records)`);
  }

  // Rule 2: Missing boundary data on approved parcel
  if (parcel.status === 'approved' && !parcel.parcel_boundary) {
    score += 20;
    reasons.push('Approved parcel has no boundary data');
  }

  // Rule 3: Spatial conflict flagged
  if (['overlap_warning', 'duplicate_warning', 'conflict_blocked'].includes(parcel.spatial_validation_status)) {
    score += 30;
    reasons.push(`Spatial conflict: ${parcel.spatial_validation_status}`);
  }

  // Rule 4: Missing owner email on approved parcel
  if (parcel.status === 'approved' && !parcel.owner_email) {
    score += 15;
    reasons.push('Approved parcel has no owner email');
  }

  // Rule 5: Size anomaly — >500 hectares is unusual for residential/commercial
  if (parcel.size_hectares > 500 && ['residential', 'commercial'].includes(parcel.land_use)) {
    score += 25;
    reasons.push(`Unusually large ${parcel.land_use} parcel: ${parcel.size_hectares} ha`);
  }

  // Rule 6: No verificationstatus after 30 days
  const ageMs = Date.now() - new Date(parcel.created_date).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > 30 && parcel.verification_status === 'unverified') {
    score += 10;
    reasons.push(`Unverified for ${Math.round(ageDays)} days`);
  }

  const capped = Math.min(score, 100);
  const level = capped >= 60 ? 'high' : capped >= 30 ? 'medium' : capped >= 10 ? 'low' : 'none';

  return { score: capped, level, reasons };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow: scheduled automation (no user session) OR privileged admin
    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation context — no session */ }
    if (user && !['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all parcels — use service role since automations have no user context
    const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 2000);

    // Only score parcels that have no score yet, or score is 0 and status is not 'none'
    const toScore = allParcels.filter(p =>
      p.fraud_risk_score === undefined ||
      p.fraud_risk_score === null ||
      p.fraud_risk_score === 0
    );

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const parcel of toScore) {
      const { score, level, reasons } = scoreParcels(parcel, allParcels);

      // Only write if something changed
      if (score === (parcel.fraud_risk_score || 0) && level === (parcel.fraud_risk_level || 'none')) {
        skipped++;
        continue;
      }

      try {
        await base44.asServiceRole.entities.LandParcel.update(parcel.id, {
          fraud_risk_score: score,
          fraud_risk_level: level,
          fraud_risk_reasons: JSON.stringify(reasons),
        });

        // If high risk and no open fraud alert exists, create one
        if (level === 'high') {
          const existingAlerts = await base44.asServiceRole.entities.FraudAlert.filter({
            parcel_id: parcel.id,
            status: 'open',
          });

          if (existingAlerts.length === 0) {
            await base44.asServiceRole.entities.FraudAlert.create({
              parcel_id: parcel.id,
              parcel_number: parcel.parcel_number,
              flagged_by: 'system@landsecure.gov.ng',
              flagged_by_name: 'Automated Fraud Scoring Engine',
              alert_type: 'other',
              severity: 'high',
              description: `Automated scoring detected high fraud risk (score: ${score}/100). Reasons: ${reasons.join('; ')}`,
              status: 'open',
            });
          }
        }

        updated++;
      } catch (err) {
        errors.push({ id: parcel.id, error: err.message });
      }
    }

    return Response.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      total_parcels: allParcels.length,
      scored: toScore.length,
      updated,
      skipped,
      errors: errors.length,
      error_details: errors.slice(0, 5),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});