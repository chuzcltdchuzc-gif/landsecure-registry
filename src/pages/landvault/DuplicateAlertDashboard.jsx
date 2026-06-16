/**
 * PRIORITY 6 — Duplicate Alert Command Center
 * Enhanced dashboard with confidence scoring, multi-dimensional filtering,
 * and operational command-center visibility.
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle, Search, Copy, Shield, TrendingUp, Filter, Eye } from "lucide-react";

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

const CONFIDENCE_COLORS = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-blue-100 text-blue-700",
};

const TYPE_LABELS = {
  gps_proximity: "GPS Proximity",
  boundary_overlap: "Boundary Overlap",
  owner_duplicate: "Owner Duplicate",
  family_duplicate: "Family Duplicate",
  survey_plan_duplicate: "Survey Plan Duplicate",
  evidence_hash_duplicate: "Evidence Hash Duplicate",
  parcel_reference_duplicate: "Parcel Reference Duplicate",
  survey_reference_duplicate: "Survey Reference Duplicate",
};

function ConfidenceBar({ score }) {
  const color = score >= 90 ? "bg-red-500" : score >= 70 ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}%</span>
    </div>
  );
}

export default function DuplicateAlertDashboard() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("open");
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCommunity, setFilterCommunity] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("false_positive");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["duplicate-alerts", filterStatus],
    queryFn: () => filterStatus === "all"
      ? base44.entities.DuplicateAlert.list("-created_date", 200)
      : base44.entities.DuplicateAlert.filter({ status: filterStatus }),
  });

  // Fetch parcels for community/ward filter options
  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcels-filter"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 500),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ alertId, outcome, notes }) =>
      base44.entities.DuplicateAlert.update(alertId, {
        status: outcome,
        review_notes: notes,
        reviewed_by: "admin",
        reviewed_at: new Date().toISOString(),
        duplicate_review_outcome: outcome === "confirmed_duplicate" ? "confirmed_duplicate" : "false_positive",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duplicate-alerts"] });
      setSelectedAlert(null);
      setReviewNotes("");
    },
  });

  // Apply all filters
  let filteredAlerts = alerts;
  if (filterType !== "all") filteredAlerts = filteredAlerts.filter(a => a.alert_type === filterType);
  if (filterSeverity !== "all") filteredAlerts = filteredAlerts.filter(a => a.severity === filterSeverity);

  const openCount = alerts.filter(a => a.status === "open").length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const highConfCount = alerts.filter(a => a.confidence_score >= 90).length;
  const confirmedCount = alerts.filter(a => a.status === "confirmed_duplicate").length;
  const falsePosCount = alerts.filter(a => a.status === "false_positive").length;
  const avgConfidence = alerts.length > 0
    ? Math.round(alerts.reduce((s, a) => s + (a.confidence_score || 50), 0) / alerts.length)
    : 0;

  // Unique communities and wards from alerts
  const uniqueTypes = [...new Set(alerts.map(a => a.alert_type).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-600" />Duplicate Alert Command Center
        </h1>
        <p className="text-sm text-muted-foreground">Automated duplicate detection engine — review, classify, and audit</p>
      </div>

      {/* Command Center Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Alerts", value: openCount, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
          { label: "High Confidence", value: highConfCount, color: "text-orange-600", bg: "bg-orange-50", icon: TrendingUp },
          { label: "Confirmed", value: confirmedCount, color: "text-rose-600", bg: "bg-rose-50", icon: XCircle },
          { label: "False Positives", value: falsePosCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Avg Confidence */}
      {alerts.length > 0 && (
        <Card className="border-0 shadow-sm bg-violet-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-lg font-black text-violet-700">{avgConfidence}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800">Average Duplicate Confidence</p>
              <p className="text-xs text-violet-600">{alerts.length} total alerts · Engine v2.0</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Status</p>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="confirmed_duplicate">Confirmed</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Alert Type</p>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Severity</p>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Community</p>
              <Input className="h-8 text-xs" placeholder="Filter community…" value={filterCommunity} onChange={e => setFilterCommunity(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="alerts" className="text-xs">Alerts ({filteredAlerts.length})</TabsTrigger>
          <TabsTrigger value="high_confidence" className="text-xs">High Confidence ({highConfCount})</TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs">Resolved ({confirmedCount + falsePosCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
          {!isLoading && filteredAlerts.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium">No alerts match your filters</p>
                <p className="text-xs text-muted-foreground">The detection engine is running. New alerts appear here.</p>
              </CardContent>
            </Card>
          )}

          {filteredAlerts.map(alert => (
            <Card key={alert.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Copy className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity?.toUpperCase()}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[alert.status]}`}>{alert.status?.replace(/_/g," ")}</span>
                        {alert.confidence_level && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CONFIDENCE_COLORS[alert.confidence_level]}`}>
                            {alert.confidence_level}
                          </span>
                        )}
                      </div>

                      {/* Confidence Bar */}
                      {alert.confidence_score !== undefined && (
                        <div className="mb-2">
                          <ConfidenceBar score={alert.confidence_score} />
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {alert.confidence_score >= 90 ? 'Near-certain duplicate — investigate immediately' :
                             alert.confidence_score >= 70 ? 'Probable duplicate — review required' :
                             'Possible duplicate — verify manually'}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Source: <span className="font-mono font-medium">{alert.source_parcel_number || alert.source_parcel_id?.slice(0,8)}</span>
                        {alert.conflicting_parcel_number && <> → <span className="font-mono font-medium">{alert.conflicting_parcel_number}</span></>}
                      </p>
                      {alert.gps_distance_m && <p className="text-xs text-muted-foreground">Distance: {alert.gps_distance_m}m</p>}
                      {alert.overlap_percentage && <p className="text-xs text-muted-foreground">Overlap: {alert.overlap_percentage}%</p>}
                      {alert.detection_details && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate font-mono">{alert.detection_details}</p>
                      )}
                    </div>
                  </div>
                  {alert.status === "open" && (
                    <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setSelectedAlert(alert)}>
                      <Eye className="w-3 h-3 mr-1" />Review
                    </Button>
                  )}
                </div>

                {/* Inline review panel */}
                {selectedAlert?.id === alert.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <p className="text-xs font-semibold">Investigation Outcome</p>
                    <Select value={reviewOutcome} onValueChange={setReviewOutcome}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed_duplicate">Confirmed Duplicate — Block Parcel</SelectItem>
                        <SelectItem value="false_positive">False Positive — Clear Alert</SelectItem>
                        <SelectItem value="under_review">Still Under Review</SelectItem>
                        <SelectItem value="dismissed">Dismiss — No Action</SelectItem>
                      </SelectContent>
                    </Select>
                    <textarea
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Investigation notes (required for audit trail)…"
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
        </TabsContent>

        <TabsContent value="high_confidence" className="mt-4 space-y-3">
          {alerts.filter(a => a.confidence_score >= 90).map(alert => (
            <Card key={alert.id} className="border-0 shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-sm">{TYPE_LABELS[alert.alert_type]}</span>
                  <Badge className="text-[10px] bg-red-100 text-red-700">{alert.confidence_score}% confidence</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {alert.source_parcel_number} ↔ {alert.conflicting_parcel_number}
                </p>
                {alert.gps_distance_m && <p className="text-xs text-red-600 font-medium">Only {alert.gps_distance_m}m apart</p>}
              </CardContent>
            </Card>
          ))}
          {alerts.filter(a => a.confidence_score >= 90).length === 0 && (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No high-confidence duplicates detected.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {alerts.filter(a => ["confirmed_duplicate","false_positive","dismissed"].includes(a.status)).map(alert => (
            <Card key={alert.id} className="border-0 shadow-sm opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {alert.status === "false_positive" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{TYPE_LABELS[alert.alert_type]}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[alert.status]}`}>{alert.status.replace(/_/g," ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.source_parcel_number} ↔ {alert.conflicting_parcel_number}</p>
                    {alert.review_notes && <p className="text-xs text-muted-foreground mt-1 italic">"{alert.review_notes}"</p>}
                    {alert.reviewed_at && <p className="text-[10px] text-muted-foreground mt-1">Reviewed: {new Date(alert.reviewed_at).toLocaleDateString()}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {alerts.filter(a => ["confirmed_duplicate","false_positive","dismissed"].includes(a.status)).length === 0 && (
            <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">No resolved alerts yet.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}