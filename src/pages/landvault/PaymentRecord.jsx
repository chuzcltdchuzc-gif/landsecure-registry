import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const METHODS = ["cash","bank_transfer","mobile_money","pos","other"];

export default function PaymentRecord() {
  const [searchParams] = useSearchParams();
  const parcelId = searchParams.get("parcel_id");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ amount: "", payment_method: "cash", payment_reference: "", payment_date: new Date().toISOString().slice(0,10), notes: "" });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: parcels = [] } = useQuery({
    queryKey: ["lv-parcel-pay", parcelId],
    queryFn: () => base44.entities.LandVaultParcel.filter({ id: parcelId }),
    enabled: !!parcelId,
  });
  const parcel = parcels[0];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      await base44.entities.LandVaultPayment.create({
        parcel_id: parcelId,
        parcel_number: parcel?.parcel_number,
        ...form,
        amount,
        recorded_by_email: user?.email,
        recorded_by_name: user?.full_name,
      });
      // Update parcel outstanding balance
      const newPaid = (parcel?.amount_paid || 0) + amount;
      const newBalance = Math.max(0, (parcel?.total_fee || 0) - newPaid);
      const paymentStatus = newBalance === 0 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";
      const certStatus = newBalance === 0 ? "ACTIVE" : parcel?.certificate_status || "HELD";
      await base44.entities.LandVaultParcel.update(parcelId, {
        amount_paid: newPaid,
        outstanding_balance: newBalance,
        payment_status: paymentStatus,
        certificate_status: certStatus,
      });
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["lv-payments-parcel", parcelId] });
      qc.invalidateQueries({ queryKey: ["lv-parcel-detail", parcelId] });
      setTimeout(() => navigate(-1), 1500);
    },
  });

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  if (done) return (
    <div className="max-w-sm mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold">Payment Recorded</h2>
      <p className="text-sm text-muted-foreground">Certificate status updated automatically.</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Record Payment</h1>
          <p className="text-sm text-muted-foreground">{parcel?.parcel_number || parcelId}</p>
        </div>
      </div>

      {parcel && (
        <Card className="border-0 shadow-sm bg-muted/50">
          <CardContent className="p-4 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-muted-foreground">Total Fee</p><p className="font-bold">₦{(parcel.total_fee||0).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-emerald-600">₦{(parcel.amount_paid||0).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold text-orange-600">₦{(parcel.outstanding_balance||0).toLocaleString()}</p></div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div><Label className="text-xs">Amount (₦) *</Label><Input type="number" required value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" /></div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Reference / Receipt No.</Label><Input value={form.payment_reference} onChange={e => set("payment_reference", e.target.value)} /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={saveMutation.isPending} className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700">
          {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Record Payment"}
        </Button>
      </form>
    </div>
  );
}