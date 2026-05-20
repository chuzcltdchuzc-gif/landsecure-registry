import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield, RefreshCw, AlertOctagon, Database, Users } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PlatformSettings() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });
  const { data: parcels = [] } = useQuery({
    queryKey: ["platform-parcels"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 500),
  });

  if (isLoading) return <LoadingSpinner />;

  const handleUnfreezeAll = async () => {
    setIsSaving(true);
    const frozen = parcels.filter(p => p.frozen);
    for (const p of frozen) {
      await base44.entities.LandParcel.update(p.id, { frozen: false, frozen_by: "", frozen_reason: "", frozen_at: "" });
    }
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: `System Recovery: Unfroze all ${frozen.length} parcels`,
      entity_type: "LandParcel",
      details: `Executed by Super Admin`,
    });
    queryClient.invalidateQueries({ queryKey: ["platform-parcels"] });
    setIsSaving(false);
    toast.success(`${frozen.length} parcel(s) unfrozen`);
  };

  const handleClearFraudFlags = async () => {
    setIsSaving(true);
    const flagged = parcels.filter(p => p.fraud_flagged);
    for (const p of flagged) {
      await base44.entities.LandParcel.update(p.id, { fraud_flagged: false });
    }
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: `Cleared all ${flagged.length} fraud flags`,
      entity_type: "LandParcel",
    });
    queryClient.invalidateQueries({ queryKey: ["platform-parcels"] });
    setIsSaving(false);
    toast.success(`${flagged.length} fraud flag(s) cleared`);
  };

  const handleUnsuspendAll = async () => {
    if (confirmText !== "CONFIRM") {
      toast.error("Type CONFIRM to proceed");
      return;
    }
    setIsSaving(true);
    const suspended = users.filter(u => u.status === "suspended");
    for (const u of suspended) {
      await base44.entities.User.update(u.id, { status: "active", suspension_reason: "", suspended_by: "", suspended_at: "" });
    }
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: `System Recovery: Reinstated all ${suspended.length} suspended users`,
      entity_type: "User",
    });
    queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    setConfirmText("");
    setIsSaving(false);
    toast.success(`${suspended.length} user(s) reinstated`);
  };

  const frozenCount = parcels.filter(p => p.frozen).length;
  const fraudCount = parcels.filter(p => p.fraud_flagged).length;
  const suspendedCount = users.filter(u => u.status === "suspended").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System recovery controls and configuration</p>
      </div>

      {/* Platform health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Parcels", value: parcels.length, icon: Database, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Frozen Parcels", value: frozenCount, icon: AlertOctagon, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Suspended Users", value: suspendedCount, icon: Shield, color: "text-red-600", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Recovery Controls */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700">
            <RefreshCw className="w-4 h-4" />
            System Recovery Controls
          </CardTitle>
          <p className="text-xs text-muted-foreground">Bulk actions for system-wide state recovery. Use with caution.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-orange-800">Unfreeze All Parcels</p>
              <p className="text-xs text-orange-600">{frozenCount} parcel(s) currently frozen</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
              disabled={frozenCount === 0 || isSaving}
              onClick={handleUnfreezeAll}
            >
              Unfreeze All ({frozenCount})
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">Clear All Fraud Flags</p>
              <p className="text-xs text-amber-600">{fraudCount} parcel(s) fraud-flagged</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              disabled={fraudCount === 0 || isSaving}
              onClick={handleClearFraudFlags}
            >
              Clear Flags ({fraudCount})
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-800">Reinstate All Suspended Users</p>
              <p className="text-xs text-red-600">{suspendedCount} user(s) suspended · Type CONFIRM to proceed</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder='Type "CONFIRM"'
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="flex-1 border-red-200 text-sm"
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={suspendedCount === 0 || isSaving || confirmText !== "CONFIRM"}
                onClick={handleUnsuspendAll}
              >
                Reinstate All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role hierarchy reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Role Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { role: "super_admin", label: "Super Admin", desc: "Full platform control, user management, system recovery", color: "bg-purple-100 text-purple-700 border-purple-200" },
              { role: "compliance_officer", label: "Compliance Officer", desc: "Read-only parcels, fraud investigation, compliance reports", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
              { role: "surveyor_general", label: "Surveyor General", desc: "Regional approvals, survey reviews, dispute management", color: "bg-blue-100 text-blue-700 border-blue-200" },
              { role: "surveyor", label: "Surveyor", desc: "Land registration, survey documents, GIS map", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
              { role: "field_agent", label: "Field Agent", desc: "Field reports, GPS capture, parcel verification", color: "bg-orange-100 text-orange-700 border-orange-200" },
              { role: "general_user", label: "General User", desc: "Search records, file claims, manage disputes", color: "bg-gray-100 text-gray-600 border-gray-200" },
            ].map(({ role, label, desc, color }) => (
              <div key={role} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${color}`}>{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
                <span className="ml-auto text-xs font-semibold text-foreground">
                  {users.filter(u => (u.role || "general_user") === role).length} user{users.filter(u => (u.role || "general_user") === role).length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}