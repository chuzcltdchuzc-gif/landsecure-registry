import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Package, DollarSign, FileText, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Eye, Lock
} from "lucide-react";
import { LGA_NAME, STATE_NAME, WARDS } from "@/lib/ehimeMbanoData";

const FINANCE_ROLES = ["super_admin", "surveyor_general", "compliance_officer"];
const ALLOWED_ROLES = [...FINANCE_ROLES, "surveyor"];

const BASE_PRICE = 30000;

function calcPackagePrice(totalParcels) {
  let unitPrice;
  if (totalParcels >= 20) unitPrice = 23000;
  else if (totalParcels >= 10) unitPrice = 25000;
  else if (totalParcels >= 5) unitPrice = 27000;
  else unitPrice = 30000;

  const fullValue = totalParcels * BASE_PRICE;
  const packageValue = totalParcels * unitPrice;
  const discount = fullValue - packageValue;
  return { unitPrice, packageValue, discount, fullValue };
}

function fmtNGN(n) {
  if (!n && n !== 0) return "—";
  return `₦${Number(n).toLocaleString()}`;
}

const PAYMENT_STATUS_COLORS = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  unpaid: "bg-red-100 text-red-800",
};

function CreatePackageForm({ user, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    family_name: "", owner_type: "family", ward: "", community: "",
    total_parcels: "", amount_paid: "", notes: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const total = parseInt(form.total_parcels) || 0;
  const { packageValue, discount } = total > 0 ? calcPackagePrice(total) : { packageValue: 0, discount: 0 };
  const amtPaid = parseFloat(form.amount_paid) || 0;
  const balance = Math.max(0, packageValue - amtPaid);
  const paymentStatus = amtPaid >= packageValue ? "paid" : amtPaid > 0 ? "partial" : "unpaid";

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.family_name) throw new Error("Family / Owner name is required");
      if (!total || total < 1) throw new Error("Total parcels must be at least 1");

      // Generate package number
      const existing = await base44.entities.RegistrationPackage.list("-created_date", 1);
      const seq = (existing.length + 1).toString().padStart(6, "0");
      const package_number = `PKG-EHM-${seq}`;

      const pkg = await base44.entities.RegistrationPackage.create({
        package_number,
        family_name: form.family_name,
        owner_type: form.owner_type,
        state: STATE_NAME,
        lga: LGA_NAME,
        ward: form.ward,
        community: form.community,
        total_parcels: total,
        registered_parcels: 0,
        certificates_released: 0,
        certificates_held: 0,
        package_value: packageValue,
        discount_amount: discount,
        amount_paid: amtPaid,
        balance_due: balance,
        payment_status: paymentStatus,
        status: "active",
        notes: form.notes,
        created_by_email: user.email,
        created_by_name: user.full_name,
      });

      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user.email,
        user_name: user.full_name,
        action: "PACKAGE_CREATED",
        entity_type: "RegistrationPackage",
        entity_id: pkg.id,
        details: JSON.stringify({ package_number, family_name: form.family_name, total_parcels: total, package_value: packageValue }),
      });

      return pkg;
    },
    onSuccess: (pkg) => {
      toast.success(`Package ${pkg.package_number} created`);
      qc.invalidateQueries({ queryKey: ["ehime-packages"] });
      onCreated(pkg);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Family / Owner Name <span className="text-red-500">*</span></Label>
          <Input value={form.family_name} onChange={e => set("family_name", e.target.value)} placeholder="e.g. Eze Family, Okafor Community" />
        </div>
        <div>
          <Label>Owner Type</Label>
          <Select value={form.owner_type} onValueChange={v => set("owner_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="community">Community</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ward</Label>
          <Select value={form.ward} onValueChange={v => set("ward", v)}>
            <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
            <SelectContent>
              {WARDS.map(w => <SelectItem key={w.code} value={w.name}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Community</Label>
          <Input value={form.community} onChange={e => set("community", e.target.value)} placeholder="Community name" />
        </div>
        <div>
          <Label>Total Parcels <span className="text-red-500">*</span></Label>
          <Input type="number" min="1" value={form.total_parcels} onChange={e => set("total_parcels", e.target.value)} placeholder="e.g. 10" />
        </div>
      </div>

      {/* Pricing preview */}
      {total > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Package Pricing</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Unit price:</span>
            <span className="font-medium">{fmtNGN(calcPackagePrice(total).unitPrice)} each</span>
            <span className="text-muted-foreground">Package value:</span>
            <span className="font-medium">{fmtNGN(packageValue)}</span>
            {discount > 0 && <>
              <span className="text-muted-foreground">Bulk discount:</span>
              <span className="font-medium text-green-700">−{fmtNGN(discount)}</span>
            </>}
          </div>
        </div>
      )}

      {/* Initial payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Initial Payment Received (₦)</Label>
          <Input type="number" min="0" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" />
          <p className="text-xs text-muted-foreground mt-1">Leave 0 if no payment yet — registration is not blocked.</p>
        </div>
        {total > 0 && (
          <div className="rounded-xl bg-slate-50 border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount paid:</span>
              <span className="font-medium text-green-700">{fmtNGN(amtPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance due:</span>
              <span className="font-medium text-red-700">{fmtNGN(balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PAYMENT_STATUS_COLORS[paymentStatus]}`}>{paymentStatus}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Notes</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes…" />
      </div>

      <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-green-700 hover:bg-green-800 gap-2 w-full">
        <Package className="w-4 h-4" />
        {createMutation.isPending ? "Creating Package…" : "Create Registration Package"}
      </Button>
    </div>
  );
}

function RecordPaymentPanel({ pkg, user, onDone }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const pay = parseFloat(amount);
      if (!pay || pay <= 0) throw new Error("Enter a valid payment amount");
      const newPaid = (pkg.amount_paid || 0) + pay;
      const newBalance = Math.max(0, (pkg.package_value || 0) - newPaid);
      const newStatus = newBalance === 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

      await base44.entities.RegistrationPackage.update(pkg.id, {
        amount_paid: newPaid,
        balance_due: newBalance,
        payment_status: newStatus,
      });

      await base44.entities.AuditLog.create({
        tenant_id: "EHM-001",
        user_email: user.email,
        user_name: user.full_name,
        action: "PAYMENT_RECORDED",
        entity_type: "RegistrationPackage",
        entity_id: pkg.id,
        details: JSON.stringify({ package_number: pkg.package_number, amount_paid: pay, new_total: newPaid, new_balance: newBalance, notes }),
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["ehime-packages"] });
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Record Payment</p>
      <div className="flex gap-2">
        <Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)" className="flex-1" />
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference / notes" className="flex-1" />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-700 hover:bg-blue-800 shrink-0">
          {mutation.isPending ? "Saving…" : "Record"}
        </Button>
      </div>
    </div>
  );
}

function PackageCard({ pkg, user, onRegisterParcel }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const canFinance = FINANCE_ROLES.includes(user?.role);

  const pctPaid = pkg.package_value > 0 ? Math.min(100, Math.round(((pkg.amount_paid || 0) / pkg.package_value) * 100)) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm">{pkg.package_number}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[pkg.payment_status] || "bg-gray-100"}`}>
                {pkg.payment_status}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{pkg.status}</span>
            </div>
            <p className="text-sm font-medium mt-1">{pkg.family_name}</p>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{pkg.total_parcels} parcels planned · {pkg.registered_parcels || 0} registered</span>
              {pkg.ward && <span>{pkg.ward}</span>}
              {pkg.community && <span>{pkg.community}</span>}
            </div>
            {/* Payment progress bar */}
            {canFinance && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmtNGN(pkg.amount_paid || 0)} paid</span>
                  <span>{fmtNGN(pkg.balance_due || 0)} outstanding</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctPaid}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={() => onRegisterParcel(pkg)} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add Parcel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="gap-1 text-xs">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Details
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Package Value</p><p className="font-semibold">{fmtNGN(pkg.package_value)}</p></div>
              <div><p className="text-xs text-muted-foreground">Discount Applied</p><p className="font-semibold text-green-700">{fmtNGN(pkg.discount_amount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Certs Released</p><p className="font-semibold">{pkg.certificates_released || 0}</p></div>
              <div><p className="text-xs text-muted-foreground">Certs Held</p><p className="font-semibold text-amber-700">{pkg.certificates_held || 0}</p></div>
            </div>
            {pkg.notes && <p className="text-xs text-muted-foreground italic">{pkg.notes}</p>}
            {canFinance && (
              <Button size="sm" variant="outline" onClick={() => setShowPayment(s => !s)} className="gap-1 text-xs border-blue-300 text-blue-700">
                <DollarSign className="w-3 h-3" /> Record Payment
              </Button>
            )}
            {showPayment && canFinance && <RecordPaymentPanel pkg={pkg} user={user} onDone={() => setShowPayment(false)} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PackageManagement() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["ehime-packages"],
    queryFn: () => base44.entities.RegistrationPackage.list("-created_date", 200),
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ["ehime-parcels-stats"],
    queryFn: () => base44.entities.LandParcel.filter({ tenant_id: "EHM-001" }, "-created_date", 500),
  });

  if (!ALLOWED_ROLES.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
        </div>
      </div>
    );
  }

  const totalParcels = parcels.length;
  const released = parcels.filter(p => p.certificate_release_status === "released").length;
  const held = parcels.filter(p => p.certificate_release_status === "held").length;
  const totalRevenue = packages.reduce((s, p) => s + (p.package_value || 0), 0);
  const collected = packages.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const outstanding = packages.reduce((s, p) => s + (p.balance_due || 0), 0);

  const canCreate = ALLOWED_ROLES.includes(user?.role);
  const canSeeFinance = FINANCE_ROLES.includes(user?.role);

  const handleRegisterParcel = (pkg) => {
    navigate(`/ehime/register?package_id=${pkg.id}&package_number=${pkg.package_number}&family_name=${encodeURIComponent(pkg.family_name)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Registration Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">{LGA_NAME} · Deferred Certificate Release System</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(s => !s)} className="gap-2 bg-green-700 hover:bg-green-800">
            <Plus className="w-4 h-4" /> New Package
          </Button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Registered Parcels", value: totalParcels, color: "text-foreground" },
          { label: "Certificates Released", value: released, color: "text-green-700" },
          { label: "Certificates Held", value: held, color: "text-amber-700" },
          { label: "Active Packages", value: packages.filter(p => p.status === "active").length, color: "text-blue-700" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canSeeFinance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Package Value", value: fmtNGN(totalRevenue), color: "text-foreground" },
            { label: "Revenue Collected", value: fmtNGN(collected), color: "text-green-700" },
            { label: "Revenue Outstanding", value: fmtNGN(outstanding), color: "text-red-700" },
          ].map(s => (
            <Card key={s.label} className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> {s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Create New Registration Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePackageForm user={user} onCreated={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      )}

      {/* Package list */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading packages…</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No registration packages yet</p>
          <p className="text-xs mt-1">Create a package to begin bulk family registration</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} user={user} onRegisterParcel={handleRegisterParcel} />
          ))}
        </div>
      )}
    </div>
  );
}