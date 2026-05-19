import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Disputes() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    parcel_number: "",
    dispute_type: "",
    description: "",
    priority: "medium",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const role = user?.role || "general_user";
  const isOfficer = role === "surveyor_general";

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["disputes", role, user?.email],
    queryFn: () => {
      if (isOfficer) return base44.entities.Dispute.list("-created_date", 200);
      return base44.entities.Dispute.filter({ complainant_email: user?.email }, "-created_date", 100);
    },
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Dispute.create({
        ...form,
        parcel_id: "",
        complainant_email: user?.email,
        complainant_name: user?.full_name,
        status: "open",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      setOpen(false);
      setForm({ parcel_number: "", dispute_type: "", description: "", priority: "medium" });
      toast.success("Dispute filed successfully");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.Dispute.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Status updated");
    },
  });

  const filtered = disputes.filter((d) => statusFilter === "all" || d.status === statusFilter);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-1">{isOfficer ? "Manage all land disputes" : "Your filed disputes"}</p>
        </div>
        {!isOfficer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> File Dispute</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>File a New Dispute</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Parcel Number</Label>
                  <Input value={form.parcel_number} onChange={(e) => set("parcel_number", e.target.value)} placeholder="Parcel number" />
                </div>
                <div>
                  <Label>Dispute Type</Label>
                  <Select value={form.dispute_type} onValueChange={(v) => set("dispute_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boundary">Boundary</SelectItem>
                      <SelectItem value="ownership">Ownership</SelectItem>
                      <SelectItem value="fraud">Fraud</SelectItem>
                      <SelectItem value="encroachment">Encroachment</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the dispute..." />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!form.dispute_type || !form.description || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Submitting..." : "Submit Dispute"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="under_review">Under Review</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="escalated">Escalated</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No disputes" description="No disputes match the current filter" />
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={d.status} />
                      <StatusBadge status={d.priority} />
                      <span className="text-xs text-muted-foreground">{d.dispute_type?.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm font-medium">{d.complainant_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                    {d.parcel_number && <p className="text-xs text-muted-foreground mt-2">Parcel: {d.parcel_number}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(d.created_date), "MMM d, yyyy")}</p>
                  </div>
                  {isOfficer && (
                    <Select value={d.status} onValueChange={(v) => updateStatusMutation.mutate({ id: d.id, status: v })}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}