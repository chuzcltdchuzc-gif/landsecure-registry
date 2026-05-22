import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, GitBranch, Map, ArrowRight, ChevronDown, ChevronUp, Award, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Color palette for family branches
const BRANCH_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

export default function FamilyLineageOverlay({ parcel, onClose }) {
  const [expanded, setExpanded] = useState({ ownership: true, beneficiaries: false, cases: false, allocations: false });
  const navigate = useNavigate();

  const { data: familyOwnerships = [] } = useQuery({
    queryKey: ["gis-family-ownerships", parcel?.id],
    queryFn: () => base44.entities.FamilyOwnership.filter({ parcel_id: parcel.id }, "-created_date", 10),
    enabled: !!parcel?.id,
  });

  const primaryOwnership = familyOwnerships[0];

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["gis-beneficiaries", primaryOwnership?.id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ family_ownership_id: primaryOwnership.id, is_deleted: false }, "-created_date", 50),
    enabled: !!primaryOwnership?.id,
  });

  const { data: inheritanceCases = [] } = useQuery({
    queryKey: ["gis-inheritance-cases", parcel?.id],
    queryFn: () => base44.entities.InheritanceCase.filter({ parcel_id: parcel.id, is_deleted: false }, "-created_date", 10),
    enabled: !!parcel?.id,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["gis-allocations", parcel?.id],
    queryFn: () => base44.entities.PlotAllocation.filter({ parcel_id: parcel.id, is_deleted: false }, "-created_date", 20),
    enabled: !!parcel?.id,
  });

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  // Build successor chains — group by generation
  const byGeneration = beneficiaries.reduce((acc, b) => {
    const gen = b.generation_level || 1;
    acc[gen] = acc[gen] || [];
    acc[gen].push(b);
    return acc;
  }, {});
  const generations = Object.keys(byGeneration).sort((a, b) => a - b);

  if (!parcel) return null;

  return (
    <div className="absolute right-4 top-4 z-[500] w-80 max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-border">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-primary/5">
        <div>
          <p className="text-xs font-bold text-primary">Parcel #{parcel.parcel_number}</p>
          <p className="text-[11px] text-muted-foreground truncate max-w-52">{parcel.owner_name}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>

      <div className="p-3 space-y-3">
        {/* Current Ownership */}
        <SectionHeader
          icon={Map}
          title="Current Ownership"
          color="text-blue-600"
          expanded={expanded.ownership}
          onToggle={() => toggle("ownership")}
        />
        {expanded.ownership && (
          <div className="text-xs space-y-1 ml-5">
            <Row label="Owner" value={parcel.owner_name} />
            <Row label="Land Use" value={parcel.land_use} />
            <Row label="Status" value={parcel.status} />
            {parcel.size_hectares && <Row label="Size" value={`${parcel.size_hectares} ha`} />}
          </div>
        )}

        {/* Family Ownership */}
        {primaryOwnership && (
          <>
            <SectionHeader
              icon={Users}
              title={`Family: ${primaryOwnership.family_name}`}
              color="text-emerald-600"
              expanded={expanded.beneficiaries}
              onToggle={() => toggle("beneficiaries")}
              badge={`${beneficiaries.length} members`}
            />
            {expanded.beneficiaries && (
              <div className="ml-5 space-y-2">
                <div className="text-xs space-y-1">
                  <Row label="Head" value={primaryOwnership.family_head} />
                  {primaryOwnership.clan_name && <Row label="Clan" value={primaryOwnership.clan_name} />}
                  {primaryOwnership.village && <Row label="Village" value={primaryOwnership.village} />}
                  {primaryOwnership.family_lineage && <Row label="Lineage" value={primaryOwnership.family_lineage} capitalize />}
                </div>

                {/* Lineage tree by generation */}
                {generations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Beneficiary Hierarchy</p>
                    {generations.map((gen, gi) => (
                      <div key={gen}>
                        <p className="text-[10px] text-muted-foreground mb-1">Generation {gen}</p>
                        <div className="space-y-1">
                          {byGeneration[gen].map((b, bi) => (
                            <div
                              key={b.id}
                              className="flex items-center gap-2 p-1.5 rounded text-[11px]"
                              style={{ borderLeft: `3px solid ${BRANCH_COLORS[(bi + gi) % BRANCH_COLORS.length]}` }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{b.full_name}</p>
                                <p className="text-muted-foreground">{b.relationship} · {b.percentage_share}%</p>
                              </div>
                              <Badge className={`text-[9px] flex-shrink-0 ${b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                {b.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        {gi < generations.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Inheritance Cases */}
        {inheritanceCases.length > 0 && (
          <>
            <SectionHeader
              icon={GitBranch}
              title="Inheritance Cases"
              color="text-purple-600"
              expanded={expanded.cases}
              onToggle={() => toggle("cases")}
              badge={`${inheritanceCases.length}`}
            />
            {expanded.cases && (
              <div className="ml-5 space-y-2">
                {inheritanceCases.map(c => (
                  <div key={c.id} className="text-[11px] p-2 bg-muted/30 rounded space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary">{c.case_reference}</span>
                      <Badge className={`text-[9px] capitalize ${c.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground capitalize">{c.case_type?.replace(/_/g, " ")}</p>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs w-full gap-1"
                  onClick={() => navigate("/inheritance")}
                >
                  <GitBranch className="w-3 h-3" /> Open in Inheritance Mgmt
                </Button>
              </div>
            )}
          </>
        )}

        {/* Plot Allocations */}
        {allocations.length > 0 && (
          <>
            <SectionHeader
              icon={Map}
              title="Plot Allocations"
              color="text-orange-600"
              expanded={expanded.allocations}
              onToggle={() => toggle("allocations")}
              badge={`${allocations.length} plots`}
            />
            {expanded.allocations && (
              <div className="ml-5 space-y-1.5">
                {allocations.map((a, i) => (
                  <div
                    key={a.id}
                    className="text-[11px] p-2 rounded"
                    style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] + "18", borderLeft: `3px solid ${BRANCH_COLORS[i % BRANCH_COLORS.length]}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.planned_plot_number}</span>
                      <span className="text-muted-foreground">{a.allocation_percentage}%</span>
                    </div>
                    <p className="text-muted-foreground">{a.beneficiary_name}</p>
                    {a.area_sqm && <p className="text-muted-foreground">{a.area_sqm} m²</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Navigate button */}
        {primaryOwnership && (
          <Button
            size="sm"
            className="w-full gap-1.5 h-7 text-xs"
            onClick={() => navigate("/inheritance")}
          >
            <GitBranch className="w-3.5 h-3.5" /> Full Inheritance Management
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, expanded, onToggle, badge }) {
  return (
    <button className="flex items-center gap-2 w-full text-left" onClick={onToggle}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
      <span className="text-xs font-semibold flex-1">{title}</span>
      {badge && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{badge}</span>}
      {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

function Row({ label, value, capitalize }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}:</span>
      <span className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}