import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, FileText, ExternalLink, Archive, CheckCircle2, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

const REVIEW_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export default function InheritanceDocManager({ caseData, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ document_type: "family_agreement", title: "", description: "", file: null });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: documents = [] } = useQuery({
    queryKey: ["inheritance-docs", caseData.id],
    queryFn: () => base44.entities.InheritanceDocument.filter({ inheritance_case_id: caseData.id, is_deleted: false }, "-created_date", 50),
    enabled: !!caseData.id,
  });

  const activeDocCount = documents.filter(d => d.lifecycle_status === "active").length;

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.file) throw new Error("Title and file are required");
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: form.file });
      setUploading(false);

      // Get current version number for this doc type
      const existingOfType = documents.filter(d => d.document_type === form.document_type && d.lifecycle_status === "active");
      const versionNumber = existingOfType.length + 1;

      // Supersede previous active docs of same type
      await Promise.all(existingOfType.map(d =>
        base44.entities.InheritanceDocument.update(d.id, { lifecycle_status: "superseded" })
      ));

      const created = await base44.entities.InheritanceDocument.create({
        inheritance_case_id: caseData.id,
        parcel_id: caseData.parcel_id,
        family_ownership_id: caseData.family_ownership_id,
        document_type: form.document_type,
        title: form.title,
        file_url,
        version_number: versionNumber,
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        description: form.description,
        lifecycle_status: "active",
        review_status: "pending",
        is_deleted: false,
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Uploaded document: ${form.title} (v${versionNumber})`,
        entity_type: "InheritanceDocument",
        entity_id: created.id,
        details: `Case: ${caseData.case_reference}, Type: ${form.document_type}`,
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseData.id] });
      setShowForm(false);
      setForm({ document_type: "family_agreement", title: "", description: "", file: null });
      toast.success("Document uploaded successfully");
    },
    onError: () => setUploading(false),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      await base44.entities.InheritanceDocument.update(id, {
        review_status: status,
        reviewed_by: user?.email,
        review_notes: notes || null,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `${status === "approved" ? "Approved" : "Rejected"} document`,
        entity_type: "InheritanceDocument",
        entity_id: id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseData.id] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (doc) => {
      await base44.entities.InheritanceDocument.update(doc.id, { lifecycle_status: "archived" });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Archived document: ${doc.title}`,
        entity_type: "InheritanceDocument",
        entity_id: doc.id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseData.id] }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async (doc) => {
      await base44.entities.InheritanceDocument.update(doc.id, { lifecycle_status: "withdrawn" });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Withdrawn document: ${doc.title}`,
        entity_type: "InheritanceDocument",
        entity_id: doc.id,
        details: `Case: ${caseData.case_reference}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inheritance-docs", caseData.id] }),
  });

  const activeDocuments = documents.filter(d => d.lifecycle_status === "active");
  const otherDocuments = documents.filter(d => d.lifecycle_status !== "active");

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
        activeDocCount > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        <FileText className="w-3.5 h-3.5" />
        {activeDocCount} active document{activeDocCount !== 1 ? "s" : ""} — all uploads are version-controlled and immutable
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Documents ({documents.length})</p>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeDocuments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2">Active Documents</p>
              <div className="space-y-2">
                {activeDocuments.map(doc => (
                  <DocRow key={doc.id} doc={doc} user={user} onReview={reviewMutation.mutate} onArchive={() => archiveMutation.mutate(doc)} onWithdraw={() => withdrawMutation.mutate(doc)} />
                ))}
              </div>
            </div>
          )}
          {otherDocuments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Historical / Archived</p>
              <div className="space-y-2">
                {otherDocuments.map(doc => (
                  <DocRow key={doc.id} doc={doc} user={user} onReview={reviewMutation.mutate} readonly />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Inheritance Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Document Type *</Label>
                <Select value={form.document_type} onValueChange={v => setField("document_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input placeholder="Document title" value={form.title} onChange={e => setField("title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={form.description} onChange={e => setField("description", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">File *</Label>
                <Input type="file" onChange={e => setField("file", e.target.files?.[0])} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || uploading}>
                {uploading ? "Uploading..." : uploadMutation.isPending ? "Saving..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DocRow({ doc, user, onReview, onArchive, onWithdraw, readonly }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReview, setShowReview] = useState(false);
  const canReview = !readonly && (user?.role === "surveyor_general" || user?.role === "compliance_officer" || user?.role === "super_admin");

  return (
    <div className="p-3 bg-white rounded-lg border border-border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{doc.title}</span>
            <Badge className={`text-[10px] ${LIFECYCLE_COLORS[doc.lifecycle_status] || "bg-gray-100"}`}>
              {doc.lifecycle_status}
            </Badge>
            <Badge className={`text-[10px] ${REVIEW_COLORS[doc.review_status] || "bg-gray-50"}`}>
              {doc.review_status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">v{doc.version_number}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {doc.document_type?.replace(/_/g, " ")} · {doc.uploaded_by_name || doc.uploaded_by}
            {doc.created_date && ` · ${format(new Date(doc.created_date), "MMM d, yyyy")}`}
          </div>
          {doc.description && <p className="text-xs text-muted-foreground italic">{doc.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          )}
          {!readonly && doc.lifecycle_status === "active" && (
            <>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" title="Archive" onClick={onArchive}>
                <Archive className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      {canReview && doc.review_status === "pending" && (
        <div>
          {!showReview ? (
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => setShowReview(true)}>
              Review Document
            </Button>
          ) : (
            <div className="space-y-2">
              <Input className="h-7 text-xs" placeholder="Review notes (optional)" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => { onReview({ id: doc.id, status: "approved", notes: reviewNotes }); setShowReview(false); }}>
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs text-red-600 border-red-200" onClick={() => { onReview({ id: doc.id, status: "rejected", notes: reviewNotes }); setShowReview(false); }}>
                  <XCircle className="w-3 h-3 mr-0.5" /> Reject
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowReview(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}