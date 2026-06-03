import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Compass, CheckCircle, Clock, MapPin, Upload, FileText, Calendar } from "lucide-react";

export default function SurveyorPortal() {
  const { user } = useOutletContext() || {};
  const { toast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitForm, setSubmitForm] = useState({ date_surveyed: "", surveyor_notes: "", boundary_notes: "", geojson_polygon: "", measurements: "", coordinates_taken: "" });
  const [surveyPlanUrl, setSurveyPlanUrl] = useState("");
  const [signedDocUrl, setSignedDocUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    const query = user?.role === "licensed_surveyor" ? { surveyor_email: user.email } : {};
    base44.entities.SurveyAssignment.filter(query).then(r => setAssignments(r || [])).finally(() => setLoading(false));
  };
  useEffect(load, [user]);

  const handleAccept = async (a) => {
    await base44.entities.SurveyAssignment.update(a.id, { status: "accepted", accepted_at: new Date().toISOString() });
    await base44.entities.LandVaultParcel.filter({ id: a.parcel_id }).then(async ([p]) => {
      if (p) await base44.entities.LandVaultParcel.update(p.id, { survey_status: "in_progress", status: "survey_in_progress" });
    }).catch(() => {});
    toast({ title: "Assignment accepted" });
    load();
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Uploading..." });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "plan") setSurveyPlanUrl(file_url);
    else setSignedDocUrl(file_url);
  };

  const handleSubmit = async () => {
    if (!selected || !submitForm.date_surveyed) { toast({ title: "Survey date required", variant: "destructive" }); return; }
    setSaving(true);
    await base44.entities.SurveyAssignment.update(selected.id, {
      ...submitForm,
      survey_plan_url: surveyPlanUrl,
      signed_document_url: signedDocUrl,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await base44.entities.LandVaultParcel.filter({ id: selected.parcel_id }).then(async ([p]) => {
      if (p) await base44.entities.LandVaultParcel.update(p.id, {
        survey_status: "completed",
        status: "survey_complete",
        surveyor_name: selected.surveyor_name,
        surveyor_licence: selected.surveyor_licence,
        survey_date: submitForm.date_surveyed,
        survey_plan_url: surveyPlanUrl,
        geojson_polygon: submitForm.geojson_polygon,
        boundary_notes: submitForm.boundary_notes,
        verification_status: "survey_verified",
      });
    }).catch(() => {});
    toast({ title: "Survey submitted successfully" });
    setSelected(null);
    setSurveyPlanUrl("");
    setSignedDocUrl("");
    setSubmitForm({ date_surveyed: "", surveyor_notes: "", boundary_notes: "", geojson_polygon: "", measurements: "", coordinates_taken: "" });
    load();
    setSaving(false);
  };

  const pending = assignments.filter(a => ["scheduled", "accepted"].includes(a.status));
  const done = assignments.filter(a => a.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Compass className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Surveyor Portal</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pending · {done.length} completed</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Assigned", assignments.filter(a => a.status === "scheduled").length, "text-blue-600"],
          ["Accepted", assignments.filter(a => a.status === "accepted").length, "text-amber-600"],
          ["Completed", done.length, "text-green-600"]].map(([l, v, c]) => (
          <Card key={l} className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className={`text-xl font-bold ${c}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pending Assignments</h2>
              {pending.map(a => (
                <Card key={a.id} className="border-0 shadow-sm border-l-4 border-l-amber-400">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold">{a.parcel_number}</p>
                      <p className="text-xs text-muted-foreground">{a.community} · {a.village} · {a.ward}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{a.scheduled_date} {a.scheduled_time}</p>
                    </div>
                    <div className="flex gap-2">
                      {a.status === "scheduled" && (
                        <Button size="sm" variant="outline" onClick={() => handleAccept(a)}>Accept</Button>
                      )}
                      <Button size="sm" onClick={() => { setSelected(a); setSubmitForm(f => ({ ...f, date_surveyed: a.scheduled_date })); }}>
                        Submit Survey
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed Surveys</h2>
              {done.map(a => (
                <Card key={a.id} className="border-0 shadow-sm border-l-4 border-l-green-400">
                  <CardContent className="p-4 flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-mono text-sm font-semibold">{a.parcel_number}</p>
                      <p className="text-xs text-muted-foreground">{a.community} · Surveyed: {a.date_surveyed}</p>
                    </div>
                    {a.survey_plan_url && <a href={a.survey_plan_url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><FileText className="w-4 h-4" /></Button></a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {assignments.length === 0 && <div className="text-center py-12 text-muted-foreground">No survey assignments yet</div>}
        </>
      )}

      {/* Submit Survey Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Survey — {selected?.parcel_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date Surveyed *</Label><Input type="date" value={submitForm.date_surveyed} onChange={e => setSubmitForm(f => ({...f, date_surveyed: e.target.value}))} /></div>
            <div><Label>GPS Coordinates Taken</Label><Textarea value={submitForm.coordinates_taken} onChange={e => setSubmitForm(f => ({...f, coordinates_taken: e.target.value}))} placeholder='[{"lat":5.123,"lng":7.456},...]' rows={2} /></div>
            <div><Label>GeoJSON Polygon</Label><Textarea value={submitForm.geojson_polygon} onChange={e => setSubmitForm(f => ({...f, geojson_polygon: e.target.value}))} placeholder='{"type":"Polygon","coordinates":[...]}' rows={3} /></div>
            <div><Label>Measurements</Label><Textarea value={submitForm.measurements} onChange={e => setSubmitForm(f => ({...f, measurements: e.target.value}))} placeholder="Area, perimeter, bearing..." rows={2} /></div>
            <div><Label>Boundary Notes</Label><Textarea value={submitForm.boundary_notes} onChange={e => setSubmitForm(f => ({...f, boundary_notes: e.target.value}))} rows={2} /></div>
            <div><Label>Surveyor Notes</Label><Textarea value={submitForm.surveyor_notes} onChange={e => setSubmitForm(f => ({...f, surveyor_notes: e.target.value}))} rows={2} /></div>
            <div>
              <Label>Survey Plan Upload</Label>
              <input type="file" accept=".pdf,.jpg,.png,.dwg" className="mt-1 block w-full text-sm" onChange={e => handleUpload(e, "plan")} />
              {surveyPlanUrl && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
            </div>
            <div>
              <Label>Signed Document Upload</Label>
              <input type="file" accept=".pdf,.jpg,.png" className="mt-1 block w-full text-sm" onChange={e => handleUpload(e, "signed")} />
              {signedDocUrl && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit Final Survey"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}