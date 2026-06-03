import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, ClipboardList, Upload, ChevronRight, Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";

const STATUS_COLORS = {
  scheduled: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
  rescheduled: "bg-indigo-100 text-indigo-700",
};

function AssignmentCard({ assignment, onAccept, onSubmit, userId }) {
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
            <Button size="sm" variant="outline" className="text-xs gap-1"><ChevronRight className="w-3 h-3" />View Parcel</Button>
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-surveys-mine", user?.email] }),
  });

  const pending = assignments.filter(a => ["scheduled","accepted","in_progress"].includes(a.status));
  const completed = assignments.filter(a => a.status === "completed");

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Surveyor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome, {user?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending.length, color: "text-yellow-600", icon: Calendar },
          { label: "Completed", value: completed.length, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Total Assigned", value: assignments.length, color: "text-blue-600", icon: ClipboardList },
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

      {/* Active Assignments */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Active Assignments ({pending.length})</h2>
        {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>}
        {!isLoading && pending.length === 0 && (
          <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending assignments.</CardContent></Card>
        )}
        <div className="space-y-3">
          {pending.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              userId={user?.id}
              onAccept={(id) => acceptMutation.mutate(id)}
              onSubmit={(assignId, parcelId, data) => submitMutation.mutateAsync({ assignId, parcelId, data })}
            />
          ))}
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">Completed ({completed.length})</h2>
          <div className="space-y-2">
            {completed.map(a => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}