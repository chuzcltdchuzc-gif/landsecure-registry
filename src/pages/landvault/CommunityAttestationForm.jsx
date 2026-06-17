import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, Users, MapPin, FileText, CheckCircle2, ArrowRight, ArrowLeft, Clock, AlertTriangle, Camera, Mic, Video, Scale } from "lucide-react";

const ROLE_OPTIONS = [
  "FAMILY_HEAD", "KINDRED_HEAD", "VILLAGE_CHAIRMAN", "TRADITIONAL_RULER",
  "COMMUNITY_DEVELOPMENT_UNION", "LAND_COMMITTEE_MEMBER", "RELIGIOUS_LEADER",
  "SURVEYOR_WITNESS", "COMMUNITY_WITNESS",
];

const ROLE_LABELS = {
  FAMILY_HEAD: "Family Head", KINDRED_HEAD: "Kindred Head", VILLAGE_CHAIRMAN: "Village Chairman",
  TRADITIONAL_RULER: "Traditional Ruler", COMMUNITY_DEVELOPMENT_UNION: "Community Development Union",
  LAND_COMMITTEE_MEMBER: "Land Committee Member", RELIGIOUS_LEADER: "Religious Leader",
  SURVEYOR_WITNESS: "Surveyor Witness", COMMUNITY_WITNESS: "Community Witness",
};

const CHECKLIST_ITEMS = [
  "Survey Plan Reviewed",
  "Coordinates Reviewed",
  "Community Location Confirmed",
  "Family Connection Reviewed",
  "Boundary Knowledge Confirmed",
  "Supporting Documents Reviewed",
];

const CONFIDENCE_RULES = {
  FAMILY_HEAD: 8, VILLAGE_CHAIRMAN: 8, TRADITIONAL_RULER: 10,
  SURVEYOR_WITNESS: 10, COMMUNITY_WITNESS: 5,
  KINDRED_HEAD: 7, COMMUNITY_DEVELOPMENT_UNION: 6,
  LAND_COMMITTEE_MEMBER: 6, RELIGIOUS_LEADER: 5,
};

