import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, CheckCircle2 } from "lucide-react";

const WITNESS_OPTIONS = [
  { key: "family_witness", label: "Family Witness" },
  { key: "community_witness", label: "Community Witness" },
  { key: "village_head", label: "Village Head Witness" },
  { key: "none", label: "No Witness Present" },
];

export default function Stage6Witness({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const [witnessName, setWitnessName] = useState("");
  const [witnessPhone, setWitnessPhone] = useState("");

  const handleSubmit = () => {
    onComplete({
      witnessRole: selected,
      witnessName: selected !== "none" ? witnessName : "",
      witnessPhone: selected !== "none" ? witnessPhone : "",
      hasWitness: selected !== "none",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stage 6 — Witness Capture <span className="text-sm font-normal text-muted-foreground">(Recommended)</span></h2>
        <p className="text-sm text-muted-foreground mt-1">Is a witness present at this registration?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {WITNESS_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-sm font-medium text-left ${
              selected === key
                ? key === "none"
                  ? "border-slate-400 bg-slate-100 text-slate-800"
                  : "border-green-500 bg-green-50 text-green-800"
                : "border-border hover:border-primary text-muted-foreground"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {selected && selected !== "none" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Witness Details — {WITNESS_OPTIONS.find(w => w.key === selected)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Witness Full Name <span className="text-red-500">*</span></Label>
              <Input value={witnessName} onChange={e => setWitnessName(e.target.value)} placeholder="Full name of witness" />
            </div>
            <div>
              <Label>Witness Phone Number</Label>
              <Input value={witnessPhone} onChange={e => setWitnessPhone(e.target.value)} placeholder="+234..." />
            </div>
          </CardContent>
        </Card>
      )}

      {selected === "none" && (
        <div className="p-4 rounded-xl bg-slate-50 border text-sm text-muted-foreground">
          No witness recorded. This reduces the overall consent strength score. You may proceed without a witness.
        </div>
      )}

      {selected && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={selected !== "none" && !witnessName.trim()}
            className="gap-2 bg-green-700 hover:bg-green-800"
          >
            <CheckCircle2 className="w-4 h-4" /> Save & Continue
          </Button>
        </div>
      )}
    </div>
  );
}