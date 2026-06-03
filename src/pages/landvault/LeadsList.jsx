import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, ChevronRight, MapPin } from "lucide-react";

const STATUS_COLORS = {
  NEW_LEAD: "bg-gray-100 text-gray-700",
  COMMUNITY_CONTACTED: "bg-blue-100 text-blue-700",
  FAMILY_CONTACTED: "bg-indigo-100 text-indigo-700",
  CONSENT_RECEIVED: "bg-purple-100 text-purple-700",
  SURVEY_SCHEDULED: "bg-yellow-100 text-yellow-800",
  SURVEY_IN_PROGRESS: "bg-orange-100 text-orange-700",
  SURVEY_COMPLETED: "bg-emerald-100 text-emerald-700",
  DOCUMENTATION_COMPLETE: "bg-teal-100 text-teal-700",
  CERTIFICATE_READY: "bg-green-100 text-green-700",
  CERTIFICATE_ISSUED: "bg-green-200 text-green-900",
};

const ALL_STATUSES = [
  "NEW_LEAD","COMMUNITY_CONTACTED","FAMILY_CONTACTED","CONSENT_RECEIVED",
  "SURVEY_SCHEDULED","SURVEY_IN_PROGRESS","SURVEY_COMPLETED",
  "DOCUMENTATION_COMPLETE","CERTIFICATE_READY","CERTIFICATE_ISSUED"
];

export default function LeadsList() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["lv-leads"],
    queryFn: () => base44.entities.CommunityLead.list("-created_date", 200),
  });

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.community?.toLowerCase().includes(search.toLowerCase()) ||
      l.family_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.village?.toLowerCase().includes(search.toLowerCase()) ||
      l.lead_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const total = leads.length;
  const surveyScheduled = leads.filter(l => l.status === "SURVEY_SCHEDULED").length;
  const surveysCompleted = leads.filter(l => ["SURVEY_COMPLETED","DOCUMENTATION_COMPLETE","CERTIFICATE_ISSUED"].includes(l.status)).length;
  const converted = leads.filter(l => l.status === "CERTIFICATE_ISSUED").length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Leads</h1>
          <p className="text-sm text-muted-foreground">All field leads and their progress</p>
        </div>
        <Link to="/lv/leads/new">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> New Lead
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: total, color: "text-foreground" },
          { label: "Conversion %", value: `${conversionRate}%`, color: "text-emerald-600" },
          { label: "Pending Survey", value: surveyScheduled, color: "text-yellow-600" },
          { label: "Surveys Done", value: surveysCompleted, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by community, family or village…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >All</button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >{s.replace(/_/g," ")}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && <p className="text-center text-muted-foreground py-8 text-sm">Loading leads…</p>}
        {!isLoading && filtered.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No leads found.
            </CardContent>
          </Card>
        )}
        {filtered.map(lead => (
          <Link key={lead.id} to={`/lv/leads/${lead.id}`}>
            <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{lead.family_name || lead.community}</p>
                    {lead.lead_number && <span className="text-[10px] text-muted-foreground font-mono">{lead.lead_number}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.village && `${lead.village}, `}{lead.community} — {lead.lga}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] px-2 py-0 rounded-full ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}>
                      {lead.status?.replace(/_/g, " ")}
                    </Badge>
                    {lead.estimated_plots && <span className="text-[10px] text-muted-foreground">{lead.estimated_plots} plots est.</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground">{lead.field_agent_name || lead.field_agent_email}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}