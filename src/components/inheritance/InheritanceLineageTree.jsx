import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  deceased: "bg-gray-100 text-gray-500",
  missing: "bg-orange-100 text-orange-700",
  transferred: "bg-blue-100 text-blue-700",
  disputed: "bg-red-100 text-red-700",
  under_verification: "bg-amber-100 text-amber-700",
  minor: "bg-purple-100 text-purple-700",
};

function BeneficiaryNode({ ben, allBeneficiaries, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allBeneficiaries.filter(
    (b) => b.parent_beneficiary_id === ben.id && !b.is_deleted
  );
  const hasChildren = children.length > 0;

  return (
    <div className={`${depth > 0 ? "ml-5 border-l-2 border-border pl-3" : ""} mt-2`}>
      <div className="flex items-start gap-2 group">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 border-b-2 border-border inline-block" />
        )}

        <div className="flex items-center gap-2 flex-wrap py-1 px-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors flex-1">
          <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold">{ben.full_name}</span>
          <span className="text-[10px] text-muted-foreground capitalize">({ben.relationship})</span>
          <Badge className={`text-[9px] py-0 px-1.5 ${STATUS_COLORS[ben.status] || "bg-gray-100"}`}>
            {ben.status}
          </Badge>
          {ben.percentage_share > 0 && (
            <span className="text-[10px] font-semibold text-primary ml-auto">
              {ben.percentage_share}%
            </span>
          )}
          {ben.generation_level && (
            <span className="text-[9px] text-muted-foreground">Gen {ben.generation_level}</span>
          )}
          {ben.family_branch && (
            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
              {ben.family_branch}
            </span>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {children
            .sort((a, b) => (a.inheritance_rank || 99) - (b.inheritance_rank || 99))
            .map((child) => (
              <BeneficiaryNode
                key={child.id}
                ben={child}
                allBeneficiaries={allBeneficiaries}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function InheritanceLineageTree({ familyOwnership, beneficiaries }) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No beneficiaries recorded</p>
    );
  }

  // Root nodes = beneficiaries with no parent (or parent not in this set)
  const benIds = new Set(beneficiaries.map((b) => b.id));
  const rootBens = beneficiaries.filter(
    (b) => !b.parent_beneficiary_id || !benIds.has(b.parent_beneficiary_id)
  );

  return (
    <div className="space-y-1">
      {familyOwnership && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold">{familyOwnership.family_head}</p>
            <p className="text-[10px] text-muted-foreground">
              Family Head · {familyOwnership.family_name}
              {familyOwnership.wife_lineage_group && ` · ${familyOwnership.wife_lineage_group}`}
            </p>
          </div>
        </div>
      )}
      {rootBens
        .sort((a, b) => (a.inheritance_rank || 99) - (b.inheritance_rank || 99))
        .map((ben) => (
          <BeneficiaryNode
            key={ben.id}
            ben={ben}
            allBeneficiaries={beneficiaries}
            depth={0}
          />
        ))}
    </div>
  );
}