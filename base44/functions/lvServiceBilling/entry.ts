import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;
    const body = await req.json();
    const { action } = body;
    const ts = () => new Date().toISOString();
    const genId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

    async function auditEntry(actionType, entityType, entityId, before, after, amt, reason, ref) {
      await sr.entities.EconomicAuditEntry.create({
        audit_id: genId('EAE'),
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        actor_email: user.email,
        actor_id: user.id,
        before_state: JSON.stringify(before),
        after_state: JSON.stringify(after),
        amount: amt || 0,
        reason: reason || '',
        reference: ref || '',
        timestamp: ts(),
      });
    }

    switch (action) {

      // ===== INITIATE: Authorize, reserve credits, create service request =====
      case 'initiate': {
        const { service_id, parcel_id, priority, notes } = body;

        // 1. Resolve service
        const allSvcs = await sr.entities.ServiceCatalog.filter({ service_status: 'ACTIVE' });
        const service = allSvcs.find(s => s.id === service_id);
        if (!service) return Response.json({ error: 'Service not found or inactive' }, { status: 404 });

        // 2. Calculate cost with priority multiplier
        const mult = priority === 'URGENT' ? 2 : priority === 'PRIORITY' ? 1.5 : 1;
        const creditCost = Math.ceil((service.credit_cost || 0) * mult);
        const cashAmount = Math.ceil((service.cash_price || 0) * mult);

        // 3. Find or create wallet
        let wallets = await sr.entities.CreditWallet.filter({ user_email: user.email });
        let wallet = wallets[0];
        if (!wallet) {
          wallet = await sr.entities.CreditWallet.create({
            wallet_id: genId('WAL'), user_id: user.id, user_email: user.email,
            credit_balance: 0, reserved_credits: 0, credits_consumed: 0,
            credits_purchased: 0, credits_granted: 0, wallet_status: 'ACTIVE',
          });
          await auditEntry('WALLET_CREATED', 'CreditWallet', wallet.id, {}, { status: 'ACTIVE' }, 0, 'Auto-created on first service request', '');
        }

        // 4. ENFORCE: Check wallet status
        if (wallet.wallet_status !== 'ACTIVE') {
          return Response.json({ error: `Wallet ${wallet.wallet_status}. Service blocked.`, code: 'WALLET_BLOCKED' }, { status: 403 });
        }

        // 5. ENFORCE: Check balance
        const available = (wallet.credit_balance || 0) - (wallet.reserved_credits || 0);
        if (available < creditCost) {
          return Response.json({
            error: 'Insufficient credits. Purchase or request credits to proceed.',
            code: 'INSUFFICIENT_CREDITS',
            available, required: creditCost, service_name: service.service_name,
          }, { status: 402 });
        }

        // 6. RESERVE credits — ATOMIC $inc to prevent race conditions
        const beforeWallet = { credit_balance: wallet.credit_balance, reserved_credits: wallet.reserved_credits };
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { reserved_credits: creditCost } });

        // 7. Create ServiceRequest
        const requestRef = genId('SR');
        let parcelNumber = null;
        if (parcel_id) {
          const parcels = await sr.entities.LandVaultParcel.filter({}, '-created_date', 500);
          const parcel = parcels.find(p => p.id === parcel_id);
          parcelNumber = parcel?.parcel_number || null;
        }

        const serviceRequest = await sr.entities.ServiceRequest.create({
          request_reference: requestRef,
          requestor: user.email, requestor_id: user.id,
          service_id: service.id, service_name: service.service_name,
          service_category: service.service_category,
          parcel_id: parcel_id || null, parcel_number: parcelNumber,
          status: service.requires_review ? 'UNDER_REVIEW' : 'PROCESSING',
          submitted_at: ts(), priority: priority || 'STANDARD',
          credits_consumed: creditCost, cash_amount: cashAmount,
          notes: notes || '',
        });

        // 8. Audit
        await auditEntry('SERVICE_BILLED', 'ServiceRequest', serviceRequest.id,
          beforeWallet, { ...beforeWallet, reserved_credits: newReserved },
          creditCost, `Service initiated: ${service.service_name}`, requestRef);

        return Response.json({
          success: true,
          request_id: serviceRequest.id,
          request_reference: requestRef,
          service_name: service.service_name,
          credits_reserved: creditCost,
          cash_amount: cashAmount,
          wallet_available: available - creditCost,
        });
      }

      // ===== COMPLETE: Consume reserved credits, finalize =====
      case 'complete': {
        const { request_reference, delivery_reference } = body;
        const allReqs = await sr.entities.ServiceRequest.filter({ request_reference: request_reference });
        const serviceReq = allReqs[0];
        if (!serviceReq) return Response.json({ error: 'Service request not found' }, { status: 404 });
        if (serviceReq.status === 'COMPLETED' || serviceReq.status === 'DELIVERED') {
          return Response.json({ error: 'Already completed', status: serviceReq.status }, { status: 409 });
        }

        const wallets = await sr.entities.CreditWallet.filter({ user_email: serviceReq.requestor });
        const wallet = wallets[0];
        if (!wallet) return Response.json({ error: 'Requestor wallet not found' }, { status: 404 });

        const creditAmount = serviceReq.credits_consumed || 0;
        const beforeWallet = { credit_balance: wallet.credit_balance, reserved_credits: wallet.reserved_credits, credits_consumed: wallet.credits_consumed };

        // ATOMIC $inc — prevents race conditions under concurrent load
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, {
          $inc: { credit_balance: -creditAmount, reserved_credits: -creditAmount, credits_consumed: creditAmount }
        });

        // Re-read wallet for accurate after_state
        const updatedWallets = await sr.entities.CreditWallet.filter({ user_email: serviceReq.requestor });
        const updatedWallet = updatedWallets[0];
        const afterWallet = { credit_balance: updatedWallet.credit_balance, reserved_credits: updatedWallet.reserved_credits, credits_consumed: updatedWallet.credits_consumed };

        // Update request
        await sr.entities.ServiceRequest.update(serviceReq.id, {
          status: 'COMPLETED', completed_at: ts(),
          delivery_reference: delivery_reference || '',
        });

        // Create usage ledger entry
        await sr.entities.UsageLedger.create({
          usage_id: genId('USE'),
          user_id: serviceReq.requestor_id, user_email: serviceReq.requestor,
          parcel_id: serviceReq.parcel_id, parcel_number: serviceReq.parcel_number,
          service_id: serviceReq.service_id, service_name: serviceReq.service_name,
          service_category: serviceReq.service_category,
          credits_used: creditAmount, cash_value: serviceReq.cash_amount || 0,
          request_reference: serviceReq.request_reference,
          usage_timestamp: ts(), status: 'COMPLETED',
        });

        // Audit
        await auditEntry('SERVICE_COMPLETED', 'CreditWallet', wallet.id,
          beforeWallet, afterWallet,
          creditAmount, `Service completed: ${serviceReq.service_name}`, serviceReq.request_reference);

        // Auto-generate invoice
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        const invoice = await sr.entities.Invoice.create({
          invoice_id: genId('INV'), invoice_number: invoiceNumber,
          customer_id: serviceReq.requestor_id, customer_email: serviceReq.requestor,
          customer_name: serviceReq.requestor,
          service_request: serviceReq.id,
          amount: serviceReq.cash_amount || 0, tax: 0,
          total_amount: serviceReq.cash_amount || 0,
          currency: 'NGN', status: 'ISSUED',
          generated_at: ts(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          notes: `Auto-generated for ${serviceReq.service_name} (${serviceReq.request_reference})`,
        });
        await sr.entities.ServiceRequest.update(serviceReq.id, { invoice_reference: invoice.invoice_number });
        await auditEntry('INVOICE_GENERATED', 'Invoice', invoice.id,
          {}, { invoice_number: invoice.invoice_number, amount: serviceReq.cash_amount || 0, status: 'ISSUED' },
          serviceReq.cash_amount || 0, `Invoice auto-generated: ${invoice.invoice_number}`, serviceReq.request_reference);

        return Response.json({ success: true, consumed: creditAmount, new_balance: afterWallet.credit_balance, invoice_number: invoice.invoice_number, request_reference: serviceReq.request_reference });
      }

      // ===== FAIL: Refund reserved credits on failure =====
      case 'fail': {
        const { request_reference, failure_reason } = body;
        const allReqs = await sr.entities.ServiceRequest.filter({ request_reference: request_reference });
        const serviceReq = allReqs[0];
        if (!serviceReq) return Response.json({ error: 'Service request not found' }, { status: 404 });

        const wallets = await sr.entities.CreditWallet.filter({ user_email: serviceReq.requestor });
        const wallet = wallets[0];
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

        const creditAmount = serviceReq.credits_consumed || 0;
        const beforeWallet = { reserved_credits: wallet.reserved_credits };

        // ATOMIC $inc — release reservation
        await sr.entities.CreditWallet.updateMany({ id: wallet.id }, { $inc: { reserved_credits: -creditAmount } });

        // Re-read for accurate after_state
        const refundedWallets = await sr.entities.CreditWallet.filter({ user_email: serviceReq.requestor });
        const refundedWallet = refundedWallets[0];
        const afterWallet = { reserved_credits: refundedWallet.reserved_credits };

        // Cancel request
        await sr.entities.ServiceRequest.update(serviceReq.id, {
          status: 'CANCELLED',
          notes: `${serviceReq.notes || ''}\n[REFUNDED] ${failure_reason || 'Service execution failed'}`.trim(),
        });

        // Audit
        await auditEntry('SERVICE_REFUNDED', 'CreditWallet', wallet.id,
          beforeWallet, afterWallet,
          creditAmount, `Service failed: ${serviceReq.service_name} — ${failure_reason || 'Unknown'}`, serviceReq.request_reference);

        return Response.json({ success: true, refunded: creditAmount, request_reference: serviceReq.request_reference });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});