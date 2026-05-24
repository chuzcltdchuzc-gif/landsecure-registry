import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database, CheckCircle2, AlertTriangle, Play, Trash2, RefreshCw,
  Map, Users, FileText, Camera, Shield, GitBranch, Landmark, Clock,
  XCircle, BarChart3, Layers, Activity
} from "lucide-react";

// All seeding phases in order
const PHASES = [
  { id: "parcels_0",   label: "Parcels Batch 1",        icon: Map,        color: "blue",    desc: "Parcels 20–119 (100 records)",   phase: "parcels",       params: { offset: 0,   batchSize: 100 } },
  { id: "parcels_1",   label: "Parcels Batch 2",        icon: Map,        color: "blue",    desc: "Parcels 120–219 (100 records)",  phase: "parcels",       params: { offset: 100, batchSize: 100 } },
  { id: "parcels_2",   label: "Parcels Batch 3",        icon: Map,        color: "blue",    desc: "Parcels 220–319 (100 records)",  phase: "parcels",       params: { offset: 200, batchSize: 100 } },
  { id: "parcels_3",   label: "Parcels Batch 4",        icon: Map,        color: "blue",    desc: "Parcels 320–419 (100 records)",  phase: "parcels",       params: { offset: 300, batchSize: 100 } },
  { id: "parcels_4",   label: "Parcels Batch 5",        icon: Map,        color: "blue",    desc: "Parcels 420–519 (100 records)",  phase: "parcels",       params: { offset: 400, batchSize: 100 } },
  { id: "parcels_5",   label: "Parcels Batch 6",        icon: Map,        color: "blue",    desc: "Parcels 520–619 (100 records)",  phase: "parcels",       params: { offset: 500, batchSize: 100 } },
  { id: "parcels_6",   label: "Parcels Batch 7",        icon: Map,        color: "blue",    desc: "Parcels 620–719 (100 records)",  phase: "parcels",       params: { offset: 600, batchSize: 100 } },
  { id: "parcels_7",   label: "Parcels Batch 8",        icon: Map,        color: "blue",    desc: "Parcels 720–819 (100 records)",  phase: "parcels",       params: { offset: 700, batchSize: 100 } },
  { id: "parcels_8",   label: "Parcels Batch 9",        icon: Map,        color: "blue",    desc: "Parcels 820–919 (100 records)",  phase: "parcels",       params: { offset: 800, batchSize: 100 } },
  { id: "parcels_9",   label: "Parcels Batch 10",       icon: Map,        color: "blue",    desc: "Parcels 920–999 (80 records)",   phase: "parcels",       params: { offset: 900, batchSize: 80  } },
  { id: "familyOwn",   label: "Family Ownerships",      icon: Users,      color: "emerald", desc: "50 family ownership records",     phase: "familyOwnerships", params: { count: 50 } },
  { id: "benefics",    label: "Beneficiaries",          icon: Users,      color: "emerald", desc: "Beneficiary trees for families",  phase: "beneficiaries", params: {} },
  { id: "inherit",     label: "Inheritance Cases",      icon: GitBranch,  color: "purple",  desc: "20 inheritance cases",           phase: "inheritanceCases", params: { count: 20 } },
  { id: "fieldRep",    label: "Field Reports",          icon: Camera,     color: "orange",  desc: "150 field inspection reports",   phase: "fieldReports",  params: { count: 150 } },
  { id: "surveyDocs",  label: "Survey Documents",       icon: FileText,   color: "teal",    desc: "50 survey submissions",          phase: "surveyDocuments", params: { count: 50 } },
  { id: "disputes",    label: "Disputes",               icon: AlertTriangle, color: "red",  desc: "30 active disputes",             phase: "disputes",      params: { count: 30 } },
  { id: "fraudAl",     label: "Fraud Alerts",           icon: Shield,     color: "rose",    desc: "20 fraud alert scenarios",       phase: "fraudAlerts",   params: { count: 20 } },
  { id: "commVal",     label: "Community Validations",  icon: Landmark,   color: "indigo",  desc: "15 community validation cases",  phase: "communityValidations", params: { count: 15 } },
  { id: "ownHist",     label: "Ownership History",      icon: Layers,     color: "cyan",    desc: "200 ownership transfer records", phase: "ownershipHistory", params: { count: 200 } },
  { id: "deathVerif",  label: "Death Verifications",    icon: FileText,   color: "slate",   desc: "15 death verification records",  phase: "deathVerifications", params: {} },
  { id: "fmr",         label: "Meeting Resolutions",    icon: FileText,   color: "violet",  desc: "20 family meeting resolutions",  phase: "familyMeetingResolutions", params: {} },
  { id: "inhDisputes", label: "Inheritance Disputes",   icon: AlertTriangle, color: "red",  desc: "10 inheritance disputes",        phase: "inheritanceDisputes", params: {} },
  { id: "witnesses",   label: "Witnesses",              icon: Users,      color: "amber",   desc: "Witness records for cases",      phase: "witnesses",     params: {} },
  { id: "auditLogs1",  label: "Audit Logs Batch 1",     icon: Activity,   color: "gray",    desc: "200 audit log events",           phase: "auditLogs",     params: { count: 200 } },
  { id: "auditLogs2",  label: "Audit Logs Batch 2",     icon: Activity,   color: "gray",    desc: "200 audit log events",           phase: "auditLogs",     params: { count: 200 } },
  { id: "auditLogs3",  label: "Audit Logs Batch 3",     icon: Activity,   color: "gray",    desc: "100 audit log events",           phase: "auditLogs",     params: { count: 100 } },
  { id: "notifs",      label: "Notifications",          icon: BarChart3,  color: "green",   desc: "50 user notifications",          phase: "notifications", params: { count: 50 } },
];

