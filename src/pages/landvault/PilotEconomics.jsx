import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import {
  TrendingUp, Users, Landmark, CreditCard, FileSearch,
  ShieldCheck, Archive, Target, Zap, PiggyBank,
  BarChart3, DollarSign, Activity, Building2
} from "lucide-react";

function formatNaira(n) { return `NGN ${(n || 0).toLocaleString()}`; }

export default function PilotEconomics() {
  const { data: requests = [] } = useQuery({
    queryKey: ["pe-requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-submitted_at", 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["pe-invoices"],
    queryFn: () => base44.entities.Invoice.list("-generated_at", 500),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["pe-parcels"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 500),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["pe-reports"],
    queryFn: () => base44.entities.GeneratedReport.list("-generated_timestamp", 500),
  });
  const { data: usage = [] } = useQuery({
    queryKey: ["pe-usage"],
    queryFn: () => base44.entities.UsageLedger.list("-usage_timestamp", 500),
  });
  const { data: institutions = [] } = useQuery({
    queryKey: ["pe-institutions"],
    queryFn: () => base44.entities.InstitutionPlan.list("-created_date", 50),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["pe-users"],
    queryFn: () => base44.entities.User.list("-created_date", 50),
  });

  const economics = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalParcels = parcels.length;
    const totalReqs = requests.length;
    const completedReqs = requests.filter(r => ["COMPLETED", "DELIVERED"].includes(r.status)).length;
    const ddReqs = requests.filter(r => r.service_category === "DUE_DILIGENCE_REPORT").length;
    const verifyReqs = requests.filter(r => r.service_category === "PARCEL_VERIFICATION").length;
    const totalCredits = usage.reduce((s, u) => s + (u.credits_used || 0), 0);
    const uniqueUsers = new Set(usage.map(u => u.user_id)).size;

    const revenuePerParcel = totalParcels > 0 ? Math.round(totalRevenue / totalParcels) : 0;
    const revenuePerUser = uniqueUsers > 0 ? Math.round(totalRevenue / uniqueUsers) : 0;
    const conversionRate = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;

    const monthlyRevenue = {};
    invoices.filter(i => i.status === "PAID" && i.generated_at).forEach(i => {
      const m = new Date(i.generated_at).toISOString().slice(0, 7);
      monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (i.total_amount || 0);
    });
    const monthlyArr = Object.entries(monthlyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const runRate = monthlyArr.length >= 3
      ? Math.round(monthlyArr.slice(-3).reduce((s, [, v]) => s + v, 0) / 3)
      : monthlyArr.length > 0 ? monthlyArr[monthlyArr.length - 1][1] : 0;

    const monthlyRequestCount = {};
    requests.filter(r => r.submitted_at).forEach(r => {
      const m = new Date(r.submitted_at).toISOString().slice(0, 7);
      monthlyRequestCount[m] = (monthlyRequestCount[m] || 0) + 1;
    });
    const combinedMonthly = monthlyArr.map(([month, rev]) => ({
      month,
      revenue: rev,
      requests: monthlyRequestCount[month] || 0,
    }));

    const breakevenMonthly = 500000;
    const monthsToBreakeven = runRate > 0 ? Math.ceil(breakevenMonthly / runRate) : 99;
    const breakEvenPct = Math.min(100, Math.round((runRate / breakevenMonthly) * 100));

    return {
      totalRevenue, totalParcels, totalReqs, completedReqs,
      ddReqs, verifyReqs, totalCredits, uniqueUsers,
      revenuePerParcel, revenuePerUser, conversionRate,
      monthlyArr, runRate, combinedMonthly,
      breakevenMonthly, monthsToBreakeven, breakEvenPct,
      totalInstitutions: institutions.length,
      activeInst: institutions.filter(i => i.status === "ACTIVE").length,
      totalReports: reports.length,
      totalUsers: users.length,
    };
  }, [requests, invoices, parcels, reports, usage, institutions, users]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pilot Economics Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Business viability metrics — Demonstrate the economics to investors, government, surveyors, and strategic partners
        </p>
      </div>

      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><DollarSign className="w-3 h-3" /> Total Revenue</div>
            <div className="text-xl font-bold text-emerald-600">{formatNaira(economics.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Landmark className="w-3 h-3" /> Parcels Digitized</div>
            <div className="text-xl font-bold">{economics.totalParcels.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatNaira(economics.revenuePerParcel)} / parcel</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3" /> Monthly Run Rate</div>
            <div className="text-xl font-bold text-primary">{formatNaira(economics.runRate)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> Active Users</div>
            <div className="text-xl font-bold">{economics.uniqueUsers}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatNaira(economics.revenuePerUser)} / user</div>
          </CardContent>
        </Card>
      </div>

      {/* Break-Even & Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Break-Even Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <div className="text-2xl font-bold">{economics.breakEvenPct}%</div>
              <div className="text-xs text-muted-foreground">Target: {formatNaira(economics.breakevenMonthly)}/mo</div>
            </div>
            <Progress value={economics.breakEvenPct} className="h-2" />
            <div className="text-xs text-muted-foreground mt-2">
              {economics.runRate >= economics.breakevenMonthly
                ? "Break-even achieved!"
                : `~${economics.monthsToBreakeven} months to break-even at current run rate`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Conversion Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{economics.conversionRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{economics.completedReqs} completed of {economics.totalReqs} requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-500" /> Institutions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{economics.activeInst}</div>
            <div className="text-xs text-muted-foreground mt-1">{economics.totalInstitutions} plans | {formatNaira(institutions.filter(i => i.status === "ACTIVE").reduce((s, i) => s + (i.monthly_fee || 0), 0))} MRR potential</div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Revenue + Requests Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Revenue & Requests</CardTitle></CardHeader>
          <CardContent>
            {economics.combinedMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={economics.combinedMonthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(v, name) => name === "revenue" ? formatNaira(v) : v} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98120" name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="requests" stroke="#3b82f6" name="Requests" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Per Service Type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Parcel Verification", value: requests.filter(r => r.service_category === "PARCEL_VERIFICATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0), icon: FileSearch, color: "bg-blue-100 text-blue-600" },
                { label: "Due Diligence Reports", value: requests.filter(r => r.service_category === "DUE_DILIGENCE_REPORT" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0), icon: Landmark, color: "bg-purple-100 text-purple-600" },
                { label: "Certificates", value: requests.filter(r => r.service_category === "CERTIFICATE_GENERATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0), icon: ShieldCheck, color: "bg-emerald-100 text-emerald-600" },
                { label: "Community Evidence", value: requests.filter(r => r.service_category === "COMMUNITY_EVIDENCE_REPORT" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0), icon: Users, color: "bg-amber-100 text-amber-600" },
                { label: "Archive Digitization", value: requests.filter(r => r.service_category === "ARCHIVE_DIGITIZATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0), icon: Archive, color: "bg-rose-100 text-rose-600" },
              ].map(item => {
                const Icon = item.icon;
                const pct = economics.totalRevenue > 0 ? Math.round((item.value / economics.totalRevenue) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${item.color}`}><Icon className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{formatNaira(item.value)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Economy */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Credit Economy Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{economics.totalCredits.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Credits Consumed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{economics.totalReqs.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Requests</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{economics.ddReqs}</div>
              <div className="text-xs text-muted-foreground">Due Diligence Requests</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{economics.verifyReqs}</div>
              <div className="text-xs text-muted-foreground">Verification Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Independence Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-center">
          <div className="text-sm text-amber-800">
            <strong>Trust Independence:</strong> Revenue influences service delivery speed — never evidence confidence, community consensus, fraud detection, verification outcomes, or trust scoring.
            LandVault monetizes verification infrastructure, not truth.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}