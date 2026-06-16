import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, CheckCircle2, FileText, TrendingUp, AlertTriangle, Building2, UserCheck, Shield, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useOutletContext } from "react-router-dom";

export default function LandVaultDashboard() {
  const { user } = useOutletContext() || {};

  const { data: leads = [] } = useQuery({ queryKey: ["lv-leads-dash"], queryFn: () => base44.entities.CommunityLead.list("-created_date", 500) });
  const { data: parcels = [] } = useQuery({ queryKey: ["lv-parcels-dash"], queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 500) });
  const { data: payments = [] } = useQuery({ queryKey: ["lv-payments-dash"], queryFn: () => base44.entities.LandVaultPayment.list("-created_date", 500) });
  const { data: surveys = [] } = useQuery({ queryKey: ["lv-surveys-dash"], queryFn: () => base44.entities.SurveyAssignment.list("-created_date", 500) });

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstandingRevenue = parcels.reduce((s, p) => s + (p.outstanding_balance || 0), 0);
  const surveysCompleted = surveys.filter(s => s.status === "completed").length;
  const certIssued = parcels.filter(p => p.status === "certificate_issued").length;
  const pendingValidation = parcels.filter(p => p.community_validation_status === "pending").length;
  const uniqueCommunities = [...new Set(leads.map(l => l.community).filter(Boolean))].length;
  const uniqueFamilies = [...new Set(parcels.map(p => p.family_name).filter(Boolean))].length;
  const activeAgents = [...new Set(leads.map(l => l.field_agent_email).filter(Boolean))].length;
  const activeSurveyors = [...new Set(surveys.map(s => s.surveyor_email).filter(Boolean))].length;

  const avgEvidenceConfidence = parcels.length > 0
    ? Math.round(parcels.reduce((s, p) => s + (p.evidence_confidence_score || 0), 0) / parcels.length)
    : 0;
  const verifiedParcels = parcels.filter(p => p.evidence_confidence_level === "VERIFIED").length;
  const strongParcels = parcels.filter(p => p.evidence_confidence_level === "STRONG").length;

  // Monthly growth (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({length: 6}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const label = d.toLocaleString("default", { month: "short" });
    const month = d.getMonth();
    const year = d.getFullYear();
    const count = parcels.filter(p => {
      const pd = new Date(p.created_date);
      return pd.getMonth() === month && pd.getFullYear() === year;
    }).length;
    return { month: label, parcels: count };
  });

  const stats = [
    { label: "Communities", value: uniqueCommunities, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Families", value: uniqueFamilies, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Parcels", value: parcels.length, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Surveys Done", value: surveysCompleted, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Certs Issued", value: certIssued, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Pending Validation", value: pendingValidation, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Field Agents", value: activeAgents, icon: UserCheck, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Surveyors", value: activeSurveyors, icon: UserCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Evidence Confidence", value: `${avgEvidenceConfidence}%`, icon: Shield, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "VERIFIED Parcels", value: verifiedParcels, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LandVault Dashboard</h1>
        <p className="text-sm text-muted-foreground">Aquasavannah LandVault — Ehime Mbano Pilot</p>
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">₦{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">₦{outstandingRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Growth Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Monthly Parcel Registrations</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="parcels" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lead Pipeline */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Lead Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              ["NEW_LEAD","New Leads"],["CONSENT_RECEIVED","Consent Received"],
              ["SURVEY_SCHEDULED","Survey Scheduled"],["SURVEY_COMPLETED","Survey Completed"],
              ["CERTIFICATE_ISSUED","Certificates Issued"]
            ].map(([status, label]) => {
              const count = leads.filter(l => l.status === status).length;
              const pct = leads.length > 0 ? Math.round((count/leads.length)*100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}