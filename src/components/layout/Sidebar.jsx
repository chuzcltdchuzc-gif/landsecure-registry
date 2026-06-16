import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  FileText,
  AlertTriangle,
  ClipboardList,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  Compass,
  Camera,
  History,
  Menu,
  X,
  LogOut,
  PlayCircle,
  Users,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Upload,
  GitBranch,
  Landmark,
  BarChart2,
  Database,
  BookOpen,
  ServerCog,
  MapPin,
  Search,
  Package,
  TreePine,
  UserCheck,
  CheckSquare,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const roleMenus = {
  general_user: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Search Lands", icon: Map, path: "/lands" },
    { label: "My Claims", icon: FileText, path: "/my-claims" },
    { label: "Disputes", icon: AlertTriangle, path: "/disputes" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  surveyor_general: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Executive Dashboard", icon: BarChart2, path: "/gov/executive-dashboard" },
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "LandVault Dashboard", icon: TreePine, path: "/lv" },
    { label: "Community Leads", icon: Users, path: "/lv/leads" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "Validation Queue", icon: CheckSquare, path: "/lv/validate" },
    { label: "Duplicate Alerts", icon: AlertTriangle, path: "/lv/duplicates" },
    { label: "Pilot Readiness", icon: ShieldCheck, path: "/lv/readiness" },
    { label: "Governance Audit", icon: ShieldAlert, path: "/lv/governance" },
    { label: "LV Public Verify", icon: Search, path: "/lv/verify" },
    { label: "── Ehime Mbano LGA ──", icon: MapPin, path: null, divider: true },
    { label: "Parcel Registry", icon: MapPin, path: "/ehime/parcels" },
    { label: "Register Parcel", icon: FileText, path: "/ehime/register" },
    { label: "Bulk Packages", icon: Package, path: "/ehime/packages" },
    { label: "Public Verify", icon: Search, path: "/verify" },
    { label: "── ──────────── ──", icon: null, path: null, divider: true },
    { label: "Approvals", icon: Shield, path: "/approvals" },
    { label: "Land Registry", icon: Map, path: "/lands" },
    { label: "Inheritance Mgmt", icon: GitBranch, path: "/inheritance" },
    { label: "Customary Governance", icon: Landmark, path: "/gov/customary-governance" },
    { label: "Survey Reviews", icon: Compass, path: "/survey-reviews" },
    { label: "Disputes", icon: AlertTriangle, path: "/disputes" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Pilot Reports", icon: FileText, path: "/gov/pilot-reports" },
    { label: "Data Integrity", icon: ShieldCheck, path: "/gov/data-integrity" },
    { label: "Demo Readiness", icon: BookOpen, path: "/gov/demo-readiness" },
    { label: "Pilot Validation", icon: Activity, path: "/gov/pilot-validation" },
    { label: "Deployment Package", icon: ClipboardList, path: "/gov/deployment-package" },
    { label: "Production Readiness", icon: ServerCog, path: "/gov/production-readiness" },
    { label: "Audit Logs", icon: History, path: "/audit-logs" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  surveyor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "── Ehime Mbano LGA ──", icon: MapPin, path: null, divider: true },
    { label: "Parcel Registry", icon: MapPin, path: "/ehime/parcels" },
    { label: "Register Parcel", icon: FileText, path: "/ehime/register" },
    { label: "Bulk Packages", icon: Package, path: "/ehime/packages" },
    { label: "Public Verify", icon: Search, path: "/verify" },
    { label: "── ──────────── ──", icon: null, path: null, divider: true },
    { label: "Register Land", icon: FileText, path: "/register-land" },
    { label: "My Submissions", icon: ClipboardList, path: "/my-submissions" },
    { label: "Survey Documents", icon: Compass, path: "/survey-documents" },
    { label: "Inheritance Mgmt", icon: GitBranch, path: "/inheritance" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  field_agent: [
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "Field Dashboard", icon: LayoutDashboard, path: "/lv/field" },
    { label: "My Leads", icon: Users, path: "/lv/leads" },
    { label: "New Lead", icon: FileText, path: "/lv/leads/new" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "New Parcel", icon: MapPin, path: "/lv/parcels/new" },
    { label: "Upload Evidence", icon: Camera, path: "/lv/evidence/new" },
    { label: "Verify Parcel", icon: Search, path: "/lv/verify" },
    { label: "── Legacy ──────────", icon: null, path: null, divider: true },
    { label: "Field Reports", icon: Camera, path: "/field-reports" },
    { label: "Assigned Parcels", icon: ClipboardList, path: "/assigned-parcels" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  licensed_surveyor: [
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "Surveyor Dashboard", icon: LayoutDashboard, path: "/lv/surveyor" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "Verify Parcel", icon: Search, path: "/lv/verify" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  surveyor_partner: [
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "Partner Portal", icon: LayoutDashboard, path: "/lv/surveyor" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "Duplicate Alerts", icon: AlertTriangle, path: "/lv/duplicates" },
    { label: "Verify Parcel", icon: Search, path: "/lv/verify" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  community_validator: [
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "Validation Queue", icon: CheckSquare, path: "/lv/validate" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "Verify Parcel", icon: Search, path: "/lv/verify" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  government_observer: [
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "Observer Portal", icon: Shield, path: "/lv/observer" },
    { label: "Verify Parcel", icon: Search, path: "/lv/verify" },
  ],
  super_admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Executive Dashboard", icon: BarChart2, path: "/gov/executive-dashboard" },
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "LandVault Dashboard", icon: TreePine, path: "/lv" },
    { label: "Community Leads", icon: Users, path: "/lv/leads" },
    { label: "Parcel Registry", icon: MapPin, path: "/lv/parcels" },
    { label: "Validation Queue", icon: CheckSquare, path: "/lv/validate" },
    { label: "Duplicate Alerts", icon: AlertTriangle, path: "/lv/duplicates" },
    { label: "Pilot Readiness", icon: ShieldCheck, path: "/lv/readiness" },
    { label: "Governance Audit", icon: ShieldAlert, path: "/lv/governance" },
    { label: "LV Public Verify", icon: Search, path: "/lv/verify" },
    { label: "── Ehime Mbano LGA ──", icon: MapPin, path: null, divider: true },
    { label: "Parcel Registry", icon: MapPin, path: "/ehime/parcels" },
    { label: "Register Parcel", icon: FileText, path: "/ehime/register" },
    { label: "Bulk Packages", icon: Package, path: "/ehime/packages" },
    { label: "Public Verify", icon: Search, path: "/verify" },
    { label: "── ──────────── ──", icon: null, path: null, divider: true },
    { label: "Pilot Operations", icon: Activity, path: "/gov/pilot-dashboard" },
    { label: "Demo Data Seed", icon: Database, path: "/gov/demo-seed" },
    { label: "Pilot Reports", icon: FileText, path: "/gov/pilot-reports" },
    { label: "Data Integrity Report", icon: ShieldCheck, path: "/gov/data-integrity" },
    { label: "Demo Readiness Report", icon: BookOpen, path: "/gov/demo-readiness" },
    { label: "Pilot Validation", icon: Activity, path: "/gov/pilot-validation" },
    { label: "Deployment Package", icon: ClipboardList, path: "/gov/deployment-package" },
    { label: "Production Readiness", icon: ServerCog, path: "/gov/production-readiness" },
    { label: "Customary Governance", icon: Landmark, path: "/gov/customary-governance" },
    { label: "Inheritance Mgmt", icon: GitBranch, path: "/inheritance" },
    { label: "User Management", icon: Users, path: "/gov/user-management" },
    { label: "Bulk Import", icon: Upload, path: "/gov/bulk-import" },
    { label: "Freeze Parcels", icon: Lock, path: "/gov/parcel-freeze" },
    { label: "Fraud Alerts", icon: AlertTriangle, path: "/gov/fraud-alerts" },
    { label: "Audit Reports", icon: FileText, path: "/gov/audit-reports" },
    { label: "Global Audit", icon: History, path: "/gov/global-audit" },
    { label: "Land Registry", icon: Map, path: "/lands" },
    { label: "Disputes", icon: ShieldAlert, path: "/disputes" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  compliance_officer: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Executive Dashboard", icon: BarChart2, path: "/gov/executive-dashboard" },
    { label: "── LandVault ──────", icon: null, path: null, divider: true },
    { label: "LandVault Dashboard", icon: TreePine, path: "/lv" },
    { label: "Duplicate Alerts", icon: AlertTriangle, path: "/lv/duplicates" },
    { label: "Pilot Readiness", icon: ShieldCheck, path: "/lv/readiness" },
    { label: "Governance Audit", icon: ShieldAlert, path: "/lv/governance" },
    { label: "── Ehime Mbano LGA ──", icon: MapPin, path: null, divider: true },
    { label: "Parcel Registry", icon: MapPin, path: "/ehime/parcels" },
    { label: "Register Parcel", icon: FileText, path: "/ehime/register" },
    { label: "Bulk Packages", icon: Package, path: "/ehime/packages" },
    { label: "Public Verify", icon: Search, path: "/verify" },
    { label: "── ──────────── ──", icon: null, path: null, divider: true },
    { label: "Pilot Operations", icon: Activity, path: "/gov/pilot-dashboard" },
    { label: "Pilot Reports", icon: FileText, path: "/gov/pilot-reports" },
    { label: "Data Integrity", icon: ShieldCheck, path: "/gov/data-integrity" },
    { label: "Demo Readiness", icon: BookOpen, path: "/gov/demo-readiness" },
    { label: "Pilot Validation", icon: Activity, path: "/gov/pilot-validation" },
    { label: "Deployment Package", icon: ClipboardList, path: "/gov/deployment-package" },
    { label: "Production Readiness", icon: ServerCog, path: "/gov/production-readiness" },
    { label: "Customary Governance", icon: Landmark, path: "/gov/customary-governance" },
    { label: "Pending Approvals", icon: ClipboardList, path: "/gov/pending-approvals" },
    { label: "Inheritance Mgmt", icon: GitBranch, path: "/inheritance" },
    { label: "Fraud Alerts", icon: AlertTriangle, path: "/gov/fraud-alerts" },
    { label: "Freeze Parcels", icon: Lock, path: "/gov/parcel-freeze" },
    { label: "Audit Reports", icon: FileText, path: "/gov/audit-reports" },
    { label: "Compliance Reports", icon: ShieldCheck, path: "/gov/compliance-reports" },
    { label: "Global Audit", icon: History, path: "/gov/global-audit" },
    { label: "All Parcels", icon: Map, path: "/lands" },
    { label: "Disputes", icon: ShieldAlert, path: "/disputes" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
};

export default function Sidebar({ user, collapsed, setCollapsed }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || "general_user";
  const menuItems = roleMenus[role] || roleMenus.general_user;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-foreground truncate">LandVault</h1>
              <p className="text-[10px] text-muted-foreground">Aquasavannah</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, idx) => {
          if (item.divider) {
            return collapsed ? null : (
              <p key={idx} className="text-[10px] text-muted-foreground px-3 pt-3 pb-1 uppercase tracking-widest truncate font-semibold">
                {item.label.includes("Ehime") ? "Ehime Mbano" : ""}
              </p>
            );
          }
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              `}
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          to="/demo-guide"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === "/demo-guide" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Demo Guide</span>}
        </Link>
        <Link
          to="/demo"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-all"
        >
          <PlayCircle className="w-4 h-4 flex-shrink-0 text-primary" />
          {!collapsed && <span>Demo Accounts</span>}
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-lg border border-border"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-card shadow-xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ${collapsed ? "w-16" : "w-60"} flex-shrink-0`}>
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
          style={{ left: collapsed ? "52px" : "228px" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>
    </>
  );
}