const COLOR_CLASSES = {
  blue:    "bg-blue-50 text-blue-600 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
  orange:  "bg-orange-50 text-orange-600 border-orange-200",
  red:     "bg-red-50 text-red-600 border-red-200",
  rose:    "bg-rose-50 text-rose-600 border-rose-200",
  purple:  "bg-purple-50 text-purple-600 border-purple-200",
  teal:    "bg-teal-50 text-teal-600 border-teal-200",
  indigo:  "bg-indigo-50 text-indigo-600 border-indigo-200",
  cyan:    "bg-cyan-50 text-cyan-600 border-cyan-200",
  slate:   "bg-slate-50 text-slate-600 border-slate-200",
  violet:  "bg-violet-50 text-violet-600 border-violet-200",
  amber:   "bg-amber-50 text-amber-600 border-amber-200",
  gray:    "bg-gray-50 text-gray-600 border-gray-200",
  green:   "bg-green-50 text-green-600 border-green-200",
};

const SUMMARY = [
  { label: "Land Parcels", value: "~980", icon: Map, color: "text-blue-600" },
  { label: "Family Ownerships", value: "50", icon: Users, color: "text-emerald-600" },
  { label: "Field Reports", value: "150", icon: Camera, color: "text-orange-600" },
  { label: "Disputes", value: "30", icon: AlertTriangle, color: "text-red-600" },
  { label: "Fraud Alerts", value: "20", icon: Shield, color: "text-rose-600" },
  { label: "Audit Events", value: "500+", icon: Activity, color: "text-gray-600" },
];

