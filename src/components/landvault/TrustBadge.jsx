import React from "react";
import { Badge } from "@/components/ui/badge";
import { Database, Shield, Award } from "lucide-react";

const TRUST_BADGE_CONFIG = {
  GREY: { label: "Archive Record", color: "bg-gray-100 text-gray-600 border-gray-300", icon: Database },
  BLUE: { label: "Surveyor Verified", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Shield },
  GREEN: { label: "Community Verified", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: Award },
};

export default function TrustBadge({ badge, className }) {
  if (!badge) return null;
  const config = TRUST_BADGE_CONFIG[badge] || TRUST_BADGE_CONFIG.GREY;
  const Icon = config.icon;
  return (
    <Badge className={`text-[10px] px-2 py-0 rounded-full flex items-center gap-1 ${config.color} ${className || ""}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </Badge>
  );
}

export { TRUST_BADGE_CONFIG };