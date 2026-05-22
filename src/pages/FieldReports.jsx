import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Plus, MapPin } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FieldReports() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    parcel_number: "",
    report_type: "",
    description: "",
    latitude: "",
    longitude: "",
    boundary_valid: false,
    gps_accuracy: "",
    device_identifier: "",
    network_status: navigator.onLine ? "online" : "offline",
    capture_method: "manual_entry",
  });
  const [photos, setPhotos] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["field-reports", user?.email],
    queryFn: () => base44.entities.FieldReport.filter({ agent_email: user?.email }, "-created_date", 200),
    enabled: !!user?.email,
  });

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          set("latitude", pos.coords.latitude.toString());
          set("longitude", pos.coords.longitude.toString());
          set("gps_accuracy", pos.coords.accuracy?.toFixed(1) || "");
          set("capture_method", "gps_auto");
          set("capture_timestamp", new Date().toISOString());
          toast.success(`GPS captured (accuracy: ${pos.coords.accuracy?.toFixed(1)}m)`);
        },
        () => toast.error("Could not get GPS location")
      );
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const photoUrls = [];
      for (const photo of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
        photoUrls.push(file_url);
      }
      // Automated quality check
      const qualityIssues = [];
      if (!form.latitude || !form.longitude) qualityIssues.push("Missing GPS coordinates");
      if (photos.length < 1) qualityIssues.push("No photographs attached");
      if (!form.description.trim()) qualityIssues.push("Missing field notes");
      if (form.gps_accuracy && parseFloat(form.gps_accuracy) > 20) qualityIssues.push(`GPS accuracy poor (${form.gps_accuracy}m > 20m threshold)`);
      const qualityFlag = qualityIssues.length === 0 ? "pass" : qualityIssues.length === 1 ? "warn" : "fail";

      await base44.entities.FieldReport.create({
        ...form,
        parcel_id: "",
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        gps_accuracy: form.gps_accuracy ? parseFloat(form.gps_accuracy) : undefined,
        capture_timestamp: form.capture_timestamp || new Date().toISOString(),
        photos: photoUrls,
        agent_email: user?.email,
        agent_name: user?.full_name,
        status: "submitted",
        quality_flag: qualityFlag,
        quality_notes: qualityIssues.join("; ") || "All checks passed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-reports"] });
      setOpen(false);
      setForm({ parcel_number: "", report_type: "", description: "", latitude: "", longitude: "", boundary_valid: false });
      setPhotos([]);
      toast.success("Report submitted");
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Field Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{reports.length} reports</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Report</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Field Report</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Parcel Number</Label>
                <Input value={form.parcel_number} onChange={(e) => set("parcel_number", e.target.value)} />
              </div>
              <div>
                <Label>Report Type</Label>
                <Select value={form.report_type} onValueChange={(v) => set("report_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boundary_check">Boundary Check</SelectItem>
                    <SelectItem value="photo_capture">Photo Capture</SelectItem>
                    <SelectItem value="gps_survey">GPS Survey</SelectItem>
                    <SelectItem value="drone_survey">Drone Survey</SelectItem>
                    <SelectItem value="site_inspection">Site Inspection</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitude</Label>
                  <Input type="number" step="0.000001" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input type="number" step="0.000001" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
                </div>
              </div>
              <Button type="button" variant="outline" onClick={captureGPS} className="w-full gap-2">
                <MapPin className="w-4 h-4" /> Capture Current GPS
              </Button>
              <div className="flex items-center gap-2">
                <Switch checked={form.boundary_valid} onCheckedChange={(v) => set("boundary_valid", v)} />
                <Label>Boundary matches records</Label>
              </div>
              <div>
                <Label>Photos</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files))} />
              </div>
              <div>
                <Label>Description & Findings</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.report_type || !form.description || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={Camera} title="No reports" description="Create your first field report" />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.report_type?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">Parcel: {r.parcel_number || "N/A"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(r.created_date), "MMM d, yyyy")}
                      {r.gps_accuracy != null && ` · GPS: ${r.gps_accuracy}m`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  {r.quality_flag && r.quality_flag !== "pass" && <StatusBadge status={r.quality_flag === "fail" ? "rejected" : "pending"} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}