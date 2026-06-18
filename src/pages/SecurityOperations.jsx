import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Activity, Lock, BarChart3, Server,
  ShieldAlert, ShieldCheck, ShieldOff,
  Loader2, TrendingUp, TrendingDown, Target,
  Fingerprint, FileWarning, Key, FileText, Layers,
  Database, HardDrive, KeyRound, Rocket,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OperationsDashboard() {
  const now = new Date().toISOString();

  const { data: trustSnapshots } = useQuery({
    queryKey: ['sec-ops-trust'],
    queryFn: () => base44.entities.TrustScoreSnapshot.list('-created_date', 20),
    refetchInterval: 60000,
  });

  const { data: incidents } = useQuery({
    queryKey: ['sec-ops-incidents'],
    queryFn: () => base44.entities.SecurityIncident.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: fraudSignals } = useQuery({
    queryKey: ['sec-ops-fraud'],
    queryFn: () => base44.entities.FraudSignal.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const { data: hashChains } = useQuery({
    queryKey: ['sec-ops-hashchains'],
    queryFn: () => base44.entities.HashChainEntry.list('-created_date', 100),
    refetchInterval: 60000,
  });

  const { data: evidenceLocks } = useQuery({
    queryKey: ['sec-ops-locks'],
    queryFn: () => base44.entities.EvidenceLock.list('-created_date', 100),
    refetchInterval: 60000,
  });

  const { data: integrityChecks } = useQuery({
    queryKey: ['sec-ops-integrity'],
    queryFn: () => base44.entities.EvidenceIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: auditChecks } = useQuery({
    queryKey: ['sec-ops-audit'],
    queryFn: () => base44.entities.AuditIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: certChecks } = useQuery({
    queryKey: ['sec-ops-cert'],
    queryFn: () => base44.entities.CertificateIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: recoveryTests } = useQuery({
    queryKey: ['sec-ops-recovery'],
    queryFn: () => base44.entities.RecoveryTest.list('-created_date', 20),
    refetchInterval: 120000,
  });

  const { data: penetrationTests } = useQuery({
    queryKey: ['sec-ops-pentest'],
    queryFn: () => base44.entities.PenetrationTestResult.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: roleRequests } = useQuery({
    queryKey: ['sec-ops-roles'],
    queryFn: () => base44.entities.RoleChangeApproval.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const { data: assessments } = useQuery({
    queryKey: ['sec-ops-assessment'],
    queryFn: () => base44.entities.TakeoffReadinessAssessment.list('-created_date', 5),
    refetchInterval: 120000,
  });

  // ── Computed metrics ──
  const trustList = trustSnapshots || [];
  const incList = incidents || [];
  const fraudList = fraudSignals || [];
  const chainList = hashChains || [];
  const lockList = evidenceLocks || [];
  const integrityList = integrityChecks || [];
  const auditList = auditChecks || [];
  const certList = certChecks || [];
  const recoveryList = recoveryTests || [];
  const pentestList = penetrationTests || [];
  const roleList = roleRequests || [];
  const assessList = assessments || [];

  const latestTrust = trustList[0];
  const trustScore = latestTrust?.trust_score || 0;
  const trustLevel = latestTrust?.trust_level || 'MONITORED';

  const openIncidents = incList.filter(i => i.status === 'OPEN').length;
  const criticalIncidents = incList.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;

  const openFraud = fraudList.filter(f => f.status === 'OPEN').length;
  const criticalFraud = fraudList.filter(f => f.severity === 'CRITICAL' && f.status === 'OPEN').length;

  const validChains = chainList.filter(c => c.verification_status === 'VALID').length;
  const brokenChains = chainList.filter(c => ['CHAIN_BREAK', 'HASH_MISMATCH', 'MISSING_LINK'].includes(c.verification_status)).length;
  const chainHealth = chainList.length > 0 ? Math.round((validChains / chainList.length) * 100) : 0;

  const activeLocks = lockList.filter(l => l.status === 'ACTIVE').length;
  const validIntegrity = integrityList.filter(c => c.verification_status === 'VALID').length;
  const integrityPct = integrityList.length > 0 ? Math.round((validIntegrity / integrityList.length) * 100) : 0;

  const cleanAudit = auditList.filter(c => c.status === 'CLEAN').length;
  const auditPct = auditList.length > 0 ? Math.round((cleanAudit / auditList.length) * 100) : 0;

  const validCerts = certList.filter(c => c.status === 'VALID').length;
  const certPct = certList.length > 0 ? Math.round((validCerts / certList.length) * 100) : 0;

  const passedRecovery = recoveryList.filter(t => t.status === 'PASSED').length;
  const recoveryPct = recoveryList.length > 0 ? Math.round((passedRecovery / recoveryList.length) * 100) : 0;

  const passedPentest = pentestList.filter(t => t.result === 'PASSED').length;
  const failedPentest = pentestList.filter(t => t.result === 'FAILED').length;
  const pentestPct = pentestList.length > 0 ? Math.round((passedPentest / pentestList.length) * 100) : 0;

  const pendingRoles = roleList.filter(r => r.status === 'PENDING' || r.status === 'FIRST_APPROVED').length;

  const latestAssessment = assessList[0];
  const readinessScore = latestAssessment?.overall_score || 0;
  const readinessLevel = latestAssessment?.readiness_level || 'NOT_READY';

  // ── Platform security score ──
  const platformScore = Math.round(
    (trustScore * 0.15) +
    (integrityPct * 0.15) +
    (auditPct * 0.15) +
    (certPct * 0.10) +
    (chainHealth * 0.10) +
    (Math.max(0, 100 - openIncidents * 8) * 0.15) +
    (pentestPct * 0.10) +
    (recoveryPct * 0.10)
  );

  const isReady = readinessScore >= 85;
  const readinessColors = {
    NOT_READY: 'text-red-600 bg-red-50 border-red-200',
    EARLY_PILOT: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    PILOT_READY: 'text-blue-600 bg-blue-50 border-blue-200',
    TAKEOFF_READY: 'text-green-600 bg-green-50 border-green-200',
    SCALE_READY: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Security Operations Command</h1>
              <p className="text-sm text-muted-foreground mt-1">Real-time platform security posture & takeoff readiness</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestAssessment && (
            <Badge className={cn("gap-1.5 px-3 py-1.5 border", readinessColors[readinessLevel] || 'bg-muted')}>
              <Rocket className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{readinessScore}/100 — {readinessLevel.replace(/_/g, ' ')}</span>
            </Badge>
          )}
          <Badge variant="outline" className={cn("gap-1.5 px-3 py-1.5 border", platformScore >= 75 ? 'border-green-200 bg-green-50 text-green-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700')}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{platformScore}/100</span>
          </Badge>
        </div>
      </div>

      {/* Critical Risk Banner */}
      {(criticalIncidents > 0 || criticalFraud > 0 || brokenChains > 0) && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <strong>Critical Risks Active:</strong>
            {criticalIncidents > 0 && ` ${criticalIncidents} critical incidents`}
            {criticalFraud > 0 && `, ${criticalFraud} critical fraud signals`}
            {brokenChains > 0 && `, ${brokenChains} broken hash chains`}
          </div>
        </div>
      )}

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard label="Platform Score" value={platformScore.toString()} max={100} color={platformScore >= 75 ? 'text-green-600' : 'text-yellow-600'} icon={ShieldCheck} />
        <KpiCard label="Trust Score" value={trustScore.toString()} max={100} color={trustScore >= 75 ? 'text-green-600' : 'text-yellow-600'} icon={Shield} />
        <KpiCard label="Evidence Integrity" value={`${integrityPct}`} max={100} suffix="%" color={integrityPct >= 90 ? 'text-green-600' : 'text-yellow-600'} icon={Fingerprint} />
        <KpiCard label="Audit Integrity" value={`${auditPct}`} max={100} suffix="%" color={auditPct >= 90 ? 'text-green-600' : 'text-yellow-600'} icon={FileWarning} />
        <KpiCard label="Hash Chain Health" value={`${chainHealth}`} max={100} suffix="%" color={chainHealth >= 80 ? 'text-green-600' : 'text-yellow-600'} icon={Layers} />
        <KpiCard label="Recovery Readiness" value={`${recoveryPct}`} max={100} suffix="%" color={recoveryPct >= 75 ? 'text-green-600' : 'text-yellow-600'} icon={HardDrive} />
      </div>

      {/* Security Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MatrixCard label="Evidence Integrity" value={integrityPct} icon={Fingerprint} color="text-blue-600" />
        <MatrixCard label="Audit Integrity" value={auditPct} icon={FileWarning} color="text-purple-600" />
        <MatrixCard label="Certificate Health" value={certPct} icon={FileText} color="text-emerald-600" />
        <MatrixCard label="Hash Chain Health" value={chainHealth} icon={Layers} color="text-indigo-600" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="security" className="mb-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-1" /> Security ({openIncidents})</TabsTrigger>
          <TabsTrigger value="fraud"><AlertTriangle className="w-4 h-4 mr-1" /> Fraud ({openFraud})</TabsTrigger>
          <TabsTrigger value="roles"><KeyRound className="w-4 h-4 mr-1" /> Roles ({pendingRoles})</TabsTrigger>
          <TabsTrigger value="chains"><Layers className="w-4 h-4 mr-1" /> Hash Chains</TabsTrigger>
          <TabsTrigger value="recovery"><HardDrive className="w-4 h-4 mr-1" /> Recovery</TabsTrigger>
          <TabsTrigger value="pentest"><Target className="w-4 h-4 mr-1" /> Pen Tests</TabsTrigger>
          <TabsTrigger value="readiness"><Rocket className="w-4 h-4 mr-1" /> Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Active Security Incidents</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">Type</th><th className="text-left p-3">Severity</th><th className="text-left p-3">Status</th><th className="text-left p-3">Description</th><th className="text-left p-3">Opened</th></tr></thead>
                  <tbody>
                    {incList.slice(0, 40).map(inc => (
                      <tr key={inc.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-xs font-medium">{inc.incident_type?.replace(/_/g, ' ')}</td>
                        <td className="p-3"><Badge className={inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}>{inc.severity}</Badge></td>
                        <td className="p-3"><Badge variant="outline">{inc.status}</Badge></td>
                        <td className="p-3 text-xs text-muted-foreground max-w-64 truncate">{inc.description || '—'}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(inc.opened_at || inc.created_date)}</td>
                      </tr>
                    ))}
                    {incList.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No incidents</td></tr>}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Fraud Signals</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">Signal</th><th className="text-left p-3">User</th><th className="text-left p-3">Severity</th><th className="text-left p-3">Risk</th><th className="text-left p-3">Count</th><th className="text-left p-3">Detected</th></tr></thead>
                  <tbody>
                    {fraudList.slice(0, 40).map(s => (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-xs font-medium">{s.signal_type?.replace(/_/g, ' ')}</td>
                        <td className="p-3 text-xs text-muted-foreground">{s.user_email || '—'}</td>
                        <td className="p-3"><Badge className={s.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : s.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}>{s.severity}</Badge></td>
                        <td className="p-3"><span className={s.risk_score >= 70 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>{s.risk_score}/100</span></td>
                        <td className="p-3 text-xs">{s.count || 0}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(s.created_at || s.created_date)}</td>
                      </tr>
                    ))}
                    {fraudList.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No fraud signals</td></tr>}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Role Change Requests</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">User</th><th className="text-left p-3">From → To</th><th className="text-left p-3">Requested By</th><th className="text-left p-3">Status</th><th className="text-left p-3">Date</th></tr></thead>
                  <tbody>
                    {roleList.slice(0, 30).map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-xs font-medium">{r.user_email || r.user_id}</td>
                        <td className="p-3 text-xs">{r.current_role} → <span className="font-medium">{r.requested_role}</span></td>
                        <td className="p-3 text-xs text-muted-foreground">{r.requested_by}</td>
                        <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(r.requested_at || r.created_date)}</td>
                      </tr>
                    ))}
                    {roleList.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No role change requests</td></tr>}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Hash Chain Integrity</CardTitle>
                <Badge className={brokenChains === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {brokenChains === 0 ? 'All Chains Valid' : `${brokenChains} Broken`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-green-600">{validChains}</div><div className="text-xs text-muted-foreground">Valid</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-red-600">{brokenChains}</div><div className="text-xs text-muted-foreground">Broken</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold">{chainList.length}</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
              <ScrollArea className="max-h-64">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">Chain ID</th><th className="text-left p-3">Entity</th><th className="text-left p-3">Position</th><th className="text-left p-3">Status</th></tr></thead>
                  <tbody>
                    {chainList.slice(0, 20).map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-xs font-mono">{c.chain_id || c.id?.slice(0, 12)}</td>
                        <td className="p-3 text-xs">{c.entity_type}</td>
                        <td className="p-3 text-xs">{c.chain_position}</td>
                        <td className="p-3"><Badge className={c.verification_status === 'VALID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{c.verification_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Disaster Recovery Tests</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-green-600">{passedRecovery}</div><div className="text-xs text-muted-foreground">Passed</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-red-600">{recoveryList.filter(t => t.status === 'FAILED').length}</div><div className="text-xs text-muted-foreground">Failed</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold">{recoveryList.length}</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
              <ScrollArea className="max-h-64">
                {recoveryList.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border-b">
                    <div>
                      <span className="text-sm font-medium">{t.test_type?.replace(/_/g, ' ')}</span>
                      <div className="text-xs text-muted-foreground">{t.success_rate}% — {t.duration_minutes}min</div>
                    </div>
                    <Badge className={t.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{t.status}</Badge>
                  </div>
                ))}
                {recoveryList.length === 0 && <div className="p-4 text-center text-muted-foreground">No recovery tests run</div>}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pentest">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Penetration Test Results</CardTitle>
                <Badge className={failedPentest === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {failedPentest === 0 ? 'All Passed' : `${failedPentest} Failed`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-green-600">{passedPentest}</div><div className="text-xs text-muted-foreground">Passed</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold text-red-600">{failedPentest}</div><div className="text-xs text-muted-foreground">Failed</div></div>
                <div className="text-center p-3 rounded-lg bg-muted"><div className="text-2xl font-bold">{pentestList.length}</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
              <ScrollArea className="max-h-64">
                {pentestList.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border-b">
                    <div>
                      <span className="text-sm font-medium">{t.test_name?.replace(/_/g, ' ')}</span>
                      <div className="text-xs text-muted-foreground">{t.vulnerability || 'No vulnerability found'}</div>
                    </div>
                    <Badge className={t.result === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{t.result}</Badge>
                  </div>
                ))}
                {pentestList.length === 0 && <div className="p-4 text-center text-muted-foreground">No penetration tests run</div>}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Takeoff Readiness Assessment</CardTitle></CardHeader>
            <CardContent>
              {latestAssessment ? (
                <>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary">{readinessScore}</div>
                    <div className="text-lg font-medium mt-2">{readinessLevel.replace(/_/g, ' ')}</div>
                    <Progress value={readinessScore} className="mt-3 h-2" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    {[
                      { label: 'Infrastructure', val: latestAssessment.infrastructure_score },
                      { label: 'Trust', val: latestAssessment.trust_score },
                      { label: 'Security', val: latestAssessment.security_score },
                      { label: 'Evidence', val: latestAssessment.evidence_integrity_score },
                      { label: 'Community', val: latestAssessment.community_participation_score },
                      { label: 'Verification', val: latestAssessment.verification_quality_score },
                      { label: 'Surveyor', val: latestAssessment.surveyor_adoption_score },
                      { label: 'Recovery', val: latestAssessment.disaster_recovery_score },
                      { label: 'Fraud', val: latestAssessment.fraud_resilience_score },
                      { label: 'Operations', val: latestAssessment.operational_health_score },
                    ].map(m => (
                      <div key={m.label} className="p-3 rounded-lg bg-muted text-center">
                        <div className="text-lg font-bold">{m.val}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {latestAssessment.gaps && (() => { try { const gaps = JSON.parse(latestAssessment.gaps); if (gaps.length > 0) return <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200"><strong className="text-sm text-yellow-800">Gaps Identified ({gaps.length}):</strong><ul className="mt-2 space-y-1">{gaps.map((g, i) => <li key={i} className="text-xs text-yellow-700">{g.area}: {g.detail} — <span className="font-medium">{g.recommendation}</span></li>)}</ul></div>; } catch { return null; } })()}
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Rocket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No takeoff readiness assessment generated yet</p>
                  <p className="text-xs mt-1">Run lvTakeoffReadiness to generate an assessment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Evidence Locks Section */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-sm font-medium">Evidence Locks Active</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-3">
            <div className="text-3xl font-bold text-primary">{activeLocks}</div>
            <div className="text-sm text-muted-foreground">active evidence locks (v{lockList.filter(l => l.status === 'ACTIVE').reduce((max, l) => Math.max(max, l.version_number || 1), 0)} max version)</div>
            <div className="text-xs text-muted-foreground mt-2">Locked evidence cannot be directly edited — corrections require new versions</div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted border text-xs text-muted-foreground">
        <strong className="text-foreground">Security Operations Notice:</strong> All metrics derived from live platform data. Incident counts and fraud signals auto-update every 30 seconds. Recovery and penetration tests must be explicitly triggered. Takeoff readiness assessments are generated by the lvTakeoffReadiness function. Evidence locks, hash chains, and certificate integrity checks run continuously through the JobQueue background processing engine.
      </div>
    </div>
  );
}

function KpiCard({ label, value, max, suffix = '', color, icon: Icon }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div className={cn("text-2xl font-bold", color)}>{value}{suffix}</div>
        <Progress value={parseInt(value)} className="mt-2 h-1.5" />
      </CardContent>
    </Card>
  );
}

function MatrixCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Icon className={cn("w-5 h-5", color)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}%</div>
        <Progress value={value} className="mt-2 h-2" />
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}