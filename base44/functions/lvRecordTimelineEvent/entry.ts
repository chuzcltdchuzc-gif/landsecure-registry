import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const event = body.event;
        const data = body.data;
        const oldData = body.old_data;

        if (!data || !data.parcel_id) {
            return Response.json({ skipped: true, reason: 'No attestation data' });
        }

        const parcelId = data.parcel_id;
        const parcelNumber = data.parcel_number || '';
        const attestationId = data.id || '';
        const now = new Date().toISOString();

        // Determine event type based on what changed
        let eventType = null;
        let summary = '';
        let visibility = 'INTERNAL';

        if (event.type === 'create') {
            eventType = 'ATTESTATION_SUBMITTED';
            summary = `Community attestation submitted by ${data.attestor_name || 'unknown'} (${data.attestor_role || 'unknown'})`;
            visibility = 'PUBLIC';
        } else if (event.type === 'update') {
            const oldStatus = oldData?.verification_status;
            const newStatus = data.verification_status;

            if (oldStatus !== newStatus) {
                if (newStatus === 'APPROVED') {
                    eventType = 'ATTESTATION_APPROVED';
                    summary = `Attestation approved by ${data.reviewed_by || 'admin'}`;
                } else if (newStatus === 'REJECTED') {
                    eventType = 'ATTESTATION_REJECTED';
                    summary = `Attestation rejected: ${data.rejection_reason || 'No reason provided'}`;
                } else if (newStatus === 'CLARIFICATION_REQUIRED') {
                    eventType = 'ATTESTATION_CLARIFICATION';
                    summary = `Clarification requested: ${data.review_notes || 'More information needed'}`;
                }
            }
            visibility = 'INTERNAL';
        }

        if (!eventType) {
            return Response.json({ skipped: true, reason: 'No timeline-relevant event' });
        }

        const timelineEvent = await base44.asServiceRole.entities.EvidenceTimelineEvent.create({
            parcel_id: parcelId,
            parcel_number: parcelNumber,
            event_type: eventType,
            event_source: 'lvRecordTimelineEvent',
            timestamp: now,
            user: data.reviewed_by || 'system',
            summary,
            related_record: attestationId,
            related_type: 'CommunityAttestation',
            visibility,
        });

        return Response.json({ success: true, eventType, timelineEventId: timelineEvent.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});