import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Plus, ChevronRight, FileText, Camera } from "lucide-react";

const STATUS_COLORS = {
  NEW_LEAD: "bg-gray-100 text-gray-700", COMMUNITY_CONTACTED: "bg-blue-100 text-blue-700",
  FAMILY_CONTACTED: "bg-indigo-100 text-indigo-700", CONSENT_RECEIVED: "bg-purple-100 text-purple-700",
  SURVEY_SCHEDULED: "bg-yellow-100 text-yellow-800", SURVEY_IN_PROGRESS: "bg-orange-100 text-orange-700",
  SURVEY_COMPLETED: "bg-emerald-100 text-emerald-700", DOCUMENTATION_COMPLETE: "bg-teal-100 text-teal-700",
  CERTIFICATE_READY: "bg-green-100 text-green-700", CERTIFICATE_ISSUED: "bg-green-200 text-green-900",
};

const STATUSES = [
  "NEW_LEAD","COMMUNITY_CONTACTED","FAMILY_CONTACTED","CONSENT_RECEIVED",
  "SURVEY_SCHEDULED","SURVEY_IN_PROGRESS","SURVEY_COMPLETED","DOCUMENTATION_COMPLETE","CERTIFICATE_READY","CERTIFICATE_ISSUED"
];

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["lv-lead", id],
    queryFn: () => base44.entities.CommunityLead.filter({ id }),
  });
  const lead = leads[0];

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcels-lead", id],
    queryFn: () => base44.entities.LandVaultParcel.filter({ lead_id: id }),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.CommunityLead.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lv-lead", id] }),
  });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>;
  if (!lead) return <div className="text-center py-10 text-muted-foreground text-sm">Lead not found.</div>;

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{lead.family_name || lead.community}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-[10px] px-2 py-0 rounded-full ${STATUS_COLORS[lead.status] || ""}`}>
              {lead.status?.replace(/_/g, " ")}
            </Badge>
            {lead.lead_number && <span className="text-[10px] text-muted-foreground font-mono">{lead.lead_number}</span>}
          </div>
        </div>
        <Link to={`/lv/leads/${id}/edit`}>
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
      </div>

      {/* Status Update */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Update Status</p>
          <Select value={lead.status} onValueChange={v => updateStatus.mutate(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> Location</CardTitle></CardHeader>
        <CardContent>
          <Row label="Community" value={lead.community} />
          <Row label="Village" value={lead.village} />
          <Row label="Ward" value={lead.ward} />
          <Row label="LGA" value={lead.lga} />
          <Row label="State" value={lead.state} />
          <Row label="Visit Date" value={lead.visit_date} />
          {lead.gps_lat && <Row label="GPS" value={`${lead.gps_lat?.toFixed(5)}, ${lead.gps_lng?.toFixed(5)}`} />}
        </CardContent>
      </Card>

      {/* Community Leader */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Community Leader</CardTitle></CardHeader>
        <CardContent>
          <Row label="Name" value={lead.community_leader_name} />
          <Row label="Phone" value={lead.community_leader_phone} />
          <Row label="Role" value={lead.community_leader_role?.replace(/_/g," ")} />
        </CardContent>
      </Card>

      {/* Family */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Family</CardTitle></CardHeader>
        <CardContent>
          <Row label="Family Name" value={lead.family_name} />
          <Row label="Representative" value={lead.family_representative} />
          <Row label="Rep Phone" value={lead.family_representative_phone} />
          <Row label="Est. Plots" value={lead.estimated_plots} />
        </CardContent>
      </Card>

      {/* Notes */}
      {lead.notes && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{lead.notes}</p></CardContent>
        </Card>
      )}

      {/* Linked Parcels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Linked Parcels ({parcels.length})</h2>
          <Link to={`/lv/parcels/new?lead_id=${id}`}>
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"><Plus className="w-3 h-3" />Add Parcel</Button>
          </Link>
        </div>
        <div className="space-y-2">
          {parcels.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="py-6 text-center text-muted-foreground text-sm">No parcels yet. Add the first parcel for this family.</CardContent>
            </Card>
          )}
          {parcels.map(p => (
            <Link key={p.id} to={`/lv/parcels/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-violet-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.parcel_number || "Draft Parcel"}</p>
                    <p className="text-xs text-muted-foreground">{p.community} · {p.ownership_type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={`/lv/evidence?parcel_lead=${id}`}>
          <Button variant="outline" className="w-full gap-2 text-sm"><Camera className="w-4 h-4" />Add Evidence</Button>
        </Link>
        <Link to={`/lv/parcels/new?lead_id=${id}`}>
          <Button className="w-full gap-2 text-sm bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4" />New Parcel</Button>
        </Link>
      </div>
    </div>
  );
}