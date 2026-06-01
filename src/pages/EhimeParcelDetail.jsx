import React, { useState } from "react";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  ArrowLeft, MapPin, Shield, FileText, CheckCircle2, Clock,
  AlertTriangle, Lock, Download, QrCode, History, User
} from "lucide-react";
import {
  PROPERTY_TYPE_LABELS, STATUS_LABELS, VERIFICATION_LABELS,
  ENCUMBRANCE_LABELS, LGA_CENTER
} from "@/lib/ehimeMbanoData";
import ParcelCertificate from "@/components/ehime/ParcelCertificate";
import CertificateReleasePanel from "@/components/ehime/CertificateReleasePanel";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ADMIN_ROLES = ["super_admin", "surveyor_general", "compliance_officer"];
const STAFF_ROLES = ["super_admin", "surveyor_general", "compliance_officer", "surveyor", "field_agent"];

function InfoItem({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function EhimeParcelDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCert, setShowCert] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newVerif, setNewVerif] = useState("");

  const { data: parcel, isLoading } = useQuery({
    queryKey: ["parcel-detail", id],
    queryFn: () => base44.entities.LandParcel.filter({ id }).then(r => r[0]),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["parcel-audit", id],
    queryFn: () => base44.entities.AuditLog.filter({ entity_id: id }, "-created_date", 20),
    enabled: ADMIN_ROLES.includes(user?.role),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ updates }) => {
      await base44.entities.LandParcel.update(id, updates);
      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user.email,
        user_name: user.full_name,
        action: "PARCEL_UPDATED",
        entity_type: "LandParcel",
        entity_id: id,
        details: JSON.stringify({ updates, parcel_number: parcel?.parcel_number }),
      });
    },
    onSuccess: () => {
      toast.success("Parcel updated");
      qc.invalidateQueries({ queryKey: ["parcel-detail", id] });
      qc.invalidateQueries({ queryKey: ["ehime-parcels"] });
    },
  });

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  if (!parcel) return <div className="text-center py-20 text-muted-foreground">Parcel not found</div>;

  let mapCenter = [LGA_CENTER.lat, LGA_CENTER.lng];
  let polygon = null;
  if (parcel.latitude && parcel.longitude) mapCenter = [parcel.latitude, parcel.longitude];
  if (parcel.parcel_boundary) {
    try {
      const geo = JSON.parse(parcel.parcel_boundary);
      const coords = geo?.geometry?.coordinates || geo?.coordinates;
      if (coords?.[0]) {
        polygon = coords[0].map(([lng, lat]) => [lat, lng]);
        if (polygon.length) mapCenter = polygon[0];
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/ehime/parcels")} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Registry
      </Button>

      {/* Header Card */}
      <Card className="border-2 border-green-200">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">Parcel Number</p>
              <p className="text-2xl font-bold font-mono text-foreground">{parcel.parcel_number}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  parcel.status === "approved" || parcel.status === "approved_locked"
                    ? "bg-green-100 text-green-800"
                    : parcel.status === "rejected" ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>{STATUS_LABELS[parcel.status] || parcel.status}</span>
                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {VERIFICATION_LABELS[parcel.verification_status]}
                </span>
                {parcel.property_type && (
                  <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                    {PROPERTY_TYPE_LABELS[parcel.property_type]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline" size="sm"
                onClick={() => window.open(`/verify?parcel_id=${parcel.parcel_number}`, "_blank")}
                className="gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" /> Public View
              </Button>
              {parcel.certificate_release_status === "released" && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowCert(!showCert)}
                  className="gap-1.5 border-green-300 text-green-700"
                >
                  <Download className="w-3.5 h-3.5" /> Certificate
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Panel */}
      {showCert && parcel.certificate_release_status === "released" && <ParcelCertificate parcel={parcel} />}

      {/* Certificate Release Panel — always shown to staff */}
      {STAFF_ROLES.includes(user?.role) && (
        <CertificateReleasePanel
          parcel={parcel}
          user={user}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["parcel-detail", id] })}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-green-700" /> Location</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoItem label="State" value={parcel.state} />
            <InfoItem label="LGA" value={parcel.lga} />
            <InfoItem label="Ward" value={parcel.ward} />
            <InfoItem label="Community" value={parcel.community} />
            <InfoItem label="Address" value={parcel.address} />
            <InfoItem label="Size" value={parcel.size_sqm ? `${parcel.size_sqm.toLocaleString()} sqm` : null} />
            <InfoItem label="Encumbrance" value={ENCUMBRANCE_LABELS[parcel.encumbrance_status]} />
          </CardContent>
        </Card>

        {/* Ownership — restricted */}
        {STAFF_ROLES.includes(user?.role) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-green-700" /> Ownership
                <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoItem label="Owner Name" value={parcel.owner_name} />
              <InfoItem label="Ownership Type" value={parcel.ownership_type} />
              {ADMIN_ROLES.includes(user?.role) && (
                <>
                  <InfoItem label="Phone" value={parcel.owner_phone} />
                  <InfoItem label="Email" value={parcel.owner_email} />
                  <InfoItem label="NIN" value={parcel.owner_nin ? "••••••••" : "Not provided"} />
                </>
              )}
              <InfoItem label="Registered By" value={parcel.registered_by} />
              <InfoItem label="Registration Date" value={parcel.registration_date} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* GIS Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-green-700" /> GIS Map</CardTitle>
        </CardHeader>
        <CardContent>
          <MapContainer center={mapCenter} zoom={16} className="w-full h-72 rounded-lg z-0" scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {polygon && <Polygon positions={polygon} color="#16a34a" fillOpacity={0.3} />}
            <Marker position={mapCenter}><Popup>{parcel.parcel_number}</Popup></Marker>
          </MapContainer>
          {parcel.boundary_area && (
            <p className="text-xs text-muted-foreground mt-2">
              Area: {parcel.boundary_area.toFixed(1)} sqm · Perimeter: {parcel.boundary_perimeter?.toFixed(1)}m · GIS: {parcel.spatial_validation_status?.replace(/_/g, " ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      {ADMIN_ROLES.includes(user?.role) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-green-700" /> Administrative Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-2">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue placeholder="Change status…" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">Update Verification</p>
                <Select value={newVerif} onValueChange={setNewVerif}>
                  <SelectTrigger><SelectValue placeholder="Change verification…" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VERIFICATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              value={approveNotes}
              onChange={e => setApproveNotes(e.target.value)}
              placeholder="Action notes (optional)…"
              rows={2}
            />
            <Button
              onClick={() => updateMutation.mutate({
                updates: {
                  ...(newStatus ? { status: newStatus, approved_by: user.email, approval_date: new Date().toISOString().split("T")[0] } : {}),
                  ...(newVerif ? { verification_status: newVerif } : {}),
                  ...(approveNotes ? { notes: approveNotes } : {}),
                }
              })}
              disabled={(!newStatus && !newVerif) || updateMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              {updateMutation.isPending ? "Saving…" : "Apply Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {ADMIN_ROLES.includes(user?.role) && auditLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-green-700" /> Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{log.action?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{log.user_name || log.user_email} · {new Date(log.created_date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}