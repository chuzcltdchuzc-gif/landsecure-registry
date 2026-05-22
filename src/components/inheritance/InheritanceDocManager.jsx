import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, ExternalLink, Archive, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "family_agreement", label: "Family Agreement" },
  { value: "probate_document", label: "Probate Document" },
  { value: "court_order", label: "Court Order" },
  { value: "consent_letter", label: "Consent Letter" },
  { value: "customary_declaration", label: "Customary Declaration" },
  { value: "survey_plan", label: "Survey Plan" },
  { value: "traditional_ruler_certification", label: "Traditional Ruler Certification" },
  { value: "other", label: "Other" },
];

const LIFECYCLE_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  superseded: "bg-amber-100 text-amber-700",
  archived: "bg-gray-100 text-gray-600",
  withdrawn: "bg-red-100 text-red-700",
};

export default function InheritanceDocManager({ caseId, parcelId, familyOwnershipId, user, readOnly = false }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ document_type: "family_agreement", title: "", description: "" });
  const [file, setFile] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["inheritance-docs", caseId],
    queryFn: () => base44.entities.InheritanceDocument.filter({ inheritance_case_id: caseId, is_deleted: false }, "-created_date", 50),
    enabled: !!caseId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let fileUrl = "";
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        fileUrl = res.file_url;
      }
      setUploading(false);

      // Supersede previous versions of same type
      const existing = documents.filter((d) => d.document_type === form.document_type && d.lifecycle_status === "active");
      await Promise.all(existing.map((d) =>
        base44.entities.InheritanceDocument.update(d.id, { lifecycle_status: "superseded" })
      ));

      const newVersion = Math.max(0, ...documents.filter(d => d.document_type === form.document_type).map(d => d.version_number || 0)) + 1;

      const doc = await base44.entities.InheritanceDocument.create({
        ...form,
        inheritance_case_id: caseId,
        parcel_id: parcelId,
        family_ownership_id: familyOwnershipId,
        file_url: fileUrl,
        version_number: newVersion,
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        lifecycle_status: "active",
        review_status: "pending",
        is_deleted: false,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Uploaded inheritance document: ${form.title} (v${newVersion})`,
        entity_type: "InheritanceDocument",
        entity_id: doc.id,
        details: `Type: ${form.document_type}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseId] });
      toast.success("Document uploaded");
      setForm({ document_type: "family_agreement", title: "", description: "" });
      setFile(null);
      setAdding(false);
    },
    onError: () => setUploading(false),
  });

  const archiveMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.InheritanceDocument.update(docId, { lifecycle_status: "archived" });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: "Archived inheritance document",
        entity_type: "InheritanceDocument",
        entity_id: docId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseId] }),
  });

  const approveMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.InheritanceDocument.update(docId, {
        review_status: "approved",
        reviewed_by: user?.email,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: "Approved inheritance document",
        entity_type: "InheritanceDocument",
        entity_id: docId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Documents ({documents.length})</span>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(!adding)}>
            <Plus className="w-3.5 h-3.5" /> Upload
          </Button>
        )}
      </div>

      {adding && (
        <div className="p-3 border border-border rounded-lg space-y-2 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Document Type *</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm(f => ({ ...f, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input placeholder="Document title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">File *</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => addMutation.mutate()} disabled={!form.title || !file || addMutation.isPending || uploading}>
              {uploading ? "Uploading..." : addMutation.isPending ? "Saving..." : "Upload Document"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {documents.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-2 p-2.5 bg-card rounded-lg border border-border">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold truncate">{d.title}</span>
                <Badge className={`text-[9px] py-0 px-1.5 ${LIFECYCLE_COLORS[d.lifecycle_status] || ""}`}>
                  {d.lifecycle_status}
                </Badge>
                {d.review_status === "approved" && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                  </span>
                )}
                {d.version_number > 1 && <span className="text-[9px] text-muted-foreground">v{d.version_number}</span>}
              </div>
              <p className="text-[10px] text-muted-foreground capitalize">{d.document_type?.replace(/_/g, " ")}</p>
              {d.created_date && (
                <p className="text-[10px] text-muted-foreground">
                  {d.uploaded_by_name || d.uploaded_by} · {format(new Date(d.created_date), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              )}
              {!readOnly && d.review_status !== "approved" && d.lifecycle_status === "active" && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 px-1.5" onClick={() => approveMutation.mutate(d.id)}>
                  Approve
                </Button>
              )}
              {!readOnly && d.lifecycle_status === "active" && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => archiveMutation.mutate(d.id)}>
                  <Archive className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No documents uploaded</p>
        )}
      </div>
    </div>
  );
}