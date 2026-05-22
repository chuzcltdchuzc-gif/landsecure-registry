import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, TreePine, ArrowRightLeft, ChevronDown, ChevronUp,
  Building2, Droplets, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const BENEFICIARY_STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  deceased: "bg-gray-100 text-gray-600",
  transferred: "bg-blue-100 text-blue-700",
  disputed: "bg-red-100 text-red-700",
  minor: "bg-amber-100 text-amber-700",
};

function AssetRow({ icon: Icon, label, value, color = "text-emerald-600" }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InheritanceTransferCard({ ownership, beneficiary, parcel, user, onSuccess }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [transferType, setTransferType] = useState("family_inheritance");
  const [open, setOpen] = useState(false);

  const transferMutation = useMutation({
    mutationFn: async () => {
      // Update beneficiary status
      await base44.entities.FamilyBeneficiary.update(beneficiary.id, {
        status: "transferred",
      });
      // Create ownership history
      await base44.entities.OwnershipHistory.create({
        parcel_id: parcel.id,
        parcel_number: parcel.parcel_number,
        from_owner: ownership.family_name,
        to_owner: beneficiary.full_name,
        transfer_type: transferType,
        transfer_date: new Date().toISOString().split("T")[0],
        family_ownership_id: ownership.id,
        beneficiary_id: beneficiary.id,
        status: "pending",
        notes: notes || `Inheritance transfer to ${beneficiary.full_name} (${beneficiary.relationship})`,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Initiated inheritance transfer for parcel ${parcel.parcel_number}`,
        entity_type: "OwnershipHistory",
        details: `Transferred to ${beneficiary.full_name} from ${ownership.family_name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownership-history", parcel.id] });
      queryClient.invalidateQueries({ queryKey: ["family-beneficiaries", ownership.id] });
      toast.success(`Inheritance transfer initiated for ${beneficiary.full_name}`);
      setOpen(false);
      onSuccess?.();
    },
  });

  if (beneficiary.status !== "active") return null;

  return (
    <div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-[10px] text-primary px-1"
        onClick={() => setOpen(!open)}
      >
        <ArrowRightLeft className="w-3 h-3 mr-1" />
        Transfer
      </Button>
      {open && (
        <div className="mt-2 p-3 border border-border rounded-lg bg-muted/30 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Transfer Type</Label>
            <Select value={transferType} onValueChange={setTransferType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="family_inheritance">Family Inheritance</SelectItem>
                <SelectItem value="family_partition">Family Partition</SelectItem>
                <SelectItem value="customary_allocation">Customary Allocation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Reason or customary context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-white"
              onClick={() => transferMutation.mutate()}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Processing..." : "Confirm Transfer"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyOwnershipPanel({ parcel, user }) {
  const [expandedFO, setExpandedFO] = useState(null);

  const { data: familyOwnerships = [], isLoading } = useQuery({
    queryKey: ["family-ownership", parcel.id],
    queryFn: () => base44.entities.FamilyOwnership.filter({ parcel_id: parcel.id }, "-created_date", 20),
    enabled: !!parcel.id,
  });

  const { data: allBeneficiaries = [] } = useQuery({
    queryKey: ["family-beneficiaries-all", parcel.id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ parcel_id: parcel.id }, "inheritance_rank", 100),
    enabled: !!parcel.id,
  });

  const { data: ownershipHistory = [] } = useQuery({
    queryKey: ["ownership-history", parcel.id],
    queryFn: () => base44.entities.OwnershipHistory.filter({ parcel_id: parcel.id }, "-created_date", 30),
    enabled: !!parcel.id,
  });

  if (isLoading) return null;
  if (familyOwnerships.length === 0) return null;

  return (
    <div className="space-y-3">
      {familyOwnerships.map((fo) => {
        const bens = allBeneficiaries.filter((b) => b.family_ownership_id === fo.id);
        const isExpanded = expandedFO === fo.id;
        const totalShare = bens.reduce((s, b) => s + (b.percentage_share || 0), 0);
        const hasAssets =
          fo.fruit_trees || fo.buildings || fo.boreholes ||
          fo.economic_trees || fo.other_improvements;

        return (
          <Card key={fo.id} className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <CardTitle className="text-sm text-emerald-800">{fo.family_name}</CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] capitalize">
                    {fo.status}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] capitalize">
                    {fo.family_lineage}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setExpandedFO(isExpanded ? null : fo.id)}
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-6">
                <p><span className="font-medium">Head:</span> {fo.family_head}</p>
                {fo.family_representative && (
                  <p><span className="font-medium">Representative:</span> {fo.family_representative}</p>
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Family notes */}
                {fo.family_notes && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-300 pl-2">
                    {fo.family_notes}
                  </p>
                )}

                {/* Attached assets */}
                {hasAssets && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <TreePine className="w-3.5 h-3.5 text-emerald-600" /> Attached Assets
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      <AssetRow icon={TreePine} label="Fruit Trees" value={fo.fruit_trees} />
                      <AssetRow icon={Building2} label="Buildings" value={fo.buildings} color="text-blue-600" />
                      <AssetRow icon={Droplets} label="Boreholes" value={fo.boreholes} color="text-cyan-600" />
                      <AssetRow icon={TreePine} label="Economic Trees" value={fo.economic_trees} color="text-lime-700" />
                      {fo.other_improvements && (
                        <div className="col-span-2 text-xs text-muted-foreground">
                          <span className="font-medium">Other:</span> {fo.other_improvements}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Beneficiaries */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      Beneficiaries ({bens.length})
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      Math.abs(totalShare - 100) < 0.01
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {totalShare.toFixed(1)}% allocated
                    </span>
                  </div>

                  {bens.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No beneficiaries recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {bens.sort((a, b) => (a.inheritance_rank || 99) - (b.inheritance_rank || 99)).map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-2.5 bg-white rounded-lg border border-border"
                        >
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold">{b.full_name}</span>
                              <span className="text-[10px] text-muted-foreground capitalize">({b.relationship})</span>
                              <Badge className={`text-[10px] ${BENEFICIARY_STATUS_STYLES[b.status] || ""}`}>
                                {b.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                              {b.inheritance_rank && <span>Rank #{b.inheritance_rank}</span>}
                              <span className="font-semibold text-foreground">{b.percentage_share}%</span>
                              {b.allocated_plot && <span>Plot: {b.allocated_plot}</span>}
                            </div>
                            {b.notes && <p className="text-[10px] text-muted-foreground">{b.notes}</p>}
                          </div>
                          <InheritanceTransferCard
                            ownership={fo}
                            beneficiary={b}
                            parcel={parcel}
                            user={user}
                            onSuccess={() => {}}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ownership history for this family ownership */}
                {ownershipHistory.filter((h) => h.family_ownership_id === fo.id).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Transfer History
                    </p>
                    <div className="space-y-1.5">
                      {ownershipHistory
                        .filter((h) => h.family_ownership_id === fo.id)
                        .map((h) => (
                          <div key={h.id} className="flex items-start gap-2 text-xs p-2 bg-white rounded-lg border border-border">
                            {h.status === "approved" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : h.status === "pending" ? (
                              <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {h.from_owner} → {h.to_owner}
                              </p>
                              <p className="text-muted-foreground capitalize">
                                {h.transfer_type?.replace(/_/g, " ")}
                                {h.transfer_date && ` · ${format(new Date(h.transfer_date), "MMM d, yyyy")}`}
                              </p>
                              {h.notes && <p className="text-muted-foreground truncate">{h.notes}</p>}
                            </div>
                            <Badge className={`text-[10px] flex-shrink-0 capitalize ${
                              h.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                              h.status === "pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {h.status}
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
      })}
    </div>
  );
}