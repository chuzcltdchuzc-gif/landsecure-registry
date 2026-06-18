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
  RefreshCw, Activity, Lock, Users, FileText, Fingerprint,
  TrendingUp, TrendingDown, BarChart3, Layers, Server,
  ShieldAlert, ShieldCheck, ShieldOff, Eye, EyeOff,
  Loader2, ScanLine, Key, Hash, Bug, FileWarning,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Config ──
const severityConfig = {
  CRITICAL: { color: "bg-red-600", text: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Critical" },
  HIGH: { color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "High" },
  MEDIUM: { color: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", label: "Medium" },
  LOW: { color: "bg-green-500", text: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Low" },
};

const incidentTypeIcons = {
  HASH_MISMATCH: Fingerprint,
  AUDIT_TAMPERING: FileWarning,
  ROLE_ESCALATION: Key,
  UNAUTHORIZED_ACCESS: EyeOff,
  CERTIFICATE_FRAUD: FileText,
  DUPLICATE_ABUSE: Layers,
  DATA_CORRUPTION: Bug,
  SUSPICIOUS_ACTIVITY: AlertTriangle,
  BULK_MANIPULATION: Layers,
};

export default function SecurityDashboard() {
  const { data: incidents, isLoading: incLoading } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: () => base44.entities.SecurityIncident.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: fraudSignals, isLoading: fraudLoading } = useQuery({
    queryKey: ['security-fraud'],
    queryFn: () => base44.entities.FraudSignal.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: integrityChecks } = useQuery({
    queryKey: ['security-integrity'],
    queryFn: () => base44.entities.EvidenceIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: auditChecks } = useQuery({
    queryKey: ['security-audit-checks'],
    queryFn: () => base44.entities.AuditIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: certChecks } = useQuery({
    queryKey: ['security-cert-checks'],
    queryFn: () => base44.entities.CertificateIntegrityCheck.list('-created_date', 50),
    refetchInterval: 60000,
  });

  const { data: trustSnapshots } = useQuery({
    queryKey: ['security-trust'],
    queryFn: () => base44.entities.TrustScoreSnapshot.list('-created_date', 20),
    refetchInterval: 120000,
  });

  const { data: sessions } = useQuery({
    queryKey: ['security-sessions'],
    queryFn: () => base44.entities.SecuritySession.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const isLoading = incLoading || fraudLoading;

  // ── Computed Metrics ──
  const incList = incidents || [];
  const fraudList = fraudSignals || [];
  const integrityList = integrityChecks || [];
  const auditList = auditChecks || [];
  const certList = certChecks || [];
  const trustList = trustSnapshots || [];
  const sessionList = sessions || [];

  const openIncidents = incList.filter(i => i.status === 'OPEN').length;
  const criticalIncidents = incList.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
  const investigatingIncidents = incList.filter(i => i.status === 'INVESTIGATING').length;
  const resolvedIncidents = incList.filter(i => i.status === 'RESOLVED').length;

  const openFraudSignals = fraudList.filter(f => f.status === 'OPEN').length;
  const criticalFraud = fraudList.filter(f => f.severity === 'CRITICAL' && f.status === 'OPEN').length;

  const hashMismatches = integrityList.filter(c => c.verification_status === 'INVALID' || c.verification_status === 'MODIFIED').length;
  const validChecks = integrityList.filter(c => c.verification_status === 'VALID').length;

  const auditIssues = auditList.filter(c => c.status === 'ISSUE_DETECTED').length;
  const failedLogins = sessionList.filter(s => s.event_type === 'LOGIN_FAILURE').length;
  const lockedAccounts = sessionList.filter(s => s.account_locked).length;

  const latestTrust = trustList[0];
  const trustScore = latestTrust?.trust_score || 0;
  const trustLevel = latestTrust?.trust_level || 'MONITORED';

  // ── Security Score ──
  const securityScore = Math.round(
    (trustScore * 0.3) +
    (Math.max(0, 100 - openIncidents * 5 - criticalIncidents * 15) * 0.2) +
    (Math.max(0, 100 - openFraudSignals * 3 - criticalFraud * 10) * 0.2) +
    (Math.max(0, 100 - hashMismatches * 10 - auditIssues * 8) * 0.15) +
    (Math.max(0, 100 - failedLogins * 2 - lockedAccounts * 5) * 0.15)
  );
  const cappedSecurityScore = Math.max(0, Math.min(100, securityScore));

  const securityLevel = cappedSecurityScore >= 85 ? 'OPTIMAL' : cappedSecurityScore >= 65 ? 'GOOD' : cappedSecurityScore >= 40 ? 'NEEDS ATTENTION' : 'CRITICAL';
  const securityLevelColor = securityLevel === 'OPTIMAL' ? 'text-green-600' : securityLevel === 'GOOD' ? 'text-blue-600' : securityLevel === 'NEEDS ATTENTION' ? 'text-yellow-600' : 'text-red-600';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Security Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Security Command Center</h1>
              <p className="text-sm text-muted-foreground mt-1">Platform-wide security, integrity & trust monitoring</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`gap-1.5 px-3 py-1.5 ${cappedSecurityScore >= 65 ? 'border-green-200 bg-green-50 text-green-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`}>
            <Shield className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Score: {cappedSecurityScore}/100</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <OverviewCard label="Security Score" value={`${cappedSecurityScore}`} subtitle={securityLevel} icon={ShieldCheck} color={securityLevelColor} />
        <OverviewCard label="Trust Score" value={`${trustScore}`} subtitle={trustLevel} icon={Shield} color={trustScore >= 75 ? 'text-green-600' : 'text-yellow-600'} />
        <OverviewCard label="Open Incidents" value={openIncidents.toString()} subtitle={`${criticalIncidents} critical`} icon={AlertTriangle} color={openIncidents > 0 ? 'text-red-600' : 'text-green-600'} />
        <OverviewCard label="Fraud Signals" value={openFraudSignals.toString()} subtitle={`${criticalFraud} critical`} icon={EyeOff} color={openFraudSignals > 0 ? 'text-red-600' : 'text-green-600'} />
        <OverviewCard label="Hash Status" value={hashMismatches === 0 ? 'Clean' : `${hashMismatches} issues`} subtitle={`${validChecks} valid`} icon={Hash} color={hashMismatches > 0 ? 'text-red-600' : 'text-green-600'} />
        <OverviewCard label="Active Sessions" value={sessionList.filter(s => s.is_active).length.toString()} subtitle={`${failedLogins} failed`} icon={Activity} color="text-blue-600" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Failed Login Attempts</div>
          <div className="text-2xl font-bold">{failedLogins}</div>
          <div className="text-xs text-muted-foreground mt-1">{lockedAccounts} accounts locked</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Evidence Integrity</div>
          <div className="text-2xl font-bold text-green-600">{validChecks} valid</div>
          <div className="text-xs text-muted-foreground mt-1">{hashMismatches} mismatches</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Audit Trail Health</div>
          <div className="text-2xl font-bold text-green-600">{auditList.length - auditIssues} clean</div>
          <div className="text-xs text-muted-foreground mt-1">{auditIssues} issues</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Certificate Health</div>
          <div className="text-2xl font-bold text-green-600">{certList.filter(c => c.status === 'VALID').length} valid</div>
          <div className="text-xs text-muted-foreground mt-1">{certList.filter(c => c.status !== 'VALID').length} issues</div>
        </div>
      </div>

      {/* Tabs: Incidents | Fraud | Sessions | Activity Feed */}
      <Tabs defaultValue="incidents" className="mb-8">
        <TabsList>
          <TabsTrigger value="incidents">
            <AlertTriangle className="w-4 h-4 mr-1" /> Incidents ({openIncidents})
          </TabsTrigger>
          <TabsTrigger value="fraud">
            <Bug className="w-4 h-4 mr-1" /> Fraud Signals ({openFraudSignals})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Activity className="w-4 h-4 mr-1" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="feed">
            <Clock className="w-4 h-4 mr-1" /> Activity Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Severity</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incList.slice(0, 30).map(inc => {
                      const Icon = incidentTypeIcons[inc.incident_type] || AlertTriangle;
                      const sev = severityConfig[inc.severity] || severityConfig.MEDIUM;
                      return (
                        <tr key={inc.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-xs">{inc.incident_type?.replace(/_/g, ' ')}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={cn(sev.bg, sev.text, sev.border, "border")}>{sev.label}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{inc.status}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs max-w-64 truncate">{inc.description || '—'}</td>
                          <td className="p-3 text-muted-foreground text-xs">{formatDate(inc.opened_at || inc.created_date)}</td>
                        </tr>
                      );
                    })}
                    {incList.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No security incidents recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fraud Signals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-3 font-medium">Signal Type</th>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Severity</th>
                      <th className="text-left p-3 font-medium">Risk Score</th>
                      <th className="text-left p-3 font-medium">Count</th>
                      <th className="text-left p-3 font-medium">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraudList.slice(0, 30).map(signal => {
                      const sev = severityConfig[signal.severity] || severityConfig.MEDIUM;
                      return (
                        <tr key={signal.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium text-xs">{signal.signal_type?.replace(/_/g, ' ')}</td>
                          <td className="p-3 text-muted-foreground text-xs">{signal.user_email || '—'}</td>
                          <td className="p-3">
                            <Badge className={cn(sev.bg, sev.text, sev.border, "border")}>{sev.label}</Badge>
                          </td>
                          <td className="p-3">
                            <span className={cn("font-medium", signal.risk_score >= 70 ? 'text-red-600' : signal.risk_score >= 40 ? 'text-orange-600' : 'text-green-600')}>
                              {signal.risk_score}/100
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{signal.count || 0}</td>
                          <td className="p-3 text-muted-foreground text-xs">{formatDate(signal.created_at || signal.created_date)}</td>
                        </tr>
                      );
                    })}
                    {fraudList.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No fraud signals detected</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Session Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Event</th>
                      <th className="text-left p-3 font-medium">Location</th>
                      <th className="text-left p-3 font-medium">Failures</th>
                      <th className="text-left p-3 font-medium">Locked</th>
                      <th className="text-left p-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionList.slice(0, 30).map(s => (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium text-xs">{s.user_email}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={s.event_type === 'LOGIN_FAILURE' ? 'text-red-600' : 'text-green-600'}>
                            {s.event_type?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{s.location || s.ip_address || '—'}</td>
                        <td className="p-3 text-muted-foreground">{s.consecutive_failures || 0}</td>
                        <td className="p-3">{s.account_locked ? <Badge className="bg-red-100 text-red-700">Locked</Badge> : '—'}</td>
                        <td className="p-3 text-muted-foreground text-xs">{formatDate(s.created_date)}</td>
                      </tr>
                    ))}
                    {sessionList.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No session data recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Live Security Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <div className="divide-y">
                  {[...incList, ...fraudList.map(f => ({ ...f, _type: 'fraud', _ts: f.created_at || f.created_date })), ...sessionList.filter(s => s.event_type === 'LOGIN_FAILURE' || s.account_locked).map(s => ({ ...s, _type: 'session', _ts: s.created_date }))]
                    .sort((a, b) => new Date(b._ts || b.created_date || 0) - new Date(a._ts || a.created_date || 0))
                    .slice(0, 50)
                    .map((item, idx) => {
                      const isIncident = item.incident_type && !item._type;
                      const isFraud = item._type === 'fraud';
                      const isSession = item._type === 'session';
                      const Icon = isIncident ? (incidentTypeIcons[item.incident_type] || AlertTriangle) : isFraud ? Bug : Activity;
                      const sev = severityConfig[item.severity] || severityConfig.MEDIUM;
                      return (
                        <div key={item.id || idx} className="flex items-start gap-3 p-3 hover:bg-muted/50">
                          <Icon className={cn("w-4 h-4 mt-0.5", sev.text)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{isIncident ? 'Security Incident' : isFraud ? 'Fraud Signal' : 'Session Event'}</span>
                              <Badge className={cn(sev.bg, sev.text, sev.border, "border text-[10px]")}>{sev.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {item.description || item.signal_type || item.event_type || 'No description'}
                              {item.user_email ? ` — ${item.user_email}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(item._ts || item.created_date)}</span>
                        </div>
                      );
                    })}
                  {incList.length === 0 && fraudList.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">No security activity recorded</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trust Trend */}
      {trustList.length >= 2 && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Trust Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {trustList.slice(0, 12).reverse().map((snap, i) => {
                const height = Math.max(4, snap.trust_score);
                const color = snap.trust_score >= 90 ? 'bg-green-500' : snap.trust_score >= 75 ? 'bg-blue-500' : snap.trust_score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={snap.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{snap.trust_score}</span>
                    <div className={cn("w-full rounded-t", color)} style={{ height: `${height}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>Oldest</span>
              <span>{trustList.length} snapshots</span>
              <span>Latest</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted border text-xs text-muted-foreground">
        <strong className="text-foreground">Security Infrastructure Notice:</strong> All security checks run through the JobQueue background processing engine and execute every 6 hours. Evidence integrity is verified via SHA-256 hash comparison. Trust scores are computed from live platform data. Incidents and fraud signals generate automatic audit records. This dashboard is accessible only to admin roles.
      </div>
    </div>
  );
}

function OverviewCard({ label, value, subtitle, icon: Icon, color }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
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
    const diffHrs = Math.floor(diffMin / 60);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}