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
    const ts = () => new Date().toISOString();
    const genId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
    const findings = [];

    // ===== 1. NEGATIVE BALANCE CHECK =====
    const allWallets = await sr.entities.CreditWallet.list('-created_date', 500);
    const negativeWallets = allWallets.filter(w => (w.credit_balance || 0) < 0);
    for (const w of negativeWallets) {
      findings.push({ type: 'NEGATIVE_BALANCE', severity: 'CRITICAL', wallet_id: w.id, user: w.user_email, balance: w.credit_balance });
      // Auto-freeze
      await sr.entities.CreditWallet.update(w.id, { wallet_status: 'FROZEN', frozen_reason: 'Negative balance detected', frozen_at: ts(), frozen_by: 'SYSTEM' });
    }

    // ===== 2. RESERVATION EXCEEDS BALANCE =====
    const overReserved = allWallets.filter(w => (w.reserved_credits || 0) > (w.credit_balance || 0));
    for (const w of overReserved) {
      findings.push({ type: 'OVER_RESERVATION', severity: 'HIGH', wallet_id: w.id, user: w.user_email, balance: w.credit_balance, reserved: w.reserved_credits });
    }

    // ===== 3. CONSUMED > PURCHASED + GRANTED (impossible state) =====
    const impossibleConsumed = allWallets.filter(w => (w.credits_consumed || 0) > ((w.credits_purchased || 0) + (w.credits_granted || 0) + 100));
    for (const w of impossibleConsumed) {
      findings.push({ type: 'CONSUMPTION_EXCEEDS_SUPPLY', severity: 'HIGH', wallet_id: w.id, user: w.user_email,
        consumed: w.credits_consumed, purchased: w.credits_purchased, granted: w.credits_granted });
    }

    // ===== 4. DUPLICATE BILLING (same service request billed twice) =====
    const allUsage = await sr.entities.UsageLedger.list('-usage_timestamp', 500);
    const refCounts = {};
    for (const u of allUsage) {
      if (u.request_reference) {
        refCounts[u.request_reference] = (refCounts[u.request_reference] || 0) + 1;
      }
    }
    const duplicateBills = Object.entries(refCounts).filter(([, count]) => count > 1);
    for (const [ref, count] of duplicateBills) {
      findings.push({ type: 'DUPLICATE_BILLING', severity: 'HIGH', reference: ref, count });
    }

    // ===== 5. INVOICE INTEGRITY (total != amount + tax) =====
    const allInvoices = await sr.entities.Invoice.list('-generated_at', 300);
    const badInvoices = allInvoices.filter(inv => {
      const expected = (inv.amount || 0) + (inv.tax || 0);
      return Math.abs(expected - (inv.total_amount || 0)) > 1;
    });
    for (const inv of badInvoices) {
      findings.push({ type: 'INVOICE_INTEGRITY_MISMATCH', severity: 'CRITICAL', invoice: inv.invoice_number,
        amount: inv.amount, tax: inv.tax, total: inv.total_amount, expected: (inv.amount || 0) + (inv.tax || 0) });
    }

    // ===== 6. FROZEN WALLETS WITH ACTIVE REQUESTS =====
    const frozenWallets = allWallets.filter(w => w.wallet_status === 'FROZEN' || w.wallet_status === 'SUSPENDED');
    const frozenEmails = new Set(frozenWallets.map(w => w.user_email));
    const activeReqs = await sr.entities.ServiceRequest.filter({ status: 'PROCESSING' }, '-submitted_at', 200);
    const blockedReqs = activeReqs.filter(r => frozenEmails.has(r.requestor));
    for (const r of blockedReqs) {
      findings.push({ type: 'FROZEN_WALLET_ACTIVE_SERVICE', severity: 'MEDIUM', reference: r.request_reference, user: r.requestor });
    }

    // ===== 7. WALLET RECONCILIATION (balance + consumed should roughly equal purchased + granted) =====
    const reconciliationIssues = allWallets.filter(w => {
      const totalIn = (w.credits_purchased || 0) + (w.credits_granted || 0);
      const totalOut = (w.credits_consumed || 0) + (w.credit_balance || 0);
      return Math.abs(totalIn - totalOut) > 5;
    });
    for (const w of reconciliationIssues) {
      findings.push({ type: 'WALLET_RECONCILIATION_MISMATCH', severity: 'MEDIUM', wallet_id: w.id, user: w.user_email,
        total_in: (w.credits_purchased || 0) + (w.credits_granted || 0),
        total_out: (w.credits_consumed || 0) + (w.credit_balance || 0) });
    }

    // ===== RECORD FINDINGS =====
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
    if (criticalFindings.length > 0) {
      await sr.entities.EconomicAuditEntry.create({
        audit_id: genId('EAE'),
        action_type: 'FRAUD_DETECTED',
        entity_type: 'System',
        entity_id: 'revenue_fraud_scan',
        actor_email: user.email,
        actor_id: user.id,
        before_state: '{}',
        after_state: JSON.stringify({ critical: criticalFindings.length, total: findings.length, findings: criticalFindings }),
        amount: 0,
        reason: `Revenue fraud scan: ${criticalFindings.length} critical, ${findings.length} total findings`,
        reference: genId('FRAUD'),
        timestamp: ts(),
      });
    }

    return Response.json({
      success: true,
      scan_timestamp: ts(),
      total_wallets: allWallets.length,
      total_findings: findings.length,
      critical: criticalFindings.length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      wallets_frozen: negativeWallets.length,
      findings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});