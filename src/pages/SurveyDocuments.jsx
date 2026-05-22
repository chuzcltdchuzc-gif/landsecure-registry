import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, ExternalLink, History } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import DocVersionHistory from "@/components/documents/DocVersionHistory";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SurveyDocuments() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [form, setForm] = useState({ parcel_number: "", document_type: "", description: "" });
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["survey-docs", user?.email],
    queryFn: () => base44.entities.SurveyDocument.filter({ surveyor_email: user?.email }, "-created_date", 200),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let file_url = "";
      if (file) {
        const result = await base44.integrations.Core.UploadFile({ file });
        file_url = result.file_url;
      }
      const doc = await base44.entities.SurveyDocument.create({
        ...form,
        parcel_id: "",
        file_url,
        surveyor_email: user?.email,
        surveyor_name: user?.full_name,
        review_status: "pending",
      });
      // Priority 5: Create initial version record
      if (doc?.id) {
        await base44.entities.DocVersion.create({
          document_id: doc.id,
          parcel_number: form.parcel_number,
          version_number: 1,
          file_url,
          document_type: form.document_type,
          uploaded_by: user?.email,
          uploaded_by_name: user?.full_name,
          change_notes: "Initial upload",
          lifecycle_status: "active",
        });
        await base44.entities.AuditLog.create({
          user_email: user?.email,
          user_name: user?.full_name,
          action: `Uploaded survey document v1: ${form.document_type} for parcel ${form.parcel_number}`,
          entity_type: "SurveyDocument",
          entity_id: doc.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-docs"] });
      setOpen(false);
      setForm({ parcel_number: "", document_type: "", description: "" });
      setFile(null);
      toast.success("Document uploaded");
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Survey Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">{docs.length} documents uploaded</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Survey Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Parcel Number</Label>
                <Input value={form.parcel_number} onChange={(e) => set("parcel_number", e.target.value)} />
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={(v) => set("document_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survey_plan">Survey Plan</SelectItem>
                    <SelectItem value="cad_drawing">CAD Drawing</SelectItem>
                    <SelectItem value="topographic_map">Topographic Map</SelectItem>
                    <SelectItem value="boundary_report">Boundary Report</SelectItem>
                    <SelectItem value="gis_data">GIS Data</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.document_type || !file || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Upload your first survey document" />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.document_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{d.parcel_number || "No parcel"} — {d.description || "No description"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(d.created_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.review_status} />
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8"
                      onClick={() => setExpandedDoc(expandedDoc === d.id ? null : d.id)}
                      title="Version history"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedDoc === d.id && (
                  <div className="pt-3 border-t border-border">
                    <DocVersionHistory document={d} user={user} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}