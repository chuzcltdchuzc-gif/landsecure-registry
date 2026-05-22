import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, XCircle, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const WORKFLOW_ORDER = ["draft", "submitted", "surveyor_review", "compliance_review", "surveyor_general_review", "approved"];

const STAGE_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-200" },
  surveyor_review: { label: "Surveyor Review", color: "bg-amber-100 text-amber-700 border-amber-200" },
  compliance_review: { label: "Compliance Review", color: "bg-orange-100 text-orange-700 border-orange-200" },
  surveyor_general_review: { label: "SG Review", color: "bg-purple-100 text-purple-700 border-purple-200" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-400 border-gray-200" },
};

// Which role can advance from which stage
const STAGE_ADVANCE_ROLES = {
  draft: ["surveyor", "compliance_officer", "super_admin", "surveyor_general"],
  submitted: ["surveyor", "compliance_officer", "super_admin", "surveyor_general"],
  surveyor_review: ["surveyor", "compliance_officer", "super_admin", "surveyor_general"],
  compliance_review: ["compliance_officer", "super_admin", "surveyor_general"],
  surveyor_general_review: ["surveyor_general", "super_admin"],
};

const NEXT_STAGE = {
  draft: "submitted",
  submitted: "surveyor_review",
  surveyor_review: "compliance_review",
  compliance_review: "surveyor_general_review",
  surveyor_general_review: "approved",
};

const STAGE_REVIEWER_FIELDS = {
  surveyor_review: { reviewer: "surveyor_reviewer", date: "surveyor_review_date", notes: "surveyor_notes" },
  compliance_review: { reviewer: "compliance_reviewer", date: "compliance_review_date", notes: "compliance_notes" },
  surveyor_general_review: { reviewer: "sg_reviewer", date: "sg_review_date", notes: "sg_notes" },
  approved: { reviewer: "final_approved_by", date: "final_approved_date" },
};

