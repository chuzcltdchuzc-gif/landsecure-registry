import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Download, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CERT_TYPES = [
  { key: "family_ownership", label: "Family Ownership Certificate" },
  { key: "inheritance_allocation", label: "Inheritance Allocation Certificate" },
  { key: "beneficiary_allocation", label: "Beneficiary Allocation Certificate" },
  { key: "subdivision_approval", label: "Subdivision Approval Certificate" },
];

export default function CertificateGenerator({ caseData, familyOwnership, witnesses, documents, allocations, user, onCertGenerated }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("family_ownership");
  const [printing, setPrinting] = useState(false);

  const isApproved = caseData.status === "approved";
  const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");
  const activeDocuments = documents.filter(d => d.lifecycle_status === "active");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const certRef = `CERT-${caseData.case_reference}-${selectedType.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;

      const updated = await base44.entities.InheritanceCase.update(caseData.id, {
        certificate_generated: true,
        certificate_url: certRef,
        final_approved_by: caseData.final_approved_by || user?.email,
        final_approved_date: caseData.final_approved_date || new Date().toISOString(),
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email,
        user_name: user?.full_name,
        action: `Generated ${selectedType.replace(/_/g, " ")} certificate`,
        entity_type: "InheritanceCase",
        entity_id: caseData.id,
        details: `Certificate Reference: ${certRef}`,
      });

      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inheritance-cases"] });
      onCertGenerated?.(data);
      toast.success("Certificate generated and recorded");
    },
  });

  const printCert = () => {
    setPrinting(true);
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(buildCertHTML(selectedType, caseData, familyOwnership, verifiedWitnesses, activeDocuments, allocations));
    win.document.close();
    win.print();
    setPrinting(false);
  };

  return (
    <div className="space-y-6">
      {!isApproved && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Case not yet approved</p>
            <p>Certificates can only be generated after the case has been fully approved through the workflow.</p>
          </div>
        </div>
      )}

      {/* Certificate type selection */}
      <div className="grid grid-cols-2 gap-3">
        {CERT_TYPES.map(ct => (
          <button
            key={ct.key}
            onClick={() => setSelectedType(ct.key)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedType === ct.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground"
            }`}
          >
            <Award className={`w-4 h-4 mb-1 ${selectedType === ct.key ? "text-primary" : "text-muted-foreground"}`} />
            <p className={`text-xs font-semibold ${selectedType === ct.key ? "text-primary" : "text-foreground"}`}>
              {ct.label}
            </p>
          </button>
        ))}
      </div>

      {/* Preview */}
      <Card className="border-2 border-dashed border-amber-300 bg-amber-50/30">
        <CardHeader className="pb-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-700" />
            </div>
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-900">
            {CERT_TYPES.find(c => c.key === selectedType)?.label}
          </CardTitle>
          <p className="text-xs text-muted-foreground">LandSecure Registry — Nigerian Customary Land System</p>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <CertField label="Case Reference" value={caseData.case_reference} />
            <CertField label="Parcel Number" value={`#${caseData.parcel_number}`} />
            <CertField label="Family" value={familyOwnership?.family_name} />
            <CertField label="Family Head" value={familyOwnership?.family_head} />
            <CertField label="Community" value={familyOwnership?.community} />
            <CertField label="LGA" value={familyOwnership?.lga} />
            <CertField label="State" value={familyOwnership?.state} />
            <CertField label="Lineage" value={familyOwnership?.family_lineage} capitalize />
          </div>

          {allocations.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Plot Allocations</p>
              <div className="space-y-1">
                {allocations.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-1.5 bg-white rounded border">
                    <span className="font-mono font-bold text-primary">{a.planned_plot_number}</span>
                    <span>{a.beneficiary_name}</span>
                    <span className="font-semibold">{a.allocation_percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verifiedWitnesses.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Verified Witnesses ({verifiedWitnesses.length})</p>
              <div className="space-y-1">
                {verifiedWitnesses.map(w => (
                  <div key={w.id} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{w.full_name}</span>
                    <span className="text-muted-foreground capitalize">({w.witness_role?.replace(/_/g, " ")})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(caseData.sg_reviewer || caseData.final_approved_by) && (
            <div className="border-t pt-3 text-center space-y-1">
              <p className="font-semibold">Approved by Surveyor General</p>
              <p className="text-muted-foreground">{caseData.sg_reviewer || caseData.final_approved_by}</p>
              {(caseData.sg_review_date || caseData.final_approved_date) && (
                <p className="text-muted-foreground">
                  {format(new Date(caseData.sg_review_date || caseData.final_approved_date), "MMMM d, yyyy")}
                </p>
              )}
            </div>
          )}

          {caseData.certificate_generated && (
            <div className="flex items-center justify-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Certificate Already Generated</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!isApproved || generateMutation.isPending || (caseData.certificate_generated && selectedType !== "subdivision_approval")}
          className="gap-2"
        >
          <Award className="w-4 h-4" />
          {generateMutation.isPending ? "Recording..." : caseData.certificate_generated ? "Regenerate" : "Generate Certificate"}
        </Button>
        <Button
          variant="outline"
          onClick={printCert}
          disabled={printing}
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          {printing ? "Opening..." : "Print / PDF"}
        </Button>
      </div>
    </div>
  );
}

function CertField({ label, value, capitalize }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-semibold ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function buildCertHTML(type, caseData, fo, witnesses, documents, allocations) {
  const now = format(new Date(), "MMMM d, yyyy");
  const title = {
    family_ownership: "Family Ownership Certificate",
    inheritance_allocation: "Inheritance Allocation Certificate",
    beneficiary_allocation: "Beneficiary Allocation Certificate",
    subdivision_approval: "Subdivision Approval Certificate",
  }[type];

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 40px; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px double #c9a84c; padding-bottom: 24px; margin-bottom: 24px; }
  .seal { width: 80px; height: 80px; border: 3px solid #c9a84c; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; background: #fef9ef; }
  h1 { font-size: 22px; margin: 8px 0; color: #92400e; letter-spacing: 2px; text-transform: uppercase; }
  h2 { font-size: 14px; color: #666; font-weight: normal; margin: 4px 0; }
  .cert-ref { font-family: monospace; font-size: 12px; color: #666; margin-top: 8px; }
  .section { margin: 20px 0; }
  .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; border-bottom: 1px solid #e5c37a; padding-bottom: 4px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field label { font-size: 10px; text-transform: uppercase; color: #888; display: block; }
  .field span { font-weight: bold; font-size: 13px; }
  .witness { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0e8d0; }
  .alloc { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0e8d0; }
  .footer { margin-top: 48px; border-top: 2px solid #c9a84c; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #1a1a1a; margin-bottom: 8px; height: 40px; }
  .sig-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .qr-placeholder { border: 1px dashed #ccc; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #888; text-align: center; margin: 0 auto; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="seal">⚖</div>
  <h2>LandSecure Registry — Federal Republic of Nigeria</h2>
  <h1>${title}</h1>
  <p class="cert-ref">${caseData.case_reference} · Issued: ${now}</p>
</div>

<div class="section">
  <h3>Land & Case Reference</h3>
  <div class="grid">
    <div class="field"><label>Parcel Number</label><span>#${caseData.parcel_number || "—"}</span></div>
    <div class="field"><label>Case Reference</label><span>${caseData.case_reference || "—"}</span></div>
    <div class="field"><label>Case Type</label><span>${caseData.case_type?.replace(/_/g, " ") || "—"}</span></div>
    <div class="field"><label>Approval Status</label><span>Approved</span></div>
  </div>
</div>

<div class="section">
  <h3>Family Information</h3>
  <div class="grid">
    <div class="field"><label>Family Name</label><span>${fo?.family_name || "—"}</span></div>
    <div class="field"><label>Family Head</label><span>${fo?.family_head || "—"}</span></div>
    <div class="field"><label>Community</label><span>${fo?.community || "—"}</span></div>
    <div class="field"><label>Local Government Area</label><span>${fo?.lga || "—"}</span></div>
    <div class="field"><label>State</label><span>${fo?.state || "—"}</span></div>
    <div class="field"><label>Lineage System</label><span style="text-transform:capitalize">${fo?.family_lineage || "—"}</span></div>
  </div>
</div>

${allocations.length > 0 ? `
<div class="section">
  <h3>Plot Allocations</h3>
  ${allocations.map(a => `
    <div class="alloc">
      <span style="font-family:monospace;font-weight:bold">${a.planned_plot_number}</span>
      <span>${a.beneficiary_name}</span>
      <span style="font-weight:bold">${a.allocation_percentage}%</span>
    </div>
  `).join("")}
</div>
` : ""}

${witnesses.length > 0 ? `
<div class="section">
  <h3>Verified Witnesses</h3>
  ${witnesses.map(w => `
    <div class="witness">
      <span style="color:#15803d">✓</span>
      <span style="font-weight:bold">${w.full_name}</span>
      <span style="color:#666;font-size:12px;text-transform:capitalize">(${w.witness_role?.replace(/_/g, " ")})</span>
    </div>
  `).join("")}
</div>
` : ""}

<div class="footer">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Surveyor General<br/>Signature &amp; Stamp</div>
  </div>
  <div class="sig-block">
    <div class="qr-placeholder">QR Verification<br/>${caseData.case_reference}</div>
  </div>
</div>

<p style="margin-top:24px;font-size:10px;color:#888;text-align:center">
  This certificate is issued under the authority of the Nigerian Survey Department.<br/>
  Case reference: ${caseData.case_reference} · Generated: ${now} · LandSecure Registry
</p>
</body></html>`;
}