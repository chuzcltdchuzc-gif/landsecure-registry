/**
 * Priority 4 — Offline Field Operations
 * Stores captures in localStorage when offline; syncs when back online.
 * Works alongside FieldReports for photo capture + GPS.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const OFFLINE_KEY = "landsecure_offline_queue";

export function useOfflineQueue() {
  const getQueue = () => {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const saveQueue = (items) => {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(items));
  };

  const enqueue = (item) => {
    const queue = getQueue();
    const entry = {
      local_id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      captured_at: new Date().toISOString(),
      sync_status: "queued",
      ...item,
    };
    saveQueue([...queue, entry]);
    return entry.local_id;
  };

  const removeItem = (localId) => {
    const queue = getQueue().filter((i) => i.local_id !== localId);
    saveQueue(queue);
  };

  const updateStatus = (localId, status, error = null) => {
    const queue = getQueue().map((i) =>
      i.local_id === localId ? { ...i, sync_status: status, sync_error: error } : i
    );
    saveQueue(queue);
  };

  return { getQueue, enqueue, removeItem, updateStatus };
}

export default function OfflineSyncManager({ user }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { getQueue, removeItem, updateStatus } = useOfflineQueue();

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Back online — you can now sync queued reports"); };
    const handleOffline = () => { setIsOnline(false); toast.warning("You're offline — data will be queued for sync"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshQueue = useCallback(() => setQueue(getQueue()), []);

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const syncAll = async () => {
    if (!isOnline) { toast.error("Cannot sync — no internet connection"); return; }
    const pending = queue.filter((i) => i.sync_status === "queued" || i.sync_status === "failed");
    if (pending.length === 0) { toast.info("Nothing to sync"); return; }

    setSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pending) {
      updateStatus(item.local_id, "syncing");
      refreshQueue();
      try {
        if (item.operation_type === "field_report") {
          await base44.entities.FieldReport.create({
            ...item.payload,
            agent_email: user?.email,
            agent_name: user?.full_name,
            network_status: "synced_offline",
            capture_timestamp: item.captured_at,
          });
        }
        updateStatus(item.local_id, "synced");
        successCount++;
      } catch (e) {
        updateStatus(item.local_id, "failed", e.message);
        failCount++;
      }
      refreshQueue();
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["field-reports"] });
      toast.success(`${successCount} report(s) synced successfully`);
    }
    if (failCount > 0) toast.error(`${failCount} report(s) failed to sync`);
    setSyncing(false);
  };

  const clearSynced = () => {
    const synced = queue.filter((i) => i.sync_status === "synced");
    synced.forEach((i) => removeItem(i.local_id));
    refreshQueue();
    toast.info(`Cleared ${synced.length} synced item(s)`);
  };

  const pendingCount = queue.filter((i) => i.sync_status === "queued" || i.sync_status === "failed").length;
  const syncedCount = queue.filter((i) => i.sync_status === "synced").length;

  if (queue.length === 0 && isOnline) return null;

  return (
    <Card className={`border ${isOnline ? "border-border" : "border-amber-300 bg-amber-50/30"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline
              ? <Wifi className="w-4 h-4 text-emerald-500" />
              : <WifiOff className="w-4 h-4 text-amber-600" />}
            <span>Offline Queue</span>
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">{pendingCount} pending</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {syncedCount > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={clearSynced}>
                <Trash2 className="w-3 h-3" /> Clear synced
              </Button>
            )}
            {pendingCount > 0 && isOnline && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={syncAll} disabled={syncing}>
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : `Sync ${pendingCount}`}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {queue.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          {queue.map((item) => (
            <div key={item.local_id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              {item.sync_status === "synced" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
              {item.sync_status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              {(item.sync_status === "queued" || item.sync_status === "syncing") && (
                <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${item.sync_status === "syncing" ? "text-blue-500 animate-pulse" : "text-amber-500"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium capitalize truncate">
                  {item.operation_type?.replace(/_/g, " ")} — {item.payload?.report_type?.replace(/_/g, " ") || ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Captured {format(new Date(item.captured_at), "MMM d HH:mm")}
                  {item.sync_status === "failed" && item.sync_error && ` · ${item.sync_error}`}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                item.sync_status === "synced" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                item.sync_status === "failed" ? "bg-red-50 text-red-600 border-red-200" :
                item.sync_status === "syncing" ? "bg-blue-50 text-blue-600 border-blue-200" :
                "bg-amber-50 text-amber-600 border-amber-200"
              }`}>
                {item.sync_status}
              </Badge>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}