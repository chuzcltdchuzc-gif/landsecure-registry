import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, DollarSign, CreditCard, Users, Building2,
  FileSearch, ShieldCheck, Archive, Landmark, ArrowUpRight, Search
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

function formatNaira(n) { return `NGN ${(n || 0).toLocaleString()}`; }

export default function RevenueAnalytics() {
  const { data: requests = [], isLoading: loadingReq } = useQuery({
    queryKey: ["all-service-requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-submitted_at", 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["all-invoices"],
    queryFn: () => base44.entities.Invoice.list("-generated_at", 200),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["all-reports-ra"],
    queryFn: () => base44.entities.GeneratedReport.list("-generated_timestamp", 200),
  });
  const { data: usage = [] } = useQuery({
    queryKey: ["all-usage"],
    queryFn: () => base44.entities.UsageLedger.list("-usage_timestamp", 500),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["all-parcels-ra"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 500),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["all-plans"],
    queryFn: () => base44.entities.InstitutionPlan.list("-created_date", 50),
  });

  const metrics = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + (i.total_amount || 0), 0);
    const pendingRevenue = invoices.filter(i => i.status === "ISSUED").reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalCreditsUsed = usage.reduce((s, u) => s + (u.credits_used || 0), 0);
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => ["COMPLETED", "DELIVERED"].includes(r.status)).length;
    const conversionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;
    const avgRevenuePerUser = totalRevenue > 0 && usage.length > 0 ? Math.round(totalRevenue / new Set(usage.map(u => u.user_id)).size) : 0;

    const revenueByService = {};
    requests.filter(r => r.status === "COMPLETED" || r.status === "DELIVERED").forEach(r => {
      const cat = r.service_category || "OTHER";
      revenueByService[cat] = (revenueByService[cat] || 0) + (r.cash_amount || 0);
    });
    const servicePieData = Object.entries(revenueByService).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

    const monthlyRevenue = {};
    invoices.filter(i => i.status === "PAID").forEach(i => {
      if (!i.generated_at) return;
      const m = new Date(i.generated_at).toISOString().slice(0, 7);
      monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (i.total_amount || 0);
    });
    const monthlyData = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({ month, revenue }));

    const requestsByCategory = {};
    requests.forEach(r => {
      const cat = r.service_category || "OTHER";
      requestsByCategory[cat] = (requestsByCategory[cat] || 0) + 1;
    });
    const categoryData = Object.entries(requestsByCategory)
      .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count);

    const totalVerificationRevenue = requests.filter(r => r.service_category === "PARCEL_VERIFICATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0);
    const totalDDRevenue = requests.filter(r => r.service_category === "DUE_DILIGENCE_REPORT" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0);
    const totalCertRevenue = requests.filter(r => r.service_category === "CERTIFICATE_GENERATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0);

    const monthlyRunRate = monthlyData.length >= 3
      ? Math.round(monthlyData.slice(-3).reduce((s, m) => s + m.revenue, 0) / 3)
      : monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].revenue : 0;

    return {
      totalRevenue, pendingRevenue, totalCreditsUsed, totalRequests, completedRequests,
      conversionRate, avgRevenuePerUser, servicePieData, monthlyData, categoryData,
      totalVerificationRevenue, totalDDRevenue, totalCertRevenue,
      totalReports: reports.length, totalPlans: plans.length,
      activePlans: plans.filter(p => p.status === "ACTIVE").length,
      totalParcels: parcels.length,
      monthlyRunRate,
    };
  }, [requests, invoices, reports, usage, parcels, plans]);

  if (loadingReq) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revenue Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          LandVault Economic Operating System — investor readiness, pilot economics, business intelligence
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3 h-3" /> Total Revenue
            </div>
            <div className="text-xl font-bold text-emerald-600">{formatNaira(metrics.totalRevenue)}</div>
            {metrics.pendingRevenue > 0 && (
              <div className="text-xs text-amber-600 mt-1">{formatNaira(metrics.pendingRevenue)} pending</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CreditCard className="w-3 h-3" /> Credits Used
            </div>
            <div className="text-xl font-bold">{metrics.totalCreditsUsed.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{metrics.totalRequests} total requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" /> Monthly Run Rate
            </div>
            <div className="text-xl font-bold text-primary">{formatNaira(metrics.monthlyRunRate)}</div>
            <div className="text-xs text-muted-foreground mt-1">3-month average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Building2 className="w-3 h-3" /> Institutions
            </div>
            <div className="text-xl font-bold">{metrics.activePlans}</div>
            <div className="text-xs text-muted-foreground mt-1">{metrics.totalPlans} plans configured</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">By Service</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Service Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue by Service Category</CardTitle></CardHeader>
              <CardContent>
                {metrics.servicePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={metrics.servicePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}>
                        {metrics.servicePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatNaira(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No revenue data yet</div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Breakdown Cards */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100"><Search className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <div className="font-medium text-sm">Verification Revenue</div>
                      <div className="text-xs text-muted-foreground">Parcel & survey verification</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">{formatNaira(metrics.totalVerificationRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100"><FileSearch className="w-5 h-5 text-purple-600" /></div>
                    <div>
                      <div className="font-medium text-sm">Due Diligence Revenue</div>
                      <div className="text-xs text-muted-foreground">Bank, legal & DD reports</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">{formatNaira(metrics.totalDDRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <div className="font-medium text-sm">Certificate Revenue</div>
                      <div className="text-xs text-muted-foreground">Digital certificate generation</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">{formatNaira(metrics.totalCertRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100"><Archive className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <div className="font-medium text-sm">Digitization Revenue</div>
                      <div className="text-xs text-muted-foreground">Archive & document services</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">{formatNaira(
                    requests.filter(r => r.service_category === "ARCHIVE_DIGITIZATION" && r.status === "COMPLETED").reduce((s, r) => s + (r.cash_amount || 0), 0)
                  )}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader><CardTitle className="text-base">Requests by Service Category</CardTitle></CardHeader>
            <CardContent>
              {metrics.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={metrics.categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              {metrics.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => formatNaira(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No revenue trends yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}