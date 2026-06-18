import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const attestation = body.data;

        if (!attestation || !attestation.parcel_id) {
            return Response.json({ skipped: true, reason: 'No attestation data' });
        }

        const attestationId = attestation.id;
        const parcelId = attestation.parcel_id;
        const parcelNumber = attestation.parcel_number || '';

        // Only scan for conflicts when attestation is approved
        if (attestation.verification_status !== 'APPROVED') {
            return Response.json({ skipped: true, reason: 'Not yet approved' });
        }

        // Get all other approved attestations for this parcel
        const otherAttestations = await base44.asServiceRole.entities.CommunityAttestation.filter({
            parcel_id: parcelId,
            verification_status: 'APPROVED',
        });

        const conflicts = [];

        for (const other of otherAttestations) {
            if (other.id === attestationId) continue;

            let conflictType = null;
            let conflictSummary = '';

            // Check for statement conflicts (attestation_position differs)
            if (
                attestation.attestation_position === 'CONFLICTING' ||
                other.attestation_position === 'CONFLICTING'
            ) {
                if (attestation.attestation_position !== other.attestation_position) {
                    conflictType = 'STATEMENT_CONFLICT';
                    conflictSummary = `Attestation ${attestationId} (${attestation.attestation_position}) conflicts with attestation ${other.id} (${other.attestation_position})`;
                    conflicts.push({ type: conflictType, summary: conflictSummary, otherId: other.id });
                }
            }

            // Check for relationship conflicts
            if (
                attestation.relationship_to_land &&
                other.relationship_to_land &&
                attestation.relationship_to_land !== other.relationship_to_land
            ) {
                conflictType = 'RELATIONSHIP_CONFLICT';
                conflictSummary = `Different relationships claimed: "${attestation.relationship_to_land}" vs "${other.relationship_to_land}"`;
                conflicts.push({ type: conflictType, summary: conflictSummary, otherId: other.id });
            }

            // Check for traditional endorsement conflicts
            if (
                attestation.traditional_institution_verified &&
                other.traditional_institution_verified &&
                attestation.attestor_role === 'TRADITIONAL_RULER' &&
                other.attestor_role === 'TRADITIONAL_RULER'
            ) {
                conflictType = 'TRADITIONAL_ENDORSEMENT_CONFLICT';
                conflictSummary = `Two traditional rulers have attested: ${attestation.attestor_name} vs ${other.attestor_name}`;
                conflicts.push({ type: conflictType, summary: conflictSummary, otherId: other.id });
            }

            // Check for community knowledge conflicts
            if (
                attestation.community_name !== other.community_name &&
                attestation.attestor_role === 'COMMUNITY_DEVELOPMENT_UNION' &&
                other.attestor_role === 'COMMUNITY_DEVELOPMENT_UNION'
            ) {
                conflictType = 'COMMUNITY_KNOWLEDGE_CONFLICT';
                conflictSummary = `Different community CDU attestations: ${attestation.community_name} vs ${other.community_name}`;
                conflicts.push({ type: conflictType, summary: conflictSummary, otherId: other.id });
            }
        }

        // Create alert and flag for each conflict
        const results = [];
        for (const conflict of conflicts) {
            // Create CommunityReviewAlert
            const alert = await base44.asServiceRole.entities.CommunityReviewAlert.create({
                parcel_id: parcelId,
                parcel_number: parcelNumber,
                attestation_a: attestationId,
                attestation_b: conflict.otherId,
                conflict_type: conflict.type,
                conflict_summary: conflict.summary,
                status: 'OPEN',
            });

            // Create ParcelFlag
            let flagType = 'MANUAL_REVIEW_REQUIRED';
            if (conflict.type === 'TRADITIONAL_ENDORSEMENT_CONFLICT') flagType = 'TRADITIONAL_DISPUTE';
            else if (conflict.type === 'RELATIONSHIP_CONFLICT') flagType = 'COMMUNITY_DISPUTE';
            else if (conflict.type === 'COMMUNITY_KNOWLEDGE_CONFLICT') flagType = 'COMMUNITY_DISPUTE';
            else if (conflict.type === 'STATEMENT_CONFLICT') flagType = 'CONFLICTING_ATTESTATIONS';

            await base44.asServiceRole.entities.ParcelFlag.create({
                parcel_id: parcelId,
                parcel_number: parcelNumber,
                flag_type: flagType,
                severity: 'HIGH',
                status: 'ACTIVE',
                notes: conflict.summary,
            });

            // Record timeline events
            await base44.asServiceRole.entities.EvidenceTimelineEvent.create({
                parcel_id: parcelId,
                parcel_number: parcelNumber,
                event_type: 'CONFLICT_DETECTED',
                event_source: 'lvConflictDetection',
                timestamp: new Date().toISOString(),
                user: 'system',
                summary: `Conflict detected: ${conflict.summary}`,
                related_record: alert.id,
                related_type: 'CommunityReviewAlert',
                visibility: 'ADMIN_ONLY',
            });

            await base44.asServiceRole.entities.EvidenceTimelineEvent.create({
                parcel_id: parcelId,
                parcel_number: parcelNumber,
                event_type: 'FLAG_CREATED',
                event_source: 'lvConflictDetection',
                timestamp: new Date().toISOString(),
                user: 'system',
                summary: `Parcel flagged: ${flagType}`,
                related_record: parcelId,
                related_type: 'ParcelFlag',
                visibility: 'ADMIN_ONLY',
            });

            // Generate notification for admins
            const admins = await base44.asServiceRole.entities.User.list();
            for (const admin of admins) {
                if (['super_admin', 'surveyor_general', 'compliance_officer'].includes(admin.role)) {
                    await base44.asServiceRole.entities.CommunityNotification.create({
                        recipient: admin.email,
                        type: 'CONFLICT_DETECTED',
                        message: `Conflict: ${conflict.summary} on parcel ${parcelNumber}`,
                        parcel_id: parcelId,
                        parcel_number: parcelNumber,
                        related_record: alert.id,
                        related_type: 'CommunityReviewAlert',
                        status: 'UNREAD',
                    });
                }
            }

            results.push({ conflict, alertId: alert.id });
        }

        return Response.json({
            success: true,
            parcelId,
            conflictsFound: conflicts.length,
            results,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});