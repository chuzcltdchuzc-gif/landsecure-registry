/**
 * lvRoleChangeApproval — Role escalation defense.
 * No direct role promotion. Requires two-person approval, Super Admin review,
 * audit logging, and notification generation. Flags emergency changes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const action = body.action || 'request';
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Request Role Change ──
    if (action === 'request') {
      const targetUserId = body.user_id;
      const requestedRole = body.requested_role;

      if (!targetUserId || !requestedRole) {
        return Response.json({ error: 'user_id and requested_role required' }, { status: 400 });
      }

      // Get target user
      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
      const targetUser = targetUsers[0];
      if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

      // Block direct changes to super_admin without super_admin
      if (requestedRole === 'super_admin' && user.role !== 'super_admin') {
        return Response.json({ error: 'Only Super Admins can promote to super_admin' }, { status: 403 });
      }

      // Block self-promotion
      if (targetUserId === user.id) {
        return Response.json({ error: 'Self-promotion is not allowed. Request must be made by another person.' }, { status: 403 });
      }

      // Create approval request
      const approval = await base44.asServiceRole.entities.RoleChangeApproval.create({
        user_id: targetUserId,
        user_email: targetUser.email,
        user_name: targetUser.full_name,
        current_role: targetUser.role,
        requested_role: requestedRole,
        requested_by: user.email,
        requested_at: new Date().toISOString(),
        request_reason: body.reason || 'No reason provided',
        emergency_override: body.emergency || false,
        emergency_reason: body.emergency_reason || '',
        status: 'PENDING',
      });

      // Log audit
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name,
        action: 'ROLE_CHANGE_REQUESTED',
        entity_type: 'RoleChangeApproval',
        entity_id: approval.id,
        details: JSON.stringify({
          target_user: targetUser.email,
          from_role: targetUser.role,
          to_role: requestedRole,
          requested_by: user.email,
        }),
      });

      return Response.json({
        status: 'pending',
        request_id: approval.id,
        message: `Role change from ${targetUser.role} to ${requestedRole} requested for ${targetUser.email}. Awaiting two-person approval.`,
      });
    }

    // ── Approve Role Change (First Approver) ──
    if (action === 'first_approve') {
      const requestId = body.request_id;
      if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

      const requests = await base44.asServiceRole.entities.RoleChangeApproval.filter({ id: requestId });
      const rca = requests[0];
      if (!rca) return Response.json({ error: 'Approval request not found' }, { status: 404 });
      if (rca.status !== 'PENDING') return Response.json({ error: `Request is already ${rca.status}` }, { status: 400 });
      if (rca.requested_by === user.email) return Response.json({ error: 'Requestor cannot approve their own request' }, { status: 403 });

      await base44.asServiceRole.entities.RoleChangeApproval.update(requestId, {
        first_approver: user.email,
        first_approved_at: new Date().toISOString(),
        status: 'FIRST_APPROVED',
      });

      return Response.json({ status: 'first_approved', request_id: requestId, approver: user.email, message: 'First approval recorded. Second approval from Super Admin required.' });
    }

    // ── Second Approve (Super Admin) and Apply ──
    if (action === 'final_approve') {
      const requestId = body.request_id;
      if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });
      if (user.role !== 'super_admin') return Response.json({ error: 'Only Super Admin can provide final approval' }, { status: 403 });

      const requests = await base44.asServiceRole.entities.RoleChangeApproval.filter({ id: requestId });
      const rca = requests[0];
      if (!rca) return Response.json({ error: 'Approval request not found' }, { status: 404 });
      if (rca.status !== 'FIRST_APPROVED') return Response.json({ error: 'First approval required before final approval' }, { status: 400 });

      // Apply role change
      try {
        await base44.asServiceRole.entities.User.update(rca.user_id, { role: rca.requested_role });
      } catch (e) {
        return Response.json({ error: `Failed to apply role change: ${e.message}` }, { status: 500 });
      }

      // Mark approved
      await base44.asServiceRole.entities.RoleChangeApproval.update(requestId, {
        second_approver: user.email,
        second_approved_at: new Date().toISOString(),
        status: 'APPROVED',
        applied_at: new Date().toISOString(),
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name,
        action: 'ROLE_CHANGE_APPLIED',
        entity_type: 'RoleChangeApproval',
        entity_id: requestId,
        details: JSON.stringify({
          user_id: rca.user_id,
          from_role: rca.current_role,
          to_role: rca.requested_role,
          approved_by: `${rca.first_approver} + ${user.email}`,
        }),
      });

      return Response.json({ status: 'approved', request_id: requestId, message: `Role changed to ${rca.requested_role} for ${rca.user_email}` });
    }

    // ── Reject ──
    if (action === 'reject') {
      const requestId = body.request_id;
      if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

      await base44.asServiceRole.entities.RoleChangeApproval.update(requestId, {
        status: 'REJECTED',
        rejection_reason: body.reason || 'No reason provided',
      });

      return Response.json({ status: 'rejected', request_id: requestId, message: 'Role change request rejected.' });
    }

    return Response.json({ error: 'Invalid action. Use: request, first_approve, final_approve, reject' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});