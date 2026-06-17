import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, MapPin, FileText, TrendingUp, Database, Award } from "lucide-react";

const BADGE_CONFIG = {
  GREY: { label: "Archive Record", color: "bg-gray-100 text-gray-600 border-gray-300", icon: Database },
  BLUE: { label: "Surveyor Verified", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Shield },
  GREEN: { label: "Community Verified", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: Award },
};

export default function SurveyorPublicProfile() {
  const { id } = useParams();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["lv-surveyor-profile", id],
    queryFn: () => base44.entities.SurveyorPartner.filter({ id }),
  });
  const partner = partners[0];

  const { data: archiveRecords = [] } = useQuery({
    queryKey: ["lv-archive-surveyor", partner?.user_email],
    queryFn: () => base44.entities.ArchiveRecord.filter({ surveyor_email: partner?.user_email, status: "ACTIVE" }, "-import_date", 50),
    enabled: !!partner?.user_email,
  });

  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!partner) return <div className="text-center py-10 text-sm text-muted-foreground">Surveyor profile not found.</div>;

  const specAreas = (() => { try { return JSON.parse(partner.specialization_areas || "[]"); } catch { return []; } })();
  const certs = (() => { try { return JSON.parse(partner.professional_certifications || "[]"); } catch { return []; } })();

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-xl font-bold">Surveyor Profile</h1>
      </div>

      {/* Header Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-slate-900 h-24 relative">
          <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center">
            {partner.profile_photo_url ? (
              <img src={partner.profile_photo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <Shield className="w-7 h-7 text-slate-600" />
            )}
          </div>
        </div>
        <CardContent className="pt-10 px-6 pb-5 space-y-1">
          <h2 className="text-xl font-bold">{partner.full_name}</h2>
          <p className="text-sm text-muted-foreground">{partner.firm_name || "Independent Surveyor"}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className="text-[10px] bg-blue-100 text-blue-700">SURCON: {partner.surcon_number || "—"}</Badge>
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{partner.verification_status?.replace(/_/g, " ")}</Badge>
            {partner.lga_coverage && <Badge className="text-[10px] bg-violet-100 text-violet-700">{partner.lga_coverage}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Records Uploaded", value: partner.total_records_uploaded, color: "text-blue-600", icon: Database },
          { label: "Surveyor Verified", value: partner.surveyor_verified_records, color: "text-blue-700", icon: Shield },
          { label: "Community Verified", value: partner.community_verified_records, color: "text-emerald-600", icon: Award },
          { label: "Certificates", value: partner.certificates_generated, color: "text-violet-600", icon: FileText },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value || 0}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bio & Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Professional Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Years Experience</p><p className="font-medium">{partner.years_of_experience || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">State</p><p className="font-medium">{partner.state || "—"}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Office Address</p><p className="font-medium text-xs">{partner.office_address || "—"}</p></div>
          </div>
          {partner.biography && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Biography</p>
              <p className="text-sm leading-relaxed">{partner.biography}</p>
            </div>
          )}
          {specAreas.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Specializations</p>
              <div className="flex flex-wrap gap-1">{specAreas.map(a => <Badge key={a} className="text-[10px] bg-violet-50 text-violet-700">{a}</Badge>)}</div>
            </div>
          )}
          {certs.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Certifications</p>
              <div className="flex flex-wrap gap-1">{certs.map(c => <Badge key={c} className="text-[10px] bg-amber-50 text-amber-700">{c}</Badge>)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Archive Records */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Archives</CardTitle>
          <Badge className="text-[10px]">{archiveRecords.length} records</Badge>
        </CardHeader>
        <CardContent>
          {archiveRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No archive records published yet.</p>
          ) : (
            <div className="space-y-2 divide-y divide-border">
              {archiveRecords.slice(0, 10).map((r) => (
                <div key={r.id} className="py-2 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-xs">{r.archive_reference}</p>
                    <p className="text-xs text-muted-foreground">{r.community}, {r.ward} · {r.survey_date}</p>
                  </div>
                  {r.trust_badge && (
                    <Badge className={`text-[10px] px-1.5 py-0 ${BADGE_CONFIG[r.trust_badge]?.color || ""}`}>
                      {BADGE_CONFIG[r.trust_badge]?.label || r.trust_badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 inline mr-1" />
          {partner.lga_coverage ? `${partner.lga_coverage}, ${partner.state || "Imo State"}` : "Ehime Mbano LGA, Imo State"} · Aquasavannah LandVault Surveyor Network
        </p>
      </div>
    </div>
  );
}