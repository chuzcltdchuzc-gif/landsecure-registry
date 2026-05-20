import React, { useState } from "react";
import { Shield, User, Compass, Camera, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const roles = [
  {
    value: "general_user",
    label: "General User",
    description: "Search land records, file claims, and track disputes.",
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50",
  },
  {
    value: "surveyor",
    label: "Independent Surveyor",
    description: "Register parcels, upload survey documents, and manage submissions.",
    icon: Compass,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50",
  },
  {
    value: "field_agent",
    label: "Field Agent",
    description: "Submit field reports, capture GPS data, and verify parcels on-site.",
    icon: Camera,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50",
  },
];

export default function RoleSelection({ onRoleSelected }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole) return;
    setSaving(true);
    await base44.auth.updateMe({ role: selectedRole, role_confirmed: true });
    onRoleSelected(selectedRole);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to LandSecure Registry</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Select your role to get started. This determines your access and features within the system.
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-3 mb-6">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;
            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                  ${isSelected
                    ? `${role.selectedBorder} ${role.selectedBg} shadow-sm`
                    : `border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30`
                  }`}
              >
                <div className={`w-11 h-11 rounded-xl ${role.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${role.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${role.color}`} />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mb-5">
          The <strong>Surveyor General</strong> role is reserved and assigned by system administrators only.
        </p>

        <Button
          onClick={handleConfirm}
          disabled={!selectedRole || saving}
          className="w-full"
          size="lg"
        >
          {saving ? "Saving..." : "Continue"}
          {!saving && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}