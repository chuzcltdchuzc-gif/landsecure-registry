import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Mic } from "lucide-react";

export default function Stage1VerbalConsent({ onAgreed, onDeclined }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7 text-green-700" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Consent Declaration</h1>
        <p className="text-sm text-muted-foreground">Stage 1 of 7 — Read aloud to the representative before proceeding</p>
      </div>

      <Card className="border-2 border-green-300 bg-green-50">
        <CardContent className="py-8 px-6">
          <div className="flex items-start gap-3 mb-4">
            <Mic className="w-5 h-5 text-green-700 mt-1 flex-shrink-0" />
            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Read aloud to the representative</p>
          </div>
          <p className="text-xl font-medium text-green-900 leading-relaxed">
            "We are registering this land on your behalf. Your details will be stored securely and will never appear on the public website. You may request a printed certificate at any time. Do you agree to proceed?"
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={onAgreed}
          className="h-16 text-base bg-green-700 hover:bg-green-800 gap-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          Representative has verbally agreed
        </Button>
        <Button
          onClick={onDeclined}
          variant="outline"
          className="h-16 text-base border-red-300 text-red-700 hover:bg-red-50 gap-3"
        >
          <XCircle className="w-5 h-5" />
          Representative declined — close registration
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        If the representative declines, no parcel record will be created and the session will be closed.
      </p>
    </div>
  );
}