import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Users, ShieldOff, ShieldCheck, Search, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_LABELS = {
  general_user: "General User",
  surveyor: "Surveyor",
  field_agent: "Field Agent",
  surveyor_general: "Surveyor General",
  compliance_officer: "Compliance Officer",
  super_admin: "Super Admin",
};

export default function UserManagement() {
  const { user: currentUser } = useOutletContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users-mgmt"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner text="Loading users..." />;

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSuspend = async () => {
    if (!suspendTarget || !suspendReason) return;
    setSaving(true);
    await base44.entities.User.update(suspendTarget.id, {
      account_status: "suspended",
      suspension_reason: suspendReason,
      suspended_by: currentUser.email,
      suspended_at: new Date().toISOString(),
    });

    await base44.entities.AuditLog.create({
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      action: `Suspended account: ${suspendTarget.email}`,
      entity_type: "User",
      entity_id: suspendTarget.id,
      details: suspendReason,
    });
    qc.invalidateQueries({ queryKey: ["all-users-mgmt"] });
    setSuspendTarget(null);
    setSuspendReason("");
    setSaving(false);
    toast.success("Account suspended");
  };

  const handleUnsuspend = async (targetUser) => {
    await base44.entities.User.update(targetUser.id, {
      account_status: "active",
      suspension_reason: "",
      suspended_by: "",
      suspended_at: "",
    });

    await base44.entities.AuditLog.create({
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      action: `Reinstated account: ${targetUser.email}`,
      entity_type: "User",
      entity_id: targetUser.id,
    });
    qc.invalidateQueries({ queryKey: ["all-users-mgmt"] });
    toast.success("Account reinstated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> User Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage accounts, roles, and suspensions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">{filtered.length} Users</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-0">
          {filtered.map(u => (
            <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b border-border last:border-0 hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{u.full_name || "—"}</p>
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.account_status === "suspended" && <StatusBadge status="rejected" />}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {u.suspension_reason && (
                  <p className="text-xs text-red-600 mt-0.5">Suspended: {u.suspension_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  {format(new Date(u.created_date), "MMM d, yyyy")}
                </span>
                {u.account_status === "suspended" ? (
                  <Button size="sm" variant="outline" onClick={() => handleUnsuspend(u)}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Reinstate
                  </Button>
                ) : u.email !== currentUser?.email && (
                  <Button size="sm" variant="outline" onClick={() => setSuspendTarget(u)}
                    className="text-red-600 border-red-200 hover:bg-red-50">
                    <ShieldOff className="w-3.5 h-3.5 mr-1" /> Suspend
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={() => { setSuspendTarget(null); setSuspendReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Suspending <strong>{suspendTarget?.full_name || suspendTarget?.email}</strong>. This will restrict their access to the platform.
          </p>
          <Textarea
            placeholder="Reason for suspension (required)..."
            value={suspendReason}
            onChange={e => setSuspendReason(e.target.value)}
            className="mt-2"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendTarget(null); setSuspendReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason || saving}>
              {saving ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}