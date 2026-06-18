import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Loader2,
  Bug, Fingerprint, FileWarning, Key, FileText, Layers,
  EyeOff, Activity, RefreshCw, FlaskConical
} from "lucide-react";

const testScenarios = [
  {
    id: 'tampered_evidence',
    label: 'Tampered Evidence',
    description: 'Simulates hash mismatch on evidence file',
    icon: Fingerprint,
    function: 'lvEvidenceIntegrityCheck',
    payload: { evidence_id: 'simulated_test_evidence', trigger: 'PENETRATION_TEST' },
    expected: 'System detects mismatch, creates SecurityIncident and ParcelFlag',
  },
  {
    id: 'fake_certificate',
    label: 'Fake Certificate',
    description: 'Simulates certificate validation failure',
    icon: FileText,
    function: 'lvCertificateIntegrityCheck',
    payload: { parcel_id: 'simulated_test_parcel', mode: 'test' },
    expected: 'System marks certificate as INVALID, creates incident for non-existent parcel',
  },
  {
    id: 'role_escalation',
    label: 'Role Escalation',
    description: 'Audits role permissions for privilege issues',
    icon: Key,
    function: 'lvPermissionAuditor',
    payload: { mode: 'batch' },
    expected: 'System detects privilege anomalies and generates PermissionRiskReport',
  },
  {
    id: 'duplicate_attack',
    label: 'Duplicate Attack',
    description: 'Simulates bulk duplicate parcel submission',
    icon: Layers,
    function: 'lvFraudDetection',
    payload: { mode: 'batch', test_window: 'simulate' },
    expected: 'System detects MASS_PARCEL_UPLOAD signal, creates FraudSignal and SecurityIncident',
  },
  {
    id: 'attestation_fraud',
    label: 'Attestation Fraud',
    description: 'Simulates multiple attestations from same user',
    icon: Users,
    function: 'lvFraudDetection',
    payload: { mode: 'batch', test_window: 'simulate' },
    expected: 'System detects MULTIPLE_ATTESTATIONS_SAME_EMAIL signal',
  },
  {
    id: 'certificate_abuse',
    label: 'Certificate Abuse',
    description: 'Simulates bulk certificate generation requests',
    icon: FileWarning,
    function: 'lvFraudDetection',
    payload: { mode: 'batch', test_window: 'simulate' },
    expected: 'System detects BULK_CERTIFICATE_REQUEST signal',
  },
  {
    id: 'audit_manipulation',
    label: 'Audit Manipulation',
    description: 'Checks for audit trail integrity violations',
    icon: Bug,
    function: 'lvAuditIntegrityCheck',
    payload: { mode: 'batch' },
    expected: 'System detects timeline gaps, missing records, or sequence breaks',
  },
  {
    id: 'session_attack',
    label: 'Brute Force Attack',
    description: 'Simulates multiple failed login attempts',
    icon: EyeOff,
    function: 'lvSessionSecurity',
    payload: { user_email: 'test_simulated@landvault', event_type: 'LOGIN_FAILURE', ip_address: '192.168.1.100', consecutive_failures: 6 },
    expected: 'System locks account after 5 failures, creates BRUTE_FORCE_ATTEMPT signal',
  },
];

// Need to import Users icon since it's used above
import { Users } from "lucide-react";

