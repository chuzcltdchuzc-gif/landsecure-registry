import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, MapPin, Award, Clock, CheckCircle2, TrendingUp, Database, Search, Lock, BarChart3, ArrowDown, QrCode, Eye, Layers, Fingerprint, Scale, BookOpen, Building2, Landmark, Globe, UserCheck, AlertTriangle, Zap } from "lucide-react";

// ─── Trust Sources ─────────────────────────────────────────────
const TRUST_WEIGHTS = [
  { source: "Survey Plan", weight: "High", desc: "Licensed surveyor-prepared boundary and measurement plan" },
  { source: "Licensed Surveyor Verification", weight: "High", desc: "Independent professional confirmation of survey authenticity" },
  { source: "GPS Coordinates", weight: "High", desc: "Geo-located evidence with accuracy scoring" },
  { source: "Community Attestation", weight: "Medium", desc: "Local stakeholder confirmation of land knowledge" },
  { source: "Supporting Documents", weight: "Medium", desc: "Allocation letters, family agreements, historical records" },
  { source: "Verification History", weight: "Medium", desc: "Complete record of all verification events" },
  { source: "Chain of Custody", weight: "High", desc: "Immutable audit trail from submission to verification" },
  { source: "Audit Logs", weight: "High", desc: "Every platform action timestamped and attributable" },
];

const STAKEHOLDERS = [
  { icon: Users, title: "Families", why: "Protect family land evidence from loss, dispute, and fragmentation", benefits: ["Permanent evidence preservation", "Community recognition", "Dispute prevention"], trust: "Evidence stays with the family" },
  { icon: Shield, title: "Surveyors", why: "Digitise, preserve, showcase and monetise professional archives", benefits: ["Portfolio visibility", "Revenue sharing", "Duplicate protection"], trust: "Work is immutably attributed" },
  { icon: Building2, title: "Traditional Institutions", why: "Formalise community land knowledge in a structured system", benefits: ["Permanent attestation records", "Intergenerational continuity"], trust: "Attestations are auditable" },
  { icon: Scale, title: "Lawyers", why: "Access structured evidence for due diligence and transaction support", benefits: ["Searchable evidence trails", "Verification reports"], trust: "Evidence is independently verifiable" },
  { icon: Landmark, title: "Banks", why: "Reduce lending risk through documented land evidence", benefits: ["Due diligence support", "Fraud risk indicators"], trust: "Multiple layers reduce uncertainty" },
  { icon: Globe, title: "Government Agencies", why: "Access community-level land evidence for planning", benefits: ["Community mapping", "Pilot metrics"], trust: "Evidence is transparent" },
  { icon: MapPin, title: "Diaspora Owners", why: "Verify family land from anywhere in the world", benefits: ["Remote verification", "QR code access"], trust: "Evidence is globally accessible" },
];

// ─── Sub-components ────────────────────────────────────────────
function ConfidenceBar({ score = 0 }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const color = pct >= 76 ? "bg-emerald-500" : pct >= 51 ? "bg-blue-500" : pct >= 26 ? "bg-amber-500" : "bg-gray-300";
  const label = pct >= 91 ? "Complete Chain of Custody" : pct >= 76 ? "Multiple Verifications" : pct >= 51 ? "Community Attested" : pct >= 26 ? "Surveyor Verified" : "Evidence Submitted";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Confidence Score</span>
        <span className="font-mono font-bold">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FlowStep({ label, icon, sub }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
        <Icon className="w-6 h-6 text-emerald-700" />
      </div>
      <p className="text-xs font-semibold">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-5 h-5 text-emerald-400" />
    </div>
  );
}

function CustodyStep({ step, actor, action, evidence, active }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
          <CheckCircle2 className="w-4 h-4" />
        </div>
        {step < 7 && <div className={`w-0.5 flex-1 ${active ? "bg-emerald-200" : "bg-muted"}`} />}
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-sm font-semibold">{action}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{actor}</span>
        </div>
        {evidence && <p className="text-[10px] text-emerald-700 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded">{evidence}</p>}
      </div>
    </div>
  );
}

