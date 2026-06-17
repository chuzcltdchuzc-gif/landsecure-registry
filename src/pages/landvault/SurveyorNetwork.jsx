import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Cloud, QrCode, TrendingUp, AlertTriangle, FileText, Eye, Database, BadgeCheck } from "lucide-react";

const BENEFITS = [
  { icon: Cloud, title: "Secure Cloud Backup", desc: "Your survey archive digitally preserved forever. Never lose a survey plan again." },
  { icon: Database, title: "Digital Archive", desc: "Organise and index decades of survey records in a searchable, structured system." },
  { icon: Eye, title: "Online Verification", desc: "Banks, lawyers, and buyers can instantly verify land records you've surveyed." },
  { icon: QrCode, title: "QR Certificates", desc: "Every verified record gets a QR-linked certificate for field and office use." },
  { icon: TrendingUp, title: "Professional Visibility", desc: "Public profile showcasing your portfolio, credentials, and coverage area." },
  { icon: TrendingUp, title: "Revenue Sharing", desc: "Earn revenue when your records are verified, downloaded, or consulted." },
  { icon: AlertTriangle, title: "Duplicate Detection", desc: "Automatic alerts when coordinates, plans, or references overlap — protecting your work." },
  { icon: FileText, title: "Evidence Preservation", desc: "Immutable SHA-256 chain of custody on every document you submit." },
];

export default function SurveyorNetwork() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,#3b82f6,#1e293b)]" />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Turn Your Survey Archive Into a Digital Asset</h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mb-8">
            Join the Aquasavannah LandVault Surveyor Network. Digitise, verify, showcase, and monetise your professional survey portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/lv/surveyor">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base gap-2">
                <BadgeCheck className="w-5 h-5" /> Join The Network
              </Button>
            </Link>
            <Link to="/lv/governance">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 px-8 py-6 text-base">
                Learn More
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-6">Licensed surveyors only. SURCON verification required.</p>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">What You Get as a Surveyor Partner</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Register", desc: "Create your profile with SURCON number and professional credentials." },
              { step: "2", title: "Import", desc: "Upload your historical survey archive — plans, coordinates, supporting documents." },
              { step: "3", title: "Earn", desc: "Your records are verified, certificates generated, and revenue tracked automatically." },
            ].map((s) => (
              <Card key={s.step} className="border-0 shadow-sm text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mx-auto">
                    <span className="text-white font-bold text-lg">{s.step}</span>
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Join?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Licensed surveyors in Imo State and beyond — start building your digital land evidence portfolio today.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/lv/surveyor">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2 px-8">
              <Shield className="w-4 h-4" /> Join The LandVault Surveyor Network
            </Button>
          </Link>
          <Link to="/lv/archive-import">
            <Button size="lg" variant="outline" className="gap-2 px-8">
              <Database className="w-4 h-4" /> Import Archives
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">Aquasavannah LandVault — Protecting Family Land for Generations</p>
      </div>
    </div>
  );
}