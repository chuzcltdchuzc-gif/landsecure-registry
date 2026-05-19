import React, { useState } from "react";
import { Shield, Copy, CheckCheck, User, Compass, Camera, MapPin, ChevronRight, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

const DEMO_PASSWORD = "LandSecure@2025";

const roles = [
  {
    key: "general_user",
    label: "General User",
    name: "Blessing Eze",
    email: "citizen.demo@landsecure.app",
    icon: User,
    color: "blue",
    bgClass: "bg-blue-50 border-blue-200",
    iconClass: "bg-blue-100 text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700",
    description: "A land owner who searches the registry, manages their land claims, tracks registration status, and files disputes.",
    demoData: [
      "4 land parcels: 1 approved, 1 pending, 1 rejected, 1 disputed",
      "1 active ownership dispute filed (Ajah Beachfront)",
      "2 unread notifications incl. approval & rejection",
      "Rejected parcel with detailed rejection reason",
    ],
    experience: [
      "View approved & pending parcels on dashboard",
      "See rejection reason on OYO/2025/001",
      "Track ongoing dispute for LAG/2025/006",
      "Read notifications with status updates",
      "Search any parcel in the Land Registry",
    ],
  },
  {
    key: "surveyor_general",
    label: "Surveyor General",
    name: "Dr. Amara Okafor",
    email: "sg.demo@landsecure.app",
    icon: Shield,
    color: "green",
    bgClass: "bg-emerald-50 border-emerald-200",
    iconClass: "bg-emerald-100 text-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-700",
    description: "Senior government officer who approves/rejects land registrations, reviews survey documents, manages disputes, and monitors the entire system.",
    demoData: [
      "15 total parcels in the system to oversee",
      "9 parcels pending approval decision",
      "4 disputes (1 critical fraud case escalated)",
      "12 audit log entries from all users",
      "Charts showing land use & status distribution",
    ],
    experience: [
      "View system-wide dashboard with charts",
      "Approve or reject pending parcels with reason",
      "Review & approve/reject survey documents",
      "Change dispute status (open → resolved)",
      "Browse full audit trail of system activity",
    ],
  },
  {
    key: "surveyor",
    label: "Licensed Surveyor",
    name: "Tobi Fashola",
    email: "surveyor.demo@landsecure.app",
    icon: Compass,
    color: "purple",
    bgClass: "bg-purple-50 border-purple-200",
    iconClass: "bg-purple-100 text-purple-600",
    badgeClass: "bg-purple-100 text-purple-700",
    description: "A licensed surveyor who registers new land parcels, uploads survey plans and technical documents, and tracks submission statuses.",
    demoData: [
      "5 land parcels submitted (various states)",
      "5 survey documents: 1 approved, 1 rejected, 1 reviewed, 2 pending",
      "2 unread notifications (approval + rejection)",
      "Parcels across Lagos, Abuja, Rivers, Kwara, Edo",
    ],
    experience: [
      "Dashboard showing submitted parcels by status",
      "Register new land parcel with file uploads",
      "Upload survey plans, CAD drawings, GIS data",
      "Track document review status from SG",
      "View GIS map with parcel locations",
    ],
  },
  {
    key: "field_agent",
    label: "Field Agent",
    name: "Emeka Obi",
    email: "agent.demo@landsecure.app",
    icon: Camera,
    color: "orange",
    bgClass: "bg-amber-50 border-amber-200",
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700",
    description: "A field officer who conducts on-site inspections, captures GPS coordinates, takes photos, and submits verification reports.",
    demoData: [
      "6 field reports: 2 reviewed, 2 submitted, 1 draft",
      "Reports cover boundary checks, GPS surveys, inspections",
      "GPS coordinates captured for 5 parcels",
      "2 unread notifications (review + new assignment)",
    ],
    experience: [
      "Dashboard showing report counts by status",
      "Create report with GPS auto-capture button",
      "Upload multiple site photos per report",
      "View unverified parcels needing field visit",
      "Access GIS map to navigate to parcel locations",
    ],
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="p-1.5 rounded-md hover:bg-black/10 transition-colors flex-shrink-0"
      title="Copy"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function CredentialRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-black/5 last:border-0">
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium flex-1 ${mono ? "font-mono" : ""}`}>{value}</span>
      <CopyButton text={value} />
    </div>
  );
}

export default function DemoAccess() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-base text-foreground">LandSecure Registry</h1>
          <p className="text-xs text-muted-foreground">Demo Access Guide</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
            <Lock className="w-3 h-3" /> Demo Environment
          </div>
          <h2 className="text-3xl font-bold text-foreground">Explore Every Role</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Four demo accounts are pre-configured with realistic Nigerian land registry data. Use the credentials below to log in as each role and experience their unique workflow.
          </p>
        </div>

        {/* Shared password */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Universal Demo Password</p>
              <p className="text-sm text-muted-foreground">All 4 accounts share the same password</p>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-border shadow-sm">
              <span className="font-mono font-semibold text-foreground tracking-wide">
                {showPassword ? DEMO_PASSWORD : "•".repeat(DEMO_PASSWORD.length)}
              </span>
              <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <CopyButton text={DEMO_PASSWORD} />
            </div>
          </CardContent>
        </Card>

        {/* Role Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.key} className={`border-2 ${role.bgClass} overflow-hidden`}>
                <CardHeader className="pb-0 pt-5 px-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${role.iconClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">{role.label}</h3>
                        <Badge className={`text-[10px] ${role.badgeClass} border-0`}>{role.key.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{role.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
                </CardHeader>

                <CardContent className="pt-4 pb-5 px-5 space-y-4">
                  {/* Credentials */}
                  <div className="bg-white rounded-xl p-3 border border-black/8">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Login Credentials</p>
                    <CredentialRow label="Email" value={role.email} />
                    <CredentialRow label="Password" value={DEMO_PASSWORD} mono />
                  </div>

                  {/* Demo data */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pre-Loaded Demo Data</p>
                    <ul className="space-y-1.5">
                      {role.demoData.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${role.iconClass.replace("text-", "bg-").split(" ")[0]}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Try these */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">What to Try</p>
                    <ul className="space-y-1.5">
                      {role.experience.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                          <ChevronRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${role.iconClass.split(" ")[1]}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="w-full gap-2 mt-2"
                    variant="default"
                    size="sm"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    Login as {role.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Setup Steps — prominent */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-900 text-base">Required Setup Before Logging In</p>
              <p className="text-sm text-amber-800 mt-1">
                Demo accounts do not exist automatically — they must be invited from the Base44 dashboard first. Each invitation sets up the user account so they can log in with the password above.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Step-by-Step Instructions</p>
            {[
              { step: "1", text: "Open the Base44 Dashboard and navigate to your app" },
              { step: "2", text: 'Click "Users" in the left sidebar, then click "Invite User"' },
              { step: "3", text: "Enter the email address and select the matching role from the table below" },
              { step: "4", text: "Repeat for all 4 demo emails" },
              { step: "5", text: 'Each user receives an invite email — set password to LandSecure@2025' },
              { step: "6", text: "Return here and click the Login button on any role card" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-amber-900">{text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-100">
                  <th className="text-left px-4 py-2 text-xs font-bold text-amber-900">Email to Invite</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-amber-900">Role to Select</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-amber-900">Name</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={r.key} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/50"}>
                    <td className="px-4 py-2.5 font-mono text-xs text-amber-800">{r.email}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-amber-900">{r.key}</td>
                    <td className="px-4 py-2.5 text-xs text-amber-700">{r.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}