export default function DemoDataSeed() {
  const [phaseStatus, setPhaseStatus] = useState({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [startFrom, setStartFrom] = useState(0);
  const abortRef = useRef(false);
  const logEndRef = useRef(null);

  const addLog = (msg, type = "info") => {
    setLog(prev => {
      const newLog = [...prev, { msg, type, ts: new Date().toLocaleTimeString() }];
      return newLog;
    });
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const setPS = (id, s) => setPhaseStatus(prev => ({ ...prev, [id]: s }));

  const runAll = async (fromIndex = 0) => {
    setRunning(true);
    abortRef.current = false;
    addLog(`Starting Demo Population Phase from step ${fromIndex + 1}/${PHASES.length}…`);
    addLog("Note: This will take 5–10 minutes. Do not close this page.");

    for (let i = fromIndex; i < PHASES.length; i++) {
      if (abortRef.current) {
        addLog("⏹ Seeding paused by user.", "warn");
        setRunning(false);
        setStartFrom(i);
        return;
      }

      const ph = PHASES[i];
      setPS(ph.id, "running");
      addLog(`[${i + 1}/${PHASES.length}] Running: ${ph.label}…`);

      try {
        const res = await base44.functions.invoke("seedDemoData", {
          phase: ph.phase,
          ...ph.params,
        });
        const data = res.data;
        if (data?.error) {
          addLog(`  ⚠ ${ph.label}: ${data.error}`, "warn");
          setPS(ph.id, "error");
        } else {
          const count = data?.inserted ?? "✓";
          addLog(`  ✓ ${ph.label}: ${count} records inserted`, "success");
          setPS(ph.id, "done");
        }
      } catch (err) {
        addLog(`  ✗ ${ph.label}: ${err.message}`, "error");
        setPS(ph.id, "error");
      }

      // Small delay between phases to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));
    }

    if (!abortRef.current) {
      addLog("", "info");
      addLog("🎉 Greenfield LGA Demo Population Complete!", "success");
      addLog("All ~1,000 parcels, families, reports, disputes, fraud cases, and audit trails are now live.", "success");
      addLog("Refresh dashboards to see all populated data.", "success");
      setStartFrom(0);
    }
    setRunning(false);
  };

  const pause = () => { abortRef.current = true; };

  const completedCount = Object.values(phaseStatus).filter(s => s === "done").length;
  const errorCount = Object.values(phaseStatus).filter(s => s === "error").length;
  const progress = (completedCount / PHASES.length) * 100;

  // Group phases for display
  const parcelPhases = PHASES.filter(p => p.phase === "parcels");
  const otherPhases = PHASES.filter(p => p.phase !== "parcels");

  const PhaseRow = ({ ph }) => {
    const Icon = ph.icon;
    const s = phaseStatus[ph.id];
    const colClasses = COLOR_CLASSES[ph.color] || COLOR_CLASSES.gray;
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all
        ${s === "done" ? "bg-emerald-50 border-emerald-300" :
          s === "running" ? "bg-blue-50 border-blue-300 animate-pulse" :
          s === "error" ? "bg-red-50 border-red-300" :
          "bg-white border-border"}`}>
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${s === "done" ? "bg-emerald-100" : s === "error" ? "bg-red-100" : colClasses.split(" ")[0]}`}>
          {s === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
           s === "running" ? <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" /> :
           s === "error" ? <XCircle className="w-3.5 h-3.5 text-red-600" /> :
           <Icon className={`w-3.5 h-3.5 ${colClasses.split(" ")[1]}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{ph.label}</p>
          <p className="text-muted-foreground truncate">{ph.desc}</p>
        </div>
        {s && (
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
            s === "done" ? "border-emerald-400 text-emerald-700" :
            s === "running" ? "border-blue-400 text-blue-700" :
            s === "error" ? "border-red-400 text-red-700" : ""}`}>
            {s}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Demo Population Phase</h1>
          <Badge className="bg-primary/10 text-primary border-primary/20">Admin Only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Full-scale Greenfield LGA demonstration environment. Generates ~1,000 interconnected land parcels, families, disputes, fraud cases, and audit histories.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {SUMMARY.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="text-center">
              <CardContent className="p-3">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Bar */}
      {completedCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{completedCount} / {PHASES.length} phases complete</span>
              <span className="flex items-center gap-2">
                {errorCount > 0 && <span className="text-red-500">{errorCount} errors</span>}
                <span>{Math.round(progress)}%</span>
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {completedCount === PHASES.length && (
              <p className="text-xs text-emerald-700 font-semibold mt-2 text-center">
                🎉 All phases complete — Greenfield LGA is fully populated!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => runAll(startFrom)}
          disabled={running}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Seeding in progress…" : startFrom > 0 ? `Resume from step ${startFrom + 1}` : "Begin Full Population"}
        </Button>

        {running && (
          <Button onClick={pause} variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50">
            <XCircle className="w-4 h-4" /> Pause
          </Button>
        )}

        {startFrom > 0 && !running && (
          <Button onClick={() => { setStartFrom(0); setPhaseStatus({}); setLog([]); }} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
        )}
      </div>

      {/* Phase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Parcel batches */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Map className="w-4 h-4 text-blue-600" />
              Land Parcels (980 total)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {parcelPhases.map(ph => <PhaseRow key={ph.id} ph={ph} />)}
          </CardContent>
        </Card>

        {/* All other phases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Supporting Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {otherPhases.map(ph => <PhaseRow key={ph.id} ph={ph} />)}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ Before Running</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>This process takes approximately <strong>5–10 minutes</strong> end-to-end.</li>
            <li>Do <strong>not</strong> close or refresh the page during seeding.</li>
            <li>Use <strong>Pause</strong> to stop between phases — seeding resumes from where it stopped.</li>
            <li>Data is additive — run once per fresh pilot environment.</li>
            <li>After completion, refresh all dashboards to load live statistics.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Log */}
      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Seed Log
              <Badge variant="outline" className="ml-auto text-xs">{log.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-950 rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-0.5">
              {log.map((entry, i) => (
                <div key={i} className={
                  entry.type === "success" ? "text-emerald-400" :
                  entry.type === "error" ? "text-red-400" :
                  entry.type === "warn" ? "text-amber-400" : "text-gray-300"
                }>
                  {entry.msg && <><span className="text-gray-600">[{entry.ts}]</span> {entry.msg}</>}
                </div>
              ))}
              {running && <div className="text-blue-400 animate-pulse mt-1">● Processing…</div>}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}