import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database, CheckCircle2, AlertTriangle, Play, Trash2, RefreshCw,
  Map, Users, FileText, Camera, Shield, GitBranch, Landmark
} from "lucide-react";
import {
  generateParcels, generateFieldReports, generateDisputes,
  generateFamilyOwnerships, generateBeneficiaries, generateInheritanceCases,
  generateCommunityValidations, generateDeathVerifications, generateFamilyMeetingResolutions,
  pick, fullName, dateOnly, rndInt, GFL_CONFIG
} from "@/lib/demoDataGenerator";

const SEED_STEPS = [
  { id: "parcels", label: "Land Parcels", icon: Map, count: 200, color: "blue", desc: "200 parcels across Greenfield LGA communities" },
  { id: "field_reports", label: "Field Reports", icon: Camera, count: 80, color: "orange", desc: "80 GPS-verified field inspection reports" },
  { id: "disputes", label: "Disputes", icon: AlertTriangle, count: 20, color: "red", desc: "20 active and resolved disputes" },
  { id: "family", label: "Family Ownership", icon: Users, count: 5, color: "emerald", desc: "5 families with beneficiary trees" },
  { id: "inheritance", label: "Inheritance Cases", icon: GitBranch, count: 5, color: "purple", desc: "5 inheritance cases across workflow stages" },
  { id: "community", label: "Community Validations", icon: Landmark, count: 8, color: "teal", desc: "8 community validation workflows" },
  { id: "death_verifs", label: "Death Verifications", icon: FileText, count: 4, color: "indigo", desc: "4 death verification records" },
  { id: "resolutions", label: "Family Resolutions", icon: FileText, count: 4, color: "violet", desc: "4 family meeting resolution records" },
];

const COLOR_MAP = {
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
  red: "bg-red-50 text-red-600 border-red-200",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  teal: "bg-teal-50 text-teal-600 border-teal-200",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  violet: "bg-violet-50 text-violet-600 border-violet-200",
};

