import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const attestation = body.data;

        if (!attestation || attestation.verification_status !== 'APPROVED') {
            return Response.json({ skipped: true });
        }

        const parcelId = attestation.parcel_id;
        if (!parcelId) return Response.json({ error: 'No parcel_id' }, { status: 400 });

        // Get all approved attestations for this parcel
        const allApproved = await base44.asServiceRole.entities.CommunityAttestation.filter({
            parcel_id: parcelId,
            verification_status: 'APPROVED'
        });

        // Calculate total impact capped at 15
        const totalImpact = Math.min(
            allApproved.reduce((sum, a) => sum + (a.confidence_impact || 0), 0),
            15
        );

        // Get current parcel
        const parcels = await base44.asServiceRole.entities.LandVaultParcel.filter({ id: parcelId });
        if (!parcels.length) return Response.json({ error: 'Parcel not found' }, { status: 404 });

        const parcel = parcels[0];
        const currentScore = parcel.evidence_confidence_score || 0;

        // New score = current + this attestation's impact, capped at 100
        const thisImpact = attestation.confidence_impact || 0;
        const newScore = Math.min(currentScore + thisImpact, 100);

        await base44.asServiceRole.entities.LandVaultParcel.update(parcelId, {
            evidence_confidence_score: newScore,
        });

        // Determine confidence level from new score
        let level = 'LIMITED';
        if (newScore >= 76) level = 'VERIFIED';
        else if (newScore >= 51) level = 'STRONG';
        else if (newScore >= 26) level = 'MODERATE';

        await base44.asServiceRole.entities.LandVaultParcel.update(parcelId, {
            evidence_confidence_level: level,
        });

        return Response.json({
            success: true,
            parcelId,
            previousScore: currentScore,
            newScore,
            impact: thisImpact,
            totalAttestationImpact: totalImpact,
            level,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});