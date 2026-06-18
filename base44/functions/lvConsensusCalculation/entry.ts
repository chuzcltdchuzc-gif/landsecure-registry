import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const attestation = body.data;

        if (!attestation || !attestation.parcel_id) {
            return Response.json({ skipped: true, reason: 'No attestation data' });
        }

        const parcelId = attestation.parcel_id;

        // Get all approved attestations for this parcel
        const allApproved = await base44.asServiceRole.entities.CommunityAttestation.filter({
            parcel_id: parcelId,
            verification_status: 'APPROVED'
        });

        // Count by position
        const supporting = allApproved.filter(a => a.attestation_position === 'SUPPORTING').length;
        const neutral = allApproved.filter(a => a.attestation_position === 'NEUTRAL').length;
        const conflicting = allApproved.filter(a => a.attestation_position === 'CONFLICTING').length;
        const total = allApproved.length;

        // Calculate consensus percentage
        const consensusPercentage = total > 0 ? Math.round((supporting / total) * 100) : 0;

        // Determine consensus level
        let consensusLevel = 'MIXED_OPINIONS';
        if (consensusPercentage >= 80) consensusLevel = 'STRONG_CONSENSUS';
        else if (consensusPercentage >= 60) consensusLevel = 'MODERATE_CONSENSUS';
        else if (consensusPercentage >= 40) consensusLevel = 'WEAK_CONSENSUS';

        // Update parcel with consensus data
        await base44.asServiceRole.entities.LandVaultParcel.update(parcelId, {
            consensus_percentage: consensusPercentage,
            consensus_level: consensusLevel,
            supporting_count: supporting,
            neutral_count: neutral,
            conflicting_count: conflicting,
            last_consensus_calculated_at: new Date().toISOString(),
        });

        // Record timeline event
        await base44.asServiceRole.entities.EvidenceTimelineEvent.create({
            parcel_id: parcelId,
            parcel_number: attestation.parcel_number || '',
            event_type: 'CONSENSUS_UPDATED',
            event_source: 'lvConsensusCalculation',
            timestamp: new Date().toISOString(),
            user: 'system',
            summary: `Consensus recalculated: ${consensusLevel} (${consensusPercentage}% supporting, ${supporting}S/${neutral}N/${conflicting}C)`,
            related_record: attestation.id || '',
            related_type: 'CommunityAttestation',
            visibility: 'PUBLIC',
        });

        return Response.json({
            success: true,
            parcelId,
            consensusPercentage,
            consensusLevel,
            supporting,
            neutral,
            conflicting,
            total,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});