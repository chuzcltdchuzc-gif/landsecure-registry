import React, { useState, useEffect } from "react";
import { Bell, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const roleBadgeLabels = {
  general_user: "General User",
  surveyor_general: "Surveyor General",
  surveyor: "Surveyor",
  field_agent: "Field Agent",
};

export default function TopBar({ user }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-unread", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email, read: false }, "-created_date", 5),
    enabled: !!user?.email,
  });

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-4 lg:ml-0 ml-12">
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          LandSecure Registry
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="hidden sm:flex text-xs">
          {roleBadgeLabels[user?.role] || "User"}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} asChild>
                  <Link to="/notifications" className="flex flex-col gap-1 p-3">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{n.message}</span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.full_name?.[0] || "U"}
          </div>
          <span className="text-sm font-medium hidden md:block">{user?.full_name || "User"}</span>
        </div>
      </div>
    </header>
  );
}