function StakeholderCard({ s }) {
  const Icon = s.icon;
  return (
    <Card className="border-0 shadow-sm h-full">
      <CardContent className="p-5 space-y-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-700" />
        </div>
        <h3 className="font-semibold text-sm">{s.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-foreground">Why:</span> {s.why}</p>
        <div className="flex flex-wrap gap-1">
          {s.benefits.map(b => <Badge key={b} className="text-[10px] bg-emerald-50 text-emerald-700">{b}</Badge>)}
        </div>
        <p className="text-[10px] font-semibold text-emerald-700 italic">{s.trust}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 text-center">
        <Icon className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────
export default function TrustArchitecture() {
  const { data: parcels = [] } = useQuery({ queryKey: ["trust-parcels"], queryFn: async () => { try { return await base44.entities.LandVaultParcel.filter({}, "-created_date", 1000); } catch { return []; } }, staleTime: 120_000 });
  const { data: surveyors = [] } = useQuery({ queryKey: ["trust-surveyors"], queryFn: async () => { try { return await base44.entities.SurveyorPartner.filter({}); } catch { return []; } }, staleTime: 120_000 });
  const { data: archives = [] } = useQuery({ queryKey: ["trust-archives"], queryFn: async () => { try { return await base44.entities.ArchiveRecord.filter({}); } catch { return []; } }, staleTime: 120_000 });
  const { data: revenue = [] } = useQuery({ queryKey: ["trust-revenue"], queryFn: async () => { try { return await base44.entities.RevenueTransaction.filter({}); } catch { return []; } }, staleTime: 120_000 });
  const { data: auditLogs = [] } = useQuery({ queryKey: ["trust-audit"], queryFn: async () => { try { return await base44.entities.AuditLog.filter({}, "-created_date", 10); } catch { return []; } }, staleTime: 120_000 });

  const totalParcels = parcels.length;
  const totalSurveyors = surveyors.length;
  const communities = [...new Set([...parcels.map(p => p.community), ...archives.map(a => a.community)].filter(Boolean))];
  const totalCommunities = communities.length;
  const certificates = parcels.filter(p => ["ACTIVE", "RELEASED"].includes(p.certificate_status)).length;
  const verifiedParcels = parcels.filter(p => p.verification_status !== "unverified").length;
  const commVerifiedCount = parcels.filter(p => p.community_confirmed).length;
  const svVerifiedCount = archives.filter(a => a.classification === "SURVEYOR_VERIFIED").length + parcels.filter(p => p.survey_status === "completed").length;
  const archiveOnly = archives.filter(a => a.classification === "ARCHIVE_ONLY").length;
  const duplicatesResolved = parcels.filter(p => p.duplicate_flag && p.duplicate_reviewed).length;
  const totalRevenue = revenue.reduce((s, r) => s + (r.amount || 0), 0);

  const confidenceScores = parcels.map(p => p.evidence_confidence_score || p.consent_strength_score || 0).filter(s => s > 0);
  const avgConfidence = confidenceScores.length ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) : 0;

  const auditSamples = auditLogs.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">

      {/* ── SECTION 1: HERO ──────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#10b981,#064e3b)]" style={{ opacity: 0.07 }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,#3b82f6,#1e3a5f)]" style={{ opacity: 0.05 }} />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ boxShadow: "0 10px 40px rgba(5,150,105,0.3)" }}>
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">How LandVault Builds Trust</h1>
          <div className="text-lg text-slate-300 max-w-xl mx-auto mb-2 space-y-1">
            <p className="text-emerald-400 font-semibold">We record evidence.</p>
            <p className="text-white/80">We do not determine truth.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-400 mt-6 mb-10">
            <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">Every parcel is traceable</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">Every record is auditable</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">Every verification leaves evidence</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#evidence-model"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-base gap-2"><Layers className="w-5 h-5" /> Explore Our Evidence Model</Button></a>
            <a href="#confidence-engine"><Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 px-8 py-6 text-base gap-2"><Zap className="w-5 h-5" /> Learn How Verification Works</Button></a>
            <Link to="/lv/surveyor-network"><Button size="lg" variant="outline" className="border-emerald-700 text-emerald-300 hover:bg-emerald-950 px-8 py-6 text-base gap-2"><Users className="w-5 h-5" /> Join The Surveyor Network</Button></Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: WHY LANDVAULT EXISTS ──────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">WHY LANDVAULT EXISTS</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-0 shadow-md bg-red-50/50">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-red-800 mb-4">Traditional land disputes often emerge because evidence is:</p>
              <div className="space-y-2">
                {["Fragmented", "Lost", "Unverifiable", "Difficult to access", "Difficult to preserve"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-sm text-red-700"><AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> {i}</div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-emerald-50/50">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-emerald-800 mb-4">LandVault exists to:</p>
              <div className="space-y-2">
                {["Preserve evidence", "Improve transparency", "Support verification", "Improve due diligence", "Reduce evidence loss", "Create permanent audit trails"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {i}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 p-6 bg-slate-900 text-white rounded-2xl text-center">
          <p className="text-lg md:text-xl font-bold tracking-wide">LANDVAULT RECORDS EVIDENCE.</p>
          <p className="text-emerald-400 font-semibold mt-1">IT DOES NOT DETERMINE OWNERSHIP.</p>
        </div>
      </div>

      {/* ── SECTION 3: EVIDENCE STEWARDSHIP ──────────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">EVIDENCE STEWARDSHIP</h2>
          <p className="text-center text-muted-foreground max-w-xl mx-auto mb-10">LandVault does not own submitted evidence. Evidence remains attributable to its source.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, title: "Families", desc: "Retain ownership of submitted family records" },
              { icon: Shield, title: "Surveyors", desc: "Retain attribution of survey work" },
              { icon: Building2, title: "Communities", desc: "Retain authority over attestations" },
              { icon: Lock, title: "LandVault", desc: "Preserves · Indexes · Audits · Verifies evidence trails" },
            ].map(c => {
              const CIcon = c.icon;
              return (
                <Card key={c.title} className="border-0 shadow-sm text-center">
                  <CardContent className="p-6 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                      <CIcon className="w-6 h-6 text-emerald-700" />
                    </div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm font-semibold text-emerald-700 mt-8 italic">"Evidence remains attributable to its source."</p>
        </div>
      </div>

      {/* ── SECTION 4: TRUST SOURCES ─────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">WHERE TRUST COMES FROM</h2>
        <p className="text-center text-muted-foreground max-w-lg mx-auto mb-10">Trust comes from evidence quality, not ownership claims.</p>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Evidence Source</th>
                  <th className="text-left p-4 font-semibold">Trust Weight</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {TRUST_WEIGHTS.map(tw => (
                  <tr key={tw.source} className="border-b border-border/50 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-4 font-medium">{tw.source}</td>
                    <td className="p-4"><Badge className={`text-[10px] ${tw.weight === "High" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{tw.weight}</Badge></td>
                    <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{tw.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── SECTION 5: CONFIDENCE ENGINE ─────────────────────── */}
      <div id="confidence-engine" className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">THE LANDVAULT CONFIDENCE ENGINE</h2>
          <div className="grid grid-cols-5 gap-2 mb-8">
            {[
              { range: "0-25", label: "Evidence Submitted", color: "bg-gray-100" },
              { range: "26-50", label: "Surveyor Verified", color: "bg-blue-100" },
              { range: "51-75", label: "Community Attested", color: "bg-amber-100" },
              { range: "76-90", label: "Multiple Verifications", color: "bg-emerald-100" },
              { range: "91-100", label: "Complete Custody", color: "bg-emerald-300" },
            ].map(s => (
              <div key={s.range} className={`${s.color} rounded-xl p-3 text-center`}>
                <p className="text-lg font-bold">{s.range}</p>
                <p className="text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Average Evidence Confidence</h3>
                <span className="text-3xl font-black text-emerald-600">{avgConfidence}%</span>
              </div>
              <ConfidenceBar score={avgConfidence} />
              <p className="text-xs text-muted-foreground italic">Higher confidence means stronger evidence preservation and verification activity. Higher confidence does not imply legal ownership.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION 6: FOUR EVIDENCE LAYERS ──────────────────── */}
      <div id="evidence-model" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">FOUR LAYERS OF EVIDENCE</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { badge: "GREY", Icon: Database, title: "ARCHIVE RECORD", desc: "Historical documents preserved.", borders: "border-gray-300 bg-gray-50" },
            { badge: "BLUE", Icon: Shield, title: "SURVEYOR VERIFIED", desc: "Licensed surveyor confirms authenticity.", borders: "border-blue-300 bg-blue-50" },
            { badge: "GREEN", Icon: Award, title: "COMMUNITY ATTESTED", desc: "Community stakeholders confirm local knowledge.", borders: "border-emerald-300 bg-emerald-50" },
            { badge: "VERIFIED", Icon: CheckCircle2, title: "VERIFIED RECORD", desc: "Complete evidence package with verification history.", borders: "border-violet-300 bg-violet-50" },
          ].map(l => (
            <Card key={l.title} className={`border-2 shadow-sm ${l.borders} text-center`}>
              <CardContent className="p-6 space-y-3">
                <div className={`w-12 h-12 rounded-xl ${l.borders.split(" ")[0].replace("border-","bg-").replace("-300","-100")} flex items-center justify-center mx-auto`}>
                  <l.Icon className={`w-6 h-6 ${l.borders.split(" ")[0].replace("border-","text-").replace("-300","-600")}`} />
                </div>
                <Badge className="text-[10px] mb-1">{l.badge} BADGE</Badge>
                <h3 className="font-bold text-sm">{l.title}</h3>
                <p className="text-xs text-muted-foreground">{l.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: GROWING EVIDENCE NETWORK ──────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">THE EVIDENCE NETWORK</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            <MetricCard label="Total Parcels" value={totalParcels} icon={MapPin} />
            <MetricCard label="Surveyors" value={totalSurveyors} icon={Users} />
            <MetricCard label="Communities" value={totalCommunities} icon={Building2} />
            <MetricCard label="Certificates" value={certificates} icon={Award} />
            <MetricCard label="Verifications" value={verifiedParcels} icon={CheckCircle2} />
            <MetricCard label="Archive Records" value={archiveOnly + svVerifiedCount + commVerifiedCount} icon={Database} />
            <MetricCard label="Community Verified" value={commVerifiedCount} icon={Users} />
            <MetricCard label="Surveyor Verified" value={svVerifiedCount} icon={Shield} />
            <MetricCard label="Alerts Resolved" value={duplicatesResolved} icon={AlertTriangle} />
            <MetricCard label="Avg Confidence" value={`${avgConfidence}%`} icon={TrendingUp} />
          </div>
          <div className="space-y-2 text-center text-sm text-emerald-700 font-medium">
            <p>Every verified record strengthens the network.</p>
            <p>Every surveyor strengthens the network.</p>
            <p>Every attestation strengthens the network.</p>
            <p>Every preserved archive strengthens the network.</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 8: TRUST ARCHITECTURE DIAGRAM ────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">TRUST ARCHITECTURE</h2>
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-0">
              <FlowStep label="Families" icon={Users} sub="Submit evidence" />
              <FlowArrow />
              <FlowStep label="Evidence Layer" icon={Layers} sub="Documents · Photos · GPS · Consent" />
              <FlowArrow />
              <FlowStep label="Surveyor Verification" icon={Shield} sub="Licensed professional review" />
              <FlowArrow />
              <FlowStep label="Community Attestation" icon={Building2} sub="Local knowledge confirmation" />
              <FlowArrow />
              <FlowStep label="Confidence Engine" icon={BarChart3} sub="Score calculation" />
              <FlowArrow />
              <FlowStep label="Certificate Generation" icon={Award} sub="QR-linked digital certificate" />
              <FlowArrow />
              <FlowStep label="Verification Requests" icon={Search} sub="Due diligence portal" />
              <FlowArrow />
              <FlowStep label="Audit Trail" icon={Fingerprint} sub="Immutable chain of custody" />
            </div>
            <p className="text-center text-sm font-semibold text-emerald-700 mt-8 italic">Trust emerges through layered verification.</p>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 9: CHAIN OF CUSTODY ──────────────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">CHAIN OF CUSTODY</h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              {[
                { step: 1, actor: "Field Agent", action: "Parcel Created", evidence: "GPS · Consent · Photos" },
                { step: 2, actor: "Field Agent", action: "Document Uploaded", evidence: "Survey plans · Supporting docs" },
                { step: 3, actor: "Licensed Surveyor", action: "Surveyor Verification", evidence: "Survey authentication · Boundaries" },
                { step: 4, actor: "Community Validator", action: "Community Attestation", evidence: "Local knowledge · Witness" },
                { step: 5, actor: "System", action: "Certificate Generated", evidence: "QR Certificate · Confidence Score" },
                { step: 6, actor: "Verifier", action: "Verification Request", evidence: "Due diligence review" },
                { step: 7, actor: "System", action: "Audit Logged", evidence: "Immutable audit record · Timestamp" },
              ].map(cs => (
                <CustodyStep key={cs.step} step={cs.step} actor={cs.actor} action={cs.action} evidence={cs.evidence} active={true} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION 10: SURVEYOR NETWORK ─────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">BUILDING THE SURVEYOR EVIDENCE NETWORK</h2>
        <p className="text-center text-muted-foreground max-w-lg mx-auto mb-10">Licensed surveyors can digitise, preserve, verify, showcase and monetise professional archives.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          <MetricCard label="Surveyor Partners" value={totalSurveyors} icon={Users} />
          <MetricCard label="Archives Imported" value={archives.length} icon={Database} />
          <MetricCard label="Communities Covered" value={totalCommunities} icon={MapPin} />
          <MetricCard label="Verification Requests" value={verifiedParcels} icon={Search} />
          <MetricCard label="Revenue Generated" value={`₦${totalRevenue.toLocaleString()}`} icon={TrendingUp} />
        </div>
        <p className="text-center text-sm font-semibold text-emerald-700">Every surveyor archive preserved strengthens the evidence network.</p>
        <div className="flex justify-center mt-6">
          <Link to="/lv/surveyor-network"><Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Users className="w-4 h-4" /> Explore Surveyor Network</Button></Link>
        </div>
      </div>

      {/* ── SECTION 11: COMMUNITY TRUST MODEL ────────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">COMMUNITY ATTESTATION</h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-0">
                <FlowStep label="Family Head" icon={Users} sub="Identifies family land" />
                <FlowArrow />
                <FlowStep label="Community Leader" icon={UserCheck} sub="Confirms local knowledge" />
                <FlowArrow />
                <FlowStep label="Traditional Institution" icon={Building2} sub="Formal attestation" />
                <FlowArrow />
                <FlowStep label="Permanent Attestation Record" icon={Lock} sub="Immutable · Auditable" />
              </div>
              <p className="text-center text-sm font-semibold text-emerald-700 mt-8">Community attestation adds local legitimacy.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION 12: VERIFICATION REQUEST FLOW ────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">HOW DUE DILIGENCE WORKS</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { Icon: Users, label: "Buyer" },
            { Icon: Scale, label: "Lawyer" },
            { Icon: Landmark, label: "Bank" },
            { Icon: Globe, label: "Diaspora Investor" },
          ].map(r => (
            <Card key={r.label} className="border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <r.Icon className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
                <p className="text-sm font-semibold">{r.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-0 shadow-md max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-0">
              <FlowStep label="Verification Request" icon={Search} />
              <FlowArrow />
              <FlowStep label="Evidence Review" icon={Eye} />
              <FlowArrow />
              <FlowStep label="Confidence Assessment" icon={BarChart3} />
              <FlowArrow />
              <FlowStep label="Certificate Validation" icon={QrCode} />
              <FlowArrow />
              <FlowStep label="Audit Record" icon={Fingerprint} />
            </div>
          </CardContent>
        </Card>
        <div className="mt-8 text-center">
          <p className="text-emerald-700 font-semibold">LandVault supports verification.</p>
          <p className="text-muted-foreground text-sm mt-1">LandVault does not determine ownership.</p>
        </div>
      </div>

      {/* ── SECTION 13: WHO USES LANDVAULT ──────────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">WHO USES LANDVAULT</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAKEHOLDERS.map(s => <StakeholderCard key={s.title} s={s} />)}
          </div>
        </div>
      </div>

      {/* ── SECTION 14: WHAT LANDVAULT DOES ──────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-0 shadow-md bg-red-50/50">
            <CardContent className="p-6">
              <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> LANDVAULT DOES NOT</h3>
              <div className="space-y-2">
                {["Determine ownership", "Replace registries", "Replace government systems", "Replace courts", "Adjudicate disputes", "Act as title authority"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-sm text-red-700"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{i}</div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-emerald-50/50">
            <CardContent className="p-6">
              <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> LANDVAULT DOES</h3>
              <div className="space-y-2">
                {["Preserve evidence", "Record verification activity", "Maintain chain of custody", "Improve transparency", "Support due diligence", "Create searchable evidence trails"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{i}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION 15: TRUST BADGES ─────────────────────────── */}
      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">TRUST BADGES</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { Icon: Shield, label: "SURCON Verified", desc: "Verified by a SURCON-licensed surveyor", color: "bg-blue-100 text-blue-700 border-blue-300" },
              { Icon: Users, label: "Community Attested", desc: "Confirmed by community stakeholders", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
              { Icon: Database, label: "Evidence Preserved", desc: "Historical evidence digitally archived", color: "bg-gray-100 text-gray-700 border-gray-300" },
              { Icon: Fingerprint, label: "Audit Logged", desc: "Every action leaves a traceable audit record", color: "bg-violet-100 text-violet-700 border-violet-300" },
              { Icon: Award, label: "Certificate Issued", desc: "QR-linked digital certificate generated", color: "bg-amber-100 text-amber-700 border-amber-300" },
              { Icon: QrCode, label: "QR Verified", desc: "Instant verification via QR code scan", color: "bg-slate-100 text-slate-700 border-slate-300" },
            ].map(b => (
              <Card key={b.label} className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${b.color.split(" ")[0]} flex items-center justify-center shrink-0`}>
                    <b.Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <Badge className={`text-[10px] mb-1 ${b.color}`}>{b.label}</Badge>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 16: TRANSPARENCY & AUDIT ─────────────────── */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">EVERY ACTION LEAVES EVIDENCE</h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-10">Every significant platform action is timestamped and auditable.</p>
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-semibold">User</th>
                    <th className="text-left p-3 font-semibold">Action</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Date</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Entity</th>
                    <th className="text-left p-3 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {auditSamples.length > 0 ? auditSamples.map(a => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="p-3 text-xs">{a.user_name || a.user_email || "—"}</td>
                      <td className="p-3 text-xs font-medium">{a.action}</td>
                      <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{a.created_date ? new Date(a.created_date).toLocaleDateString() : "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{a.entity_type || "—"}</td>
                      <td className="p-3"><Badge className="text-[10px] bg-emerald-100 text-emerald-700">Logged</Badge></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground italic">Audit records accumulate as platform activity grows. Every future action will be logged here.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SECTION 17: LEGAL DISCLAIMER ─────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Card className="border-2 border-amber-300 bg-amber-50 shadow-md">
          <CardContent className="p-8 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-amber-700" />
              <h2 className="font-bold text-lg text-amber-900">Legal Disclaimer</h2>
            </div>
            <p className="text-sm text-amber-800">Aquasavannah LandVault records submitted evidence and verification events.</p>
            <div className="space-y-1.5 text-sm text-amber-700">
              <p>LandVault does not determine legal ownership.</p>
              <p>LandVault does not replace government land registries.</p>
              <p>LandVault does not adjudicate disputes.</p>
              <p>LandVault does not replace courts, title systems, or statutory land administration processes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 18: CALL TO ACTION ───────────────────────── */}
      <div className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Building Trust</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-10">Explore the evidence network, join as a surveyor partner, or request verification of a parcel.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/lv/parcels"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-8"><MapPin className="w-4 h-4" /> Explore Parcels</Button></Link>
            <Link to="/lv/surveyor-network"><Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-2 px-8"><Users className="w-4 h-4" /> Join Surveyor Network</Button></Link>
            <Link to="/lv/verify"><Button size="lg" variant="outline" className="border-emerald-700 text-emerald-300 hover:bg-emerald-950 gap-2 px-8"><Search className="w-4 h-4" /> Request Verification</Button></Link>
            <Link to="/demo"><Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-2 px-8"><BookOpen className="w-4 h-4" /> Book Demo</Button></Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-sm">Aquasavannah LandVault</span>
        </div>
        <p className="text-xs text-muted-foreground">Evidence Infrastructure Platform · Protecting Family Land for Generations</p>
      </div>
    </div>
  );
}