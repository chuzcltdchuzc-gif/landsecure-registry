import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { format } from "date-fns";

export default function AuditLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 200),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">System activity and changes</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={History} title="No logs" description="No activity has been logged yet" />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_date), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.user_name || log.user_email}</p>
                  {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                  {log.entity_type && (
                    <p className="text-[10px] text-muted-foreground mt-1">Entity: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ""}</p>
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