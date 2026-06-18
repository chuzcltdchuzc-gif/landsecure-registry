/**
 * lvPilotReadinessCertification — Pilot readiness certification engine.
 * Generates readiness percentage, blocking issues, critical failures,
 * recommended actions, and GO/NO-GO pilot recommendation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get the latest trust validation run
    const runs = await base44.asServiceRole.entities.TrustValidationRun.list('-created_date', 5);
    const latestRun = runs[0];

    const takeoffAssessments = await base44.asServiceRole.entities.TakeoffReadinessAssessment.list('-created_date', 3);
    const latestTakeoff = takeoffAssessments[0];

    const parcels = await base44.asServiceRole.entities.LandVaultParcel.list('-created_date', 1000);

    let readinessPct = 0;
    let blockingIssues = [];
    let criticalFailures = [];
    let recommendedActions = [];
    let pilotRecommendation = 'NOT_READY';

    // ── Aggregate from trust validation ──
    if (latestRun) {
      readinessPct = latestRun.overall_score || 0;

      if (latestRun.trust_grade === 'FAIL' || latestRun.trust_grade === 'D') {
        criticalFailures.push(`Trust grade is ${latestRun.trust_grade} — serious trust issues detected`);
        blockingIssues.push('Trust grade below minimum threshold');
      }

      if (latestRun.failed_tests > 3) {
        criticalFailures.push(`${latestRun.failed_tests} validation tests failed`);
      }

      if (latestRun.pilot_recommendation) {
        pilotRecommendation = latestRun.pilot_recommendation;
      }

      // Parse subscores for detailed issues
      if (latestRun.subscores) {
        try {
          const sub = JSON.parse(latestRun.subscores);
          for (const [name, data] of Object.entries(sub)) {
            if (data && data.score < 50) {
              blockingIssues.push(`${name.replace(/_/g, ' ')} score critically low (${data.score}/100)`);
              recommendedActions.push(`Investigate and improve ${name.replace(/_/g, ' ')} systems`);
            }
          }
        } catch {}
      }
    }

    // ── Add takeoff assessment data ──
    if (latestTakeoff) {
      if (latestTakeoff.overall_score < 70) {
        criticalFailures.push(`Takeoff readiness score is ${latestTakeoff.overall_score}/100 — below pilot threshold`);
        recommendedActions.push('Address gaps identified in takeoff readiness assessment');
      }

      if (latestTakeoff.gaps) {
        try {
          const gaps = JSON.parse(latestTakeoff.gaps);
          for (const gap of gaps) {
            if (gap.severity === 'HIGH' || gap.severity === 'CRITICAL') {
              blockingIssues.push(`${gap.area}: ${gap.detail}`);
              recommendedActions.push(gap.recommendation);
            }
          }
        } catch {}
      }
    }

    // ── Parcel volume check ──
    if (parcels.length < 5) {
      blockingIssues.push(`Only ${parcels.length} parcels — insufficient for pilot (minimum: 10)`);
      recommendedActions.push('Increase parcel registrations to at least 10');
    }

    // ── Compute final recommendation ──
    if (blockingIssues.length === 0 && criticalFailures.length === 0) {
      pilotRecommendation = readinessPct >= 90 ? 'GO' : 'GO_WITH_MONITORING';
    } else if (criticalFailures.length > 2) {
      pilotRecommendation = 'CRITICAL_REMEDIATION_REQUIRED';
    } else if (criticalFailures.length > 0) {
      pilotRecommendation = 'NOT_READY';
    } else {
      pilotRecommendation = 'GO_WITH_MONITORING';
    }

    return Response.json({
      readiness_percentage: readinessPct,
      pilot_recommendation: pilotRecommendation,
      blocking_issues: blockingIssues,
      blocking_count: blockingIssues.length,
      critical_failures: criticalFailures,
      critical_count: criticalFailures.length,
      recommended_actions: recommendedActions,
      go_no_go: ['GO', 'GO_WITH_MONITORING'].includes(pilotRecommendation) ? 'GO' : 'NO-GO',
      reference_data: {
        trust_validation_run: latestRun?.id || null,
        trust_score: latestRun?.overall_score || 0,
        takeoff_score: latestTakeoff?.overall_score || 0,
        parcel_count: parcels.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, readiness_percentage: 0, pilot_recommendation: 'NOT_READY', blocking_issues: [], recommended_actions: [], go_no_go: 'NO-GO' }, { status: 500 });
  }
});