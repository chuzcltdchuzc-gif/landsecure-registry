import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";

const actionColors = {
  "Suspended user": "text-red-600",
  "Reinstated user": "text-emerald-600",
  "Froze parcel": "text-orange-600",
  "Unfroze parcel": "text-blue-600",
  "Changed role": "text-purple-600",
  "Updated fraud alert": "text-amber-600",
};

function getActionColor(action) {
  const key = Object.keys(actionColors).find(k => action?.startsWith(k));
  return key ? actionColors[key] : "text-foreground";
}

export default function GovernanceAuditLog() {
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["governance-audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner />;

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === "all" || l.entity_type === filterEntity;
    return matchSearch && matchEntity;
  });

  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  const handleExport = () => {
    const csv = [
      ["Date", "User", "Action", "Entity Type", "Entity ID", "Details"].join(","),
      ...filtered.map(l => [
        format(new Date(l.created_date), "yyyy-MM-dd HH:mm"),
        l.user_email,
        `"${l.action}"`,
        l.entity_type || "",
        l.entity_id || "",
        `"${l.details || ""}"`,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete platform activity trail — all users, all actions</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search actions, users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} log entries</p>

      {filtered.length === 0 ? (
        <EmptyState icon={History} title="No logs found" description="No activity matches your search" />
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <Card key={log.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${getActionColor(log.action)}`}>{log.action}</p>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_date), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.user_name || log.user_email}</p>
                  {log.details && <p className="text-xs text-muted-foreground mt-1 italic">{log.details}</p>}
                  {log.entity_type && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Entity: <span className="font-medium">{log.entity_type}</span>
                      {log.entity_id ? ` · ${log.entity_id}` : ""}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}