import { S, SectionCard, StatBox } from "./PilotShared";
import { Users, GitBranch, Shield, CheckCircle2, FileText } from "lucide-react";

export default function CustomaryOwnershipTab({ data }) {
  const { families, beneficiaries, cases, witnesses, tradVal, communityVal } = data;

  // ── Beneficiary share totals ──
  const shareByFamily = {};
  beneficiaries.filter(b => !b.is_deleted).forEach(b => {
    shareByFamily[b.family_ownership_id] = (shareByFamily[b.family_ownership_id] || 0) + (b.percentage_share || 0);
  });
  const familyShareEntries = Object.entries(shareByFamily);
  const shareExact100 = familyShareEntries.filter(([, total]) => Math.abs(total - 100) < 0.01);
  const shareOver100 = familyShareEntries.filter(([, total]) => total > 100.01);
  const shareUnder100 = familyShareEntries.filter(([, total]) => total < 99.99 && total > 0);
  const shareZero = familyShareEntries.filter(([, total]) => total === 0);

  const shareRows = [
    { label: "Family ownerships with beneficiary shares totalling exactly 100%", checked: familyShareEntries.length, passed: shareExact100.length, failed: shareOver100.length + shareUnder100.length, sampleIds: [...shareOver100, ...shareUnder100].slice(0, 5).map(([id]) => id), evidence: `${shareExact100.length} correct · ${shareOver100.length} over 100% · ${shareUnder100.length} under 100% · ${shareZero.length} at 0%`, status: shareOver100.length + shareUnder100.length === 0 ? S.ok : shareOver100.length > 0 ? S.fail : S.warn },
    { label: "Beneficiaries with percentage_share > 0", checked: beneficiaries.length, passed: beneficiaries.filter(b => b.percentage_share > 0).length, failed: beneficiaries.filter(b => !(b.percentage_share > 0)).length, sampleIds: beneficiaries.filter(b => !(b.percentage_share > 0)).slice(0, 5).map(b => b.id), evidence: `${beneficiaries.filter(b => b.percentage_share > 0).length} of ${beneficiaries.length} beneficiaries have a share > 0%`, status: beneficiaries.filter(b => !(b.percentage_share > 0)).length === 0 ? S.ok : S.warn },
    { label: "Beneficiaries with allocated_plot recorded", checked: beneficiaries.length, passed: beneficiaries.filter(b => b.allocated_plot).length, failed: beneficiaries.filter(b => !b.allocated_plot).length, sampleIds: beneficiaries.filter(b => !b.allocated_plot).slice(0, 5).map(b => b.id), evidence: `${beneficiaries.filter(b => b.allocated_plot).length} beneficiaries have an allocated_plot reference`, status: beneficiaries.filter(b => !b.allocated_plot).length / Math.max(beneficiaries.length, 1) < 0.3 ? S.ok : S.warn },
  ];

  // ── Inheritance ranking sequence ──
  // Check each family's beneficiaries have unique, sequential inheritance_rank values
  const benefByFamily = {};
  beneficiaries.filter(b => !b.is_deleted).forEach(b => {
    benefByFamily[b.family_ownership_id] = (benefByFamily[b.family_ownership_id] || []).concat(b);
  });
  let rankConflicts = [], rankGaps = [], rankMissing = [];
  Object.entries(benefByFamily).forEach(([famId, benefs]) => {
    const ranked = benefs.filter(b => b.inheritance_rank);
    const ranks = ranked.map(b => b.inheritance_rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size < ranks.length) rankConflicts.push(famId); // duplicate ranks
    const maxRank = Math.max(...ranks);
    const expected = Array.from({ length: maxRank }, (_, i) => i + 1);
    const missing = expected.filter(r => !uniqueRanks.has(r));
    if (missing.length > 0) rankGaps.push(famId);
    if (benefs.some(b => !b.inheritance_rank)) rankMissing.push(famId);
  });

  const rankingRows = [
    { label: "Family groups with unique inheritance rankings (no duplicates)", checked: Object.keys(benefByFamily).length, passed: Object.keys(benefByFamily).length - rankConflicts.length, failed: rankConflicts.length, sampleIds: rankConflicts.slice(0, 5), evidence: `${rankConflicts.length} family groups have duplicate inheritance_rank values among their beneficiaries`, status: rankConflicts.length === 0 ? S.ok : S.fail },
    { label: "Family groups with sequential rank (no gaps)", checked: Object.keys(benefByFamily).length, passed: Object.keys(benefByFamily).length - rankGaps.length, failed: rankGaps.length, sampleIds: rankGaps.slice(0, 5), evidence: `${rankGaps.length} family groups have gaps in ranking sequence`, status: rankGaps.length === 0 ? S.ok : S.warn },
    { label: "Beneficiaries with inheritance_rank assigned", checked: beneficiaries.length, passed: beneficiaries.filter(b => b.inheritance_rank).length, failed: beneficiaries.filter(b => !b.inheritance_rank).length, sampleIds: beneficiaries.filter(b => !b.inheritance_rank).slice(0, 5).map(b => b.id), evidence: `${beneficiaries.filter(b => b.inheritance_rank).length} of ${beneficiaries.length} beneficiaries have a rank`, status: beneficiaries.filter(b => !b.inheritance_rank).length / Math.max(beneficiaries.length, 1) < 0.2 ? S.ok : S.warn },
  ];

  // ── Successor chains ──
  // parent_beneficiary_id chains
  const benefIds = new Set(beneficiaries.map(b => b.id));
  const brokenSuccessors = beneficiaries.filter(b => b.parent_beneficiary_id && !benefIds.has(b.parent_beneficiary_id));
  const activeWithSuccessor = beneficiaries.filter(b => b.status === "deceased" && beneficiaries.some(s => s.parent_beneficiary_id === b.id));

  const successorRows = [
    { label: "Successor chain references valid (parent_beneficiary_id)", checked: beneficiaries.filter(b => b.parent_beneficiary_id).length, passed: beneficiaries.filter(b => b.parent_beneficiary_id).length - brokenSuccessors.length, failed: brokenSuccessors.length, sampleIds: brokenSuccessors.slice(0, 5).map(b => b.id), evidence: brokenSuccessors.length === 0 ? "All parent_beneficiary_id references resolve to existing beneficiaries" : `${brokenSuccessors.length} successor references point to non-existent beneficiaries`, status: brokenSuccessors.length === 0 ? S.ok : S.fail },
    { label: "Deceased beneficiaries with at least one successor registered", checked: beneficiaries.filter(b => b.status === "deceased").length, passed: activeWithSuccessor.length, failed: beneficiaries.filter(b => b.status === "deceased").length - activeWithSuccessor.length, sampleIds: beneficiaries.filter(b => b.status === "deceased" && !beneficiaries.some(s => s.parent_beneficiary_id === b.id)).slice(0, 5).map(b => b.id), evidence: `${activeWithSuccessor.length} of ${beneficiaries.filter(b => b.status === "deceased").length} deceased beneficiaries have a recorded successor`, status: beneficiaries.filter(b => b.status === "deceased").length === 0 ? S.ok : activeWithSuccessor.length === beneficiaries.filter(b => b.status === "deceased").length ? S.ok : S.warn },
    { label: "Beneficiaries with 'minor' status (succession pending)", checked: beneficiaries.length, passed: 0, failed: beneficiaries.filter(b => b.status === "minor").length, sampleIds: beneficiaries.filter(b => b.status === "minor").slice(0, 5).map(b => b.id), evidence: `${beneficiaries.filter(b => b.status === "minor").length} minor beneficiaries — succession decisions deferred`, status: beneficiaries.filter(b => b.status === "minor").length === 0 ? S.ok : S.warn },
  ];

  // ── Family branch structure ──
  const withBranch = families.filter(f => f.family_branch);
  const withGenLevel = families.filter(f => f.generation_level);
  const withLineage = families.filter(f => f.family_lineage);

  const branchRows = [
    { label: "FamilyOwnership records with family_branch defined", checked: families.length, passed: withBranch.length, failed: families.length - withBranch.length, sampleIds: families.filter(f => !f.family_branch).slice(0, 5).map(f => f.id), evidence: `${withBranch.length} of ${families.length} families have a branch designation`, status: withBranch.length / Math.max(families.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "FamilyOwnership records with generation_level defined", checked: families.length, passed: withGenLevel.length, failed: families.length - withGenLevel.length, sampleIds: families.filter(f => !f.generation_level).slice(0, 5).map(f => f.id), evidence: `${withGenLevel.length} of ${families.length} families specify a generation level`, status: withGenLevel.length / Math.max(families.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "FamilyOwnership records with lineage system specified", checked: families.length, passed: withLineage.length, failed: families.length - withLineage.length, sampleIds: families.filter(f => !f.family_lineage).slice(0, 5).map(f => f.id), evidence: `Lineage types present: ${[...new Set(families.map(f => f.family_lineage).filter(Boolean))].join(", ")}`, status: withLineage.length / Math.max(families.length, 1) >= 0.5 ? S.ok : S.warn },
    { label: "Beneficiaries with family_branch matching their ownership record", checked: beneficiaries.filter(b => b.family_branch).length, passed: beneficiaries.filter(b => b.family_branch).length, failed: 0, sampleIds: [], evidence: `${beneficiaries.filter(b => b.family_branch).length} beneficiaries carry a family_branch designation`, status: beneficiaries.filter(b => b.family_branch).length > 0 ? S.ok : S.warn },
  ];

  // ── Witness requirements ──
  const REQUIRED_TYPES = ["family_witness", "community_witness"];
  const caseWitnessMap = {};
  witnesses.forEach(w => { caseWitnessMap[w.inheritance_case_id] = (caseWitnessMap[w.inheritance_case_id] || []).concat(w); });
  const casesWithAllWitTypes = cases.filter(c => {
    const wits = caseWitnessMap[c.id] || [];
    return REQUIRED_TYPES.every(t => wits.some(w => w.witness_role === t));
  });
  const casesLackingWitTypes = cases.filter(c => {
    const wits = caseWitnessMap[c.id] || [];
    return !REQUIRED_TYPES.every(t => wits.some(w => w.witness_role === t));
  });
  const verifiedWitnesses = witnesses.filter(w => w.verification_status === "verified");

  const witnessRows = [
    { label: "Inheritance cases with family + community witness types", checked: cases.length, passed: casesWithAllWitTypes.length, failed: casesLackingWitTypes.length, sampleIds: casesLackingWitTypes.slice(0, 5).map(c => c.id), evidence: `${casesWithAllWitTypes.length} of ${cases.length} cases have both required witness types · ${casesLackingWitTypes.length} incomplete`, status: casesLackingWitTypes.length === 0 ? S.ok : casesLackingWitTypes.length < 3 ? S.warn : S.fail },
    { label: "Witnesses with verified status", checked: witnesses.length, passed: verifiedWitnesses.length, failed: witnesses.filter(w => w.verification_status === "rejected").length, sampleIds: witnesses.filter(w => w.verification_status === "rejected").slice(0, 5).map(w => w.id), evidence: `${verifiedWitnesses.length} verified · ${witnesses.filter(w => w.verification_status === "pending").length} pending · ${witnesses.filter(w => w.verification_status === "rejected").length} rejected`, status: verifiedWitnesses.length / Math.max(witnesses.length, 1) >= 0.7 ? S.ok : S.warn },
    { label: "Witnesses with identification document recorded", checked: witnesses.length, passed: witnesses.filter(w => w.identification).length, failed: witnesses.filter(w => !w.identification).length, sampleIds: witnesses.filter(w => !w.identification).slice(0, 5).map(w => w.id), evidence: `${witnesses.filter(w => w.identification).length} witnesses have NIN/Passport/Voter ID recorded`, status: witnesses.filter(w => !w.identification).length / Math.max(witnesses.length, 1) < 0.2 ? S.ok : S.warn },
  ];

  // ── Traditional ruler approvals ──
  const tradApproved = tradVal.filter(t => t.validation_status === "approved");
  const tradPending = tradVal.filter(t => t.validation_status === "pending");
  const tradWithRuler = tradVal.filter(t => t.traditional_ruler_name);
  const tradWithInstitution = tradVal.filter(t => t.traditional_institution);
  const tradConditional = tradVal.filter(t => t.validation_status === "conditionally_approved");

  const tradRows = [
    { label: "Traditional authority validations submitted", checked: tradVal.length, passed: tradVal.length, failed: 0, sampleIds: [], evidence: `${tradVal.length} submissions · ${tradApproved.length} approved · ${tradPending.length} pending · ${tradConditional.length} conditional`, status: tradVal.length > 0 ? S.ok : S.warn },
    { label: "Traditional ruler name recorded on all submissions", checked: tradVal.length, passed: tradWithRuler.length, failed: tradVal.length - tradWithRuler.length, sampleIds: tradVal.filter(t => !t.traditional_ruler_name).slice(0, 5).map(t => t.id), evidence: `${tradWithRuler.length} of ${tradVal.length} have traditional_ruler_name populated`, status: tradVal.length - tradWithRuler.length === 0 ? S.ok : S.warn },
    { label: "Traditional institution name recorded", checked: tradVal.length, passed: tradWithInstitution.length, failed: tradVal.length - tradWithInstitution.length, sampleIds: tradVal.filter(t => !t.traditional_institution).slice(0, 5).map(t => t.id), evidence: `Institutions: ${[...new Set(tradVal.map(t => t.traditional_institution).filter(Boolean))].slice(0, 3).join(", ")}`, status: tradVal.length - tradWithInstitution.length === 0 ? S.ok : S.warn },
    { label: "Conditionally approved — conditions documented", checked: tradConditional.length, passed: tradConditional.filter(t => t.conditions).length, failed: tradConditional.filter(t => !t.conditions).length, sampleIds: tradConditional.filter(t => !t.conditions).slice(0, 5).map(t => t.id), evidence: `${tradConditional.length} conditional approvals · ${tradConditional.filter(t => t.conditions).length} have conditions text`, status: tradConditional.filter(t => !t.conditions).length === 0 ? S.ok : S.warn },
  ];

  // ── Community consent records ──
  const commApproved = communityVal.filter(c => c.status === "approved");
  const commWithElders = communityVal.filter(c => c.community_elder || c.village_head);
  const commWithDate = communityVal.filter(c => c.validation_date);

  const communityRows = [
    { label: "Community validations with approved status", checked: communityVal.length, passed: commApproved.length, failed: communityVal.filter(c => c.status === "rejected").length, sampleIds: communityVal.filter(c => c.status === "rejected").slice(0, 5).map(c => c.id), evidence: `${commApproved.length} approved · ${communityVal.filter(c => c.status === "rejected").length} rejected · ${communityVal.filter(c => c.status === "submitted").length} pending`, status: commApproved.length > 0 ? S.ok : S.warn },
    { label: "Community validations with elder or village head named", checked: communityVal.length, passed: commWithElders.length, failed: communityVal.length - commWithElders.length, sampleIds: communityVal.filter(c => !(c.community_elder || c.village_head)).slice(0, 5).map(c => c.id), evidence: `${commWithElders.length} records identify a community elder or village head`, status: commWithElders.length / Math.max(communityVal.length, 1) >= 0.7 ? S.ok : S.warn },
    { label: "Community validations with validation_date recorded", checked: communityVal.length, passed: commWithDate.length, failed: communityVal.length - commWithDate.length, sampleIds: communityVal.filter(c => !c.validation_date).slice(0, 5).map(c => c.id), evidence: `${commWithDate.length} of ${communityVal.length} have a validation date`, status: commWithDate.length / Math.max(communityVal.length, 1) >= 0.8 ? S.ok : S.warn },
    { label: "Community validations linked to a parcel or family record", checked: communityVal.length, passed: communityVal.filter(c => c.parcel_id || c.family_ownership_id).length, failed: communityVal.filter(c => !c.parcel_id && !c.family_ownership_id).length, sampleIds: communityVal.filter(c => !c.parcel_id && !c.family_ownership_id).slice(0, 5).map(c => c.id), evidence: `${communityVal.filter(c => !c.parcel_id && !c.family_ownership_id).length} community validations have no parcel or family linkage`, status: communityVal.filter(c => !c.parcel_id && !c.family_ownership_id).length === 0 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Share Total Errors" value={shareOver100.length + shareUnder100.length} color={shareOver100.length + shareUnder100.length > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Broken Successor Chains" value={brokenSuccessors.length} color={brokenSuccessors.length > 0 ? "text-red-600" : "text-emerald-700"} />
        <StatBox label="Verified Witnesses" value={verifiedWitnesses.length} color="text-blue-700" />
        <StatBox label="Traditional Authority Approvals" value={tradApproved.length} color="text-purple-700" />
      </div>
      <SectionCard title="Beneficiary Share Totals" icon={Users} iconColor="text-blue-600" rows={shareRows} summary={`${familyShareEntries.length} family ownerships checked · shares must total 100%`} />
      <SectionCard title="Inheritance Ranking Sequence" icon={GitBranch} iconColor="text-emerald-600" rows={rankingRows} summary={`${beneficiaries.length} beneficiaries across ${Object.keys(benefByFamily).length} family groups`} />
      <SectionCard title="Successor Chains" icon={GitBranch} iconColor="text-purple-600" rows={successorRows} summary={`${beneficiaries.filter(b => b.status === "deceased").length} deceased beneficiaries checked for successors`} />
      <SectionCard title="Family Branch Structure" icon={Users} iconColor="text-teal-600" rows={branchRows} summary={`${families.length} family records checked for branch, generation and lineage data`} />
      <SectionCard title="Witness Requirements" icon={CheckCircle2} iconColor="text-amber-600" rows={witnessRows} summary={`${witnesses.length} witnesses across ${cases.length} inheritance cases`} />
      <SectionCard title="Traditional Ruler Approvals" icon={Shield} iconColor="text-indigo-600" rows={tradRows} summary={`${tradVal.length} traditional authority validation submissions`} />
      <SectionCard title="Community Consent Records" icon={FileText} iconColor="text-rose-600" rows={communityRows} summary={`${communityVal.length} community validation records`} />
    </div>
  );
}