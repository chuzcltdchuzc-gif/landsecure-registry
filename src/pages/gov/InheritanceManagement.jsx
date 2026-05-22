import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Users, Plus, Search, Filter, GitBranch, FileText, UserCheck,
  Layers, Award, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import InheritanceLineageTree from "@/components/inheritance/InheritanceLineageTree";
import InheritanceCaseWorkflow from "@/components/inheritance/InheritanceCaseWorkflow";
import WitnessManager from "@/components/inheritance/WitnessManager";
import InheritanceDocManager from "@/components/inheritance/InheritanceDocManager";
import PlotAllocationManager from "@/components/inheritance/PlotAllocationManager";
import SubdivisionPlanner from "@/components/inheritance/SubdivisionPlanner";
import InheritanceCertificate from "@/components/inheritance/InheritanceCertificate";

const CASE_TYPES = [
  { value: "succession", label: "Succession" },
  { value: "partition", label: "Partition" },
  { value: "allocation", label: "Allocation" },
  { value: "transfer", label: "Transfer" },
  { value: "dispute_resolution", label: "Dispute Resolution" },
  { value: "subdivision", label: "Subdivision" },
];

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  surveyor_review: "bg-amber-100 text-amber-700",
  compliance_review: "bg-orange-100 text-orange-700",
  surveyor_general_review: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

const TABS = [
  { key: "lineage", label: "Lineage Tree", icon: GitBranch },
  { key: "workflow", label: "Workflow", icon: Clock },
  { key: "witnesses", label: "Witnesses", icon: UserCheck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "allocations", label: "Plot Allocations", icon: Layers },
  { key: "subdivision", label: "Subdivision", icon: Layers },
  { key: "certificate", label: "Certificate", icon: Award },
];

