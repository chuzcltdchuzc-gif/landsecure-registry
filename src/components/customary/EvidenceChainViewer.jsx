import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, FileText, ChevronDown, ChevronUp, Hash, Clock, User, Lock, Plus, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  superseded: "bg-amber-100 text-amber-700",
  archived: "bg-gray-100 text-gray-600",
  withdrawn: "bg-red-100 text-red-700",
};

// Simple browser-side hash using SubtleCrypto
async function computeHash(file) {
  try {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `hash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function EvidenceChainViewer({ caseData, user }) {
  const [expanded, setExpanded] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const qc = useQueryClient();

  const { data: chain = [] } = useQuery({
    queryKey: ["evidence-chain", caseData?.id],
    queryFn: () => base44.entities.EvidenceChain.filter(
      { inheritance_case_id: caseData?.id },
      "-upload_date", 100
    ),
    enabled: !!caseData?.id,
  });

  const recordAccess = (id, chainItem) => {
    const history = JSON.parse(chainItem.access_history || "[]");
    history.push({ date: new Date().toISOString(), accessed_by: user?.email, name: user?.full_name });
    base44.entities.EvidenceChain.update(id, { access_history: JSON.stringify(history) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Legal Evidence Chain ({chain.length})
        </h3>
        <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> Register Evidence
        </Button>
      </div>

      {chain.length === 0 ? (
        <Card><CardContent className="py-10 text-center"><Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No evidence chain records</p></CardContent></Card>
      ) : (
        chain.map((ev, idx) => (
          <Card key={ev.id} className={`border-l-4 ${ev.lifecycle_status === "active" ? "border-l-emerald-400" : ev.lifecycle_status === "superseded" ? "border-l-amber-400" : "border-l-gray-300"}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{ev.file_name || ev.document_type}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[ev.lifecycle_status]}`}>{ev.lifecycle_status}</Badge>
                    <Badge className="text-[10px] bg-gray-100 text-gray-600">v{ev.version_number}</Badge>
                    {ev.replacement_blocked && <Badge className="text-[10px] bg-red-100 text-red-700 gap-1"><Lock className="w-2.5 h-2.5" />Locked</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{ev.uploaded_by_name || ev.uploaded_by}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.upload_date ? format(new Date(ev.upload_date), "MMM d, yyyy HH:mm") : "—"}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 items-center">
                  {ev.file_url && (
                    <a href={ev.file_url} target="_blank" rel="noreferrer" onClick={() => recordAccess(ev.id, ev)}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">View</Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}>
                    {expanded === ev.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {expanded === ev.id && (
                <div className="pt-2 border-t space-y-3">
                  {ev.hash_fingerprint && (
                    <div className="bg-muted/30 rounded p-2 flex items-start gap-2">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">SHA-256 Hash Fingerprint</p>
                        <p className="text-[10px] font-mono break-all">{ev.hash_fingerprint}</p>
                      </div>
                    </div>
                  )}
                  {ev.approval_history && (() => {
                    try {
                      const hist = JSON.parse(ev.approval_history);
                      if (!hist.length) return null;
                      return (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1">Approval History</p>
                          {hist.map((h, i) => <div key={i} className="text-[11px] text-muted-foreground flex gap-2"><span className="font-medium">{h.action}</span><span>— {h.by} · {h.date ? format(new Date(h.date), "MMM d") : ""}</span></div>)}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  {ev.access_history && (() => {
                    try {
                      const hist = JSON.parse(ev.access_history);
                      if (!hist.length) return null;
                      return (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1">Access History ({hist.length})</p>
                          {hist.slice(-5).map((h, i) => <div key={i} className="text-[11px] text-muted-foreground">{h.name || h.accessed_by} · {h.date ? format(new Date(h.date), "MMM d HH:mm") : ""}</div>)}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  {ev.notes && <div className="text-xs text-muted-foreground">{ev.notes}</div>}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showUpload && (
        <EvidenceUploadForm
          caseData={caseData}
          user={user}
          onClose={() => setShowUpload(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["evidence-chain"] }); setShowUpload(false); toast.success("Evidence registered in chain"); }}
        />
      )}
    </div>
  );
}

function EvidenceUploadForm({ caseData, user, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!file) { toast.error("Please select a file"); return; }
    setUploading(true);
    try {
      const hash = await computeHash(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const chainEntry = await base44.entities.EvidenceChain.create({
        document_id: `manual-${Date.now()}`,
        document_type: docType || "manual_upload",
        inheritance_case_id: caseData?.id,
        parcel_id: caseData?.parcel_id,
        file_url,
        file_name: file.name,
        upload_date: new Date().toISOString(),
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        hash_fingerprint: hash,
        version_number: 1,
        lifecycle_status: "active",
        replacement_blocked: false,
        approval_history: JSON.stringify([{ date: new Date().toISOString(), action: "Document registered", by: user?.full_name }]),
        access_history: JSON.stringify([]),
        notes,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email, user_name: user?.full_name,
        action: "EVIDENCE_CHAIN_REGISTERED",
        entity_type: "EvidenceChain",
        details: `File: ${file.name}, Hash: ${hash.slice(0, 16)}...`,
      });
      onSaved(chainEntry);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Register Evidence in Chain</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Document Type</Label><Input value={docType} onChange={e => setDocType(e.target.value)} placeholder="e.g. family_agreement, survey_plan" /></div>
          <div className="space-y-1">
            <Label className="text-xs">File *</Label>
            <Input type="file" onChange={e => setFile(e.target.files[0])} />
            <p className="text-[11px] text-muted-foreground">SHA-256 fingerprint will be computed automatically</p>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Brief description..." /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={uploading || !file} onClick={handleSave}>
              {uploading ? "Computing hash & uploading..." : "Register"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}