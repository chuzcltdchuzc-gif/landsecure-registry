import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { FileText, Plus, Download, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { toast } from "sonner";

const REPORT_TYPES = ["fraud_summary", "approval_audit", "parcel_freeze_log", "user_activity", "regional_overview", "escalation_summary"];

export default function ComplianceReports() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", report_type: "", period_start: "", period_end: "", summary: "" });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["compliance-reports-page"],
    queryFn: () => base44.entities.ComplianceReport.list("-created_date", 100),
  });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts-for-report"], queryFn: () => base44.entities.FraudAlert.list("-created_date", 200) });
  const { data: freezes = [] } = useQuery({ queryKey: ["freezes-for-report"], queryFn: () => base44.entities.ParcelFreeze.list("-created_date", 200) });
  const { data: parcels = [] } = useQuery({ queryKey: ["parcels-for-report"], queryFn: () => base44.entities.LandParcel.list("-created_date", 300) });

  if (isLoading) return <LoadingSpinner text="Loading compliance reports..." />;

  const generateFindings = (type) => {
    if (type === "fraud_summary") return JSON.stringify({
      total_alerts: alerts.length,
      open: alerts.filter(a => a.status === "open").length,
      critical: alerts.filter(a => a.severity === "critical").length,
      resolved: alerts.filter(a => a.status === "resolved").length,
    }, null, 2);
    if (type === "parcel_freeze_log") return JSON.stringify({
      total_freezes: freezes.length,
      active: freezes.filter(f => f.status === "active").length,
      lifted: freezes.filter(f => f.status === "lifted").length,
    }, null, 2);
    if (type === "approval_audit") return JSON.stringify({
      total_parcels: parcels.length,
      approved: parcels.filter(p => p.status === "approved").length,
      rejected: parcels.filter(p => p.status === "rejected").length,
      pending: parcels.filter(p => p.status === "pending").length,
    }, null, 2);
    return "{}";
  };

  const handleGenerate = async () => {
    if (!form.title || !form.report_type) return;
    setGenerating(true);
    const findings = generateFindings(form.report_type);
    await base44.entities.ComplianceReport.create({
      ...form,
      generated_by: user.email,
      findings,
      status: "draft",
    });
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name,
      action: `Generated compliance report: ${form.title}`,
      entity_type: "ComplianceReport",
      details: form.report_type,
    });
    qc.invalidateQueries({ queryKey: ["compliance-reports-page"] });
    setShowCreate(false);
    setForm({ title: "", report_type: "", period_start: "", period_end: "", summary: "" });
    setGenerating(false);
    toast.success("Report generated");
  };

  const handleFinalize = async (report) => {
    setSaving(true);
    await base44.entities.ComplianceReport.update(report.id, { status: "finalized" });
    qc.invalidateQueries({ queryKey: ["compliance-reports-page"] });
    setSaving(false);
    toast.success("Report finalized");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Compliance Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and manage regulatory compliance reports</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Generate Report
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {["draft", "finalized", "submitted"].map(s => (
          <Card key={s} className="text-center">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{reports.filter(r => r.status === s).length}</p>
              <p className="text-xs text-muted-foreground capitalize">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {reports.map(report => (
          <Card key={report.id}>
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{report.title}</p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{report.report_type?.replace(/_/g, " ")}</p>
                {report.summary && <p className="text-xs text-muted-foreground mt-1">{report.summary}</p>}
                {report.findings && (
                  <details className="mt-2">
                    <summary className="text-xs text-primary cursor-pointer">View Findings</summary>
                    <pre className="text-[10px] bg-muted/40 p-2 rounded mt-1 overflow-x-auto">{report.findings}</pre>
                  </details>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Generated by {report.generated_by} · {format(new Date(report.created_date), "MMM d, yyyy")}
                  {report.period_start && ` · Period: ${report.period_start} to ${report.period_end}`}
                </p>
              </div>
              {report.status === "draft" && (
                <Button size="sm" variant="outline" onClick={() => handleFinalize(report)} disabled={saving}
                  className="flex-shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finalize
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No compliance reports yet. Generate your first report.</CardContent></Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Compliance Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Report title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Select value={form.report_type} onValueChange={val => setForm(f => ({ ...f, report_type: val }))}>
              <SelectTrigger><SelectValue placeholder="Report type..." /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Period Start</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Period End</label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <Textarea placeholder="Executive summary (optional)..." value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!form.title || !form.report_type || generating}>
              {generating ? "Generating..." : "Generate Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}