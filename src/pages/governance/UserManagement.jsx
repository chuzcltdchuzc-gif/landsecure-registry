import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ShieldOff, ShieldCheck, UserCog } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const roleLabels = {
  super_admin: "Super Admin",
  compliance_officer: "Compliance Officer",
  surveyor_general: "Surveyor General",
  surveyor: "Surveyor",
  field_agent: "Field Agent",
  general_user: "General User",
};

const roleBadgeColors = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  compliance_officer: "bg-indigo-100 text-indigo-700 border-indigo-200",
  surveyor_general: "bg-blue-100 text-blue-700 border-blue-200",
  surveyor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  field_agent: "bg-orange-100 text-orange-700 border-orange-200",
  general_user: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function UserManagement() {
  const { user: currentUser } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users-mgmt"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner />;

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleSuspend = async () => {
    if (!suspendTarget || !suspensionReason.trim()) return;
    setSaving(true);
    await base44.entities.User.update(suspendTarget.id, {
      status: "suspended",
      suspension_reason: suspensionReason,
      suspended_by: currentUser?.email,
      suspended_at: new Date().toISOString(),
    });
    await base44.entities.AuditLog.create({
      user_email: currentUser?.email,
      user_name: currentUser?.full_name,
      action: `Suspended user: ${suspendTarget.email}`,
      entity_type: "User",
      entity_id: suspendTarget.id,
      details: `Reason: ${suspensionReason}`,
    });
    queryClient.invalidateQueries({ queryKey: ["all-users-mgmt"] });
    setSuspendTarget(null);
    setSuspensionReason("");
    setSaving(false);
    toast.success("User suspended successfully");
  };

  const handleUnsuspend = async (u) => {
    await base44.entities.User.update(u.id, { status: "active", suspension_reason: "", suspended_by: "", suspended_at: "" });
    await base44.entities.AuditLog.create({
      user_email: currentUser?.email,
      user_name: currentUser?.full_name,
      action: `Reinstated user: ${u.email}`,
      entity_type: "User",
      entity_id: u.id,
    });
    queryClient.invalidateQueries({ queryKey: ["all-users-mgmt"] });
    toast.success("User reinstated");
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget || !newRole) return;
    setSaving(true);
    await base44.entities.User.update(roleChangeTarget.id, { role: newRole, role_confirmed: true });
    await base44.entities.AuditLog.create({
      user_email: currentUser?.email,
      user_name: currentUser?.full_name,
      action: `Changed role for ${roleChangeTarget.email}: ${roleChangeTarget.role} → ${newRole}`,
      entity_type: "User",
      entity_id: roleChangeTarget.id,
    });
    queryClient.invalidateQueries({ queryKey: ["all-users-mgmt"] });
    setRoleChangeTarget(null);
    setNewRole("");
    setSaving(false);
    toast.success("Role updated successfully");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all platform users, roles, and account status</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""} found</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filter" />
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{u.full_name || "—"}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleBadgeColors[u.role] || roleBadgeColors.general_user}`}>
                      {roleLabels[u.role] || u.role || "General User"}
                    </span>
                    {u.status === "suspended" && <StatusBadge status="rejected" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.status === "suspended" && (
                    <p className="text-[10px] text-red-500 mt-0.5">Suspended: {u.suspension_reason}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Joined {u.created_date ? format(new Date(u.created_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setRoleChangeTarget(u); setNewRole(u.role || "general_user"); }}>
                    <UserCog className="w-3 h-3" /> Change Role
                  </Button>
                  {u.status === "suspended" ? (
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleUnsuspend(u)}>
                      <ShieldCheck className="w-3 h-3" /> Reinstate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setSuspendTarget(u)}
                      disabled={u.email === currentUser?.email}
                    >
                      <ShieldOff className="w-3 h-3" /> Suspend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suspend dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={() => { setSuspendTarget(null); setSuspensionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Suspend <strong>{suspendTarget?.full_name || suspendTarget?.email}</strong>? They will lose access immediately.</p>
          <Textarea
            placeholder="Reason for suspension (required)..."
            value={suspensionReason}
            onChange={e => setSuspensionReason(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendTarget(null); setSuspensionReason(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={!suspensionReason.trim() || saving} onClick={handleSuspend}>
              {saving ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role change dialog */}
      <Dialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Update role for <strong>{roleChangeTarget?.full_name || roleChangeTarget?.email}</strong></p>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select new role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeTarget(null)}>Cancel</Button>
            <Button disabled={!newRole || saving} onClick={handleRoleChange}>
              {saving ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}