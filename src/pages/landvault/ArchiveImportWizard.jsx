import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileText, MapPin, CheckCircle2, Loader2, ChevronRight, Database, Shield } from "lucide-react";
import { useOutletContext } from "react-router-dom";

const STEP_LABELS = ["Upload Documents", "Capture Metadata", "Assign Trust Level", "Preview", "Submit"];
const TRUST_LEVELS = [
  { value: "ARCHIVE_ONLY", label: "Archive Only — Historical record only, no validation", badge: "GREY", icon: Database, color: "bg-gray-100 border-gray-300" },
  { value: "SURVEYOR_VERIFIED", label: "Surveyor Verified — You confirm authenticity, coordinates, and reference", badge: "BLUE", icon: Shield, color: "bg-blue-50 border-blue-300" },
  { value: "COMMUNITY_VERIFIED", label: "Community Verified — Includes consent, witness, and community attestation", badge: "GREEN", icon: CheckCircle2, color: "bg-emerald-50 border-emerald-300" },
];

function BatchPreview({ records }) {
  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {records.map((r, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{r.survey_reference}</p>
              <p className="text-[10px] text-muted-foreground">{r.community}, {r.ward} · {r.lga}</p>
            </div>
            <Badge className={`text-[10px] px-1.5 py-0 ${r.classification === "COMMUNITY_VERIFIED" ? "bg-emerald-100 text-emerald-700" : r.classification === "SURVEYOR_VERIFIED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {r.classification?.replace(/_/g, " ")}
            </Badge>
          </CardContent>
        </Card>
      ))}
      {records.length === 0 && (
        <Card className="border-dashed border-2"><CardContent className="py-8 text-center text-xs text-muted-foreground">No records added yet.</CardContent></Card>
      )}
    </div>
  );
}

export default function ArchiveImportWizard() {
  const navigate = useNavigate();
  const { user } = useOutletContext() || {};
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Files
  const [files, setFiles] = useState({ survey_plan: null, coordinates: null, supporting: [] });

  // Step 2 — Records array
  const [records, setRecords] = useState([]);
  const [currentMeta, setCurrentMeta] = useState({
    survey_reference: "", survey_date: "", state: "Imo", lga: "Ehime Mbano",
    ward: "", community: "", village: "", gps_lat: "", gps_lng: "",
    client_consent_status: "not_applicable", allocation_letter: null, family_agreement: null, photos: null, notes: ""
  });

  // Step 3 — Trust classification
  const [classification, setClassification] = useState("ARCHIVE_ONLY");

  const createMutation = useMutation({
    mutationFn: async () => {
      // Upload files first
      let survey_plan_url = "";
      let coordinate_file_url = "";
      const supporting_urls = [];

      if (files.survey_plan) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files.survey_plan });
        survey_plan_url = file_url;
      }
      if (files.coordinates) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files.coordinates });
        coordinate_file_url = file_url;
      }
      for (const sf of files.supporting) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: sf });
        supporting_urls.push(file_url);
      }

      // Create batch
      const batchId = `BATCH-${Date.now()}`;
      const createdRecords = [];
      for (const rec of records) {
        // Upload individual files
        let alloc_url = "";
        let family_url = "";
        let photo_urls = [];
        if (rec._allocationLetter) { const { file_url } = await base44.integrations.Core.UploadFile({ file: rec._allocationLetter }); alloc_url = file_url; }
        if (rec._familyAgreement) { const { file_url } = await base44.integrations.Core.UploadFile({ file: rec._familyAgreement }); family_url = file_url; }
        if (rec._photos) {
          for (const ph of (Array.isArray(rec._photos) ? rec._photos : [rec._photos])) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: ph });
            photo_urls.push(file_url);
          }
        }

        const archiveRef = `ASV-ARCH-${Date.now().toString(36).toUpperCase()}-${String(createdRecords.length + 1).padStart(3, "0")}`;
        const record = await base44.entities.ArchiveRecord.create({
          archive_reference: archiveRef,
          survey_reference: rec.survey_reference,
          survey_date: rec.survey_date,
          community: rec.community,
          village: rec.village,
          ward: rec.ward,
          lga: rec.lga,
          state: rec.state,
          survey_plan_url: survey_plan_url || rec._surveyPlanUrl || "",
          coordinate_file_url: coordinate_file_url || "",
          supporting_docs: [...supporting_urls, alloc_url, family_url].filter(Boolean),
          photos: photo_urls,
          classification: rec.classification || classification,
          trust_badge: rec.classification === "COMMUNITY_VERIFIED" ? "GREEN" : rec.classification === "SURVEYOR_VERIFIED" ? "BLUE" : "GREY",
          surveyor_partner_id: user?.email,
          surveyor_email: user?.email,
          surveyor_name: user?.full_name,
          gps_lat: rec.gps_lat ? parseFloat(rec.gps_lat) : undefined,
          gps_lng: rec.gps_lng ? parseFloat(rec.gps_lng) : undefined,
          client_consent_status: rec.client_consent_status || "not_applicable",
          import_batch_id: batchId,
          import_date: new Date().toISOString(),
          status: "ACTIVE",
        });
        createdRecords.push(record);
      }

      // Update surveyor partner metrics
      const partners = await base44.entities.SurveyorPartner.filter({ user_email: user?.email });
      if (partners.length > 0) {
        const partner = partners[0];
        const verifiedCount = records.filter(r => (r.classification || classification) === "SURVEYOR_VERIFIED").length;
        const communityCount = records.filter(r => (r.classification || classification) === "COMMUNITY_VERIFIED").length;
        await base44.entities.SurveyorPartner.update(partner.id, {
          total_records_uploaded: (partner.total_records_uploaded || 0) + records.length,
          archive_records: (partner.archive_records || 0) + records.length,
          surveyor_verified_records: (partner.surveyor_verified_records || 0) + verifiedCount,
          community_verified_records: (partner.community_verified_records || 0) + communityCount,
        });
      }

      return { batchId, count: createdRecords.length };
    },
    onSuccess: (data) => {
      setSubmitting(false);
      navigate(`/lv/surveyor?batch=${data.batchId}&count=${data.count}`);
    },
    onError: () => setSubmitting(false),
  });

  const addRecord = () => {
    if (!currentMeta.survey_reference || !currentMeta.community) return;
    const rec = {
      ...currentMeta,
      classification,
      _allocationLetter: currentMeta.allocation_letter,
      _familyAgreement: currentMeta.family_agreement,
      _photos: currentMeta.photos,
    };
    setRecords([...records, rec]);
    setCurrentMeta({ survey_reference: "", survey_date: "", state: "Imo", lga: "Ehime Mbano", ward: "", community: "", village: "", gps_lat: "", gps_lng: "", client_consent_status: "not_applicable", allocation_letter: null, family_agreement: null, photos: null, notes: "" });
  };

  const removeRecord = (idx) => setRecords(records.filter((_, i) => i !== idx));

  const totalSteps = 5;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Archive Import Wizard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {STEP_LABELS.map((l, i) => (
              <React.Fragment key={l}>
                <span className={`text-[10px] ${i + 1 <= step ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>{l}</span>
                {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i + 1 <= step ? "bg-blue-600" : "bg-gray-200"}`} />
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Step 1: Upload Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Upload your historical survey plans and coordinate data. Accepted: PDF, ZIP, Images, CSV, CAD exports.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Survey Plan (PDF, Image)</Label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFiles(f => ({...f, survey_plan: e.target.files[0]}))} className="w-full mt-1 text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 cursor-pointer" />
                {files.survey_plan && <p className="text-[10px] text-blue-600 mt-1">{files.survey_plan.name}</p>}
              </div>
              <div>
                <Label className="text-xs">Coordinate File (CSV, GeoJSON, CAD)</Label>
                <input type="file" accept=".csv,.geojson,.json,.dxf,.dwg" onChange={e => setFiles(f => ({...f, coordinates: e.target.files[0]}))} className="w-full mt-1 text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 cursor-pointer" />
                {files.coordinates && <p className="text-[10px] text-blue-600 mt-1">{files.coordinates.name}</p>}
              </div>
              <div>
                <Label className="text-xs">Supporting Documents (Multiple)</Label>
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.zip" onChange={e => setFiles(f => ({...f, supporting: [...e.target.files]}))} className="w-full mt-1 text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 cursor-pointer" />
                {files.supporting.length > 0 && <p className="text-[10px] text-blue-600 mt-1">{files.supporting.length} file(s) selected</p>}
              </div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Metadata */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Step 2: Capture Metadata</CardTitle>
            <Badge className="text-[10px] bg-blue-100 text-blue-700">{records.length} added</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Add records one at a time. Required: survey reference, date, and location.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Survey Reference *</Label><Input value={currentMeta.survey_reference} onChange={e => setCurrentMeta(m => ({...m, survey_reference: e.target.value}))} placeholder="e.g. SURV-1998-042" className="text-xs" /></div>
              <div><Label className="text-xs">Survey Date *</Label><Input type="date" value={currentMeta.survey_date} onChange={e => setCurrentMeta(m => ({...m, survey_date: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">State</Label><Input value={currentMeta.state} onChange={e => setCurrentMeta(m => ({...m, state: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">LGA</Label><Input value={currentMeta.lga} onChange={e => setCurrentMeta(m => ({...m, lga: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">Ward</Label><Input value={currentMeta.ward} onChange={e => setCurrentMeta(m => ({...m, ward: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">Community *</Label><Input value={currentMeta.community} onChange={e => setCurrentMeta(m => ({...m, community: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">Village</Label><Input value={currentMeta.village} onChange={e => setCurrentMeta(m => ({...m, village: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">Client Consent</Label>
                <Select value={currentMeta.client_consent_status} onValueChange={v => setCurrentMeta(m => ({...m, client_consent_status: v}))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obtained" className="text-xs">Obtained</SelectItem>
                    <SelectItem value="not_obtained" className="text-xs">Not Obtained</SelectItem>
                    <SelectItem value="not_applicable" className="text-xs">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">GPS Lat</Label><Input value={currentMeta.gps_lat} onChange={e => setCurrentMeta(m => ({...m, gps_lat: e.target.value}))} className="text-xs" /></div>
              <div><Label className="text-xs">GPS Lng</Label><Input value={currentMeta.gps_lng} onChange={e => setCurrentMeta(m => ({...m, gps_lng: e.target.value}))} className="text-xs" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Allocation Letter</Label><input type="file" accept=".pdf,image/*" onChange={e => setCurrentMeta(m => ({...m, allocation_letter: e.target.files[0]}))} className="w-full mt-1 text-xs file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-gray-50 cursor-pointer" /></div>
              <div><Label className="text-xs">Family Agreement</Label><input type="file" accept=".pdf,image/*" onChange={e => setCurrentMeta(m => ({...m, family_agreement: e.target.files[0]}))} className="w-full mt-1 text-xs file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-gray-50 cursor-pointer" /></div>
              <div><Label className="text-xs">Site Photos</Label><input type="file" multiple accept="image/*" onChange={e => setCurrentMeta(m => ({...m, photos: [...e.target.files]}))} className="w-full mt-1 text-xs file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-gray-50 cursor-pointer" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={currentMeta.notes} onChange={e => setCurrentMeta(m => ({...m, notes: e.target.value}))} className="text-xs" /></div>

            <div className="flex gap-2">
              <Button onClick={addRecord} disabled={!currentMeta.survey_reference || !currentMeta.community} className="flex-1 gap-1 text-sm" variant="outline">
                + Add Record
              </Button>
              <Button onClick={() => setStep(records.length > 0 ? 3 : 1)} className="flex-1 gap-2 text-sm" disabled={records.length === 0}>
                Continue ({records.length}) <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview */}
            {records.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium mb-2">Added Records</p>
                <BatchPreview records={records} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Trust Level */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Step 3: Assign Trust Level</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Classify records by trust level. This determines the badge displayed on verification, certificates, and your profile.</p>
            {TRUST_LEVELS.map((tl) => (
              <button
                key={tl.value}
                onClick={() => setClassification(tl.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${classification === tl.value ? `${tl.color} ring-2 ring-offset-1 ring-blue-400` : "border-border hover:border-gray-300"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${classification === tl.value ? "bg-blue-600" : "bg-gray-100"}`}>
                    <tl.icon className={`w-4 h-4 ${classification === tl.value ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tl.value.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tl.label}</p>
                    <Badge className={`text-[10px] mt-1.5 px-1.5 py-0 ${tl.value === "COMMUNITY_VERIFIED" ? "bg-emerald-100 text-emerald-700" : tl.value === "SURVEYOR_VERIFIED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {tl.badge} BADGE
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1 text-sm"><ArrowLeft className="w-3 h-3" /> Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1 gap-2 text-sm">Continue <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Preview */}
      {step === 4 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Step 4: Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Records</p><p className="font-bold text-lg">{records.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Classification</p><Badge className={classification === "COMMUNITY_VERIFIED" ? "bg-emerald-100 text-emerald-700" : classification === "SURVEYOR_VERIFIED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>{classification.replace(/_/g, " ")}</Badge></div>
              <div><p className="text-xs text-muted-foreground">Survey Plan</p><p className="text-xs">{files.survey_plan?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Coordinates</p><p className="text-xs">{files.coordinates?.name || "—"}</p></div>
            </div>
            <BatchPreview records={records} />
            <div className="flex gap-2">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1 text-sm"><ArrowLeft className="w-3 h-3" /> Back</Button>
              <Button onClick={() => setStep(5)} className="flex-1 gap-2 text-sm">Confirm & Submit <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Submit */}
      {step === 5 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Step 5: Submit to Archive</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <Database className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-lg">{records.length} Records Ready</p>
              <p className="text-xs text-muted-foreground">Classification: {classification.replace(/_/g, " ")}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">Records will be created with SHA-256 fingerprints for data integrity. Duplicate detection runs automatically.</p>
            <div className="flex gap-2">
              <Button onClick={() => setStep(4)} variant="outline" className="flex-1 text-sm"><ArrowLeft className="w-3 h-3" /> Back</Button>
              <Button
                onClick={() => { setSubmitting(true); createMutation.mutate(); }}
                disabled={submitting}
                className="flex-1 gap-2 text-sm bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><Upload className="w-4 h-4" />Submit All Records</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}