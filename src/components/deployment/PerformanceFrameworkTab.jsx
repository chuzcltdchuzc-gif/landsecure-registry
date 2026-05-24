import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, AlertTriangle, Clock, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";

const BENCHMARKS = [
  { category: "Search Performance", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", tests: [
    { id: "PERF-S1", label: "Parcel list load (2000 records)", entity: "LandParcel", op: () => base44.entities.LandParcel.list("-created_date", 2000), threshold: 3000, unit: "ms" },
    { id: "PERF-S2", label: "Audit log retrieval (2000 entries)", entity: "AuditLog", op: () => base44.entities.AuditLog.list("-created_date", 2000), threshold: 3000, unit: "ms" },
    { id: "PERF-S3", label: "Field reports load (1000 records)", entity: "FieldReport", op: () => base44.entities.FieldReport.list("-created_date", 1000), threshold: 3000, unit: "ms" },
    { id: "PERF-S4", label: "Survey documents load", entity: "SurveyDocument", op: () => base44.entities.SurveyDocument.list("-created_date", 500), threshold: 2000, unit: "ms" },
    { id: "PERF-S5", label: "Inheritance cases load", entity: "InheritanceCase", op: () => base44.entities.InheritanceCase.list("-created_date", 500), threshold: 2000, unit: "ms" },
  ]},
  { category: "GIS Rendering Performance", color: "text-teal-700", bg: "bg-teal-50 border-teal-200", tests: [
    { id: "PERF-G1", label: "Parcel boundary data load (GFL)", entity: "LandParcel (boundary fields)", op: () => base44.entities.LandParcel.list("-created_date", 2000), threshold: 3000, unit: "ms", note: "Time to retrieve all boundary polygon data" },
    { id: "PERF-G2", label: "Parcels with spatial validation status", entity: "LandParcel (spatial)", op: () => base44.entities.LandParcel.filter({ lga: "Greenfield Local Government" }, "-created_date", 500), threshold: 2000, unit: "ms" },
    { id: "PERF-G3", label: "Field reports with GPS coordinates", entity: "FieldReport (GPS)", op: () => base44.entities.FieldReport.list("-created_date", 1000), threshold: 2000, unit: "ms" },
  ]},
  { category: "Workflow Processing Performance", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", tests: [
    { id: "PERF-W1", label: "Family + beneficiaries + cases (parallel)", entity: "Multi-entity", op: () => Promise.all([base44.entities.FamilyOwnership.list("-created_date", 500), base44.entities.FamilyBeneficiary.list("-created_date", 500), base44.entities.InheritanceCase.list("-created_date", 500)]), threshold: 4000, unit: "ms" },
    { id: "PERF-W2", label: "Community validations + trad. authority", entity: "Multi-entity", op: () => Promise.all([base44.entities.CommunityValidation.list("-created_date", 500), base44.entities.TraditionalAuthorityValidation.list("-created_date", 500)]), threshold: 3000, unit: "ms" },
    { id: "PERF-W3", label: "Disputes + fraud alerts load", entity: "Dispute + FraudAlert", op: () => Promise.all([base44.entities.Dispute.list("-created_date", 500), base44.entities.FraudAlert.list("-created_date", 500)]), threshold: 2500, unit: "ms" },
    { id: "PERF-W4", label: "Plot allocations + witnesses", entity: "PlotAllocation + Witness", op: () => Promise.all([base44.entities.PlotAllocation.list("-created_date", 500), base44.entities.InheritanceWitness.list("-created_date", 500)]), threshold: 2500, unit: "ms" },
  ]},
  { category: "Report Generation Performance", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", tests: [
    { id: "PERF-R1", label: "Full pilot data fetch (15 entities)", entity: "All entities", op: () => Promise.all([base44.entities.LandParcel.list("-created_date", 2000), base44.entities.FamilyOwnership.list("-created_date", 500), base44.entities.InheritanceCase.list("-created_date", 500), base44.entities.AuditLog.list("-created_date", 2000), base44.entities.FieldReport.list("-created_date", 1000)]), threshold: 6000, unit: "ms" },
    { id: "PERF-R2", label: "Ownership history chain load", entity: "OwnershipHistory", op: () => base44.entities.OwnershipHistory.list("-created_date", 500), threshold: 2000, unit: "ms" },
    { id: "PERF-R3", label: "Audit log full retrieval (compliance)", entity: "AuditLog", op: () => base44.entities.AuditLog.list("-created_date", 2000), threshold: 3000, unit: "ms" },
  ]},
];