export default function InheritanceCaseWorkflow({ caseData, setCaseData, user, validationWarnings, witnesses, documents }) {
  const [notes, setNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);
  const queryClient = useQueryClient();

  const currentIdx = WORKFLOW_ORDER.indexOf(caseData.status);
  const canAdvance = STAGE_ADVANCE_ROLES[caseData.status]?.includes(user?.role);
  const nextStage = NEXT_STAGE[caseData.status];
  const isTerminal = ["approved", "rejected", "withdrawn"].includes(caseData.status);

  // Block advance if critical validations fail for surveyor_general_review → approved
  const criticalBlocked = caseData.status === "surveyor_general_review" && (
    witnesses.filter(w => w.verification_status === "verified").length < 2 ||
    documents.filter(d => d.lifecycle_status === "active").length === 0
  );

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const fields = STAGE_REVIEWER_FIELDS[nextStage] || {};
      const updates = {
        status: nextStage,
        ...(fields.reviewer && { [fields.reviewer]: user?.email }),
        ...(fields.date && { [fields.date]: now }),
        ...(fields.notes && notes && { [fields.notes]: notes }),
      };

      const updated = await base44.entities.InheritanceCase.update(caseData.id, updates);

      // If approving, update OwnershipHistory
      if (nextStage === "approved") {
        await base44.entities.OwnershipHistory.create({
          parcel_id: caseData.parcel_id,
          parcel_number: caseData.parcel_number,
          from_owner: `${caseData.family_name} (Family Ownership)`,
          to_owner: `${caseData.family_name} (Inheritance Case ${caseData.case_reference})`,
          transfer_type: "family_inheritance",
          transfer_date: now.split("T")[0],
          family_ownership_id: caseData.family_ownership_id,
          status: "approved",
          notes: `Inheritance case ${caseData.case_reference} approved by Surveyor General`,
        });
      }

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Advanced inheritance case ${caseData.case_reference} to ${nextStage}`,
        entity_type: "InheritanceCase",
        entity_id: caseData.id,
        details: notes || `Stage advanced from ${caseData.status} to ${nextStage}`,
      });

      return updated;
    },
    onSuccess: (data) => {
      setCaseData(data);
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      setNotes("");
      toast.success(`Case advanced to ${STAGE_CONFIG[nextStage]?.label}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const updated = await base44.entities.InheritanceCase.update(caseData.id, {
        status: "rejected",
        rejection_reason: rejectNotes,
        rejection_stage: caseData.status,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Rejected inheritance case ${caseData.case_reference}`,
        entity_type: "InheritanceCase",
        entity_id: caseData.id,
        details: `Rejected at stage ${caseData.status}. Reason: ${rejectNotes}`,
      });
      return updated;
    },
    onSuccess: (data) => {
      setCaseData(data);
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      setShowReject(false);
      setRejectNotes("");
      toast.success("Case rejected");
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: async () => {
      const updated = await base44.entities.InheritanceCase.update(caseData.id, {
        status: "submitted",
        rejection_reason: null,
        rejection_stage: null,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Resubmitted inheritance case ${caseData.case_reference}`,
        entity_type: "InheritanceCase",
        entity_id: caseData.id,
        details: `Case resubmitted for review after rejection`,
      });
      return updated;
    },
    onSuccess: (data) => {
      setCaseData(data);
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      toast.success("Case resubmitted for review");
    },
  });

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Approval Workflow</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {WORKFLOW_ORDER.map((stage, idx) => {
            const isActive = stage === caseData.status;
            const isPast = currentIdx > idx;
            const config = STAGE_CONFIG[stage];
            return (
              <React.Fragment key={stage}>
                <div className={`flex-shrink-0 flex flex-col items-center gap-1 min-w-[72px]`}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPast ? "bg-emerald-500 border-emerald-500" :
                    isActive ? "bg-primary border-primary" :
                    caseData.status === "rejected" ? "border-gray-200 bg-gray-50" :
                    "border-gray-200 bg-white"
                  }`}>
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : isActive && caseData.status === "rejected" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <span className={`text-[9px] font-bold ${isActive ? "text-white" : "text-muted-foreground"}`}>{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-[9px] font-medium text-center leading-tight ${isActive ? "text-primary" : isPast ? "text-emerald-700" : "text-muted-foreground"}`}>
                    {config.label}
                  </span>
                </div>
                {idx < WORKFLOW_ORDER.length - 1 && (
                  <div className={`flex-1 h-0.5 min-w-[16px] mx-0.5 ${isPast ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Rejected override indicator */}
        {caseData.status === "rejected" && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">Rejected at: {STAGE_CONFIG[caseData.rejection_stage]?.label || caseData.rejection_stage}</p>
              {caseData.rejection_reason && <p className="text-xs text-red-600">{caseData.rejection_reason}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isTerminal && canAdvance && nextStage && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">
            Advance to: <span className="text-primary">{STAGE_CONFIG[nextStage]?.label}</span>
          </p>

          {criticalBlocked && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Cannot approve — minimum 2 verified witnesses and at least 1 active document required.
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Review Notes {nextStage === "approved" ? "(required)" : "(optional)"}</Label>
            <Textarea
              placeholder="Add review notes, decisions, or customary observations..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-white"
              onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending || criticalBlocked}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {advanceMutation.isPending ? "Processing..." : `Advance to ${STAGE_CONFIG[nextStage]?.label}`}
            </Button>
            {!showReject ? (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowReject(true)}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            ) : (
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Rejection reason (required)..."
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  rows={2}
                  className="border-red-200"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate()}
                    disabled={!rejectNotes || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resubmit after rejection */}
      {caseData.status === "rejected" && (user?.role === caseData.initiated_by || user?.role === "surveyor" || user?.role === "surveyor_general" || user?.role === "super_admin") && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-800">This case was rejected. You may resubmit after addressing the issues.</p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => resubmitMutation.mutate()}
            disabled={resubmitMutation.isPending}
          >
            {resubmitMutation.isPending ? "Resubmitting..." : "Resubmit Case"}
          </Button>
        </div>
      )}
    </div>
  );
}