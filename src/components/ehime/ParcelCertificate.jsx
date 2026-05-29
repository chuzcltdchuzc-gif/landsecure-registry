import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download, QrCode, CheckCircle2 } from "lucide-react";
import { PROPERTY_TYPE_LABELS, VERIFICATION_LABELS, STATUS_LABELS, LGA_NAME, STATE_NAME } from "@/lib/ehimeMbanoData";

function QRCodeDisplay({ value }) {
  // Generate a simple QR code using a free API service
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(value)}`;
  return (
    <div className="flex flex-col items-center gap-1">
      <img src={url} alt="QR Code" className="w-28 h-28 border-2 border-green-800 rounded" />
      <p className="text-[9px] text-green-900 font-mono text-center break-all max-w-[112px]">
        Scan to verify
      </p>
    </div>
  );
}

export default function ParcelCertificate({ parcel }) {
  const certRef = useRef(null);
  const verifyUrl = `${window.location.origin}/verify?parcel_id=${parcel.parcel_number}`;
  const isApproved = parcel.status === "approved" || parcel.status === "approved_locked";

  const handlePrint = () => {
    const printContent = certRef.current;
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
      <html>
        <head>
          <title>Land Certificate — ${parcel.parcel_number}</title>
          <style>
            body { font-family: Georgia, serif; margin: 0; padding: 0; background: white; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${printContent.outerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      {/* Certificate */}
      <div ref={certRef} className="bg-white border-4 border-double border-green-800 rounded-xl p-8 shadow-xl max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full bg-green-800 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-green-900 uppercase tracking-widest">
            Federal Republic of Nigeria
          </h1>
          <h2 className="text-base font-semibold text-green-800">Imo State Government</h2>
          <h3 className="text-sm font-medium text-green-700">{LGA_NAME}</h3>
          <div className="w-full border-t-2 border-b-2 border-green-800 py-1.5 mt-3">
            <p className="text-sm font-bold tracking-widest text-green-900 uppercase">
              Certificate of Land Registration
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`text-center py-2 px-4 rounded-lg mb-6 ${isApproved ? "bg-green-100 border border-green-300" : "bg-yellow-100 border border-yellow-300"}`}>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${isApproved ? "text-green-700" : "text-yellow-700"}`} />
            <span className={`font-semibold text-sm ${isApproved ? "text-green-800" : "text-yellow-800"}`}>
              {STATUS_LABELS[parcel.status] || parcel.status}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          <div className="flex-1">
            {/* Parcel Number */}
            <div className="text-center mb-5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs uppercase text-green-700 tracking-wide font-semibold mb-1">Official Parcel Number</p>
              <p className="text-2xl font-bold font-mono text-green-900">{parcel.parcel_number}</p>
            </div>

            <table className="w-full text-sm">
              <tbody>
                {[
                  ["State", parcel.state || STATE_NAME],
                  ["LGA", parcel.lga || LGA_NAME],
                  ["Ward", parcel.ward],
                  ["Community", parcel.community],
                  ["Property Type", PROPERTY_TYPE_LABELS[parcel.property_type] || parcel.property_type],
                  ["Land Area", parcel.size_sqm ? `${parcel.size_sqm.toLocaleString()} sqm` : "—"],
                  ["Survey Status", VERIFICATION_LABELS[parcel.verification_status]],
                  ["Encumbrance", parcel.encumbrance_status === "none" ? "None" : parcel.encumbrance_status],
                  ["Registration Date", parcel.registration_date || parcel.approval_date || "—"],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-green-100">
                    <td className="py-1.5 pr-3 text-green-700 font-medium w-36">{label}</td>
                    <td className="py-1.5 text-green-900 font-semibold">{value || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <QRCodeDisplay value={verifyUrl} />
            <div className="text-center">
              <p className="text-[10px] text-green-700 font-semibold">Verify Online</p>
              <p className="text-[9px] text-green-600 break-all max-w-[120px]">{verifyUrl}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-green-800">
          <div className="flex items-start justify-between">
            <div className="text-xs text-green-800">
              <p className="font-semibold">DISCLAIMER</p>
              <p className="text-green-700 max-w-xs">
                This certificate is for verification purposes only. Owner personal data is confidential.
                Scan QR code or visit the public verification portal to confirm authenticity.
              </p>
            </div>
            <div className="text-center">
              <div className="w-24 border-t-2 border-green-900 pt-1">
                <p className="text-[10px] text-green-900 font-semibold">Authorised Signature</p>
                <p className="text-[10px] text-green-700">{LGA_NAME}</p>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-green-600 mt-3">
            Generated by LandSecure Registry System · {new Date().toLocaleDateString("en-NG", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}