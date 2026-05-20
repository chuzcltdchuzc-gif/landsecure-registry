import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";

export default function GlobalAudit() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["global-audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner text="Loading audit records..." />;

  const entityTypes = ["all", ...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || log.entity_type === entityFilter;
    return matchSearch && matchEntity;
  });

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = format(new Date(log.created_date), "MMMM d, yyyy");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const actionColor = (action = "") => {
    if (action.toLowerCase().includes("suspend") || action.toLowerCase().includes("reject")) return "bg-red-100 text-red-700";
    if (action.toLowerCase().includes("approve") || action.toLowerCase().includes("reinstate")) return "bg-emerald-100 text-emerald-700";
    if (action.toLowerCase().includes("freeze") || action.toLowerCase().includes("flag")) return "bg-orange-100 text-orange-700";
    if (action.toLowerCase().includes("create") || action.toLowerCase().includes("register")) return "bg-blue-100 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" /> Global Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete platform activity trail — {logs.length} total records
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by action, user, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter entity type" />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map(e => <SelectItem key={e} value={e}>{e === "all" ? "All Entities" : e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateLogs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{date}</p>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{dateLogs.length} events</span>
            </div>
            <div className="space-y-2">
              {dateLogs.map(log => (
                <Card key={log.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-start gap-4">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0 mt-0.5 ${actionColor(log.action)}`}>
                      {log.entity_type || "SYS"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.user_name || log.user_email}</p>
                      {log.details && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.details}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground">{format(new Date(log.created_date), "h:mm a")}</p>
                      {log.entity_id && <p className="text-[9px] text-muted-foreground mt-0.5 font-mono truncate max-w-[80px]">{log.entity_id.slice(0, 8)}…</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No audit records match your search</CardContent></Card>
        )}
      </div>
    </div>
  );
}