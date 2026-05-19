import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  disputed: "bg-orange-100 text-orange-700 border-orange-200",
  transferred: "bg-blue-100 text-blue-700 border-blue-200",
  open: "bg-amber-100 text-amber-700 border-amber-200",
  under_review: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  escalated: "bg-red-100 text-red-700 border-red-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
  unverified: "bg-gray-100 text-gray-600 border-gray-200",
  field_verified: "bg-blue-100 text-blue-700 border-blue-200",
  survey_verified: "bg-indigo-100 text-indigo-700 border-indigo-200",
  fully_verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  reviewed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={`${statusStyles[status] || "bg-gray-100 text-gray-600"} text-xs font-medium border`}>
      {label}
    </Badge>
  );
}