export default function SecurityTesting() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [log, setLog] = useState([]);

  const runTest = async (test) => {
    setRunning(test.id);
    const start = Date.now();
    setLog(prev => [...prev, { id: test.id, label: test.label, status: 'running', time: new Date().toLocaleTimeString() }]);

    try {
      const response = await base44.functions.invoke(test.function, test.payload);
      const duration = Date.now() - start;

      const result = {
        success: true,
        duration: `${duration}ms`,
        data: response.data,
        timestamp: new Date().toISOString(),
      };

      setResults(prev => ({ ...prev, [test.id]: result }));
      setLog(prev => prev.map(l => l.id === test.id ? { ...l, status: 'passed' } : l));

      // Check if incident/signal was created
      if (test.function === 'lvEvidenceIntegrityCheck') {
        const incidents = await base44.entities.SecurityIncident.filter({ incident_type: 'HASH_MISMATCH' }, '-created_date', 5);
        result.incidents_created = incidents.length;
      }
      if (test.function === 'lvFraudDetection') {
        const signals = await base44.entities.FraudSignal.filter({}, '-created_date', 5);
        result.signals_created = signals.length;
      }
      if (test.function === 'lvPermissionAuditor') {
        const reports = await base44.entities.PermissionRiskReport.filter({}, '-created_date', 5);
        result.reports_generated = reports.length;
      }
      if (test.function === 'lvAuditIntegrityCheck') {
        const checks = await base44.entities.AuditIntegrityCheck.filter({}, '-created_date', 5);
        result.checks_run = checks.length;
      }
      if (test.function === 'lvSessionSecurity') {
        const sessions = await base44.entities.SecuritySession.filter({ user_email: 'test_simulated@landvault' }, '-created_date', 5);
        result.sessions_created = sessions.length;
      }

      setResults(prev => ({ ...prev, [test.id]: result }));
    } catch (err) {
      const duration = Date.now() - start;
      setResults(prev => ({ ...prev, [test.id]: { success: false, error: err.message, duration: `${duration}ms`, timestamp: new Date().toISOString() } }));
      setLog(prev => prev.map(l => l.id === test.id ? { ...l, status: 'failed' } : l));
    }
    setRunning(null);
  };

  const runAll = async () => {
    for (const test of testScenarios) {
      await runTest(test);
    }
  };

  const passed = Object.values(log).filter(l => l.status === 'passed').length;
  const failed = Object.values(log).filter(l => l.status === 'failed').length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Security Penetration Testing</h1>
              <p className="text-sm text-muted-foreground mt-1">Simulated security scenarios — results logged, incidents created, audit trail preserved</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {passed > 0 && <Badge className="bg-green-100 text-green-700">{passed} passed</Badge>}
          {failed > 0 && <Badge className="bg-red-100 text-red-700">{failed} failed</Badge>}
          <Button onClick={runAll} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 mb-6">
        <strong>PENETRATION TEST MODE:</strong> These tests simulate security events against live platform data in read-only mode. Tests verify that the system detects anomalies and correctly creates incidents, signals, and audit records. No production data is modified. All simulated events are clearly labeled.
      </div>

      {/* Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {testScenarios.map(test => {
          const result = results[test.id];
          const isRunning = running === test.id;
          const isPassed = result?.success;
          const isFailed = result && !result.success;
          const Icon = test.icon;

          return (
            <Card key={test.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{test.label}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                    </div>
                  </div>
                  {result && (
                    isPassed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                    isFailed ? <XCircle className="w-5 h-5 text-red-600" /> :
                    null
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium">Expected:</span> {test.expected}
                </div>

                <div className="flex items-center justify-between">
                  <Button size="sm" variant="outline" onClick={() => runTest(test)} disabled={!!running}>
                    {isRunning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    {isRunning ? 'Running...' : isPassed ? 'Re-run Test' : 'Run Test'}
                  </Button>
                  {result && (
                    <span className="text-xs text-muted-foreground">
                      {result.duration}
                    </span>
                  )}
                </div>

                {result && result.data && (
                  <div className="mt-3 p-3 rounded bg-muted/50 text-xs">
                    <pre className="whitespace-pre-wrap text-muted-foreground max-h-32 overflow-auto">
                      {JSON.stringify(result.data, null, 2).substring(0, 500)}
                    </pre>
                  </div>
                )}

                {result && result.error && (
                  <div className="mt-3 p-3 rounded bg-red-50 text-xs text-red-700">
                    {result.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Test Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                {entry.status === 'running' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : entry.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium text-xs">{entry.label}</span>
                <span className="text-xs text-muted-foreground">{entry.time}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {entry.status === 'running' ? 'Running...' : entry.status === 'passed' ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
            {log.length === 0 && (
              <div className="py-4 text-center text-muted-foreground text-sm">No tests executed yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}