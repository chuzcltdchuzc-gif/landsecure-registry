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

    // Fetch all economic data
    const [invoices, usage, wallets, requests, plans, orgWallets] = await Promise.all([
      sr.entities.Invoice.list('-generated_at', 1000),
      sr.entities.UsageLedger.list('-usage_timestamp', 1000),
      sr.entities.CreditWallet.list('-created_date', 500),
      sr.entities.ServiceRequest.list('-submitted_at', 1000),
      sr.entities.InstitutionPlan.list('-created_date', 50),
      sr.entities.OrganizationWallet.list('-created_date', 100),
    ]);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    // ===== MRR & ARR =====
    const paidInvoicesThisMonth = invoices.filter(i => i.status === 'PAID' && i.paid_at && i.paid_at.startsWith(thisMonth));
    const paidInvoicesLastMonth = invoices.filter(i => i.status === 'PAID' && i.paid_at && i.paid_at.startsWith(lastMonth));
    const mrrThisMonth = paidInvoicesThisMonth.reduce((s, i) => s + (i.total_amount || 0), 0);
    const mrrLastMonth = paidInvoicesLastMonth.reduce((s, i) => s + (i.total_amount || 0), 0);
    const institutionMRR = orgWallets.filter(w => w.wallet_status === 'ACTIVE').reduce((s, w) => {
      const plan = plans.find(p => p.id === w.plan_id);
      return s + (plan?.monthly_fee || 0);
    }, 0);
    const totalMRR = mrrThisMonth + institutionMRR;
    const arr = totalMRR * 12;

    // ===== Revenue by Service =====
    const revenueByService = {};
    const completedReqs = requests.filter(r => ['COMPLETED', 'DELIVERED'].includes(r.status));
    for (const r of completedReqs) {
      const cat = r.service_category || 'OTHER';
      revenueByService[cat] = (revenueByService[cat] || 0) + (r.cash_amount || 0);
    }

    // ===== Revenue by Month (trailing 6) =====
    const monthlyRevenue = {};
    invoices.filter(i => i.status === 'PAID' && i.paid_at).forEach(i => {
      const m = i.paid_at.slice(0, 7);
      monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (i.total_amount || 0);
    });

    // ===== Revenue per Community =====
    const revByCommunity = {};
    for (const r of completedReqs) {
      if (r.parcel_number) {
        const parts = r.parcel_number.split('-');
        const community = parts.length > 2 ? parts.slice(0, 3).join('-') : 'Unknown';
        revByCommunity[community] = (revByCommunity[community] || 0) + (r.cash_amount || 0);
      }
    }

    // ===== ARPU =====
    const uniqueUsers = new Set(usage.map(u => u.user_email));
    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total_amount || 0), 0);
    const arpu = uniqueUsers.size > 0 ? Math.round(totalRevenue / uniqueUsers.size) : 0;

    // ===== Credit Economy =====
    const totalCreditsInCirculation = wallets.reduce((s, w) => s + (w.credit_balance || 0), 0);
    const totalCreditsReserved = wallets.reduce((s, w) => s + (w.reserved_credits || 0), 0);
    const totalCreditsConsumed = wallets.reduce((s, w) => s + (w.credits_consumed || 0), 0);
    const totalCreditsPurchased = wallets.reduce((s, w) => s + (w.credits_purchased || 0), 0);
    const totalCreditsGranted = wallets.reduce((s, w) => s + (w.credits_granted || 0), 0);
    const activeWallets = wallets.filter(w => w.wallet_status === 'ACTIVE').length;
    const frozenWallets = wallets.filter(w => w.wallet_status === 'FROZEN').length;

    // ===== Outstanding =====
    const outstandingInvoices = invoices.filter(i => i.status === 'ISSUED');
    const totalOutstanding = outstandingInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const overdueInvoices = outstandingInvoices.filter(i => i.due_date && new Date(i.due_date) < now);
    const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

    // ===== Forecast (simple linear based on trailing 3 months) =====
    const sortedMonths = Object.entries(monthlyRevenue).sort(([a], [b]) => a.localeCompare(b));
    const trailing3 = sortedMonths.slice(-3);
    const avgMonthlyRevenue = trailing3.length > 0 ? Math.round(trailing3.reduce((s, [, v]) => s + v, 0) / trailing3.length) : 0;
    const forecast6Month = avgMonthlyRevenue * 6;
    const forecast12Month = avgMonthlyRevenue * 12;

    // ===== Revenue Leakage (completed requests without invoices) =====
    const invoicedRefs = new Set(invoices.map(i => i.service_request).flatMap(s => s ? s.split(', ') : []));
    const uninvoiced = completedReqs.filter(r => !invoicedRefs.has(r.request_reference));
    const leakageAmount = uninvoiced.reduce((s, r) => s + (r.cash_amount || 0), 0);

    return Response.json({
      calculated_at: now.toISOString(),
      mrr: { this_month: mrrThisMonth, last_month: mrrLastMonth, institution_mrr: institutionMRR, total: totalMRR },
      arr,
      total_revenue: totalRevenue,
      arpu,
      revenue_by_service: revenueByService,
      revenue_by_month: monthlyRevenue,
      revenue_by_community: revByCommunity,
      credit_economy: {
        in_circulation: totalCreditsInCirculation, reserved: totalCreditsReserved,
        consumed: totalCreditsConsumed, purchased: totalCreditsPurchased, granted: totalCreditsGranted,
        active_wallets: activeWallets, frozen_wallets: frozenWallets, total_wallets: wallets.length,
      },
      outstanding: { count: outstandingInvoices.length, total: totalOutstanding, overdue_count: overdueInvoices.length, overdue_total: totalOverdue },
      forecast: { avg_monthly: avgMonthlyRevenue, six_month: forecast6Month, twelve_month: forecast12Month },
      leakage: { uninvoiced_requests: uninvoiced.length, amount: leakageAmount },
      requests_summary: { total: requests.length, completed: completedReqs.length, processing: requests.filter(r => r.status === 'PROCESSING').length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});