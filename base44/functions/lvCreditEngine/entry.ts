import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;
    const body = await req.json();
    const { action, wallet_id, user_email, amount, reason, reference, target_user_email } = body;

    const ts = () => new Date().toISOString();
    const uid = () => `EAE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6)}`;

    async function audit(actionType, entityType, entityId, before, after, amt) {
      await sr.entities.EconomicAuditEntry.create({
        audit_id: uid(),
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        actor_email: user.email,
        actor_id: user.id,
        before_state: JSON.stringify(before),
        after_state: JSON.stringify(after),
        reason: reason || '',
        reference: reference || '',
        amount: amt || amount || 0,
        timestamp: ts(),
      });
    }

    async function findWallet(email) {
      const target = email || user_email || user.email;
      const wallets = await sr.entities.CreditWallet.filter({ user_email: target });
      return wallets[0] || null;
    }

    switch (action) {

      // ===== AUTHORIZE: Check if wallet has sufficient credits =====
      case 'authorize': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ authorized: false, reason: 'NO_WALLET', available: 0 });
        if (wallet.wallet_status !== 'ACTIVE') {
          return Response.json({ authorized: false, reason: 'WALLET_' + wallet.wallet_status, available: 0 });
        }
        const available = (wallet.credit_balance || 0) - (wallet.reserved_credits || 0);
        const authorized = available >= (amount || 0);
        return Response.json({ authorized, available, required: amount || 0, wallet_id: wallet.id });
      }

      // ===== RESERVE: Hold credits for pending service =====
      case 'reserve': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        if (wallet.wallet_status !== 'ACTIVE') return Response.json({ error: `Wallet ${wallet.wallet_status}` }, { status: 403 });
        const available = (wallet.credit_balance || 0) - (wallet.reserved_credits || 0);
        if (available < amount) return Response.json({ error: 'Insufficient credits', available, required: amount }, { status: 402 });
        const before = { credit_balance: wallet.credit_balance, reserved_credits: wallet.reserved_credits };
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { reserved_credits: amount } });
        const newReserved = (wallet.reserved_credits || 0) + amount;
        await audit('CREDIT_RESERVED', 'CreditWallet', wallet.id, before, { ...before, reserved_credits: newReserved }, amount);
        return Response.json({ success: true, reserved: amount, wallet_id: wallet.id, new_available: (wallet.credit_balance || 0) - newReserved });
      }

      // ===== CONSUME: Deduct credits after successful completion =====
      case 'consume': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { credit_balance: wallet.credit_balance, reserved_credits: wallet.reserved_credits, credits_consumed: wallet.credits_consumed };
        if ((wallet.credit_balance || 0) - amount < 0) return Response.json({ error: 'Balance would go negative', balance: wallet.credit_balance, amount }, { status: 402 });
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { credit_balance: -amount, reserved_credits: -amount, credits_consumed: amount } });
        const newBalance = (wallet.credit_balance || 0) - amount;
        const newReserved = Math.max(0, (wallet.reserved_credits || 0) - amount);
        const newConsumed = (wallet.credits_consumed || 0) + amount;
        await audit('CREDIT_CONSUMED', 'CreditWallet', wallet.id, before, { credit_balance: newBalance, reserved_credits: newReserved, credits_consumed: newConsumed }, amount);
        return Response.json({ success: true, consumed: amount, new_balance: newBalance });
      }

      // ===== REFUND: Return reserved credits on failure =====
      case 'refund': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { reserved_credits: wallet.reserved_credits };
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { reserved_credits: -amount } });
        const newReserved = Math.max(0, (wallet.reserved_credits || 0) - amount);
        await audit('CREDIT_REFUNDED', 'CreditWallet', wallet.id, before, { reserved_credits: newReserved }, amount);
        return Response.json({ success: true, refunded: amount, wallet_id: wallet.id });
      }

      // ===== GRANT: Add free/promotional credits =====
      case 'grant': {
        if (!['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
          return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { credit_balance: wallet.credit_balance, credits_granted: wallet.credits_granted };
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { credit_balance: amount, credits_granted: amount } });
        const newBalance = (wallet.credit_balance || 0) + amount;
        const newGranted = (wallet.credits_granted || 0) + amount;
        await audit('CREDIT_GRANTED', 'CreditWallet', wallet.id, before, { credit_balance: newBalance, credits_granted: newGranted }, amount);
        return Response.json({ success: true, granted: amount, new_balance: newBalance });
      }

      // ===== PURCHASE: Record credit purchase =====
      case 'purchase': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { credit_balance: wallet.credit_balance, credits_purchased: wallet.credits_purchased };
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { credit_balance: amount, credits_purchased: amount } });
        const newBalance = (wallet.credit_balance || 0) + amount;
        const newPurchased = (wallet.credits_purchased || 0) + amount;
        await audit('CREDIT_PURCHASED', 'CreditWallet', wallet.id, before, { credit_balance: newBalance, credits_purchased: newPurchased }, amount);
        return Response.json({ success: true, purchased: amount, new_balance: newBalance });
      }

      // ===== TRANSFER: Move credits between wallets =====
      case 'transfer': {
        if (!['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
          return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }
        const sourceWallet = await findWallet();
        if (!sourceWallet) return Response.json({ error: 'Source wallet not found' }, { status: 404 });
        const targetWallets = await sr.entities.CreditWallet.filter({ user_email: target_user_email });
        const targetWallet = targetWallets[0];
        if (!targetWallet) return Response.json({ error: 'Target wallet not found' }, { status: 404 });
        const available = (sourceWallet.credit_balance || 0) - (sourceWallet.reserved_credits || 0);
        if (available < amount) return Response.json({ error: 'Insufficient available credits', available }, { status: 402 });

        await sr.entities.CreditWallet.updateMany({ id: sourceWallet.id }, { $inc: { credit_balance: -amount } });
        await sr.entities.CreditWallet.updateMany({ id: targetWallet.id }, { $inc: { credit_balance: amount } });
        await audit('CREDIT_TRANSFERRED', 'CreditWallet', sourceWallet.id,
          { source_balance: sourceWallet.credit_balance }, { source_balance: (sourceWallet.credit_balance || 0) - amount, target_email: target_user_email }, amount);
        return Response.json({ success: true, transferred: amount, from: sourceWallet.user_email, to: target_user_email });
      }

      // ===== FREEZE: Suspend wallet =====
      case 'freeze': {
        if (!['super_admin', 'compliance_officer'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { wallet_status: wallet.wallet_status };
        await sr.entities.CreditWallet.update(wallet.id, { wallet_status: 'FROZEN', frozen_reason: reason, frozen_at: ts(), frozen_by: user.email });
        await audit('WALLET_FROZEN', 'CreditWallet', wallet.id, before, { wallet_status: 'FROZEN' }, 0);
        return Response.json({ success: true, frozen: true, wallet_id: wallet.id });
      }

      // ===== UNFREEZE: Reactivate wallet =====
      case 'unfreeze': {
        if (!['super_admin', 'compliance_officer'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
        const wallet = await findWallet();
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const before = { wallet_status: wallet.wallet_status };
        await sr.entities.CreditWallet.update(wallet.id, { wallet_status: 'ACTIVE', frozen_reason: '', frozen_at: null, frozen_by: '' });
        await audit('WALLET_UNFROZEN', 'CreditWallet', wallet.id, before, { wallet_status: 'ACTIVE' }, 0);
        return Response.json({ success: true, unfrozen: true, wallet_id: wallet.id });
      }

      // ===== CREATE_WALLET: Initialize new wallet =====
      case 'create_wallet': {
        const existing = await findWallet();
        if (existing) return Response.json({ error: 'Wallet already exists', wallet_id: existing.id }, { status: 409 });
        const targetEmail = user_email || user.email;
        const wallet = await sr.entities.CreditWallet.create({
          wallet_id: `WAL-${Date.now().toString(36).toUpperCase()}`,
          user_id: user.id,
          user_email: targetEmail,
          credit_balance: 0, reserved_credits: 0, credits_consumed: 0, credits_purchased: 0, credits_granted: 0,
          wallet_status: 'ACTIVE',
        });
        await audit('WALLET_CREATED', 'CreditWallet', wallet.id, {}, { wallet_status: 'ACTIVE', credit_balance: 0 }, 0);
        return Response.json({ success: true, wallet_id: wallet.id });
      }

      // ===== GET_BALANCE: Return wallet status =====
      case 'get_balance': {
        const wallet = await findWallet();
        if (!wallet) return Response.json({ exists: false, balance: 0, available: 0 });
        return Response.json({
          exists: true,
          wallet_id: wallet.id,
          balance: wallet.credit_balance || 0,
          reserved: wallet.reserved_credits || 0,
          available: (wallet.credit_balance || 0) - (wallet.reserved_credits || 0),
          consumed: wallet.credits_consumed || 0,
          purchased: wallet.credits_purchased || 0,
          granted: wallet.credits_granted || 0,
          status: wallet.wallet_status,
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});