import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ChevronDown, ChevronUp, Search, GitBranch, MapPin } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  deceased: "bg-gray-100 text-gray-600",
  missing: "bg-amber-100 text-amber-700",
  transferred: "bg-blue-100 text-blue-700",
  disputed: "bg-red-100 text-red-700",
  under_verification: "bg-purple-100 text-purple-700",
  minor: "bg-orange-100 text-orange-700",
};

function BeneficiaryTree({ beneficiaries, parentId = null, depth = 0 }) {
  const children = beneficiaries.filter(b => (b.parent_beneficiary_id || null) === parentId && !b.is_deleted);
  if (children.length === 0) return null;

  return (
    <div className={`space-y-1 ${depth > 0 ? "ml-5 border-l border-emerald-200 pl-3" : ""}`}>
      {children.map(b => (
        <div key={b.id}>
          <div className="flex items-center gap-2 py-1 flex-wrap">
            <span className="text-xs font-medium">{b.full_name}</span>
            <span className="text-[10px] text-muted-foreground capitalize">({b.relationship})</span>
            <Badge className={`text-[10px] ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"}`}>
              {b.status?.replace(/_/g, " ")}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-semibold">{b.percentage_share}%</span>
            {b.family_branch && (
              <span className="text-[10px] text-muted-foreground">[{b.family_branch}]</span>
            )}
          </div>
          <BeneficiaryTree beneficiaries={beneficiaries} parentId={b.id} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function FamilyCard({ fo, cases }) {
  const [expanded, setExpanded] = useState(false);
  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries-fo", fo.id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ family_ownership_id: fo.id, is_deleted: false }, "inheritance_rank", 100),
    enabled: expanded,
  });

  const foCases = cases.filter(c => c.family_ownership_id === fo.id);
  const activeCases = foCases.filter(c => ["submitted", "surveyor_review", "compliance_review", "surveyor_general_review"].includes(c.status));

  return (
    <Card className="border-emerald-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <CardTitle className="text-sm text-emerald-800">{fo.family_name}</CardTitle>
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{fo.status}</Badge>
              {fo.family_lineage && (
                <Badge className="text-[10px] bg-blue-50 text-blue-700 capitalize">{fo.family_lineage}</Badge>
              )}
              {activeCases.length > 0 && (
                <Badge className="text-[10px] bg-amber-100 text-amber-700">
                  {activeCases.length} active case{activeCases.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
              <p><span className="font-medium">Head:</span> {fo.family_head}</p>
              {fo.parent_name && <p><span className="font-medium">Ancestor:</span> {fo.parent_name}</p>}
              {fo.village && <p><span className="font-medium">Village:</span> {fo.village}</p>}
              {fo.community && fo.lga && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {fo.community}, {fo.lga}{fo.state ? `, ${fo.state}` : ""}
                </p>
              )}
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Family details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {fo.clan_name && <div><span className="text-muted-foreground">Clan:</span> <span className="font-medium">{fo.clan_name}</span></div>}
            {fo.wife_lineage_group && <div><span className="text-muted-foreground">Lineage Group:</span> <span className="font-medium">{fo.wife_lineage_group}</span></div>}
            {fo.family_branch && <div><span className="text-muted-foreground">Branch:</span> <span className="font-medium">{fo.family_branch}</span></div>}
            {fo.generation_level && <div><span className="text-muted-foreground">Generation:</span> <span className="font-medium">{fo.generation_level}</span></div>}
            {fo.family_representative && <div className="col-span-2"><span className="text-muted-foreground">Representative:</span> <span className="font-medium">{fo.family_representative}</span></div>}
          </div>

          {fo.family_notes && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-300 pl-2">{fo.family_notes}</p>
          )}

          {/* Lineage tree */}
          {beneficiaries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-emerald-600" /> Inheritance Tree
              </p>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-emerald-800 mb-2">
                  {fo.family_head} <span className="text-muted-foreground font-normal">(Family Head)</span>
                </div>
                <BeneficiaryTree beneficiaries={beneficiaries} parentId={null} depth={0} />
              </div>
            </div>
          )}

          {/* Cases summary */}
          {foCases.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Inheritance Cases ({foCases.length})</p>
              <div className="space-y-1.5">
                {foCases.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-border">
                    <span className="font-mono font-medium">
                      {c.case_reference || `CASE-${c.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <span className="capitalize text-muted-foreground">{c.case_type?.replace(/_/g, " ")}</span>
                    <Badge className={`text-[10px] capitalize ${
                      c.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {c.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function FamilyLineagePanel({ familyOwnerships, cases, user }) {
  const [search, setSearch] = useState("");
  const filtered = familyOwnerships.filter(fo =>
    !search ||
    fo.family_name?.toLowerCase().includes(search.toLowerCase()) ||
    fo.community?.toLowerCase().includes(search.toLowerCase()) ||
    fo.lga?.toLowerCase().includes(search.toLowerCase()) ||
    fo.family_head?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by family name, community, LGA or family head..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No family records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(fo => (
            <FamilyCard key={fo.id} fo={fo} cases={cases} />
          ))}
        </div>
      )}
    </div>
  );
}