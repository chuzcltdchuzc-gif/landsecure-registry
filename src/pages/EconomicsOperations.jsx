import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldAlert, CreditCard, AlertTriangle, DollarSign, TrendingUp,
  RefreshCw, Lock, Unlock, Banknote, FileText, Activity, Zap, XCircle
} from "lucide-react";

function StatBlock({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className={`text-lg font-bold ${color || ''}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function EconomicsOperations() {
  const queryClient = useQueryClient();
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState("");

  // Live data
  const { data: intelligence, isLoading, refetch: refetchIntel } = useQuery({
    queryKey: ["revenue-intelligence"],
    queryFn: async () => {
      const res = await base44.functions.invoke("lvRevenueIntelligence", {});
      return res.data;
    },
    staleTime: 60000,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ["eco-wallets"],
    queryFn: () => base44.entities.CreditWallet.list("-created_date", 200),
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ["eco-audit"],
    queryFn: () => base44.entities.EconomicAuditEntry.list("-timestamp", 25),
  });

  // Actions
  const fraudScanMut = useMutation({
    mutationFn: () => base44.functions.invoke("lvRevenueFraudCheck", {}),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(`Fraud scan complete: ${d.total_findings} findings, ${d.wallets_frozen} wallets frozen`);
      queryClient.invalidateQueries({ queryKey: ["eco-wallets"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const monthlyInvoiceMut = useMutation({
    mutationFn: () => base44.functions.invoke("lvInvoiceGenerator", { action: "generate_monthly" }),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.invoices_created} invoices`);
    },
    onError: (e) => toast.error(e.message),
  });

  const grantCreditsMut = useMutation({
    mutationFn: () => base44.functions.invoke("lvCreditEngine", { action: "grant", user_email: grantEmail, amount: Number(grantAmount), reason: "Admin grant" }),
    onSuccess: () => {
      toast.success(`Granted ${grantAmount} credits to ${grantEmail}`);
      setGrantEmail(""); setGrantAmount("");
      queryClient.invalidateQueries({ queryKey: ["eco-wallets"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const freezeWalletMut = useMutation({
    mutationFn: (email) => base44.functions.invoke("lvCreditEngine", { action: "freeze", user_email: email, reason: "Manual admin freeze" }),
    onSuccess: () => { toast.success("Wallet frozen"); queryClient.invalidateQueries({ queryKey: ["eco-wallets"] }); },
  });

  const unfreezeWalletMut = useMutation({
    mutationFn: (email) => base44.functions.invoke("lvCreditEngine", { action: "unfreeze", user_email: email, reason: "Manual admin unfreeze" }),
    onSuccess: () => { toast.success("Wallet unfrozen"); queryClient.invalidateQueries({ queryKey: ["eco-wallets"] }); },
  });

  const i = intelligence || {};
  const ce = i.credit_economy || {};
  const outstanding = i.outstanding || {};
  const forecast = i.forecast || {};
  const leakage = i.leakage || {};
  const mrr = i.mrr || {};

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Economics Command Center</h1>
          <p className="text-xs text-muted-foreground">Revenue engine operations — wallets, billing, fraud, enforcement</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchIntel()}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatBlock label="MRR" value={`NGN ${(mrr.total || 0).toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" />
        <StatBlock label="ARR" value={`NGN ${(i.arr || 0).toLocaleString()}`} icon={DollarSign} />
        <StatBlock label="Credits In Circulation" value={(ce.in_circulation || 0).toLocaleString()} sub={`${ce.reserved || 0} reserved`} icon={CreditCard} />
        <StatBlock label="Active Wallets" value={ce.active_wallets || 0} sub={`${ce.frozen_wallets || 0} frozen`} icon={Activity} color={ce.frozen_wallets > 0 ? "text-red-600" : ""} />
        <StatBlock label="Outstanding" value={`NGN ${(outstanding.total || 0).toLocaleString()}`} sub={`${outstanding.overdue_count || 0} overdue`} icon={FileText} color={outstanding.overdue_count > 0 ? "text-amber-600" : ""} />
        <StatBlock label="Revenue Leakage" value={`NGN ${(leakage.amount || 0).toLocaleString()}`} sub={`${leakage.uninvoiced_requests || 0} uninvoiced`} icon={AlertTriangle} color={leakage.amount > 0 ? "text-red-600" : "text-emerald-600"} />
      </div>

      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="wallets">Wallets ({wallets.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OPERATIONS */}
        <TabsContent value="operations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fraud Scan */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Revenue Fraud Scan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Scan for negative balances, duplicate billing, wallet inconsistencies, invoice tampering. Auto-freezes suspicious wallets.</p>
                <Button size="sm" onClick={() => fraudScanMut.mutate()} disabled={fraudScanMut.isPending}>
                  {fraudScanMut.isPending ? "Scanning..." : "Run Fraud Scan"}
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Invoice */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-500" /> Monthly Invoice Generation</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Generate invoices for all uninvoiced completed service requests. Groups by customer, adds VAT.</p>
                <Button size="sm" onClick={() => monthlyInvoiceMut.mutate()} disabled={monthlyInvoiceMut.isPending}>
                  {monthlyInvoiceMut.isPending ? "Generating..." : "Generate Monthly Invoices"}
                </Button>
              </CardContent>
            </Card>

            {/* Grant Credits */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Grant Credits</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-2">
                  <Input placeholder="user@email.com" value={grantEmail} onChange={e => setGrantEmail(e.target.value)} className="text-xs" />
                  <Input placeholder="Amount" type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} className="w-24 text-xs" />
                </div>
                <Button size="sm" onClick={() => grantCreditsMut.mutate()} disabled={!grantEmail || !grantAmount || grantCreditsMut.isPending}>
                  Grant Credits
                </Button>
              </CardContent>
            </Card>

            {/* Forecast */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Revenue Forecast</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Monthly</span><span className="font-medium">NGN {(forecast.avg_monthly || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">6-Month Forecast</span><span className="font-medium">NGN {(forecast.six_month || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">12-Month Forecast</span><span className="font-bold text-primary">NGN {(forecast.twelve_month || 0).toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WALLETS */}
        <TabsContent value="wallets">
          <Card>
            <CardContent className="p-4">
              {wallets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No wallets created yet</div>
              ) : (
                <div className="space-y-2">
                  {wallets.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <CreditCard className={`w-4 h-4 ${w.wallet_status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}`} />
                        <div>
                          <div className="font-medium text-sm">{w.user_email}</div>
                          <div className="text-xs text-muted-foreground">
                            Balance: {w.credit_balance || 0} | Reserved: {w.reserved_credits || 0} | Consumed: {w.credits_consumed || 0}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={w.wallet_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {w.wallet_status}
                        </Badge>
                        {w.wallet_status === 'ACTIVE' ? (
                          <Button size="sm" variant="ghost" onClick={() => freezeWalletMut.mutate(w.user_email)}><Lock className="w-3 h-3" /></Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => unfreezeWalletMut.mutate(w.user_email)}><Unlock className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="p-4">
              {auditEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No economic audit entries yet</div>
              ) : (
                <div className="space-y-1">
                  {auditEntries.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded border text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                        <span className="text-muted-foreground">{a.actor_email}</span>
                        <span>{a.reason}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.amount > 0 && <span className="font-medium">{a.amount} credits</span>}
                        <span className="text-muted-foreground">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}