import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, ShieldAlert, ShieldOff, Shield,
  Rocket, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Activity, Zap, TrendingUp, TrendingDown,
  Target, Fingerprint, FileWarning, Key, FileText, Layers,
  Database, HardDrive, Server, Wrench, Users,
  ArrowUpRight, ArrowDownRight, Award, Gavel,
  Loader2, Play, History, ScanLine,
} from "lucide-react";

export default function TrustValidationCenter() {
  const queryClient = useQueryClient();

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['trust-runs'],
    queryFn: () => base44.entities.TrustValidationRun.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const { data: incidents } = useQuery({
    queryKey: ['tv-incidents'],
    queryFn: () => base44.entities.SecurityIncident.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const { data: assessments } = useQuery({
    queryKey: ['tv-assessment'],
    queryFn: () => base44.entities.TakeoffReadinessAssessment.list('-created_date', 3),
    refetchInterval: 60000,
  });

  const { data: fraudSignals } = useQuery({
    queryKey: ['tv-fraud'],
    queryFn: () => base44.entities.FraudSignal.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['tv-jobs'],
    queryFn: () => base44.entities.JobQueue.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const [runningValidation, setRunningValidation] = useState(false);

  const runValidation = useMutation({
    mutationFn: () => base44.functions.invoke('lvTrustValidationEngine', { validation_type: 'FULL_PLATFORM', generated_by: 'manual_command_center' }),
    onMutate: () => setRunningValidation(true),
    onSettled: () => {
      setRunningValidation(false);
      queryClient.invalidateQueries({ queryKey: ['trust-runs'] });
      queryClient.invalidateQueries({ queryKey: ['tv-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['tv-assessment'] });
    },
  });

  const runCertification = useMutation({
    mutationFn: () => base44.functions.invoke('lvPilotReadinessCertification', {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tv-assessment'] }),
  });

  const runRecoveryTests = useMutation({
    mutationFn: () => base44.functions.invoke('lvRecoveryTest', { test_type: 'DATABASE_RECOVERY', executed_by: 'command_center' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tv-assessment'] }),
  });

  const runList = runs || [];
  const incList = incidents || [];
  const assessList = assessments || [];
  const fraudList = fraudSignals || [];
  const jobList = jobs || [];

  const latestRun = runList[0];
  const latestAssessment = assessList[0];

  const overallScore = latestRun?.overall_score || 0;
  const trustGrade = latestRun?.trust_grade || 'D';
  const riskLevel = latestRun?.risk_level || 'HIGH';
  const pilotRec = latestRun?.pilot_recommendation || 'NOT_READY';

  const openIncidents = incList.filter(i => i.status === 'OPEN').length;
  const openFraud = fraudList.filter(f => f.status === 'OPEN').length;
  const pendingJobs = jobList.filter(j => j.status === 'pending' || j.status === 'queued').length;
  const failedJobs = jobList.filter(j => j.status === 'failed').length;

  const isGO = ['GO', 'GO_WITH_MONITORING'].includes(pilotRec);

  const gradeColors = {
    A_PLUS: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    A: 'text-green-600 bg-green-50 border-green-200',
    B: 'text-blue-600 bg-blue-50 border-blue-200',
    C: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    D: 'text-orange-600 bg-orange-50 border-orange-200',
    FAIL: 'text-red-600 bg-red-50 border-red-200',
  };

  const riskColors = {
    LOW: 'text-green-600 bg-green-50',
    MODERATE: 'text-blue-600 bg-blue-50',
    HIGH: 'text-yellow-600 bg-yellow-50',
    CRITICAL: 'text-red-600 bg-red-50',
  };

  // Parse subscores from latest run
  let subscoreData = {};
  if (latestRun?.subscores) {
    try { subscoreData = JSON.parse(latestRun.subscores); } catch {}
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Trust Validation Command Center</h1>
              <p className="text-sm text-muted-foreground mt-1">Continuous trust proving & operational certification</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => runValidation.mutate()}
            disabled={runningValidation}
            size="sm"
            className="gap-1.5"
          >
            {runningValidation ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {runningValidation ? 'Validating...' : 'Run Full Validation'}
          </Button>
          <Button onClick={() => runCertification.mutate()} variant="outline" size="sm" className="gap-1.5">
            <Award className="w-4 h-4" /> Certify Readiness
          </Button>
          <Button onClick={() => runRecoveryTests.mutate()} variant="outline" size="sm" className="gap-1.5">
            <HardDrive className="w-4 h-4" /> Test Recovery
          </Button>
        </div>
      </div>

      {/* GO / NO-GO Banner */}
      <div className={cn(
        "flex items-center gap-4 p-5 rounded-xl border mb-8",
        isGO ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
      )}>
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center",
          isGO ? 'bg-emerald-500' : 'bg-red-500'
        )}>
          {isGO ? <ShieldCheck className="w-7 h-7 text-white" /> : <ShieldOff className="w-7 h-7 text-white" />}
        </div>
        <div>
          <div className={cn("text-xl font-bold", isGO ? 'text-emerald-700' : 'text-red-700')}>
            {isGO ? 'PILOT GO' : 'PILOT NO-GO'}
          </div>
          <div className="text-sm text-muted-foreground">
            Recommendation: <span className="font-semibold">{pilotRec.replace(/_/g, ' ')}</span>
            {latestRun && ` — based on validation run ${latestRun.validation_id || latestRun.id?.slice(0, 12)}`}
          </div>
        </div>
        {isGO && (
          <div className="ml-auto">
            <Badge className={cn("text-sm px-3 py-1.5 border", gradeColors[trustGrade] || '')}>
              {trustGrade.replace(/_PLUS/, '+')}
            </Badge>
          </div>
        )}
      </div>

      {/* Executive Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <ExecCard label="Operational Trust" value={overallScore} max={100} color={overallScore >= 80 ? 'text-emerald-600' : overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'} icon={ShieldCheck} />
        <ExecCard label="Trust Grade" value={trustGrade.replace(/_PLUS/, '+').replace(/_/, ' ')} raw color={trustGrade.startsWith('A') ? 'text-emerald-600' : 'text-red-600'} icon={Award} />
        <ExecCard label="Risk Level" value={riskLevel} raw color={riskLevel === 'LOW' ? 'text-emerald-600' : 'text-red-600'} icon={AlertTriangle} />
        <ExecCard label="Incidents" value={openIncidents.toString()} color={openIncidents === 0 ? 'text-emerald-600' : 'text-red-600'} icon={ShieldAlert} />
        <ExecCard label="Fraud Alerts" value={openFraud.toString()} color={openFraud === 0 ? 'text-emerald-600' : 'text-red-600'} icon={AlertTriangle} />
        <ExecCard label="Job Health" value={jobList.length > 0 ? `${Math.round((jobList.filter(j => j.status === 'completed').length / jobList.length) * 100)}` : '0'} suffix="%" color={failedJobs === 0 ? 'text-emerald-600' : 'text-yellow-600'} icon={Wrench} />
      </div>

      {/* Validation Engine Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(subscoreData).map(([name, data]) => {
          const score = typeof data === 'object' ? (data.score || 0) : (data || 0);
          const label = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
          return (
            <Card key={name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground capitalize">{label}</span>
                </div>
                <div className={cn("text-2xl font-bold", scoreColor)}>{score}/100</div>
                <Progress value={score} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          );
        })}
        {Object.keys(subscoreData).length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <ScanLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No validation run data yet</p>
              <p className="text-xs mt-1">Click "Run Full Validation" to generate the first trust validation</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Validation Runs History */}
      <Tabs defaultValue="history">
        <TabsList className="flex-wrap">
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History ({runList.length})</TabsTrigger>
          <TabsTrigger value="readiness"><Rocket className="w-4 h-4 mr-1" /> Readiness</TabsTrigger>
          <TabsTrigger value="incidents"><ShieldAlert className="w-4 h-4 mr-1" /> Incidents ({openIncidents})</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Validation Run History</CardTitle>
              <Badge variant="outline">{runList.length} runs</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">Validation</th><th className="text-left p-3">Type</th><th className="text-left p-3">Score</th><th className="text-left p-3">Grade</th><th className="text-left p-3">Risk</th><th className="text-left p-3">Recommendation</th><th className="text-left p-3">Time</th><th className="text-left p-3">Duration</th></tr></thead>
                  <tbody>
                    {runList.slice(0, 30).map(run => (
                      <tr key={run.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-xs font-mono">{run.validation_id || run.id?.slice(0, 12)}</td>
                        <td className="p-3 text-xs"><Badge variant="outline" className="text-[10px]">{run.validation_type?.replace(/_/g, ' ')}</Badge></td>
                        <td className="p-3">
                          <span className={cn("font-bold text-sm", run.overall_score >= 80 ? 'text-emerald-600' : run.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                            {run.overall_score}/100
                          </span>
                        </td>
                        <td className="p-3"><Badge className={cn("text-xs", gradeColors[run.trust_grade] || '')}>{run.trust_grade?.replace(/_PLUS/, '+') || '—'}</Badge></td>
                        <td className="p-3"><Badge className={cn("text-xs", riskColors[run.risk_level] || '')}>{run.risk_level}</Badge></td>
                        <td className="p-3">
                          <Badge className={run.pilot_recommendation && isGORec(run.pilot_recommendation) ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                            {run.pilot_recommendation?.replace(/_/g, ' ') || '—'}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{fmtDate(run.completed_at || run.created_date)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{run.duration_seconds}s</td>
                      </tr>
                    ))}
                    {runList.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No validation runs yet — click "Run Full Validation" to start</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness">
          {latestAssessment ? (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Takeoff Readiness Certification</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary">{latestAssessment.overall_score}</div>
                    <div className="text-lg font-medium mt-2">{latestAssessment.readiness_level?.replace(/_/g, ' ')}</div>
                    <Progress value={latestAssessment.overall_score} className="mt-3 h-2" />
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
                  {latestAssessment.gaps && (() => { try { const gaps = JSON.parse(latestAssessment.gaps); if (gaps.length > 0) return <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200"><strong className="text-sm text-yellow-800">Gaps:</strong><ul className="mt-2 space-y-1">{gaps.map((g, i) => <li key={i} className="text-xs text-yellow-700">{g.area}: {g.detail}</li>)}</ul></div>; } catch { return null; } })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No readiness assessment generated yet</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Security Incidents</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left p-3">Type</th><th className="text-left p-3">Severity</th><th className="text-left p-3">Status</th><th className="text-left p-3">Detected By</th><th className="text-left p-3">Description</th></tr></thead>
                  <tbody>
                    {incList.slice(0, 30).map(inc => (
                      <tr key={inc.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-xs font-medium">{inc.incident_type?.replace(/_/g, ' ')}</td>
                        <td className="p-3"><Badge className={inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}>{inc.severity}</Badge></td>
                        <td className="p-3"><Badge variant="outline">{inc.status}</Badge></td>
                        <td className="p-3 text-xs text-muted-foreground">{inc.detected_by?.replace('lv', '')}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-64 truncate">{inc.description || '—'}</td>
                      </tr>
                    ))}
                    {incList.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No security incidents</td></tr>}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Immutability Notice */}
      <div className="mt-8 p-4 rounded-lg bg-muted border text-xs text-muted-foreground">
        <strong className="text-foreground">Trust Validation Records:</strong> All validation runs are immutable, permanent audit evidence. They cannot be modified or deleted. This command center reflects live operational trust data from the continuous self-validation framework. Validation reports are generated by lvTrustValidationEngine every 12 hours automatically, or on-demand.
      </div>
    </div>
  );
}

function ExecCard({ label, value, max, suffix = '', raw, color, icon: Icon }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div className={cn("text-2xl font-bold", color)}>
          {raw ? value : `${value}${suffix}`}
        </div>
        {!raw && max && <Progress value={parseInt(value)} className="mt-2 h-1.5" />}
      </CardContent>
    </Card>
  );
}

function isGORec(rec) { return ['GO', 'GO_WITH_MONITORING'].includes(rec); }

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}