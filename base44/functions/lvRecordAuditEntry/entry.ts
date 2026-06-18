import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const event = body.event;
        const data = body.data;
        const oldData = body.old_data;

        if (!data || !data.id) {
            return Response.json({ skipped: true, reason: 'No attestation data' });
        }

        const attestationId = data.id;
        const parcelId = data.parcel_id || '';
        const parcelNumber = data.parcel_number || '';

        // Determine action
        let action = 'UPDATED';
        if (event.type === 'create') {
            action = 'CREATED';
        } else if (event.type === 'delete') {
            action = 'DELETED';
        } else if (event.type === 'update') {
            const oldStatus = oldData?.verification_status;
            const newStatus = data.verification_status;
            if (oldStatus !== newStatus) {
                if (newStatus === 'APPROVED') action = 'APPROVED';
                else if (newStatus === 'REJECTED') action = 'REJECTED';
                else if (newStatus === 'CLARIFICATION_REQUIRED') action = 'CLARIFICATION_REQUESTED';
                else action = 'REVIEWED';
            }
        }

        // Get user info
        let userEmail = 'system';
        let userName = 'System';
        try {
            const user = await base44.auth.me();
            if (user) {
                userEmail = user.email || 'system';
                userName = user.full_name || 'System';
            }
        } catch {
            // Use defaults for system operations
        }

        const auditEntry = await base44.asServiceRole.entities.CommunityAttestationAudit.create({
            user_email: userEmail,
            user_name: userName,
            parcel_id: parcelId,
            parcel_number: parcelNumber,
            attestation_id: attestationId,
            action,
            before_state: oldData ? JSON.stringify(oldData) : '{}',
            after_state: JSON.stringify(data),
            timestamp: new Date().toISOString(),
            ip_address: '',
            device_information: '',
        });

        return Response.json({ success: true, action, auditId: auditEntry.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});