export default function CommunityAttestationForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1: Parcel selection
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [parcelSearch, setParcelSearch] = useState("");

  // Step 2: Checklist
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.reduce((a, i) => ({ ...a, [i]: false }), {}));
  const checklistDone = Object.values(checklist).every(Boolean);

  // Step 3: Attestation data
  const [form, setForm] = useState({
    attestor_name: "", attestor_role: "COMMUNITY_WITNESS", community_name: "",
    relationship_to_land: "", years_of_knowledge: "", attestation_statement: "",
    supporting_evidence_notes: "", additional_notes: "",
    consensus_contribution: "SUPPORTING",
    phone_number: "", email: "",
  });

  // Step 4: Confirmation
  const [submitted, setSubmitted] = useState(false);
  const [generatedId, setGeneratedId] = useState("");

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcels-attest"],
    queryFn: () => base44.entities.LandVaultParcel.filter({}, "-created_date", 200),
  });

  const { data: existingAttestations = [] } = useQuery({
    queryKey: ["existing-attestations"],
    queryFn: () => base44.entities.CommunityAttestation.filter({}),
  });

  const selectedParcel = parcels.find(p => p.id === selectedParcelId);
  const parcelAttestations = existingAttestations.filter(a => a.parcel_id === selectedParcelId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunityAttestation.create(data),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: ["community-attestations-all"] });
      qc.invalidateQueries({ queryKey: ["existing-attestations"] });
      setGeneratedId(record.attestation_id || `ATTEST-${selectedParcel?.lga?.slice(0, 3)?.toUpperCase() || "XXX"}-${String(existingAttestations.length + 1).padStart(6, "0")}`);
      setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    const lgaCode = selectedParcel?.lga?.slice(0, 3)?.toUpperCase() || "XXX";
    const seq = String(existingAttestations.length + 1).padStart(6, "0");
    const attestationId = `ATTEST-${lgaCode}-${seq}`;

    const confidence = CONFIDENCE_RULES[form.attestor_role] || 5;

    createMutation.mutate({
      attestation_id: attestationId,
      parcel_id: selectedParcelId,
      parcel_number: selectedParcel?.parcel_number || "",
      attestor_name: form.attestor_name,
      attestor_role: form.attestor_role,
      community_name: form.community_name || selectedParcel?.community || "",
      ward: selectedParcel?.ward || "",
      lga: selectedParcel?.lga || "",
      state: selectedParcel?.state || "",
      phone_number: form.phone_number,
      email: form.email,
      relationship_to_land: form.relationship_to_land,
      years_of_knowledge: Number(form.years_of_knowledge) || 0,
      attestation_statement: form.attestation_statement,
      supporting_evidence_notes: form.supporting_evidence_notes,
      additional_notes: form.additional_notes,
      evidence_review_checklist: JSON.stringify(Object.entries(checklist).filter(([, v]) => v).map(([k]) => k)),
      verification_status: "PENDING",
      confidence_impact: confidence,
      consensus_contribution: form.consensus_contribution,
      traditional_institution_verified: ["TRADITIONAL_RULER", "VILLAGE_CHAIRMAN", "COMMUNITY_DEVELOPMENT_UNION"].includes(form.attestor_role),
      special_badge: ["TRADITIONAL_RULER", "VILLAGE_CHAIRMAN"].includes(form.attestor_role) ? "TRADITIONAL_INSTITUTION_VERIFIED" :
        ["COMMUNITY_DEVELOPMENT_UNION", "LAND_COMMITTEE_MEMBER"].includes(form.attestor_role) ? "COMMUNITY_ENDORSED" : "NONE",
    });
  };

  const filteredParcels = parcelSearch ? parcels.filter(p =>
    (p.parcel_number || "").toLowerCase().includes(parcelSearch.toLowerCase()) ||
    (p.community || "").toLowerCase().includes(parcelSearch.toLowerCase()) ||
    (p.owner_name || "").toLowerCase().includes(parcelSearch.toLowerCase())
  ).slice(0, 10) : [];

  const canProceedTo3 = parcelSearch ? false : true; // must select parcel first
  // After selecting: step 1 complete, can go to step 2

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4">
      {/* Disclaimer */}
      <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Community Attestations are preserved as evidence only.</p>
            <p>This attestation does not determine ownership, replace title systems, replace courts, or replace government land administration systems.</p>
          </div>
        </CardContent>
      </Card>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {[1, 2, 3, 4].map(s => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 4 && <div className={`w-8 h-0.5 ${step > s ? "bg-emerald-600" : "bg-muted"}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Select Parcel */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" />Step 1: Select Parcel</h2>

          {/* Parcel Search */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Search by parcel number or community…" value={parcelSearch} onChange={e => setParcelSearch(e.target.value)} />
              {filteredParcels.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredParcels.map(p => (
                    <button key={p.id} onClick={() => { setSelectedParcelId(p.id); setParcelSearch(""); }}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-colors ${selectedParcelId === p.id ? "bg-emerald-100 border border-emerald-300" : "hover:bg-muted border border-transparent"}`}>
                      <span className="font-mono font-bold">{p.parcel_number || "Draft"}</span>
                      <span className="text-muted-foreground ml-2">{p.community}, {p.ward}</span>
                    </button>
                  ))}
                </div>
              )}
              {parcelSearch && filteredParcels.length === 0 && <p className="text-xs text-muted-foreground">No parcels found.</p>}
            </CardContent>
          </Card>

          {/* Selected Parcel Info */}
          {selectedParcel && (
            <Card className="border-0 shadow-md bg-emerald-50/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm">Selected Parcel</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Reference:</span> <span className="font-mono">{selectedParcel.parcel_number || "Draft"}</span></div>
                  <div><span className="text-muted-foreground">Community:</span> {selectedParcel.community}</div>
                  <div><span className="text-muted-foreground">Ward:</span> {selectedParcel.ward}</div>
                  <div><span className="text-muted-foreground">LGA:</span> {selectedParcel.lga}</div>
                  <div><span className="text-muted-foreground">State:</span> {selectedParcel.state}</div>
                  <div><span className="text-muted-foreground">Evidence Score:</span> <span className="font-bold text-emerald-700">{selectedParcel.evidence_confidence_score || 0}/100</span></div>
                </div>
                {selectedParcel.surveyor_name && (
                  <p className="text-xs"><span className="text-muted-foreground">Surveyor:</span> {selectedParcel.surveyor_name}</p>
                )}
                {parcelAttestations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Existing Attestations ({parcelAttestations.length})</p>
                    <div className="space-y-1">
                      {parcelAttestations.map(a => (
                        <div key={a.id} className="text-[10px] flex items-center gap-2">
                          <Badge className={`text-[9px] ${a.verification_status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>{a.verification_status}</Badge>
                          <span>{a.attestor_name} — {ROLE_LABELS[a.attestor_role] || a.attestor_role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedParcelId} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Evidence Review Checklist */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" />Step 2: Evidence Review</h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground mb-2">You must confirm all items before continuing.</p>
              {CHECKLIST_ITEMS.map(item => (
                <div key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox id={item} checked={checklist[item]} onCheckedChange={v => setChecklist(prev => ({ ...prev, [item]: !!v }))} />
                  <Label htmlFor={item} className="text-sm cursor-pointer">{item}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => setStep(3)} disabled={!checklistDone} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* STEP 3: Submit Attestation */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />Step 3: Submit Attestation</h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-4">
              {/* Attestor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1">Full Name *</Label>
                  <Input value={form.attestor_name} onChange={e => setForm(p => ({ ...p, attestor_name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div>
                  <Label className="text-xs mb-1">Community Role *</Label>
                  <Select value={form.attestor_role} onValueChange={v => setForm(p => ({ ...p, attestor_role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Community Name</Label>
                  <Input value={form.community_name} onChange={e => setForm(p => ({ ...p, community_name: e.target.value }))} placeholder={selectedParcel?.community || "Community name"} />
                </div>
                <div>
                  <Label className="text-xs mb-1">Relationship to Land *</Label>
                  <Input value={form.relationship_to_land} onChange={e => setForm(p => ({ ...p, relationship_to_land: e.target.value }))} placeholder="e.g. Family member, elder, neighbour" />
                </div>
                <div>
                  <Label className="text-xs mb-1">Years of Knowledge</Label>
                  <Input type="number" value={form.years_of_knowledge} onChange={e => setForm(p => ({ ...p, years_of_knowledge: e.target.value }))} placeholder="How many years" />
                </div>
                <div>
                  <Label className="text-xs mb-1">Phone Number</Label>
                  <Input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs mb-1">Email</Label>
                  <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs mb-1">Consensus Direction</Label>
                  <Select value={form.consensus_contribution} onValueChange={v => setForm(p => ({ ...p, consensus_contribution: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPORTING">Supporting</SelectItem>
                      <SelectItem value="NEUTRAL">Neutral</SelectItem>
                      <SelectItem value="CONFLICTING">Conflicting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Statement */}
              <div>
                <Label className="text-xs mb-1">Attestation Statement *</Label>
                <Textarea value={form.attestation_statement} onChange={e => setForm(p => ({ ...p, attestation_statement: e.target.value }))}
                  placeholder="Describe your knowledge of this land, its boundaries, history, and community context…" className="h-28" />
              </div>

              {/* Supporting evidence notes */}
              <div>
                <Label className="text-xs mb-1">Supporting Evidence Notes</Label>
                <Textarea value={form.supporting_evidence_notes} onChange={e => setForm(p => ({ ...p, supporting_evidence_notes: e.target.value }))}
                  placeholder="Additional evidence you can provide…" className="h-20" />
              </div>

              <div>
                <Label className="text-xs mb-1">Additional Notes</Label>
                <Textarea value={form.additional_notes} onChange={e => setForm(p => ({ ...p, additional_notes: e.target.value }))}
                  placeholder="Any other information…" className="h-20" />
              </div>

              {/* Confidence preview */}
              <div className="bg-emerald-50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-emerald-700">Confidence Impact Preview</p>
                <p>Your role ({ROLE_LABELS[form.attestor_role]}) contributes <span className="font-bold">+{CONFIDENCE_RULES[form.attestor_role] || 5} points</span> to evidence confidence if approved.</p>
                <p className="text-muted-foreground">Maximum total attestation contribution: 15 points. Score never exceeds 100.</p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={handleSubmit} disabled={!form.attestor_name || !form.relationship_to_land || !form.attestation_statement || createMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {createMutation.isPending ? "Submitting…" : <><Shield className="w-4 h-4" />Submit Attestation</>}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-4">
          {submitted ? (
            <Card className="border-0 shadow-md bg-emerald-50/50">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-emerald-800">Attestation Recorded</h2>
                <p className="text-sm text-emerald-700">Your attestation has been submitted and recorded for review.</p>
                <div className="bg-white rounded-lg p-4 inline-block">
                  <p className="text-xs text-muted-foreground">Attestation Reference</p>
                  <p className="text-lg font-mono font-bold text-emerald-700">{generatedId}</p>
                </div>
                <div className="text-xs text-amber-700 space-y-1">
                  <p className="font-semibold">Important:</p>
                  <p>This attestation is preserved as evidence only.</p>
                  <p>It does not determine ownership or replace legal processes.</p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => navigate("/community-attestation")}>View Dashboard</Button>
                  <Button onClick={() => { setStep(1); setSubmitted(false); setSelectedParcelId(""); setChecklist(CHECKLIST_ITEMS.reduce((a, i) => ({ ...a, [i]: false }), {})); setForm({ attestor_name: "", attestor_role: "COMMUNITY_WITNESS", community_name: "", relationship_to_land: "", years_of_knowledge: "", attestation_statement: "", supporting_evidence_notes: "", additional_notes: "", consensus_contribution: "SUPPORTING", phone_number: "", email: "" }); }}
                    className="bg-emerald-600 hover:bg-emerald-700">Submit Another</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">Step 4: Confirmation</h2>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Parcel: <span className="font-mono">{selectedParcel?.parcel_number}</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Evidence Checklist: <span className="font-semibold">All {CHECKLIST_ITEMS.length} items completed</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Attestor: <span className="font-semibold">{form.attestor_name}</span> ({ROLE_LABELS[form.attestor_role]})</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Statement: <span className="text-muted-foreground">{form.attestation_statement.slice(0, 100)}{form.attestation_statement.length > 100 ? "…" : ""}</span></div>
                </CardContent>
              </Card>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {createMutation.isPending ? "Recording…" : <><Shield className="w-4 h-4" />Create Record</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}