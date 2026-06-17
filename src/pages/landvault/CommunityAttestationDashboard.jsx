import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Building2, Award, Clock, CheckCircle2, Plus, FileText, Scale, TrendingUp, MapPin, Search } from "lucide-react";

const ROLE_LABELS = {
  FAMILY_HEAD: "Family Head", KINDRED_HEAD: "Kindred Head", VILLAGE_CHAIRMAN: "Village Chairman",
  TRADITIONAL_RULER: "Traditional Ruler", COMMUNITY_DEVELOPMENT_UNION: "CDU", LAND_COMMITTEE_MEMBER: "Land Committee",
  RELIGIOUS_LEADER: "Religious Leader", SURVEYOR_WITNESS: "Surveyor Witness", COMMUNITY_WITNESS: "Community Witness",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLARIFICATION_REQUIRED: "bg-blue-100 text-blue-700",
};

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 text-center">
        <Icon className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
        <p className="text-xl md:text-2xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[9px] text-emerald-700 font-medium">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function CommunityAttestationDashboard() {
  const { data: attestations = [], isLoading } = useQuery({
    queryKey: ["community-attestations-all"],
    queryFn: () => base44.entities.CommunityAttestation.filter({}, "-created_date", 500),
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ["trust-parcels"],
    queryFn: async () => { try { return await base44.entities.LandVaultParcel.filter({}, "-created_date", 1000); } catch { return []; } },
    staleTime: 120_000,
  });

  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading attestations…</div>;

  const total = attestations.length;
  const pending = attestations.filter(a => a.verification_status === "PENDING").length;
  const approved = attestations.filter(a => a.verification_status === "APPROVED").length;
  const rejected = attestations.filter(a => a.verification_status === "REJECTED").length;
  const communities = [...new Set(attestations.map(a => a.community_name).filter(Boolean))];
  const traditionalInst = attestations.filter(a => a.traditional_institution_verified).length;
  const parcelsWithAttest = [...new Set(attestations.map(a => a.parcel_id))].length;
  const avgImpact = approved ? Math.round(attestations.filter(a => a.verification_status === "APPROVED").reduce((s, a) => s + (a.confidence_impact || 0), 0) / approved) : 0;

  const recent = [...attestations].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
      {/* Legal Disclaimer */}
      <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-800">
            <p className="font-semibold">Community Attestations are preserved as evidence only.</p>
            <p>They do not determine ownership, replace title systems, replace courts, or replace government land administration systems.</p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-emerald-600" />Community Attestation Engine</h1>
          <p className="text-sm text-muted-foreground">Preserve local knowledge · Strengthen evidence confidence</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/community-attestation/new"><Button className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4" />Submit Attestation</Button></Link>
          <Link to="/community-attestation/review"><Button variant="outline" className="gap-2"><Search className="w-4 h-4" />Admin Review</Button></Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <StatCard label="Total Attestations" value={total} icon={FileText} />
        <StatCard label="Pending Review" value={pending} icon={Clock} />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} />
        <StatCard label="Rejected" value={rejected} icon={Shield} />
        <StatCard label="Communities" value={communities.length} icon={Building2} />
        <StatCard label="Traditional Institutions" value={traditionalInst} icon={Award} />
        <StatCard label="Parcels Attested" value={parcelsWithAttest} icon={MapPin} />
        <StatCard label="Avg Confidence Impact" value={`+${avgImpact}`} icon={TrendingUp} sub="points per attestation" />
      </div>

      {/* Recent Activity Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold">Attestor</th>
                <th className="text-left p-3 font-semibold">Parcel</th>
                <th className="text-left p-3 font-semibold hidden sm:table-cell">Community</th>
                <th className="text-left p-3 font-semibold hidden md:table-cell">Role</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-left p-3 font-semibold hidden sm:table-cell">Date</th>
                <th className="text-left p-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground italic">No attestations yet. Community knowledge awaits preservation.</td></tr>
              ) : recent.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-emerald-50/30">
                  <td className="p-3 font-medium">{a.attestor_name}</td>
                  <td className="p-3 font-mono text-[10px]">{a.parcel_number || "—"}</td>
                  <td className="p-3 hidden sm:table-cell">{a.community_name || "—"}</td>
                  <td className="p-3 hidden md:table-cell">{ROLE_LABELS[a.attestor_role] || a.attestor_role}</td>
                  <td className="p-3"><Badge className={`text-[10px] ${STATUS_COLORS[a.verification_status] || ""}`}>{a.verification_status?.replace(/_/g, " ")}</Badge></td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{a.created_date ? new Date(a.created_date).toLocaleDateString() : "—"}</td>
                  <td className="p-3">
                    <Link to={`/community-attestation/${a.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs h-6 text-emerald-700">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Community Evidence Network */}
      <div className="text-center py-6 space-y-2">
        <p className="text-sm font-semibold text-emerald-700">Every attestation strengthens the evidence network.</p>
        <p className="text-xs text-muted-foreground">Community attestations do not determine ownership. They preserve local knowledge as evidence.</p>
      </div>
    </div>
  );
}