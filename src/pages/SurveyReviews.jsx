import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SurveyReviews() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["all-survey-docs"],
    queryFn: () => base44.entities.SurveyDocument.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.SurveyDocument.update(id, { review_status: status, reviewed_by: user?.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-survey-docs"] });
      toast.success("Review updated");
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const pending = docs.filter(d => d.review_status === "pending");
  const reviewed = docs.filter(d => d.review_status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Survey Document Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">{pending.length} documents pending review</p>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="No survey documents to review" />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.document_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">By {d.surveyor_name || d.surveyor_email} — Parcel: {d.parcel_number || "N/A"}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(d.created_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.review_status} />
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                    )}
                    {d.review_status === "pending" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateMutation.mutate({ id: d.id, status: "approved" })}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: d.id, status: "rejected" })}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}