function NewCaseDialog({ familyOwnership, parcel, user, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ case_type: "succession", case_title: "", description: "" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const ref = `IC-${parcel.parcel_number}-${Date.now().toString(36).toUpperCase()}`;
      const ic = await base44.entities.InheritanceCase.create({
        family_ownership_id: familyOwnership.id,
        parcel_id: parcel.id,
        parcel_number: parcel.parcel_number,
        family_name: familyOwnership.family_name,
        case_reference: ref,
        case_title: form.case_title || `${form.case_type} — ${familyOwnership.family_name}`,
        case_type: form.case_type,
        description: form.description,
        status: "draft",
        initiated_by: user?.email,
        initiated_by_name: user?.full_name,
        is_deleted: false,
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Created inheritance case ${ref}`,
        entity_type: "InheritanceCase",
        entity_id: ic.id,
        details: `Type: ${form.case_type}, Family: ${familyOwnership.family_name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      toast.success("Inheritance case created");
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            New Inheritance Case — {parcel.parcel_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Case Type *</Label>
            <Select value={form.case_type} onValueChange={(v) => setForm(f => ({ ...f, case_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Case Title</Label>
            <Input placeholder="e.g. Adeyemi Family Succession 2024" value={form.case_title} onChange={(e) => setForm(f => ({ ...f, case_title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Describe the inheritance case..." rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaseDetail({ ic, familyOwnership, beneficiaries, parcel, user, onUpdated }) {
  const [activeTab, setActiveTab] = useState("lineage");
  const queryClient = useQueryClient();

  const { data: witnesses = [] } = useQuery({
    queryKey: ["witnesses", ic.id],
    queryFn: () => base44.entities.InheritanceWitness.filter({ inheritance_case_id: ic.id, is_deleted: false }, "-created_date", 50),
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["inheritance-docs", ic.id],
    queryFn: () => base44.entities.InheritanceDocument.filter({ inheritance_case_id: ic.id, is_deleted: false }, "-created_date", 50),
  });
  const { data: allocations = [] } = useQuery({
    queryKey: ["plot-allocations", ic.id],
    queryFn: () => base44.entities.PlotAllocation.filter({ inheritance_case_id: ic.id, is_deleted: false }, "-created_date", 100),
  });

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 text-xs font-medium pb-1.5 px-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "lineage" && (
        <InheritanceLineageTree
          familyOwnership={familyOwnership}
          beneficiaries={beneficiaries.filter(b => !b.is_deleted)}
        />
      )}

      {activeTab === "workflow" && (
        <InheritanceCaseWorkflow
          inheritanceCase={ic}
          witnesses={witnesses}
          documents={documents}
          allocations={allocations}
          user={user}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
            onUpdated?.();
          }}
        />
      )}

      {activeTab === "witnesses" && (
        <WitnessManager caseId={ic.id} parcelId={ic.parcel_id} user={user} />
      )}

      {activeTab === "documents" && (
        <InheritanceDocManager
          caseId={ic.id}
          parcelId={ic.parcel_id}
          familyOwnershipId={ic.family_ownership_id}
          user={user}
        />
      )}

      {activeTab === "allocations" && (
        <PlotAllocationManager
          caseId={ic.id}
          familyOwnershipId={ic.family_ownership_id}
          parcelId={ic.parcel_id}
          parcelNumber={ic.parcel_number}
          beneficiaries={beneficiaries}
          parcelSizeHa={parcel?.size_hectares}
          user={user}
        />
      )}

      {activeTab === "subdivision" && (
        <SubdivisionPlanner
          caseId={ic.id}
          parcelId={ic.parcel_id}
          parcelNumber={ic.parcel_number}
          familyOwnershipId={ic.family_ownership_id}
          parcelSizeHa={parcel?.size_hectares}
          user={user}
        />
      )}

      {activeTab === "certificate" && (
        <InheritanceCertificate
          inheritanceCase={ic}
          familyOwnership={familyOwnership}
          beneficiaries={beneficiaries}
          witnesses={witnesses}
          parcel={parcel}
          allocations={allocations}
        />
      )}
    </div>
  );
}

function FamilyOwnershipCard({ fo, user }) {
  const [expanded, setExpanded] = useState(false);
  const [showNewCase, setShowNewCase] = useState(false);
  const queryClient = useQueryClient();

  const { data: parcelList = [] } = useQuery({
    queryKey: ["parcel-for-fo", fo.parcel_id],
    queryFn: () => base44.entities.LandParcel.filter({ id: fo.parcel_id }, "-created_date", 1),
    enabled: !!fo.parcel_id,
  });
  const parcel = parcelList[0];

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["family-beneficiaries-all", fo.parcel_id],
    queryFn: () => base44.entities.FamilyBeneficiary.filter({ family_ownership_id: fo.id }, "inheritance_rank", 100),
    enabled: !!fo.id,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["inheritance-cases", fo.id],
    queryFn: () => base44.entities.InheritanceCase.filter({ family_ownership_id: fo.id, is_deleted: false }, "-created_date", 20),
    enabled: !!fo.id,
  });

  const [openCaseId, setOpenCaseId] = useState(null);

  return (
    <Card className="border-emerald-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-emerald-700" />
              <CardTitle className="text-sm">{fo.family_name}</CardTitle>
              <Badge className="text-[9px] bg-emerald-100 text-emerald-700">{fo.status}</Badge>
              {fo.family_lineage && <Badge className="text-[9px] bg-blue-100 text-blue-700 capitalize">{fo.family_lineage}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-6">
              <p><span className="font-medium">Head:</span> {fo.family_head} {fo.parcel_number && `· Parcel: ${fo.parcel_number}`}</p>
              {fo.community && <p><span className="font-medium">Community:</span> {fo.community}{fo.lga ? `, ${fo.lga}` : ""}{fo.state ? `, ${fo.state}` : ""}</p>}
              {fo.clan_name && <p><span className="font-medium">Clan:</span> {fo.clan_name}</p>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowNewCase(true)}>
              <Plus className="w-3 h-3" /> New Case
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Cases */}
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              Inheritance Cases ({cases.length})
            </p>
            {cases.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No cases opened yet</p>
            )}
            {cases.map((ic) => (
              <div key={ic.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenCaseId(openCaseId === ic.id ? null : ic.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap text-left">
                    <span className="text-xs font-semibold font-mono">{ic.case_reference}</span>
                    <span className="text-xs text-muted-foreground">{ic.case_title}</span>
                    <Badge className={`text-[9px] py-0 px-1.5 capitalize ${STATUS_COLORS[ic.status] || ""}`}>
                      {ic.status?.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                      {ic.case_type?.replace(/_/g, " ")}
                    </span>
                  </div>
                  {openCaseId === ic.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                </button>

                {openCaseId === ic.id && (
                  <div className="border-t border-border p-3">
                    <CaseDetail
                      ic={ic}
                      familyOwnership={fo}
                      beneficiaries={beneficiaries}
                      parcel={parcel}
                      user={user}
                      onUpdated={() => queryClient.invalidateQueries({ queryKey: ["inheritance-cases", fo.id] })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {showNewCase && parcel && (
        <NewCaseDialog
          familyOwnership={fo}
          parcel={parcel}
          user={user}
          open={showNewCase}
          onClose={() => setShowNewCase(false)}
        />
      )}
    </Card>
  );
}

export default function InheritanceManagement() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("");

  const { data: familyOwnerships = [], isLoading } = useQuery({
    queryKey: ["all-family-ownerships"],
    queryFn: () => base44.entities.FamilyOwnership.list("-created_date", 200),
  });

  const { data: allCases = [] } = useQuery({
    queryKey: ["all-inheritance-cases"],
    queryFn: () => base44.entities.InheritanceCase.filter({ is_deleted: false }, "-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner text="Loading inheritance management..." />;

  const filtered = familyOwnerships.filter((fo) => {
    const q = search.toLowerCase();
    const matchSearch = !search || fo.family_name?.toLowerCase().includes(q) || fo.family_head?.toLowerCase().includes(q) || fo.community?.toLowerCase().includes(q) || fo.lga?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || fo.status === statusFilter;
    const matchCommunity = !communityFilter || fo.community?.toLowerCase().includes(communityFilter.toLowerCase());
    return matchSearch && matchStatus && matchCommunity;
  });

  // Analytics
  const pending = allCases.filter((c) => ["submitted", "surveyor_review", "compliance_review", "surveyor_general_review"].includes(c.status)).length;
  const approved = allCases.filter((c) => c.status === "approved").length;
  const rejected = allCases.filter((c) => c.status === "rejected").length;
  const draft = allCases.filter((c) => c.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Customary Inheritance Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nigerian customary family land ownership, succession planning, and inheritance allocation
        </p>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Family Ownerships", value: familyOwnerships.length, color: "emerald", icon: Users },
          { label: "Pending Review", value: pending, color: "amber", icon: Clock },
          { label: "Approved Cases", value: approved, color: "blue", icon: CheckCircle2 },
          { label: "Total Cases", value: allCases.length, color: "purple", icon: GitBranch },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className={`border-${color}-200 bg-${color}-50/40`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className={`text-xl font-bold text-${color}-700`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by family name, head, community, LGA..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Filter by community..."
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
              className="w-full sm:w-44"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_transfer">In Transfer</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No family ownerships found</p>
            <p className="text-xs text-muted-foreground mt-1">Register family ownership from any parcel detail view</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fo) => (
            <FamilyOwnershipCard key={fo.id} fo={fo} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}