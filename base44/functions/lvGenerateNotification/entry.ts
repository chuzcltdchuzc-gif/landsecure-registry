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

        let notificationType = null;
        let message = '';

        if (event.type === 'create') {
            notificationType = 'ATTESTATION_SUBMITTED';
            message = `New community attestation submitted by ${data.attestor_name || 'unknown'} for parcel ${parcelNumber}`;
        } else if (event.type === 'update') {
            const oldStatus = oldData?.verification_status;
            const newStatus = data.verification_status;

            if (oldStatus !== newStatus) {
                if (newStatus === 'APPROVED') {
                    notificationType = 'ATTESTATION_APPROVED';
                    message = `Attestation from ${data.attestor_name || 'unknown'} was approved for parcel ${parcelNumber}`;
                } else if (newStatus === 'REJECTED') {
                    notificationType = 'ATTESTATION_REJECTED';
                    message = `Attestation from ${data.attestor_name || 'unknown'} was rejected for parcel ${parcelNumber}`;
                }
            }
        }

        if (!notificationType) {
            return Response.json({ skipped: true, reason: 'No notifiable event' });
        }

        // Send to admins and relevant stakeholders
        const admins = await base44.asServiceRole.entities.User.list();
        const notifications = [];

        for (const admin of admins) {
            if (['super_admin', 'surveyor_general', 'compliance_officer', 'surveyor_partner'].includes(admin.role)) {
                const notif = await base44.asServiceRole.entities.CommunityNotification.create({
                    recipient: admin.email,
                    type: notificationType,
                    message,
                    parcel_id: parcelId,
                    parcel_number: parcelNumber,
                    related_record: attestationId,
                    related_type: 'CommunityAttestation',
                    status: 'UNREAD',
                });
                notifications.push(notif.id);
            }
        }

        return Response.json({ success: true, notificationType, notificationsCreated: notifications.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});