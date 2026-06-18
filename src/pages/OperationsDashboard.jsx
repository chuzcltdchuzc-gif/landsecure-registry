import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Activity, Shield, Users, Server, Clock, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, FileText, ScanLine,
  Gauge, BarChart3, Layers, Zap, TrendingUp, TrendingDown,
  Loader2
} from "lucide-react";

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
  processing: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Processing" },
  completed: { color: "bg-green-100 text-green-800 border-green-200", label: "Completed" },
  failed: { color: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
  retrying: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Retrying" },
  cancelled: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Cancelled" },
};

export default function OperationsDashboard() {
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['operations-jobs'],
    queryFn: () => base44.entities.JobQueue.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: parcels, isLoading: parcelsLoading } = useQuery({
    queryKey: ['operations-parcels'],
    queryFn: () => base44.entities.LandVaultParcel.list('-created_date', 2000),
    refetchInterval: 60000,
  });

  const { data: surveyors, isLoading: surveyorsLoading } = useQuery({
    queryKey: ['operations-surveyors'],
    queryFn: () => base44.entities.SurveyorPartner.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: attestations, isLoading: attestLoading } = useQuery({
    queryKey: ['operations-attestations'],
    queryFn: () => base44.entities.CommunityAttestation.list('-created_date', 200),
    refetchInterval: 60000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['operations-alerts'],
    queryFn: () => base44.entities.DuplicateAlert.list('-created_date', 200),
    refetchInterval: 60000,
  });

  const isLoading = jobsLoading || parcelsLoading || surveyorsLoading || attestLoading || alertsLoading;

  // ── Queue Health Metrics ──
  const queueMetrics = !jobs ? {} : {
    pending: jobs.filter(j => ['pending', 'queued'].includes(j.status)).length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completedToday: jobs.filter(j => {
      const cd = new Date(j.completed_at || j.created_date);
      const today = new Date();
      return j.status === 'completed' && cd.toDateString() === today.toDateString();
    }).length,
    failed: jobs.filter(j => j.status === 'failed').length,
    retrying: jobs.filter(j => j.status === 'retrying').length,
    avgTime: (() => {
      const completed = jobs.filter(j => j.status === 'completed' && j.started_at && j.completed_at);
      if (completed.length === 0) return 0;
      const totalMs = completed.reduce((sum, j) => {
        const start = new Date(j.started_at);
        const end = new Date(j.completed_at);
        return sum + (end - start);
      }, 0);
      return Math.round(totalMs / completed.length / 1000);
    })(),
  };

  // ── Trust Health Metrics ──
  const trustMetrics = !parcels || !alerts || !attestations ? {} : {
    avgConfidence: parcels.length > 0
      ? Math.round(parcels.reduce((s, p) => s + (p.evidence_confidence_score || 0), 0) / parcels.length)
      : 0,
    openDuplicates: alerts.filter(a => a.status === 'open').length,
    pendingReviews: attestations.filter(a => a.verification_status === 'PENDING').length,
    pendingAttestations: attestations.filter(a => a.verification_status === 'PENDING').length,
  };

  // ── Pilot Health Metrics ──
  const pilotMetrics = !parcels || !surveyors ? {} : {
    totalParcels: parcels.length,
    verifiedParcels: parcels.filter(p => ['field_verified', 'survey_verified', 'community_validated', 'fully_verified'].includes(p.verification_status)).length,
    surveyorPartners: surveyors.filter(s => s.verification_status === 'VERIFIED_SURVEYOR').length,
    verificationPct: parcels.length > 0
      ? Math.round((parcels.filter(p => ['field_verified', 'survey_verified', 'community_validated', 'fully_verified'].includes(p.verification_status)).length / parcels.length) * 100)
      : 0,
  };

  // ── System Health Metrics ──
  const systemMetrics = !jobs ? {} : {
    ocrSuccessRate: (() => {
      const ocr = jobs.filter(j => j.job_type === 'ocr_processing');
      if (ocr.length === 0) return 100;
      const completed = ocr.filter(j => j.status === 'completed').length;
      return Math.round((completed / ocr.length) * 100);
    })(),
    duplicateRate: (() => {
      const scans = jobs.filter(j => j.job_type === 'duplicate_scan');
      if (scans.length === 0) return 0;
      const failed = scans.filter(j => j.status === 'failed').length;
      return Math.round((failed / scans.length) * 100);
    })(),
    jobFailureRate: jobs.length > 0
      ? Math.round((jobs.filter(j => j.status === 'failed').length / jobs.length) * 100)
      : 0,
    avgQueueTime: queueMetrics.avgTime || 0,
    processingBacklog: queueMetrics.pending || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Operations Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Operations Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilot monitoring &amp; operational visibility — Ehime Mbano LGA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Activity className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs">System Operational</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Section 1: Queue Health */}
      <Section title="Queue Health" icon={<Layers className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Pending" value={queueMetrics.pending} icon={Clock} color="text-yellow-600" bg="bg-yellow-50" />
          <MetricCard label="Processing" value={queueMetrics.processing} icon={RefreshCw} color="text-blue-600" bg="bg-blue-50" spin />
          <MetricCard label="Completed Today" value={queueMetrics.completedToday} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
          <MetricCard label="Failed" value={queueMetrics.failed} icon={XCircle} color="text-red-600" bg="bg-red-50" />
          <MetricCard label="Retrying" value={queueMetrics.retrying} icon={RefreshCw} color="text-orange-600" bg="bg-orange-50" spin />
          <MetricCard label="Avg Time" value={`${queueMetrics.avgTime}s`} icon={Gauge} color="text-purple-600" bg="bg-purple-50" />
        </div>

        {/* Recent Jobs Table */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Attempts</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobs || []).slice(0, 10).map(job => (
                    <tr key={job.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{formatJobType(job.job_type)}</td>
                      <td className="p-3 text-muted-foreground">{job.entity_type || '—'} {job.entity_id ? `#${job.entity_id.slice(-8)}` : ''}</td>
                      <td className="p-3">
                        <Badge className={statusConfig[job.status]?.color || ''}>
                          {statusConfig[job.status]?.label || job.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{job.attempts || job.retry_count || 0}/{job.max_attempts || 3}</td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(job.created_date)}</td>
                    </tr>
                  ))}
                  {(!jobs || jobs.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">No jobs recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Section 2: Trust Health */}
      <Section title="Trust Health" icon={<Shield className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Avg Evidence Confidence" value={`${trustMetrics.avgConfidence}/100`} icon={BarChart3} color="text-indigo-600" bg="bg-indigo-50" />
          <MetricCard label="Duplicate Alerts Open" value={trustMetrics.openDuplicates} icon={AlertTriangle} color={trustMetrics.openDuplicates > 0 ? "text-red-600" : "text-green-600"} bg={trustMetrics.openDuplicates > 0 ? "bg-red-50" : "bg-green-50"} />
          <MetricCard label="Pending Reviews" value={trustMetrics.pendingReviews} icon={Clock} color={trustMetrics.pendingReviews > 0 ? "text-orange-600" : "text-green-600"} bg={trustMetrics.pendingReviews > 0 ? "bg-orange-50" : "bg-green-50"} />
          <MetricCard label="Attestations Pending" value={trustMetrics.pendingAttestations} icon={Users} color={trustMetrics.pendingAttestations > 0 ? "text-orange-600" : "text-green-600"} bg={trustMetrics.pendingAttestations > 0 ? "bg-orange-50" : "bg-green-50"} />
        </div>

        {/* Trust Confidence Distribution */}
        {parcels && parcels.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evidence Confidence Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['VERIFIED', 'STRONG', 'MODERATE', 'LIMITED'].map(level => {
                  const count = parcels.filter(p => p.evidence_confidence_level === level).length;
                  const pct = parcels.length > 0 ? Math.round((count / parcels.length) * 100) : 0;
                  const colors = {
                    VERIFIED: "bg-green-500", STRONG: "bg-blue-500",
                    MODERATE: "bg-yellow-500", LIMITED: "bg-red-500",
                  };
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium">{level}</span>
                      <Progress value={pct} className="flex-1 h-2" indicatorClassName={colors[level]} />
                      <span className="w-16 text-sm text-muted-foreground text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* Section 3: Pilot Health */}
      <Section title="Pilot Health" icon={<Zap className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Parcels" value={pilotMetrics.totalParcels} icon={FileText} color="text-blue-600" bg="bg-blue-50" />
          <MetricCard label="Verified Parcels" value={pilotMetrics.verifiedParcels} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
          <MetricCard label="Surveyor Partners" value={pilotMetrics.surveyorPartners} icon={Users} color="text-purple-600" bg="bg-purple-50" />
          <MetricCard label="Verification Rate" value={`${pilotMetrics.verificationPct}%`} icon={TrendingUp} color={pilotMetrics.verificationPct >= 50 ? "text-green-600" : "text-yellow-600"} bg={pilotMetrics.verificationPct >= 50 ? "bg-green-50" : "bg-yellow-50"} />
        </div>

        {/* LGA Pilot Coverage */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pilot Coverage — Ehime Mbano LGA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const wards = [...new Set((parcels || []).map(p => p.ward).filter(Boolean))];
                const lgas = [...new Set((parcels || []).map(p => p.lga).filter(Boolean))];
                return (
                  <>
                    <CoverageCard label="Wards Covered" value={wards.length} subtitle="across LGA" />
                    <CoverageCard label="Communities" value={[...new Set((parcels || []).map(p => p.community).filter(Boolean))].length} subtitle="registered" />
                    <CoverageCard label="Reports Generated" value={jobs?.filter(j => j.job_type === 'verification_report' && j.status === 'completed').length || 0} subtitle="verification reports" />
                    <CoverageCard label="Certificates" value={jobs?.filter(j => ['pdf_certificate_generation', 'qr_certificate_generation'].includes(j.job_type) && j.status === 'completed').length || 0} subtitle="generated" />
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Section 4: System Health */}
      <Section title="System Health" icon={<Server className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="OCR Success Rate" value={`${systemMetrics.ocrSuccessRate}%`} icon={ScanLine} color={systemMetrics.ocrSuccessRate >= 90 ? "text-green-600" : "text-yellow-600"} bg={systemMetrics.ocrSuccessRate >= 90 ? "bg-green-50" : "bg-yellow-50"} />
          <MetricCard label="Duplicate Detection" value="Active" icon={AlertTriangle} color="text-blue-600" bg="bg-blue-50" />
          <MetricCard label="Job Failure Rate" value={`${systemMetrics.jobFailureRate}%`} icon={TrendingDown} color={systemMetrics.jobFailureRate > 10 ? "text-red-600" : "text-green-600"} bg={systemMetrics.jobFailureRate > 10 ? "bg-red-50" : "bg-green-50"} />
          <MetricCard label="Avg Queue Time" value={`${systemMetrics.avgQueueTime}s`} icon={Clock} color="text-purple-600" bg="bg-purple-50" />
          <MetricCard label="Processing Backlog" value={systemMetrics.processingBacklog} icon={Layers} color={systemMetrics.processingBacklog > 10 ? "text-orange-600" : "text-green-600"} bg={systemMetrics.processingBacklog > 10 ? "bg-orange-50" : "bg-green-50"} />
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 rounded-lg bg-muted border text-xs text-muted-foreground">
          <strong className="text-foreground">Pilot Infrastructure Note:</strong> This Operations Command Center monitors the Ehime Mbano pilot deployment (500–2,000 parcels, 10–30 surveyors). All metrics are live. Background jobs process asynchronously via the JobQueue engine with automatic retry (max 3 attempts). Failed jobs generate audit records and admin notifications.
        </div>
      </Section>
    </div>
  );
}

// ── Reusable Components ──

function Section({ title, icon, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg, spin }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color} ${spin ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CoverageCard({ label, value, subtitle }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}

// ── Helpers ──

function formatJobType(type) {
  const labels = {
    duplicate_scan: 'Duplicate Scan',
    confidence_recalculation: 'Confidence Recalc',
    verification_report: 'Verification Report',
    pdf_certificate_generation: 'Certificate (PDF)',
    qr_certificate_generation: 'Certificate (QR)',
    ocr_processing: 'OCR Processing',
    fraud_scoring: 'Fraud Scoring',
    gis_validation: 'GIS Validation',
    archive_import: 'Archive Import',
    backup: 'Backup',
    evidence_hashing: 'Evidence Hashing',
    report_export: 'Report Export',
    notification: 'Notification',
    pdf_generation: 'PDF Generation',
    bulk_import: 'Bulk Import',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}