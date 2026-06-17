import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle2, ClipboardList, Upload, ChevronRight, Loader2, TrendingUp, FileText, Shield, MapPin, AlertTriangle, BarChart2, DollarSign, Award, Database, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useOutletContext } from "react-router-dom";

const STATUS_COLORS = {
  scheduled: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
  rescheduled: "bg-indigo-100 text-indigo-700",
};

function AssignmentCard({ assignment, onAccept, onSubmit }) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [surveyData, setSurveyData] = useState({
    date_surveyed: "", surveyor_notes: "", boundary_notes: "", geojson_polygon: ""
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    let survey_plan_url = assignment.survey_plan_url;
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      survey_plan_url = file_url;
    }
    await onSubmit(assignment.id, assignment.parcel_id, { ...surveyData, survey_plan_url, status: "completed" });
    setSubmitting(false);
    setShowSubmit(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm font-mono">{assignment.parcel_number}</p>
            <p className="text-xs text-muted-foreground">{assignment.community}, {assignment.village} · {assignment.ward}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Scheduled: {assignment.scheduled_date}</p>
          </div>
          <Badge className={`text-[10px] px-2 py-0 rounded-full ${STATUS_COLORS[assignment.status] || ""}`}>
            {assignment.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {assignment.status === "scheduled" && (
            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => onAccept(assignment.id)}>
              <CheckCircle2 className="w-3 h-3" /> Accept
            </Button>
          )}
          {["accepted","in_progress"].includes(assignment.status) && (
            <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => setShowSubmit(!showSubmit)}>
              <Upload className="w-3 h-3" /> Submit Survey
            </Button>
          )}
          <Link to={`/lv/parcels/${assignment.parcel_id}`}>
            <Button size="sm" variant="outline" className="text-xs gap-1"><ChevronRight className="w-3 h-3" />View</Button>
          </Link>
        </div>

        {showSubmit && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date Surveyed</Label><Input type="date" value={surveyData.date_surveyed} onChange={e => setSurveyData(d => ({...d, date_surveyed: e.target.value}))} /></div>
              <div><Label className="text-xs">Survey Plan Upload</Label><input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files[0])} className="w-full mt-1 text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-100 cursor-pointer" /></div>
              <div className="col-span-2"><Label className="text-xs">GeoJSON Polygon</Label><textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={surveyData.geojson_polygon} onChange={e => setSurveyData(d => ({...d, geojson_polygon: e.target.value}))} placeholder='{"type":"Polygon","coordinates":[...]}' /></div>
              <div className="col-span-2"><Label className="text-xs">Boundary Notes</Label><Input value={surveyData.boundary_notes} onChange={e => setSurveyData(d => ({...d, boundary_notes: e.target.value}))} /></div>
              <div className="col-span-2"><Label className="text-xs">Surveyor Notes</Label><textarea className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={surveyData.surveyor_notes} onChange={e => setSurveyData(d => ({...d, surveyor_notes: e.target.value}))} /></div>
            </div>
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {submitting ? "Submitting…" : "Submit Final Survey"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SurveyorDashboard() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["lv-surveys-mine", user?.email],
    queryFn: () => base44.entities.SurveyAssignment.filter({ surveyor_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: allParcels = [] } = useQuery({
    queryKey: ["lv-parcels-surveyor"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 1000),
    enabled: !!user?.email,
  });

  const myParcels = allParcels.filter(p => p.surveyor_name === user?.full_name || p.surveyor_id === user?.email);

  const acceptMutation = useMutation({
    mutationFn: (id) => base44.entities.SurveyAssignment.update(id, { status: "accepted", accepted_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-surveys-mine", user?.email] }),
  });

  const submitMutation = useMutation({
    mutationFn: async ({ assignId, parcelId, data }) => {
      await base44.entities.SurveyAssignment.update(assignId, { ...data, completed_at: new Date().toISOString() });
      await base44.entities.LandVaultParcel.update(parcelId, {
        survey_status: "completed",
        survey_date: data.date_surveyed,
        geojson_polygon: data.geojson_polygon || undefined,
        survey_plan_url: data.survey_plan_url || undefined,
        status: "survey_complete",
      });
      // Enqueue evidence confidence recalculation
      await base44.entities.JobQueue.create({
        job_type: "evidence_hashing",
        status: "pending",
        payload: JSON.stringify({ parcel_id: parcelId }),
        created_by_email: user?.email,
        priority: "normal",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-surveys-mine", user?.email] }),
  });

  const pending = assignments.filter(a => ["scheduled","accepted","in_progress"].includes(a.status));
  const completed = assignments.filter(a => a.status === "completed");

  // Partner stats
  const totalUploaded = myParcels.length;
  const verifiedParcels = myParcels.filter(p => p.verification_status === "fully_verified").length;
  const certGenerated = myParcels.filter(p => p.certificate_status === "ACTIVE" || p.status === "certificate_issued").length;
  const avgConfidence = myParcels.length > 0
    ? Math.round(myParcels.reduce((s, p) => s + (p.evidence_confidence_score || 0), 0) / myParcels.length)
    : 0;
  const duplicateAlerts = myParcels.filter(p => p.duplicate_flag).length;

  // Revenue & Archive data
  const { data: revenue = [] } = useQuery({
    queryKey: ["lv-revenue-surveyor", user?.email],
    queryFn: () => base44.entities.RevenueTransaction.filter({ surveyor_email: user?.email }),
    enabled: !!user?.email,
  });
  const { data: archives = [] } = useQuery({
    queryKey: ["lv-archives-surveyor", user?.email],
    queryFn: () => base44.entities.ArchiveRecord.filter({ surveyor_email: user?.email }),
    enabled: !!user?.email,
  });
  const totalEarned = revenue.reduce((s, r) => s + (r.surveyor_earned || 0), 0);
  const pendingEarnings = revenue.filter(r => r.status === "EARNED" || r.status === "PENDING").reduce((s, r) => s + (r.surveyor_earned || 0), 0);
  const paidEarnings = revenue.filter(r => r.status === "PAID").reduce((s, r) => s + (r.surveyor_earned || 0), 0);
  const archiveCount = archives.length;

  // Pilot target tracking
  const PILOT_TARGET = 2000;
  const TARGET_REGISTRATIONS = 500;
  const TARGET_ARCHIVES = 1500;
  const totalRecords = totalUploaded + archiveCount;
  const pilotPct = Math.min(100, Math.round((totalRecords / PILOT_TARGET) * 100));

  // Chart data — monthly uploads
  const uploadChartData = (() => {
    const months = {};
    [...myParcels, ...archives].forEach(r => {
      const m = (r.created_date || r.import_date || "").slice(0, 7);
      if (m) months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).sort().slice(-6).map(([m, c]) => ({ month: m.slice(5), count: c }));
  })();

  // Evidence confidence distribution
  const confidenceDist = [
    { name: "VERIFIED", value: myParcels.filter(p => p.evidence_confidence_level === "VERIFIED").length, color: "#059669" },
    { name: "STRONG", value: myParcels.filter(p => p.evidence_confidence_level === "STRONG").length, color: "#2563eb" },
    { name: "MODERATE", value: myParcels.filter(p => p.evidence_confidence_level === "MODERATE").length, color: "#d97706" },
    { name: "LIMITED", value: myParcels.filter(p => p.evidence_confidence_level === "LIMITED").length, color: "#dc2626" },
  ];

  // Revenue trend (monthly)
  const revenueTrend = (() => {
    const months = {};
    revenue.forEach(r => {
      const m = (r.transaction_date || r.created_date || "").slice(0, 7);
      if (m) months[m] = (months[m] || 0) + (r.surveyor_earned || 0);
    });
    return Object.entries(months).sort().slice(-6).map(([m, c]) => ({ month: m.slice(5), amount: c }));
  })();

  // Duplicate trend
  const duplicateTrend = (() => {
    const months = {};
    myParcels.filter(p => p.duplicate_flag).forEach(p => {
      const m = (p.created_date || "").slice(0, 7);
      if (m) months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).sort().slice(-6).map(([m, c]) => ({ month: m.slice(5), count: c }));
  })();

  // Verification activity
  const verificationActivity = [
    { name: "Field", value: myParcels.filter(p => p.verification_status === "field_verified").length },
    { name: "Survey", value: myParcels.filter(p => p.verification_status === "survey_verified").length },
    { name: "Community", value: myParcels.filter(p => p.verification_status === "community_validated").length },
    { name: "Full", value: myParcels.filter(p => p.verification_status === "fully_verified").length },
  ];

  // Coverage by community
  const coverageByCommunity = (() => {
    const map = {};
    [...myParcels, ...archives].forEach(r => {
      const c = r.community || "Unknown";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Surveyor Partner Portal</h1>
        <p className="text-sm text-muted-foreground">Welcome, {user?.full_name} · Licence: {user?.license_number || "N/A"}</p>
      </div>

      {/* Partner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Parcels Uploaded", value: totalUploaded, color: "text-blue-600", bg: "bg-blue-50", icon: MapPin },
          { label: "Verified", value: verifiedParcels, color: "text-emerald-600", bg: "bg-emerald-50", icon: Shield },
          { label: "Certificates", value: certGenerated, color: "text-violet-600", bg: "bg-violet-50", icon: FileText },
          { label: "Avg Confidence", value: `${avgConfidence}%`, color: "text-amber-600", bg: "bg-amber-50", icon: TrendingUp },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue & Archive Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Earned", value: `₦${totalEarned.toLocaleString()}`, color: "text-emerald-600", bg: "bg-emerald-50", icon: DollarSign },
          { label: "Pending Earnings", value: `₦${pendingEarnings.toLocaleString()}`, color: "text-yellow-600", bg: "bg-yellow-50", icon: TrendingUp },
          { label: "Paid Out", value: `₦${paidEarnings.toLocaleString()}`, color: "text-blue-600", bg: "bg-blue-50", icon: Award },
          { label: "Archives", value: archiveCount, color: "text-violet-600", bg: "bg-violet-50", icon: Database },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pilot Target Tracking */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold">Pilot Progress</p>
            </div>
            <Badge className="text-[10px] bg-blue-100 text-blue-700">{totalRecords} / {PILOT_TARGET}</Badge>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all ${pilotPct >= 80 ? "bg-emerald-500" : pilotPct >= 50 ? "bg-blue-500" : "bg-yellow-500"}`}
              style={{ width: `${pilotPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs font-bold text-blue-600">{totalUploaded}</p><p className="text-[10px] text-muted-foreground">New Registrations<br/><span className="font-mono">/ {TARGET_REGISTRATIONS}</span></p></div>
            <div><p className="text-xs font-bold text-violet-600">{archiveCount}</p><p className="text-[10px] text-muted-foreground">Archives<br/><span className="font-mono">/ {TARGET_ARCHIVES}</span></p></div>
            <div><p className="text-xs font-bold text-emerald-600">{totalRecords}</p><p className="text-[10px] text-muted-foreground">Total<br/><span className="font-mono">/ {PILOT_TARGET}</span></p></div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Alerts Quick View */}
      {duplicateAlerts > 0 && (
        <Card className="border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-800 font-medium">{duplicateAlerts} duplicate alert(s) on your parcels. Review to protect your records.</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending.length, color: "text-yellow-600", icon: Calendar },
          { label: "Completed", value: completed.length, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Duplicate Alerts", value: duplicateAlerts, color: "text-red-600", icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList className="w-full grid grid-cols-5 h-9">
          <TabsTrigger value="active" className="text-xs">Active ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs">My Parcels ({totalUploaded})</TabsTrigger>
          <TabsTrigger value="archives" className="text-xs">Archives ({archiveCount})</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>}
          {!isLoading && pending.length === 0 && (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending assignments.</CardContent></Card>
          )}
          {pending.map(a => (
            <AssignmentCard key={a.id} assignment={a} onAccept={(id) => acceptMutation.mutate(id)} onSubmit={(assignId, parcelId, data) => submitMutation.mutateAsync({ assignId, parcelId, data })} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-2">
          {completed.length === 0 ? (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No completed surveys yet.</CardContent></Card>
          ) : (
            completed.map(a => (
              <Card key={a.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{a.parcel_number}</p>
                    <p className="text-xs text-muted-foreground">{a.community} · Completed {a.date_surveyed || a.completed_at?.slice(0,10)}</p>
                  </div>
                  <Link to={`/lv/parcels/${a.parcel_id}`}>
                    <Button size="sm" variant="ghost" className="text-xs"><ChevronRight className="w-3 h-3" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4 space-y-2">
          {myParcels.length === 0 ? (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No parcels in your portfolio yet.</CardContent></Card>
          ) : (
            myParcels.map(p => (
              <Card key={p.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{p.parcel_number}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{p.community}</span>
                      {p.evidence_confidence_level && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${
                          p.evidence_confidence_level === "VERIFIED" ? "bg-emerald-100 text-emerald-700" :
                          p.evidence_confidence_level === "STRONG" ? "bg-blue-100 text-blue-700" :
                          p.evidence_confidence_level === "MODERATE" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {p.evidence_confidence_level} {p.evidence_confidence_score || "—"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link to={`/lv/parcels/${p.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs"><ChevronRight className="w-3 h-3" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ARCHIVES TAB */}
        <TabsContent value="archives" className="mt-4 space-y-2">
          {archives.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center space-y-3">
                <Database className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No archives imported yet.</p>
                <Link to="/lv/archive-import">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1 text-xs"><Upload className="w-3 h-3" />Import Archives</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{archives.length} archive record(s)</p>
                <Link to="/lv/archive-import"><Button size="sm" className="text-xs h-7 gap-1 bg-blue-600"><Upload className="w-3 h-3" />Import More</Button></Link>
              </div>
              {archives.slice(0, 30).map(r => (
                <Card key={r.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Database className="w-4 h-4 text-violet-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-xs">{r.archive_reference}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{r.community} · {r.survey_date}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${
                          r.trust_badge === "GREEN" ? "bg-emerald-100 text-emerald-700" :
                          r.trust_badge === "BLUE" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {r.classification?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          {/* Monthly Uploads */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Uploads</CardTitle></CardHeader>
            <CardContent>
              {uploadChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={uploadChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Evidence Confidence Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evidence Confidence Distribution</CardTitle></CardHeader>
            <CardContent>
              {confidenceDist.every(d => d.value === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">No confidence data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={confidenceDist.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {confidenceDist.filter(d => d.value > 0).map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              {revenueTrend.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No revenue data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val) => `₦${val?.toLocaleString()}`} />
                    <Line type="monotone" dataKey="amount" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Duplicate Detection Trend */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Duplicate Detection Trend</CardTitle></CardHeader>
            <CardContent>
              {duplicateTrend.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No duplicates detected yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={duplicateTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Coverage by Community */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Coverage by Community</CardTitle></CardHeader>
            <CardContent>
              {coverageByCommunity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {coverageByCommunity.map(c => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-xs w-24 truncate">{c.name}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (c.count / coverageByCommunity[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Verification Activity</CardTitle></CardHeader>
            <CardContent>
              {verificationActivity.every(d => d.value === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">No verification data yet.</p>
              ) : (
                <div className="space-y-2">
                  {verificationActivity.map(v => (
                    <div key={v.name} className="flex items-center gap-2">
                      <span className="text-xs w-16">{v.name}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (v.value / Math.max(1, ...verificationActivity.map(d => d.value))) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold w-6 text-right">{v.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}