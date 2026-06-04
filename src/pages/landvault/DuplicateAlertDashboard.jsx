/**
 * SECTION C — Duplicate Detection & Review Dashboard
 * Shows all DuplicateAlert records with investigation workflow.
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, XCircle, Search, Copy } from "lucide-react";

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-yellow-100 text-yellow-800",
  confirmed_duplicate: "bg-red-200 text-red-800",
  false_positive: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-gray-100 text-gray-600",
};

const TYPE_LABELS = {
  gps_proximity: "GPS Proximity",
  boundary_overlap: "Boundary Overlap",
  owner_duplicate: "Owner Duplicate",
  family_duplicate: "Family Duplicate",
  survey_plan_duplicate: "Survey Plan Duplicate",
  evidence_hash_duplicate: "Evidence Hash Duplicate",
};

export default function DuplicateAlertDashboard() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("open");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("false_positive");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["duplicate-alerts", filterStatus],
    queryFn: () => filterStatus === "all"
      ? base44.entities.DuplicateAlert.list("-created_date", 100)
      : base44.entities.DuplicateAlert.filter({ status: filterStatus }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ alertId, outcome, notes }) =>
      base44.entities.DuplicateAlert.update(alertId, {
        status: outcome,
        review_notes: notes,
        reviewed_by: "current_user",
        reviewed_at: new Date().toISOString(),
        duplicate_review_outcome: outcome === "confirmed_duplicate" ? "confirmed_duplicate" : "false_positive",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duplicate-alerts"] });
      setSelectedAlert(null);
      setReviewNotes("");
    },
  });

  const openCount = alerts.filter(a => a.status === "open").length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const confirmedCount = alerts.filter(a => a.status === "confirmed_duplicate").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Duplicate Detection Dashboard</h1>
        <p className="text-sm text-muted-foreground">Automated duplicate alerts from the detection engine</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{openCount}</p>
            <p className="text-xs text-muted-foreground">Open Alerts</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{confirmedCount}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="confirmed_duplicate">Confirmed Duplicates</SelectItem>
            <SelectItem value="false_positive">False Positives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
      {!isLoading && alerts.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium">No duplicate alerts</p>
            <p className="text-xs text-muted-foreground">The detection engine has not flagged any duplicates with this filter.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {alerts.map(alert => (
          <Card key={alert.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Copy className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity?.toUpperCase()}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[alert.status]}`}>{alert.status?.replace(/_/g," ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Source: <span className="font-mono font-medium">{alert.source_parcel_number || alert.source_parcel_id?.slice(0,8)}</span>
                      {alert.conflicting_parcel_number && <> → Conflicts with: <span className="font-mono font-medium">{alert.conflicting_parcel_number}</span></>}
                    </p>
                    {alert.gps_distance_m && <p className="text-xs text-muted-foreground">GPS distance: {alert.gps_distance_m}m</p>}
                    {alert.overlap_percentage && <p className="text-xs text-muted-foreground">Boundary overlap: {alert.overlap_percentage}%</p>}
                    {alert.risk_score_impact > 0 && <p className="text-xs text-red-600">+{alert.risk_score_impact} risk score impact</p>}
                    {alert.detection_details && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{alert.detection_details}</p>
                    )}
                  </div>
                </div>
                {alert.status === "open" && (
                  <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setSelectedAlert(alert)}>
                    <Search className="w-3 h-3 mr-1" />Review
                  </Button>
                )}
              </div>

              {/* Inline review panel */}
              {selectedAlert?.id === alert.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-xs font-semibold">Investigation Outcome</p>
                  <Select value={reviewOutcome} onValueChange={setReviewOutcome}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed_duplicate">Confirmed Duplicate — Block Parcel</SelectItem>
                      <SelectItem value="false_positive">False Positive — Clear Alert</SelectItem>
                      <SelectItem value="under_review">Still Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Investigation notes…"
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700" onClick={() => reviewMutation.mutate({ alertId: alert.id, outcome: reviewOutcome, notes: reviewNotes })}>
                      Submit Review
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedAlert(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}