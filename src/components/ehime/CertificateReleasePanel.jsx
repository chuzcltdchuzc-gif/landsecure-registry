import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  FileText, CheckCircle2, Clock, Lock, Unlock, AlertTriangle,
  Package, DollarSign
} from "lucide-react";

const FINANCE_ROLES = ["super_admin", "surveyor_general", "compliance_officer"];

function fmtNGN(n) {
  if (!n && n !== 0) return "—";
  return `₦${Number(n).toLocaleString()}`;
}

export default function CertificateReleasePanel({ parcel, user, onUpdated }) {
  const qc = useQueryClient();
  const [releasing, setReleasing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const canFinance = FINANCE_ROLES.includes(user?.role);
  const isHeld = parcel.certificate_release_status !== "released";
  const isReleased = parcel.certificate_release_status === "released";

  const { data: pkg } = useQuery({
    queryKey: ["reg-package", parcel.registration_package_id],
    queryFn: () => base44.entities.RegistrationPackage.filter({ id: parcel.registration_package_id }).then(r => r[0]),
    enabled: !!parcel.registration_package_id,
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const outstanding = parcel.outstanding_certificate_fee || 0;
      if (outstanding > 0 && !canFinance) {
        throw new Error(`Outstanding balance of ${fmtNGN(outstanding)} must be settled before certificate can be released.`);
      }

      const now = new Date().toISOString();
      await base44.entities.LandParcel.update(parcel.id, {
        certificate_release_status: "released",
        certificate_released_date: now,
        certificate_hold_reason: null,
        outstanding_certificate_fee: 0,
      });

      // Update package counters
      if (pkg) {
        await base44.entities.RegistrationPackage.update(pkg.id, {
          certificates_released: (pkg.certificates_released || 0) + 1,
          certificates_held: Math.max(0, (pkg.certificates_held || 0) - 1),
        });
      }

      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user.email,
        user_name: user.full_name,
        action: "CERTIFICATE_RELEASED",
        entity_type: "LandParcel",
        entity_id: parcel.id,
        details: JSON.stringify({ parcel_number: parcel.parcel_number, released_by: user.email, timestamp: now }),
      });
    },
    onSuccess: () => {
      toast.success("Certificate released successfully");
      qc.invalidateQueries({ queryKey: ["parcel-detail", parcel.id] });
      qc.invalidateQueries({ queryKey: ["ehime-packages"] });
      setReleasing(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const ref = `CERT-REQ-${parcel.parcel_number}-${Date.now()}`;
      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user.email,
        user_name: user.full_name,
        action: "CERTIFICATE_REQUESTED",
        entity_type: "LandParcel",
        entity_id: parcel.id,
        details: JSON.stringify({
          parcel_number: parcel.parcel_number,
          outstanding: parcel.outstanding_certificate_fee,
          payment_reference: ref,
          requested_by: user.email,
        }),
      });
      return ref;
    },
    onSuccess: (ref) => {
      toast.success(`Certificate release requested. Reference: ${ref}`);
      setRequesting(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const holdReasonLabels = {
    payment_pending: "Payment Pending",
    fraud_review: "Fraud Review",
    dispute: "Under Dispute",
    legal_hold: "Legal Hold",
  };

  return (
    <Card className={isReleased ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {isReleased
            ? <><CheckCircle2 className="w-4 h-4 text-green-700" /> Certificate Status</>
            : <><Clock className="w-4 h-4 text-amber-700" /> Certificate Status</>
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Banner */}
        {isReleased ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-100 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Certificate Released</p>
              {parcel.certificate_released_date && (
                <p className="text-xs text-green-700">Released: {new Date(parcel.certificate_released_date).toLocaleDateString("en-GB")}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Lock className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Certificate Pending Release</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Registration Complete · Parcel Protected · Certificate on Hold
              </p>
              {parcel.certificate_hold_reason && (
                <Badge className="mt-1 bg-amber-100 text-amber-800 border border-amber-300 text-xs">
                  {holdReasonLabels[parcel.certificate_hold_reason] || parcel.certificate_hold_reason}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Protection status — always shown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Registered", ok: parcel.registration_completed !== false },
            { label: "Survey Done", ok: parcel.survey_completed === true },
            { label: "Protected", ok: parcel.protected_in_registry !== false },
          ].map(({ label, ok }) => (
            <div key={label} className={`rounded-lg p-2 border ${ok ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-sm font-bold ${ok ? "text-green-700" : "text-slate-400"}`}>{ok ? "✓" : "—"}</p>
            </div>
          ))}
        </div>

        {/* Outstanding fee — finance only */}
        {canFinance && parcel.outstanding_certificate_fee > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <DollarSign className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800">Outstanding Balance</p>
              <p className="text-sm font-bold text-red-700">{fmtNGN(parcel.outstanding_certificate_fee)}</p>
            </div>
          </div>
        )}

        {/* Package link */}
        {pkg && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs">
            <Package className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-blue-800">Package: <span className="font-mono font-semibold">{pkg.package_number}</span> · {pkg.family_name}</span>
            <span className={`ml-auto px-1.5 py-0.5 rounded font-semibold ${
              pkg.payment_status === "paid" ? "bg-green-100 text-green-800"
              : pkg.payment_status === "partial" ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
            }`}>{pkg.payment_status}</span>
          </div>
        )}

        {/* Actions */}
        {isHeld && (
          <div className="flex flex-col sm:flex-row gap-2">
            {canFinance && (
              <Button
                onClick={() => releaseMutation.mutate()}
                disabled={releaseMutation.isPending}
                className="gap-2 bg-green-700 hover:bg-green-800 flex-1"
              >
                <Unlock className="w-4 h-4" />
                {releaseMutation.isPending ? "Releasing…" : "Release Certificate Now"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 flex-1"
            >
              <FileText className="w-4 h-4" />
              {requestMutation.isPending ? "Requesting…" : "Request Certificate Release"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}