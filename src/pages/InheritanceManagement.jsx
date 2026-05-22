import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import {
  Users, GitBranch, FileText, ClipboardCheck, Map, Award,
  Plus, Search, Filter, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import InheritanceCaseDialog from "@/components/inheritance/InheritanceCaseDialog";
import InheritanceCaseDetail from "@/components/inheritance/InheritanceCaseDetail";
import FamilyLineagePanel from "@/components/inheritance/FamilyLineagePanel";
import InheritanceDashboardStats from "@/components/inheritance/InheritanceDashboardStats";
import { format } from "date-fns";

const WORKFLOW_STAGES = [
  { key: "draft", label: "Draft", color: "bg-gray-100 text-gray-600" },
  { key: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-700" },
  { key: "surveyor_review", label: "Surveyor Review", color: "bg-amber-100 text-amber-700" },
  { key: "compliance_review", label: "Compliance Review", color: "bg-orange-100 text-orange-700" },
  { key: "surveyor_general_review", label: "SG Review", color: "bg-purple-100 text-purple-700" },
  { key: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-gray-100 text-gray-500" },
];

export default function InheritanceManagement() {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState("cases");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lgaFilter, setLgaFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState(null);
  const [showNewCase, setShowNewCase] = useState(false);

  const { data: cases = [], isLoading: lc } = useQuery({
    queryKey: ["inheritance-cases"],
    queryFn: () => base44.entities.InheritanceCase.filter({ is_deleted: false }, "-created_date", 200),
  });
  const { data: familyOwnerships = [], isLoading: lf } = useQuery({
    queryKey: ["all-family-ownerships"],
    queryFn: () => base44.entities.FamilyOwnership.list("-created_date", 200),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["parcels-for-inheritance"],
    queryFn: () => base44.entities.LandParcel.filter({ status: "approved" }, "-created_date", 500),
  });

  if (lc || lf) return <LoadingSpinner text="Loading Inheritance Management..." />;

  const lgas = [...new Set(familyOwnerships.map(fo => fo.lga).filter(Boolean))];

  const filteredCases = cases.filter(c => {
    const matchSearch = !search ||
      c.case_reference?.toLowerCase().includes(search.toLowerCase()) ||
      c.family_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.parcel_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.case_title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    // lga filter requires linking to family ownership
    const fo = familyOwnerships.find(f => f.id === c.family_ownership_id);
    const matchLga = lgaFilter === "all" || fo?.lga === lgaFilter;
    return matchSearch && matchStatus && matchLga;
  });

  const tabs = [
    { key: "cases", label: "Inheritance Cases", icon: GitBranch, count: cases.length },
    { key: "families", label: "Family Records", icon: Users, count: familyOwnerships.length },
    { key: "dashboard", label: "Analytics", icon: ClipboardCheck },
  ];

  if (selectedCase) {
    return (
      <InheritanceCaseDetail
        caseRecord={selectedCase}
        familyOwnership={familyOwnerships.find(f => f.id === selectedCase.family_ownership_id)}
        user={user}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" />
            Customary Inheritance Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nigerian customary family land succession, allocation and legal traceability
          </p>
        </div>
        {(user?.role === "surveyor_general" || user?.role === "compliance_officer" || user?.role === "super_admin" || user?.role === "surveyor") && (
          <Button onClick={() => setShowNewCase(true)} className="gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" /> New Inheritance Case
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <InheritanceDashboardStats cases={cases} familyOwnerships={familyOwnerships} parcels={parcels} />
      )}

      {/* Cases Tab */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, family name, or parcel..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {WORKFLOW_STAGES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lgas.length > 0 && (
                  <Select value={lgaFilter} onValueChange={setLgaFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="LGA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All LGAs</SelectItem>
                      {lgas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow stage summary */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WORKFLOW_STAGES.filter(s => !["withdrawn"].includes(s.key)).map(stage => {
              const count = cases.filter(c => c.status === stage.key).length;
              return (
                <button
                  key={stage.key}
                  onClick={() => setStatusFilter(stage.key === statusFilter ? "all" : stage.key)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    statusFilter === stage.key ? "ring-2 ring-primary" : ""
                  } ${stage.color.replace("text-", "border-")} bg-white hover:opacity-80`}
                >
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[9px] font-medium leading-tight mt-0.5">{stage.label}</p>
                </button>
              );
            })}
          </div>

          {/* Cases list */}
          {filteredCases.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <GitBranch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No inheritance cases found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cases.length === 0 ? "Create your first inheritance case to get started" : "Try adjusting your filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCases.map(c => (
                <CaseCard
                  key={c.id}
                  caseRecord={c}
                  familyOwnership={familyOwnerships.find(f => f.id === c.family_ownership_id)}
                  onClick={() => setSelectedCase(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Families Tab */}
      {activeTab === "families" && (
        <FamilyLineagePanel
          familyOwnerships={familyOwnerships}
          cases={cases}
          user={user}
        />
      )}

      {/* New Case Dialog */}
      {showNewCase && (
        <InheritanceCaseDialog
          open={showNewCase}
          onClose={() => setShowNewCase(false)}
          familyOwnerships={familyOwnerships}
          user={user}
          onCreated={(c) => { setShowNewCase(false); setSelectedCase(c); }}
        />
      )}
    </div>
  );
}

function CaseCard({ caseRecord, familyOwnership, onClick }) {
  const stage = WORKFLOW_STAGES.find(s => s.key === caseRecord.status);
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold font-mono text-primary">
                {caseRecord.case_reference || `CASE-${caseRecord.id?.slice(-6).toUpperCase()}`}
              </span>
              <Badge className={`text-[10px] ${stage?.color || "bg-gray-100 text-gray-600"}`}>
                {stage?.label || caseRecord.status}
              </Badge>
              <Badge className="text-[10px] bg-blue-50 text-blue-700 capitalize">
                {caseRecord.case_type?.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {caseRecord.case_title || `${caseRecord.family_name} — ${caseRecord.case_type?.replace(/_/g, " ")}`}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {caseRecord.family_name}
              </span>
              {caseRecord.parcel_number && (
                <span className="flex items-center gap-1">
                  <Map className="w-3 h-3" />
                  Parcel #{caseRecord.parcel_number}
                </span>
              )}
              {familyOwnership?.lga && (
                <span>{familyOwnership.lga}</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(caseRecord.created_date), "MMM d, yyyy")}
            </p>
            {caseRecord.initiated_by_name && (
              <p className="text-[10px] text-muted-foreground">by {caseRecord.initiated_by_name}</p>
            )}
            {caseRecord.certificate_generated && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 mt-1 gap-1">
                <Award className="w-2.5 h-2.5" /> Certified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}