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
  PlayCircle
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
    { label: "Approvals", icon: Shield, path: "/approvals" },
    { label: "Land Registry", icon: Map, path: "/lands" },
    { label: "Survey Reviews", icon: Compass, path: "/survey-reviews" },
    { label: "Disputes", icon: AlertTriangle, path: "/disputes" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Audit Logs", icon: History, path: "/audit-logs" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  surveyor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Register Land", icon: FileText, path: "/register-land" },
    { label: "My Submissions", icon: ClipboardList, path: "/my-submissions" },
    { label: "Survey Documents", icon: Compass, path: "/survey-documents" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
  ],
  field_agent: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Field Reports", icon: Camera, path: "/field-reports" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Assigned Parcels", icon: ClipboardList, path: "/assigned-parcels" },
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
              <h1 className="font-bold text-sm text-foreground truncate">LandSecure</h1>
              <p className="text-[10px] text-muted-foreground">Registry</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          to="/demo"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-all"
        >
          <PlayCircle className="w-4 h-4 flex-shrink-0 text-primary" />
          {!collapsed && <span>Demo Guide</span>}
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