/**
 * Priority 5 — Document Version History & Lifecycle Tracking
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, ExternalLink, Archive, Upload, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const lifecycleColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  superseded: "bg-amber-100 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
  withdrawn: "bg-red-100 text-red-700 border-red-200",
};

export default function DocVersionHistory({ document, user }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [newLifecycle, setNewLifecycle] = useState("");
  const queryClient = useQueryClient();

  const { data: versions = [] } = useQuery({
    queryKey: ["doc-versions", document?.id],
    queryFn: () => base44.entities.DocVersion.filter({ document_id: document?.id }, "-version_number", 50),
    enabled: !!document?.id,
  });

  const uploadVersionMutation = useMutation({
    mutationFn: async () => {
      if (!newFile) throw new Error("No file selected");
      const { file_url } = await base44.integrations.Core.UploadFile({ file: newFile });

      const nextVersion = (versions[0]?.version_number || 0) + 1;

      // Mark previous active version as superseded
      const activeVersions = versions.filter((v) => v.lifecycle_status === "active");
      for (const v of activeVersions) {
        await base44.entities.DocVersion.update(v.id, { lifecycle_status: "superseded" });
      }

      // Create new version record
      await base44.entities.DocVersion.create({
        document_id: document.id,
        parcel_id: document.parcel_id,
        parcel_number: document.parcel_number,
        version_number: nextVersion,
        file_url,
        document_type: document.document_type,
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        change_notes: changeNotes || "New version uploaded",
        lifecycle_status: "active",
      });

      // Update parent document with new file URL
      await base44.entities.SurveyDocument.update(document.id, {
        file_url,
        review_status: "pending",
      });

      // Immutable audit log
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Uploaded version ${nextVersion} of document ${document.id} (${document.document_type})`,
        entity_type: "SurveyDocument",
        entity_id: document.id,
        details: changeNotes || "New version uploaded",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-versions", document?.id] });
      queryClient.invalidateQueries({ queryKey: ["survey-docs"] });
      setUploadOpen(false);
      setChangeNotes("");
      setNewFile(null);
      toast.success("New document version uploaded");
    },
  });

  const changeLifecycleMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.SurveyDocument.update(document.id, { review_status: newLifecycle === "archived" ? "rejected" : "pending" });

      // Mark all versions
      for (const v of versions) {
        await base44.entities.DocVersion.update(v.id, { lifecycle_status: newLifecycle });
      }

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Changed document lifecycle to '${newLifecycle}' for ${document.document_type} (${document.id})`,
        entity_type: "SurveyDocument",
        entity_id: document.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-versions", document?.id] });
      queryClient.invalidateQueries({ queryKey: ["survey-docs"] });
      setLifecycleOpen(false);
      toast.success(`Document lifecycle changed to ${newLifecycle}`);
    },
  });

  const currentVersion = versions.find((v) => v.lifecycle_status === "active") || versions[0];

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Version History</span>
          {versions.length > 0 && (
            <Badge variant="outline" className="text-xs">v{currentVersion?.version_number || "—"}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7">
                <Upload className="w-3 h-3" /> New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload New Document Version</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium capitalize">{document?.document_type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: v{currentVersion?.version_number || 0} · Next: v{(currentVersion?.version_number || 0) + 1}
                  </p>
                </div>
                <div>
                  <Label>New File *</Label>
                  <Input type="file" onChange={(e) => setNewFile(e.target.files[0])} />
                </div>
                <div>
                  <Label>Change Notes</Label>
                  <Textarea
                    placeholder="Describe what changed in this version..."
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    The current active version will be marked as <strong>superseded</strong> and an immutable audit log will be created.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => uploadVersionMutation.mutate()}
                  disabled={!newFile || uploadVersionMutation.isPending}
                >
                  {uploadVersionMutation.isPending ? "Uploading..." : "Upload Version"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={lifecycleOpen} onOpenChange={setLifecycleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-xs gap-1.5 h-7">
                <Archive className="w-3 h-3" /> Lifecycle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Change Document Lifecycle</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Lifecycle changes are permanent and create an immutable audit log entry.
                </p>
                <div>
                  <Label>New Lifecycle Status</Label>
                  <Select value={newLifecycle} onValueChange={setNewLifecycle}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="archived">Archive (read-only, retained)</SelectItem>
                      <SelectItem value="withdrawn">Withdraw (invalidated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  variant={newLifecycle === "withdrawn" ? "destructive" : "default"}
                  onClick={() => changeLifecycleMutation.mutate()}
                  disabled={!newLifecycle || changeLifecycleMutation.isPending}
                >
                  {changeLifecycleMutation.isPending ? "Processing..." : `Confirm ${newLifecycle}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Version list */}
      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No version history — this document predates version tracking.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v, idx) => (
            <div key={v.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                v.lifecycle_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}>
                v{v.version_number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium">
                    {format(new Date(v.created_date), "MMM d, yyyy HH:mm")}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${lifecycleColors[v.lifecycle_status]}`}>
                    {v.lifecycle_status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {v.uploaded_by_name || v.uploaded_by}
                </p>
                {v.change_notes && (
                  <p className="text-[10px] text-foreground mt-1 line-clamp-2">{v.change_notes}</p>
                )}
              </div>
              {v.file_url && (
                <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <Button size="icon" variant="ghost" className="w-7 h-7">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}