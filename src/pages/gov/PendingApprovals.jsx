import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  FileText, Search, MapPin, User, Calendar, ExternalLink, Filter,
  CheckCircle2, Clock, AlertTriangle, GitBranch, ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";

export default function PendingApprovals() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [landUseFilter, setLandUseFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("registrations"); // registrations | revisions

  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["pending-parcels-approval"],
    queryFn: () => base44.entities.LandParcel.filter({ status: "pending" }, "-created_date", 200),
  });

  const { data: surveyDocs = [] } = useQuery({
    queryKey: ["survey-docs-pending"],
    queryFn: () => base44.entities.SurveyDocument.filter({ review_status: "pending" }, "-created_date", 200),
  });

  const { data: revisionRequests = [] } = useQuery({
    queryKey: ["revision-requests-pending"],
    queryFn: () => base44.entities.ParcelRevision.filter({ status: "pending" }, "-created_date", 100),
  });

  const reviewRevisionMutation = useMutation({
    mutationFn: async ({ revision, decision, notes }) => {
      await base44.entities.ParcelRevision.update(revision.id, {
        status: decision,
        reviewed_by: user?.email,
        review_notes: notes,
        reviewed_date: new Date().toISOString(),
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `${decision === "approved" ? "Approved" : "Rejected"} revision request for parcel ${revision.parcel_number}`,
        entity_type: "ParcelRevision",
        entity_id: revision.id,
        details: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revision-requests-pending"] });
      toast.success("Revision request reviewed");
    },
  });

  if (isLoading) return <LoadingSpinner text="Loading pending approvals..." />;

  // Build a set of parcel IDs with pending survey docs for quick lookup
  const parcelsWithPendingDocs = new Set(surveyDocs.map(d => d.parcel_id));

  const filtered = parcels.filter(p => {
    const matchesSearch =
      !search ||
      p.parcel_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase());
    const matchesLandUse = landUseFilter === "all" || p.land_use === landUseFilter;
    const matchesVerification = verificationFilter === "all" || p.verification_status === verificationFilter;
    return matchesSearch && matchesLandUse && matchesVerification;
  });

  const withDocs = filtered.filter(p => parcelsWithPendingDocs.has(p.id));
  const withoutDocs = filtered.filter(p => !parcelsWithPendingDocs.has(p.id));

  const verificationColor = {
    unverified: "bg-gray-100 text-gray-600",
    field_verified: "bg-blue-100 text-blue-700",
    survey_verified: "bg-amber-100 text-amber-700",
    fully_verified: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Pending Registration Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Land registration documents awaiting final compliance approval
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 font-medium">{filtered.length} pending</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("registrations")}
          className={`text-sm font-medium pb-2 px-1 border-b-2 transition-colors ${activeTab === "registrations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Registrations ({filtered?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("revisions")}
          className={`text-sm font-medium pb-2 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "revisions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Revision Requests ({revisionRequests.length})
          {revisionRequests.length > 0 && <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">{revisionRequests.length}</span>}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-700">{withDocs.length}</p>
              <p className="text-xs text-muted-foreground">With Survey Docs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">
                {filtered.filter(p => p.verification_status === "fully_verified").length}
              </p>
              <p className="text-xs text-muted-foreground">Fully Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-orange-700">
                {filtered.filter(p => p.verification_status === "unverified").length}
              </p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters — registration tab only */}
      {activeTab === "registrations" && <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by parcel number, owner, address, or state..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={landUseFilter} onValueChange={setLandUseFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Land Use" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Land Uses</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="agricultural">Agricultural</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="mixed_use">Mixed Use</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="field_verified">Field Verified</SelectItem>
                <SelectItem value="survey_verified">Survey Verified</SelectItem>
                <SelectItem value="fully_verified">Fully Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>}

      {/* Ready for Approval (has pending survey docs) */}
      {activeTab === "registrations" && withDocs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Documents Submitted — Ready for Review
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">{withDocs.length}</Badge>
          </h2>
          <div className="space-y-3">
            {withDocs.map(parcel => (
              <ParcelRow
                key={parcel.id}
                parcel={parcel}
                hasDocs={true}
                pendingDocCount={surveyDocs.filter(d => d.parcel_id === parcel.id).length}
                verificationColor={verificationColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Documentation */}
      {activeTab === "registrations" && withoutDocs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Awaiting Documentation
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">{withoutDocs.length}</Badge>
          </h2>
          <div className="space-y-3">
            {withoutDocs.map(parcel => (
              <ParcelRow
                key={parcel.id}
                parcel={parcel}
                hasDocs={false}
                pendingDocCount={0}
                verificationColor={verificationColor}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "registrations" && filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No pending approvals</p>
            <p className="text-xs text-muted-foreground mt-1">All land registrations are up to date</p>
          </CardContent>
        </Card>
      )}

      {/* Revision Requests Tab */}
      {activeTab === "revisions" && (
        <div className="space-y-3">
          {revisionRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No pending revision requests</p>
              </CardContent>
            </Card>
          ) : (
            revisionRequests.map((r) => (
              <RevisionRow key={r.id} revision={r} onReview={reviewRevisionMutation.mutate} isLoading={reviewRevisionMutation.isPending} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RevisionRow({ revision, onReview, isLoading }) {
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-amber-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold font-mono">#{revision.parcel_number}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize">
                {revision.revision_type?.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Requested by: {revision.requested_by_name || revision.requested_by}</p>
            <p className="text-xs text-foreground mt-1">{revision.justification}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(revision.created_date), "MMM d, yyyy")}</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse" : "Review"}
          </Button>
        </div>
        {expanded && (
          <div className="pt-3 border-t border-border space-y-3">
            <div>
              <Label className="text-xs">Review Notes</Label>
              <Textarea
                placeholder="Add review notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => onReview({ revision, decision: "approved", notes })}
                disabled={isLoading}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReview({ revision, decision: "rejected", notes })}
                disabled={isLoading}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ParcelRow({ parcel, hasDocs, pendingDocCount, verificationColor }) {
  return (
    <Card className={`border ${hasDocs ? "border-blue-200" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Parcel info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground font-mono">
                #{parcel.parcel_number}
              </span>
              {hasDocs && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                  {pendingDocCount} doc{pendingDocCount !== 1 ? "s" : ""} pending
                </Badge>
              )}
              <Badge className={`text-[10px] capitalize ${verificationColor[parcel.verification_status] || "bg-gray-100 text-gray-600"}`}>
                {parcel.verification_status?.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{parcel.owner_name}</span>
              {parcel.owner_email && (
                <span className="text-muted-foreground text-xs">({parcel.owner_email})</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{parcel.address}{parcel.lga ? `, ${parcel.lga}` : ""}{parcel.state ? `, ${parcel.state}` : ""}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {parcel.size_hectares && (
                <span>{parcel.size_hectares} ha</span>
              )}
              {parcel.land_use && (
                <span className="capitalize">{parcel.land_use.replace(/_/g, " ")}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Submitted {format(new Date(parcel.created_date), "MMM d, yyyy")}
              </span>
              {parcel.registered_by && (
                <span>by {parcel.registered_by}</span>
              )}
            </div>
          </div>

          {/* Documents & action */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
            {parcel.survey_plan_url && (
              <a
                href={parcel.survey_plan_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Survey Plan
                </Button>
              </a>
            )}
            {parcel.cad_file_url && (
              <a
                href={parcel.cad_file_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  CAD File
                </Button>
              </a>
            )}
            {!parcel.survey_plan_url && !parcel.cad_file_url && (
              <span className="text-[10px] text-muted-foreground italic">No documents uploaded</span>
            )}
          </div>
        </div>

        {parcel.notes && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {parcel.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}