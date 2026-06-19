import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'surveyor_general', 'compliance_officer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const body = await req.json();
    const { action } = body;
    const ts = () => new Date().toISOString();
    const genId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

    switch (action) {

      // ===== GENERATE_FOR_REQUEST: Create invoice for a single service request =====
      case 'generate_for_request': {
        const { request_reference } = body;
        const allReqs = await sr.entities.ServiceRequest.filter({ request_reference });
        const serviceReq = allReqs[0];
        if (!serviceReq) return Response.json({ error: 'Service request not found' }, { status: 404 });

        // Check if invoice already exists
        const existingInvoices = await sr.entities.Invoice.filter({ service_request: serviceReq.request_reference });
        if (existingInvoices.length > 0) {
          return Response.json({ error: 'Invoice already exists', invoice_id: existingInvoices[0].id }, { status: 409 });
        }

        const amount = serviceReq.cash_amount || 0;
        const tax = Math.round(amount * 0.075); // 7.5% VAT
        const totalAmount = amount + tax;

        const invoice = await sr.entities.Invoice.create({
          invoice_number: genId('INV'),
          customer_id: serviceReq.requestor_id,
          customer_email: serviceReq.requestor,
          service_request: serviceReq.request_reference,
          amount, tax, total_amount: totalAmount,
          currency: 'NGN',
          status: 'ISSUED',
          generated_at: ts(),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          notes: `${serviceReq.service_name} — ${serviceReq.parcel_number || 'General'}`,
        });

        // Link invoice to service request
        await sr.entities.ServiceRequest.update(serviceReq.id, { invoice_reference: invoice.id });

        // Audit
        await sr.entities.EconomicAuditEntry.create({
          audit_id: genId('EAE'),
          action_type: 'INVOICE_GENERATED',
          entity_type: 'Invoice',
          entity_id: invoice.id,
          actor_email: user.email,
          actor_id: user.id,
          before_state: '{}',
          after_state: JSON.stringify({ invoice_number: invoice.invoice_number, total_amount: totalAmount }),
          amount: totalAmount,
          reason: `Invoice for: ${serviceReq.service_name}`,
          reference: serviceReq.request_reference,
          timestamp: ts(),
        });

        return Response.json({ success: true, invoice_id: invoice.id, invoice_number: invoice.invoice_number, total_amount: totalAmount });
      }

      // ===== GENERATE_MONTHLY: Batch generate invoices for all uninvoiced completed requests =====
      case 'generate_monthly': {
        const { billing_month } = body; // format: YYYY-MM
        const allRequests = await sr.entities.ServiceRequest.filter({ status: 'COMPLETED' }, '-completed_at', 500);
        const allInvoices = await sr.entities.Invoice.list('-generated_at', 1000);
        const invoicedRefs = new Set(allInvoices.map(i => i.service_request));

        // Filter to uninvoiced completed requests in the billing month
        const eligible = allRequests.filter(r => {
          if (invoicedRefs.has(r.request_reference)) return false;
          if (billing_month && r.completed_at) {
            return r.completed_at.startsWith(billing_month);
          }
          return true;
        });

        // Group by requestor for aggregated invoices
        const byUser = {};
        for (const r of eligible) {
          if (!byUser[r.requestor]) byUser[r.requestor] = [];
          byUser[r.requestor].push(r);
        }

        const created = [];
        for (const [email, reqs] of Object.entries(byUser)) {
          const totalAmount = reqs.reduce((s, r) => s + (r.cash_amount || 0), 0);
          const tax = Math.round(totalAmount * 0.075);
          const lineItems = reqs.map(r => ({
            ref: r.request_reference, service: r.service_name,
            parcel: r.parcel_number, amount: r.cash_amount || 0, credits: r.credits_consumed || 0,
          }));

          const invoice = await sr.entities.Invoice.create({
            invoice_number: genId('INV'),
            customer_id: reqs[0].requestor_id,
            customer_email: email,
            service_request: reqs.map(r => r.request_reference).join(', '),
            amount: totalAmount, tax, total_amount: totalAmount + tax,
            currency: 'NGN', status: 'ISSUED', generated_at: ts(),
            due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            notes: JSON.stringify(lineItems),
          });

          // Link invoices
          for (const r of reqs) {
            await sr.entities.ServiceRequest.update(r.id, { invoice_reference: invoice.id });
          }

          await sr.entities.EconomicAuditEntry.create({
            audit_id: genId('EAE'),
            action_type: 'INVOICE_GENERATED',
            entity_type: 'Invoice', entity_id: invoice.id,
            actor_email: user.email, actor_id: user.id,
            before_state: '{}',
            after_state: JSON.stringify({ invoice_number: invoice.invoice_number, line_items: lineItems.length, total: totalAmount + tax }),
            amount: totalAmount + tax,
            reason: `Monthly batch invoice: ${lineItems.length} services`,
            reference: invoice.invoice_number,
            timestamp: ts(),
          });

          created.push({ invoice_id: invoice.id, invoice_number: invoice.invoice_number, customer: email, total: totalAmount + tax, items: lineItems.length });
        }

        return Response.json({ success: true, invoices_created: created.length, invoices: created });
      }

      // ===== MARK_PAID: Mark invoice as paid =====
      case 'mark_paid': {
        const { invoice_number } = body;
        const invoices = await sr.entities.Invoice.filter({ invoice_number });
        const invoice = invoices[0];
        if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
        await sr.entities.Invoice.update(invoice.id, { status: 'PAID', paid_at: ts() });
        await sr.entities.EconomicAuditEntry.create({
          audit_id: genId('EAE'),
          action_type: 'INVOICE_PAID',
          entity_type: 'Invoice', entity_id: invoice.id,
          actor_email: user.email, actor_id: user.id,
          before_state: JSON.stringify({ status: invoice.status }),
          after_state: JSON.stringify({ status: 'PAID' }),
          amount: invoice.total_amount,
          reason: 'Invoice payment recorded',
          reference: invoice.invoice_number,
          timestamp: ts(),
        });
        return Response.json({ success: true, invoice_number: invoice.invoice_number });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});