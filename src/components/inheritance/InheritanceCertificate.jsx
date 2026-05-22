import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Printer, QrCode } from "lucide-react";
import { format } from "date-fns";

function QRPlaceholder({ value }) {
  return (
    <div className="w-20 h-20 border-2 border-foreground flex flex-col items-center justify-center rounded text-[8px] text-center font-mono break-all p-1">
      <QrCode className="w-8 h-8 mb-0.5 text-foreground" />
      <span className="text-[7px] opacity-60">{value?.slice(0, 12)}…</span>
    </div>
  );
}

export default function InheritanceCertificate({ inheritanceCase, familyOwnership, beneficiaries, witnesses, parcel, allocations }) {
  const ref = useRef(null);

  const handlePrint = () => {
    const content = ref.current?.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Inheritance Certificate — ${inheritanceCase.case_reference}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
        h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
        h2 { text-align: center; font-size: 14px; font-weight: normal; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td, th { border: 1px solid #aaa; padding: 6px 10px; font-size: 12px; }
        th { background: #f0f0f0; }
        .footer { text-align: center; font-size: 10px; margin-top: 40px; color: #555; }
        .seal { border: 3px double #000; padding: 10px 20px; display: inline-block; margin: 16px auto; }
        @media print { button { display: none; } }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const certDate = inheritanceCase.final_approved_date
    ? format(new Date(inheritanceCase.final_approved_date), "MMMM d, yyyy")
    : format(new Date(), "MMMM d, yyyy");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold">Certificate</span>
        </div>
        {inheritanceCase.status === "approved" && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
        )}
      </div>

      {inheritanceCase.status !== "approved" ? (
        <p className="text-xs text-muted-foreground italic">Certificate available after final approval</p>
      ) : (
        <div ref={ref} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-gradient-to-b from-primary/5 to-transparent p-6 space-y-4">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="flex justify-center mb-2">
                <div className="border-2 border-primary/40 rounded-full p-2">
                  <Award className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-wide uppercase">
                LandSecure Registry
              </h1>
              <h2 className="text-sm font-semibold text-muted-foreground">
                Customary Family Land Inheritance Certificate
              </h2>
              <p className="text-[11px] text-muted-foreground">This certifies the registration of customary family land ownership and inheritance allocation</p>
            </div>

            {/* Case info */}
            <div className="grid grid-cols-2 gap-3 text-xs border border-border rounded-lg p-3 bg-card">
              <div><span className="text-muted-foreground">Case Reference:</span> <span className="font-bold font-mono">{inheritanceCase.case_reference}</span></div>
              <div><span className="text-muted-foreground">Parcel Number:</span> <span className="font-bold font-mono">{parcel?.parcel_number}</span></div>
              <div><span className="text-muted-foreground">Family Name:</span> <span className="font-semibold">{familyOwnership?.family_name}</span></div>
              <div><span className="text-muted-foreground">Family Head:</span> <span className="font-semibold">{familyOwnership?.family_head}</span></div>
              {familyOwnership?.community && <div><span className="text-muted-foreground">Community:</span> {familyOwnership.community}</div>}
              {familyOwnership?.lga && <div><span className="text-muted-foreground">LGA:</span> {familyOwnership.lga}</div>}
              {familyOwnership?.state && <div><span className="text-muted-foreground">State:</span> {familyOwnership.state}</div>}
              <div><span className="text-muted-foreground">Certificate Date:</span> {certDate}</div>
              {parcel?.size_hectares && <div><span className="text-muted-foreground">Parcel Area:</span> {parcel.size_hectares} ha</div>}
              {parcel?.address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {parcel.address}</div>}
            </div>

            {/* Beneficiaries */}
            {beneficiaries?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold">Registered Beneficiaries</p>
                <table className="w-full text-[10px] border border-border rounded overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-1.5 text-left">Name</th>
                      <th className="p-1.5 text-left">Relationship</th>
                      <th className="p-1.5 text-left">Share %</th>
                      <th className="p-1.5 text-left">Plot</th>
                      <th className="p-1.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beneficiaries.filter(b => !b.is_deleted).map((b) => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="p-1.5 font-medium">{b.full_name}</td>
                        <td className="p-1.5 capitalize">{b.relationship}</td>
                        <td className="p-1.5 font-bold">{b.percentage_share}%</td>
                        <td className="p-1.5">{b.allocated_plot || "—"}</td>
                        <td className="p-1.5 capitalize">{b.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Witnesses */}
            {witnesses?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold">Witnesses</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {witnesses.filter(w => !w.is_deleted).map((w) => (
                    <div key={w.id} className="text-[10px] p-1.5 border border-border rounded bg-card">
                      <p className="font-semibold">{w.full_name}</p>
                      <p className="text-muted-foreground capitalize">{w.witness_role?.replace(/_/g, " ")}</p>
                      <Badge className={`text-[8px] mt-0.5 ${w.verification_status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {w.verification_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval trail + QR */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 text-[10px] text-muted-foreground flex-1">
                <p className="font-semibold text-foreground text-xs">Approval Trail</p>
                {inheritanceCase.surveyor_reviewer && <p>Surveyor: {inheritanceCase.surveyor_reviewer}</p>}
                {inheritanceCase.compliance_reviewer && <p>Compliance: {inheritanceCase.compliance_reviewer}</p>}
                {inheritanceCase.sg_reviewer && <p>Surveyor General: {inheritanceCase.sg_reviewer}</p>}
                <p>Final Approved: {certDate}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <QRPlaceholder value={inheritanceCase.id} />
                <p className="text-[8px] text-muted-foreground">Scan to verify</p>
              </div>
            </div>

            <div className="text-center text-[9px] text-muted-foreground pt-2 border-t border-border">
              This certificate is issued by the LandSecure Registry and is legally binding under applicable customary land law.
              Ref: {inheritanceCase.case_reference} | {certDate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}