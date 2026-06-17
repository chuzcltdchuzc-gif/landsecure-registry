import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileText, Users, Clock, MessageSquare, Scale } from "lucide-react";

const ROLE_LABELS = {
  FAMILY_HEAD: "Family Head", KINDRED_HEAD: "Kindred Head", VILLAGE_CHAIRMAN: "Village Chairman",
  TRADITIONAL_RULER: "Traditional Ruler", COMMUNITY_DEVELOPMENT_UNION: "CDU",
  LAND_COMMITTEE_MEMBER: "Land Committee", RELIGIOUS_LEADER: "Religious Leader",
  SURVEYOR_WITNESS: "Surveyor Witness", COMMUNITY_WITNESS: "Community Witness",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLARIFICATION_REQUIRED: "bg-blue-100 text-blue-700",
};

const REJECTION_REASONS = [
  "Insufficient Evidence", "Role Not Verified", "Community Not Verified",
  "Conflicting Evidence", "Need More Information", "Other",
];

export default function CommunityAttestationReview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: attestations = [], isLoading } = useQuery({
    queryKey: ["community-attestations-review"],
    queryFn: () => base44.entities.CommunityAttestation.filter({}, "-created_date", 200),
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ["trust-parcels"],
    queryFn: async () => { try { return await base44.entities.LandVaultParcel.filter({}, "-created_date", 1000); } catch { return []; } },
    staleTime: 120_000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ attestationId, data }) => base44.entities.CommunityAttestation.update(attestationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-attestations-review"] });
      qc.invalidateQueries({ queryKey: ["community-attestations-all"] });
      qc.invalidateQueries({ queryKey: ["trust-parcels"] });
      setReviewNotes("");
      setRejectionReason("");
    },
  });

  const pendingAttestations = attestations.filter(a => a.verification_status === "PENDING" || a.verification_status === "CLARIFICATION_REQUIRED");
  const reviewedAttestations = attestations.filter(a => a.verification_status === "APPROVED" || a.verification_status === "REJECTED");

  // Detail view for specific attestation
  const detailAttestation = id ? attestations.find(a => a.id === id) : null;
  const detailParcel = detailAttestation ? parcels.find(p => p.id === detailAttestation.parcel_id) : null;

  if (id && detailAttestation) {
    const parcelAttestations = attestations.filter(a => a.parcel_id === detailAttestation.parcel_id && a.id !== detailAttestation.id);
    const checklistItems = (() => { try { return JSON.parse(detailAttestation.evidence_review_checklist || "[]"); } catch { return []; } })();

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/community-attestation/review")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold">Attestation Review</h1>
        </div>

        {/* Disclaimer */}
        <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Admin review does not determine ownership.</p>
              <p>Approval confirms evidence quality only. Attestations remain preserved as evidence.</p>
            </div>
          </CardContent>
        </Card>

        {/* Attestation Details */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                <span className="font-mono">{detailAttestation.attestation_id}</span>
              </CardTitle>
              <Badge className={`text-[10px] ${STATUS_COLORS[detailAttestation.verification_status] || ""}`}>
                {detailAttestation.verification_status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Attestor:</span> <span className="font-medium">{detailAttestation.attestor_name}</span></div>
              <div><span className="text-muted-foreground">Role:</span> {ROLE_LABELS[detailAttestation.attestor_role] || detailAttestation.attestor_role}</div>
              <div><span className="text-muted-foreground">Community:</span> {detailAttestation.community_name || "—"}</div>
              <div><span className="text-muted-foreground">Relationship:</span> {detailAttestation.relationship_to_land}</div>
              <div><span className="text-muted-foreground">Years of Knowledge:</span> {detailAttestation.years_of_knowledge || "—"}</div>
              <div><span className="text-muted-foreground">Consensus:</span> <Badge className={`text-[9px] ${detailAttestation.consensus_contribution === "SUPPORTING" ? "bg-emerald-100 text-emerald-700" : detailAttestation.consensus_contribution === "CONFLICTING" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{detailAttestation.consensus_contribution}</Badge></div>
              <div><span className="text-muted-foreground">Confidence Impact:</span> <span className="font-bold">+{detailAttestation.confidence_impact}</span></div>
              <div><span className="text-muted-foreground">Special Badge:</span> {detailAttestation.special_badge !== "NONE" ? <Badge className="text-[9px] bg-violet-100 text-violet-700">{detailAttestation.special_badge?.replace(/_/g, " ")}</Badge> : "—"}</div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Attestation Statement:</p>
              <div className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{detailAttestation.attestation_statement}</div>
            </div>

            {detailAttestation.supporting_evidence_notes && (
              <div>
                <p className="text-muted-foreground mb-1">Supporting Evidence:</p>
                <div className="bg-muted/50 rounded-lg p-3">{detailAttestation.supporting_evidence_notes}</div>
              </div>
            )}

            {/* Checklist */}
            <div>
              <p className="text-muted-foreground mb-1">Evidence Review Checklist ({checklistItems.length}/6):</p>
              <div className="flex flex-wrap gap-1">
                {["Survey Plan Reviewed", "Coordinates Reviewed", "Community Location Confirmed", "Family Connection Reviewed", "Boundary Knowledge Confirmed", "Supporting Documents Reviewed"].map(item => (
                  <Badge key={item} className={`text-[9px] ${checklistItems.includes(item) ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {checklistItems.includes(item) ? <CheckCircle2 className="w-3 h-3 mr-0.5 inline" /> : null}{item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parcel Information */}
        {detailParcel && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parcel Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Reference:</span> <span className="font-mono">{detailParcel.parcel_number || "Draft"}</span></div>
              <div><span className="text-muted-foreground">Community:</span> {detailParcel.community}</div>
              <div><span className="text-muted-foreground">Ward:</span> {detailParcel.ward}</div>
              <div><span className="text-muted-foreground">LGA:</span> {detailParcel.lga}</div>
              <div><span className="text-muted-foreground">Evidence Score:</span> <span className="font-bold text-emerald-700">{detailParcel.evidence_confidence_score || 0}/100</span></div>
              <div><span className="text-muted-foreground">Status:</span> {detailParcel.status?.replace(/_/g, " ")}</div>
              {detailParcel.surveyor_name && <div><span className="text-muted-foreground">Surveyor:</span> {detailParcel.surveyor_name}</div>}
            </CardContent>
          </Card>
        )}

        {/* Existing Attestations */}
        {parcelAttestations.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Other Attestations for this Parcel ({parcelAttestations.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {parcelAttestations.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <div>
                    <span className="font-medium">{a.attestor_name}</span>
                    <span className="text-muted-foreground ml-2">{ROLE_LABELS[a.attestor_role]}</span>
                  </div>
                  <Badge className={`text-[9px] ${STATUS_COLORS[a.verification_status] || ""}`}>{a.verification_status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Review Actions */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" />Review Decision</h3>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Review Notes</p>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Enter review notes…" className="h-24" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Rejection Reason (if rejecting)</p>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason…" /></SelectTrigger>
                <SelectContent>{REJECTION_REASONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <Button onClick={() => reviewMutation.mutate({ attestationId: detailAttestation.id, data: { verification_status: "APPROVED", reviewed_by: "admin", reviewed_at: new Date().toISOString(), review_notes: reviewNotes } })}
                disabled={reviewMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm">
                <CheckCircle2 className="w-4 h-4" />Approve
              </Button>
              <Button onClick={() => reviewMutation.mutate({ attestationId: detailAttestation.id, data: { verification_status: "REJECTED", reviewed_by: "admin", reviewed_at: new Date().toISOString(), review_notes: reviewNotes, rejection_reason: rejectionReason || "Other" } })}
                disabled={reviewMutation.isPending} variant="destructive" className="gap-2 text-sm">
                <XCircle className="w-4 h-4" />Reject
              </Button>
              <Button onClick={() => reviewMutation.mutate({ attestationId: detailAttestation.id, data: { verification_status: "CLARIFICATION_REQUIRED", reviewed_by: "admin", reviewed_at: new Date().toISOString(), review_notes: reviewNotes } })}
                disabled={reviewMutation.isPending} variant="outline" className="gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />Request Clarification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/community-attestation")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" />Attestation Review</h1>
          <p className="text-sm text-muted-foreground">Admin review: Approve, reject, or request clarification</p>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Approval confirms evidence quality only.</p>
            <p>Approved attestations do not determine ownership or replace legal processes.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-2 w-64">
          <TabsTrigger value="pending" className="text-xs">Pending ({pendingAttestations.length})</TabsTrigger>
          <TabsTrigger value="reviewed" className="text-xs">Reviewed ({reviewedAttestations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-semibold">ID</th>
                    <th className="text-left p-3 font-semibold">Attestor</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Role</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Parcel</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Community</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Date</th>
                    <th className="text-left p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAttestations.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground italic">No pending attestations.</td></tr>
                  ) : pendingAttestations.map(a => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-emerald-50/30">
                      <td className="p-3 font-mono text-[10px]">{a.attestation_id}</td>
                      <td className="p-3 font-medium">{a.attestor_name}</td>
                      <td className="p-3 hidden sm:table-cell">{ROLE_LABELS[a.attestor_role] || a.attestor_role}</td>
                      <td className="p-3 font-mono text-[10px] hidden md:table-cell">{a.parcel_number || "—"}</td>
                      <td className="p-3 hidden md:table-cell">{a.community_name || "—"}</td>
                      <td className="p-3"><Badge className={`text-[9px] ${STATUS_COLORS[a.verification_status] || ""}`}>{a.verification_status?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{a.created_date ? new Date(a.created_date).toLocaleDateString() : "—"}</td>
                      <td className="p-3">
                        <Button size="sm" variant="ghost" className="text-xs h-6 text-emerald-700" onClick={() => navigate(`/community-attestation/review/${a.id}`)}>Review</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-semibold">ID</th>
                    <th className="text-left p-3 font-semibold">Attestor</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Role</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Parcel</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Reviewer</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewedAttestations.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground italic">No reviewed attestations yet.</td></tr>
                  ) : reviewedAttestations.map(a => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="p-3 font-mono text-[10px]">{a.attestation_id}</td>
                      <td className="p-3 font-medium">{a.attestor_name}</td>
                      <td className="p-3 hidden sm:table-cell">{ROLE_LABELS[a.attestor_role] || a.attestor_role}</td>
                      <td className="p-3 font-mono text-[10px] hidden md:table-cell">{a.parcel_number || "—"}</td>
                      <td className="p-3"><Badge className={`text-[9px] ${STATUS_COLORS[a.verification_status] || ""}`}>{a.verification_status}</Badge></td>
                      <td className="p-3 hidden sm:table-cell">{a.reviewed_by || "—"}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}