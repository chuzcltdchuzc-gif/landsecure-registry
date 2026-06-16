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
import { Calendar, CheckCircle2, ClipboardList, Upload, ChevronRight, Loader2, TrendingUp, FileText, Shield, MapPin, AlertTriangle, BarChart2 } from "lucide-react";
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
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="active" className="text-xs">Active ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs">My Parcels ({totalUploaded})</TabsTrigger>
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
      </Tabs>
    </div>
  );
}