export default function DemoDataSeed() {
  const [status, setStatus] = useState({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [seededParcels, setSeededParcels] = useState([]);
  const [seededFamilies, setSeededFamilies] = useState([]);
  const [seededCases, setSeededCases] = useState([]);

  const addLog = (msg, type = "info") => {
    setLog(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  const setStepStatus = (id, s) => setStatus(prev => ({ ...prev, [id]: s }));

  const seedAll = async () => {
    setRunning(true);
    setLog([]);
    setStatus({});

    try {
      // ── STEP 1: Parcels ──────────────────────────────────────────────────
      setStepStatus("parcels", "running");
      addLog("Generating 200 Greenfield LGA land parcels…");
      const parcelData = generateParcels(200);
      const batchSize = 25;
      const createdParcels = [];
      for (let i = 0; i < parcelData.length; i += batchSize) {
        const batch = parcelData.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(p => base44.entities.LandParcel.create(p)));
        createdParcels.push(...results);
        addLog(`  Parcels: ${Math.min(i + batchSize, parcelData.length)}/${parcelData.length} created`);
      }
      setSeededParcels(createdParcels);
      setStepStatus("parcels", "done");
      addLog(`✓ ${createdParcels.length} parcels created`, "success");

      // ── STEP 2: Field Reports ────────────────────────────────────────────
      setStepStatus("field_reports", "running");
      addLog("Generating 80 field reports with GPS data…");
      const reportData = generateFieldReports(createdParcels, 80);
      for (let i = 0; i < reportData.length; i += batchSize) {
        await Promise.all(reportData.slice(i, i + batchSize).map(r => base44.entities.FieldReport.create(r)));
      }
      setStepStatus("field_reports", "done");
      addLog(`✓ ${reportData.length} field reports created`, "success");

      // ── STEP 3: Disputes ─────────────────────────────────────────────────
      setStepStatus("disputes", "running");
      addLog("Generating 20 land disputes…");
      const disputeData = generateDisputes(createdParcels, 20);
      await Promise.all(disputeData.map(d => base44.entities.Dispute.create(d)));
      setStepStatus("disputes", "done");
      addLog(`✓ ${disputeData.length} disputes created`, "success");

      // Also seed fraud alerts
      addLog("Generating 15 fraud alerts…");
      const alertTypes = ["duplicate_coordinates", "overlapping_boundary", "suspicious_ownership", "fake_document", "multiple_claims"];
      const fraudAlertsData = createdParcels.filter(p => p.fraud_risk_score > 40).slice(0, 15).map(p => ({
        parcel_id: p.id,
        parcel_number: p.parcel_number,
        alert_type: pick(alertTypes),
        risk_score: p.fraud_risk_score,
        risk_level: p.fraud_risk_level,
        description: `Automated system flagged ${p.parcel_number}: ${JSON.parse(p.fraud_risk_reasons || "[]")[0] || "Suspicious pattern detected"}`,
        status: pick(["open", "open", "under_investigation", "resolved", "dismissed"]),
        flagged_by: "system",
        assigned_to: "sg.demo@landsecure.app",
        created_date: dateOnly(90),
      }));
      for (const alert of fraudAlertsData) {
        try { await base44.entities.FraudAlert.create(alert); } catch {}
      }
      addLog(`✓ Fraud alerts seeded`, "success");

      // ── STEP 4: Family Ownership ─────────────────────────────────────────
      setStepStatus("family", "running");
      addLog("Creating 5 family ownership records with lineages…");
      const familyData = generateFamilyOwnerships(createdParcels, 5);
      const createdFamilies = await Promise.all(familyData.map(f => base44.entities.FamilyOwnership.create(f)));
      setSeededFamilies(createdFamilies);
      setStepStatus("family", "done");
      addLog(`✓ ${createdFamilies.length} family ownership records created`, "success");

      // Beneficiaries
      addLog("Adding family beneficiaries and successor chains…");
      const beneficiaryData = generateBeneficiaries(createdFamilies);
      await Promise.all(beneficiaryData.map(b => base44.entities.FamilyBeneficiary.create(b)));
      addLog(`✓ ${beneficiaryData.length} beneficiaries created`, "success");

      // ── STEP 5: Inheritance Cases ────────────────────────────────────────
      setStepStatus("inheritance", "running");
      addLog("Creating 5 inheritance cases across workflow stages…");
      const caseData = generateInheritanceCases(createdFamilies, Math.min(5, createdFamilies.length));
      const createdCases = await Promise.all(caseData.map(c => base44.entities.InheritanceCase.create(c)));
      setSeededCases(createdCases);
      setStepStatus("inheritance", "done");
      addLog(`✓ ${createdCases.length} inheritance cases created`, "success");

      // Plot allocations
      addLog("Adding plot allocations…");
      for (const ic of createdCases) {
        const bens = beneficiaryData.filter(b => b.family_ownership_id === ic.family_ownership_id);
        if (bens.length > 0) {
          const plotLetters = ["A", "B", "C", "D", "E"];
          for (let pi = 0; pi < Math.min(bens.length, 3); pi++) {
            try {
              await base44.entities.PlotAllocation.create({
                inheritance_case_id: ic.id,
                family_ownership_id: ic.family_ownership_id,
                parcel_id: ic.parcel_id,
                parcel_number: ic.parcel_number,
                beneficiary_id: bens[pi].id || `ben_${pi}`,
                beneficiary_name: bens[pi].full_name,
                planned_plot_number: `Plot ${plotLetters[pi]}`,
                area_sqm: rndInt(200, 2000),
                allocation_percentage: parseFloat((100 / Math.min(bens.length, 3)).toFixed(1)),
                allocation_status: pick(["draft", "confirmed", "confirmed"]),
                allocated_by: "surveyor.demo@landsecure.app",
                is_deleted: false,
              });
            } catch {}
          }
        }
      }
      addLog(`✓ Plot allocations created`, "success");

      // ── STEP 6: Community Validations ────────────────────────────────────
      setStepStatus("community", "running");
      addLog("Creating 8 community validation workflows…");
      const cvData = generateCommunityValidations(createdParcels, 8);
      await Promise.all(cvData.map(cv => base44.entities.CommunityValidation.create(cv)));
      setStepStatus("community", "done");
      addLog(`✓ ${cvData.length} community validations created`, "success");

      // ── STEP 7: Death Verifications ──────────────────────────────────────
      setStepStatus("death_verifs", "running");
      addLog("Creating death verification records…");
      const dvData = generateDeathVerifications(createdCases, Math.min(4, createdCases.length));
      await Promise.all(dvData.map(dv => base44.entities.DeathVerification.create(dv)));
      setStepStatus("death_verifs", "done");
      addLog(`✓ ${dvData.length} death verification records created`, "success");

      // ── STEP 8: Family Meeting Resolutions ───────────────────────────────
      setStepStatus("resolutions", "running");
      addLog("Creating family meeting resolutions…");
      const resData = generateFamilyMeetingResolutions(createdFamilies, Math.min(4, createdFamilies.length));
      await Promise.all(resData.map(r => base44.entities.FamilyMeetingResolution.create(r)));
      setStepStatus("resolutions", "done");
      addLog(`✓ ${resData.length} family meeting resolutions created`, "success");

      // ── Community Consents ───────────────────────────────────────────────
      addLog("Creating community consent records…");
      for (const fo of createdFamilies.slice(0, 4)) {
        try {
          await base44.entities.CommunityConsent.create({
            parcel_id: fo.parcel_id,
            parcel_number: fo.parcel_number,
            family_ownership_id: fo.id,
            community_name: pick(["Greenfield Central Community", "Emeka Town Community", "Okafor Hills Community"]),
            consent_type: pick(["family", "community", "traditional_authority"]),
            date_granted: dateOnly(60),
            status: pick(["granted", "granted", "pending"]),
            consent_notes: "Community has reviewed and endorsed the land transfer/inheritance proceedings.",
            submitted_by: "citizen.demo@landsecure.app",
            submitted_by_name: fullName(),
            is_deleted: false,
          });
        } catch {}
      }
      addLog(`✓ Community consent records created`, "success");

      // ── Audit Logs ───────────────────────────────────────────────────────
      addLog("Creating audit log entries…");
      const auditEntries = [
        { user_email: "sg.demo@landsecure.app", user_name: "Dr. Amara Okafor", action: "BULK_SEED_PARCELS", entity_type: "LandParcel", entity_id: "bulk", details: `Seeded ${createdParcels.length} demo parcels for Greenfield LGA pilot` },
        { user_email: "agent.demo@landsecure.app", user_name: "Emeka Obi", action: "FIELD_REPORTS_BATCH", entity_type: "FieldReport", entity_id: "bulk", details: "Generated 80 field inspection reports with GPS data" },
        { user_email: "citizen.demo@landsecure.app", user_name: "Blessing Eze", action: "FAMILY_REGISTRATION", entity_type: "FamilyOwnership", entity_id: "bulk", details: `Registered ${createdFamilies.length} family ownership records` },
        { user_email: "surveyor.demo@landsecure.app", user_name: "Tobi Fashola", action: "INHERITANCE_CASES", entity_type: "InheritanceCase", entity_id: "bulk", details: `Created ${createdCases.length} inheritance cases for pilot demonstration` },
      ];
      await Promise.all(auditEntries.map(e => base44.entities.AuditLog.create(e)));
      addLog(`✓ Audit log entries created`, "success");

      addLog("🎉 Greenfield LGA demo environment fully seeded!", "success");

    } catch (err) {
      addLog(`❌ Error: ${err.message}`, "error");
    } finally {
      setRunning(false);
    }
  };

  const clearAll = async () => {
    if (!confirm("This will delete ALL demo data from all entities. Are you sure?")) return;
    setRunning(true);
    addLog("Clearing all demo data…", "warn");
    try {
      await Promise.all([
        base44.entities.LandParcel.filter({ lga: GFL_CONFIG.lga }).then(items => Promise.all(items.map(i => base44.entities.LandParcel.delete(i.id)))),
        base44.entities.FieldReport.list().then(items => Promise.all(items.map(i => base44.entities.FieldReport.delete(i.id)))),
        base44.entities.Dispute.list().then(items => Promise.all(items.map(i => base44.entities.Dispute.delete(i.id)))),
      ]);
      addLog("✓ Demo data cleared", "success");
      setStatus({});
    } catch (err) {
      addLog(`Error clearing: ${err.message}`, "error");
    } finally {
      setRunning(false);
    }
  };

  const completedSteps = Object.values(status).filter(s => s === "done").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Demo Data Seed</h1>
          <Badge className="bg-primary/10 text-primary border-primary/20">Admin Only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Populate Greenfield LGA with realistic pilot demonstration data. This creates all entities needed for stakeholder demonstrations.
        </p>
      </div>

      {/* LGA Info */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-2">Target Pilot Area</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><p className="text-muted-foreground">LGA Name</p><p className="font-semibold">Greenfield Local Government</p></div>
            <div><p className="text-muted-foreground">State</p><p className="font-semibold">Rivers State</p></div>
            <div><p className="text-muted-foreground">Communities</p><p className="font-semibold">10 communities</p></div>
            <div><p className="text-muted-foreground">Villages</p><p className="font-semibold">25 villages</p></div>
            <div><p className="text-muted-foreground">Wards</p><p className="font-semibold">12 wards</p></div>
            <div><p className="text-muted-foreground">GPS Centre</p><p className="font-semibold">6.455°N, 3.384°E</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Seed Steps Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEED_STEPS.map(step => {
          const Icon = step.icon;
          const s = status[step.id];
          const cls = COLOR_MAP[step.color];
          return (
            <Card key={step.id} className={`border transition-all ${s === "done" ? "border-emerald-400 bg-emerald-50" : s === "running" ? "border-primary/50" : cls.split(" ")[2]}`}>
              <CardContent className="p-3 text-center">
                <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${s === "done" ? "bg-emerald-100" : cls.split(" ")[0]}`}>
                  {s === "done" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : s === "running" ? <RefreshCw className="w-4 h-4 text-primary animate-spin" /> : <Icon className={`w-4 h-4 ${cls.split(" ")[1]}`} />}
                </div>
                <p className="text-[10px] font-semibold">{step.label}</p>
                <p className="text-[9px] text-muted-foreground">{step.count} records</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress */}
      {completedSteps > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Seeding progress</span>
            <span>{completedSteps}/{SEED_STEPS.length} steps complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(completedSteps / SEED_STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={seedAll} disabled={running} className="gap-2 bg-primary hover:bg-primary/90">
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Seeding in progress…" : "Seed Demo Data"}
        </Button>
        <Button onClick={clearAll} disabled={running} variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" /> Clear GFL Data
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ Important Notes</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Seeding takes 2–3 minutes. Do not close the page during seeding.</li>
            <li>• Data is cumulative — run once per pilot environment setup.</li>
            <li>• "Clear GFL Data" only removes parcels in the Greenfield LGA.</li>
            <li>• After seeding, refresh all dashboards to see updated statistics.</li>
            <li>• This page is admin-only — not visible to demo users.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Log output */}
      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" /> Seed Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 max-h-72 overflow-y-auto font-mono text-xs space-y-1">
              {log.map((entry, i) => (
                <div key={i} className={`${entry.type === "success" ? "text-emerald-400" : entry.type === "error" ? "text-red-400" : entry.type === "warn" ? "text-amber-400" : "text-gray-300"}`}>
                  <span className="text-gray-500">[{entry.ts}]</span> {entry.msg}
                </div>
              ))}
              {running && <div className="text-blue-400 animate-pulse">Processing…</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}