function statusFor(ms, threshold) {
  if (ms === null) return "pending";
  if (ms < threshold * 0.6) return "excellent";
  if (ms < threshold) return "pass";
  if (ms < threshold * 1.5) return "warn";
  return "fail";
}

function StatusChip({ status }) {
  const map = {
    pending: "bg-gray-100 text-gray-500",
    excellent: "bg-emerald-100 text-emerald-800",
    pass: "bg-blue-100 text-blue-800",
    warn: "bg-amber-100 text-amber-800",
    fail: "bg-red-100 text-red-800",
  };
  const labels = { pending: "—", excellent: "FAST", pass: "PASS", warn: "SLOW", fail: "FAIL" };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${map[status]}`}>{labels[status]}</span>;
}

export default function PerformanceFrameworkTab({ data }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState({});
  const gfl = data.parcels.filter(p => p.lga === "Greenfield Local Government");

  async function runTest(test) {
    setRunning(r => ({ ...r, [test.id]: true }));
    const t0 = performance.now();
    await test.op();
    const ms = Math.round(performance.now() - t0);
    setResults(r => ({ ...r, [test.id]: ms }));
    setRunning(r => ({ ...r, [test.id]: false }));
  }

  async function runAll() {
    for (const group of BENCHMARKS) {
      for (const test of group.tests) {
        await runTest(test);
      }
    }
  }

  const allRan = BENCHMARKS.flatMap(g => g.tests).every(t => results[t.id] !== undefined);
  const passing = BENCHMARKS.flatMap(g => g.tests).filter(t => results[t.id] !== undefined && results[t.id] < t.threshold).length;
  const total = BENCHMARKS.flatMap(g => g.tests).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-black text-blue-700">{total}</p><p className="text-[11px] text-muted-foreground mt-0.5">Total Benchmarks</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-black text-emerald-700">{passing}</p><p className="text-[11px] text-muted-foreground mt-0.5">Tests Passing</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-black text-gray-700">{data.parcels.length}</p><p className="text-[11px] text-muted-foreground mt-0.5">Parcels in DB</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-black text-purple-700">{gfl.length}</p><p className="text-[11px] text-muted-foreground mt-0.5">GFL Parcels</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>Performance tests run live API calls against the platform database. Results reflect actual latency.</span>
        </div>
        <Button size="sm" onClick={runAll} className="gap-2">
          <Zap className="w-3.5 h-3.5" /> Run All Benchmarks
        </Button>
      </div>

      {BENCHMARKS.map(group => (
        <Card key={group.category} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-sm font-bold ${group.color}`}>{group.category}</CardTitle>
              <span className="text-xs text-muted-foreground">{group.tests.length} tests</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">ID</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Test</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Entity / Scope</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 w-24">Threshold</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 w-24">Result</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 w-20">Status</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500 w-16">Run</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tests.map((t, i) => {
                    const ms = results[t.id];
                    const status = statusFor(ms, t.threshold);
                    return (
                      <tr key={t.id} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                        <td className="px-3 py-2"><code className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{t.id}</code></td>
                        <td className="px-3 py-2 font-medium text-gray-800">{t.label}{t.note && <span className="block text-[10px] text-muted-foreground">{t.note}</span>}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.entity}</td>
                        <td className="px-3 py-2 text-center font-mono text-gray-600">&lt;{t.threshold}ms</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">
                          {running[t.id] ? <span className="text-blue-600 animate-pulse">Running…</span> : ms !== undefined ? `${ms}ms` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center"><StatusChip status={running[t.id] ? "pending" : status} /></td>
                        <td className="px-3 py-2 text-center">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => runTest(t)} disabled={running[t.id]}>
                            {running[t.id] ? <Clock className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">Performance Interpretation Guide</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { label: "FAST (green)", desc: "< 60% of threshold — excellent for 1,000-parcel pilot" },
              { label: "PASS (blue)", desc: "< threshold — acceptable for deployment" },
              { label: "SLOW (amber)", desc: "< 150% threshold — monitor under load" },
              { label: "FAIL (red)", desc: "> 150% threshold — investigate before go-live" },
            ].map(g => <div key={g.label} className="bg-white border border-gray-200 rounded p-2"><p className="font-bold text-gray-700">{g.label}</p><p className="text-muted-foreground">{g.desc}</p></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}