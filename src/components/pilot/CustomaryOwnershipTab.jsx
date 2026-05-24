import { Card, CardContent } from "@/components/ui/card";
import { Users, GitMerge, Shield, CheckCircle2 } from "lucide-react";
import { SectionCard, S } from "./PilotShared";

export default function CustomaryOwnershipTab({ data }) {
  const { families, beneficiaries, cases, witnesses, tradVal, communityVal } = data;
  const familyIds = new Set(families.map(f => f.id));
  const caseIds = new Set(cases.map(c => c.id));

  // ── Beneficiary share totals ────────────────────────────────────────────
  const sharesByFamily = {};
  beneficiaries.filter(b => !b.is_deleted).forEach(b => {
    if (!sharesByFamily[b.family_ownership_id]) sharesByFamily[b.family_ownership_id] = [];
    sharesByFamily[b.family_ownership_id].push(b);
  });

  const familiesWithBenef = Object.entries(sharesByFamily);
  const shareNot100 = familiesWithBenef.filter(([, bs]) => {
    const total = bs.reduce((a, b) => a + (Number(b.percentage_share) || 0), 0);
    return Math.abs(total - 100) > 1; // allow 1% rounding tolerance
  });
  const shareOver100 = familiesWithBenef.filter(([, bs]) => {
    const total = bs.reduce((a, b) => a + (Number(b.percentage_share) || 0), 0);
    return total > 101;
  });
  const shareUnder100 = familiesWithBenef.filter(([, bs]) => {
    const total = bs.reduce((a, b) => a + (Number(b.percentage_share) || 0), 0);
    return total < 99 && total > 0;
  });
  const zeroShareBenef = beneficiaries.filter(b => !b.is_deleted && (b.percentage_share === 0 || b.percentage_share === null || b.percentage_share === undefined));

  // ── Inheritance ranking ─────────────────────────────────────────────────
  const ranksByFamily = {};
  beneficiaries.filter(b => !b.is_deleted && b.inheritance_rank).forEach(b => {
    if (!ranksByFamily[b.family_ownership_id]) ranksByFamily[b.family_ownership_id] = [];
    ranksByFamily[b.family_ownership_id].push(Number(b.inheritance_rank));
  });
  const duplicateRanks = Object.entries(ranksByFamily).filter(([, ranks]) => new Set(ranks).size < ranks.length);
  const benefNoRank = beneficiaries.filter(b => !b.is_deleted && !b.inheritance_rank);

  // ── Successor chains ────────────────────────────────────────────────────
  const benefIds = new Set(beneficiaries.map(b => b.id));
  const brokenSuccessorLinks = beneficiaries.filter(b => b.parent_beneficiary_id && !benefIds.has(b.parent_beneficiary_id));
  const generationLevelMissing = beneficiaries.filter(b => !b.is_deleted && !b.generation_level);

  // ── Family branch structure ─────────────────────────────────────────────
  const branchMissing = beneficiaries.filter(b => !b.is_deleted && !b.family_branch);
  const familiesNoBranch = families.filter(f => !f.family_branch);
  const familiesNoHead = families.filter(f => !f.family_head);
  const familiesNoLineage = families.filter(f => !f.family_lineage);

  // ── Witness requirements ────────────────────────────────────────────────
  const witnessByCase = {};
  witnesses.forEach(w => {
    if (!witnessByCase[w.inheritance_case_id]) witnessByCase[w.inheritance_case_id] = [];
    witnessByCase[w.inheritance_case_id].push(w);
  });

  const casesNoWitness = cases.filter(c => c.status !== "draft" && !witnessByCase[c.id]?.length);
  const casesLessThan2Witnesses = cases.filter(c => c.status !== "draft" && (witnessByCase[c.id]?.length || 0) < 2);
  const unverifiedWitnesses = witnesses.filter(w => w.verification_status === "pending");
  const rejectedWitnesses = witnesses.filter(w => w.verification_status === "rejected");
  const witnessNoId = witnesses.filter(w => !w.identification);
  const witnessRolesMissingFamily = cases.filter(c => {
    const cw = witnessByCase[c.id] || [];
    return c.status !== "draft" && !cw.some(w => w.witness_role === "family_witness");
  });
  const witnessRolesMissingCommunity = cases.filter(c => {
    const cw = witnessByCase[c.id] || [];
    return c.status !== "draft" && !cw.some(w => w.witness_role === "community_witness");
  });

  // ── Traditional ruler approvals ─────────────────────────────────────────
  const tradValNoInstitution = tradVal.filter(t => !t.traditional_institution);
  const tradValNoRulerName = tradVal.filter(t => !t.traditional_ruler_name);
  const tradValRejected = tradVal.filter(t => t.validation_status === "rejected");
  const tradValPending = tradVal.filter(t => t.validation_status === "pending");

  // ── Community consent records ───────────────────────────────────────────
  const communityValNoElder = communityVal.filter(c => !c.community_elder && !c.village_head && !c.ward_head);
  const communityValNoDate = communityVal.filter(c => !c.validation_date);
  const communityValApproved = communityVal.filter(c => c.status === "approved");

  const shareRows = [
    { label: "Families checked for share totals", checked: familiesWithBenef.length, passed: familiesWithBenef.length - shareNot100.length, failed: shareNot100.length, sampleIds: shareNot100.slice(0, 5).map(([id]) => id), evidence: `${shareNot100.length} families where beneficiary shares do not sum to 100%`, status: shareNot100.length === 0 ? S.ok : shareNot100.length < 3 ? S.warn : S.fail },
    { label: "Families with total shares > 100%", checked: familiesWithBenef.length, passed: familiesWithBenef.length - shareOver100.length, failed: shareOver100.length, sampleIds: shareOver100.slice(0, 5).map(([id]) => id), evidence: `${shareOver100.length} families with over-allocation — potential fraudulent claims`, status: shareOver100.length === 0 ? S.ok : S.fail },
    { label: "Families with total shares < 100%", checked: familiesWithBenef.length, passed: familiesWithBenef.length - shareUnder100.length, failed: shareUnder100.length, sampleIds: shareUnder100.slice(0, 5).map(([id]) => id), evidence: `${shareUnder100.length} families with under-allocated shares — missing beneficiaries?`, status: shareUnder100.length === 0 ? S.ok : S.warn },
    { label: "Beneficiaries with 0% or null share", checked: beneficiaries.length, passed: beneficiaries.length - zeroShareBenef.length, failed: zeroShareBenef.length, sampleIds: zeroShareBenef.slice(0, 5).map(b => b.id), evidence: `${zeroShareBenef.length} active beneficiaries have no share percentage assigned`, status: zeroShareBenef.length === 0 ? S.ok : S.warn },
  ];

  const rankRows = [
    { label: "Families with duplicate inheritance ranks", checked: Object.keys(ranksByFamily).length, passed: Object.keys(ranksByFamily).length - duplicateRanks.length, failed: duplicateRanks.length, sampleIds: duplicateRanks.slice(0, 5).map(([id]) => id), evidence: `${duplicateRanks.length} families have beneficiaries sharing the same rank number`, status: duplicateRanks.length === 0 ? S.ok : S.fail },
    { label: "Beneficiaries without inheritance rank", checked: beneficiaries.filter(b => !b.is_deleted).length, passed: beneficiaries.filter(b => !b.is_deleted && b.inheritance_rank).length, failed: benefNoRank.length, sampleIds: benefNoRank.slice(0, 5).map(b => b.id), evidence: `${benefNoRank.length} beneficiaries have no inheritance rank assigned`, status: benefNoRank.length === 0 ? S.ok : S.warn },
    { label: "Broken successor chain links", checked: beneficiaries.length, passed: beneficiaries.length - brokenSuccessorLinks.length, failed: brokenSuccessorLinks.length, sampleIds: brokenSuccessorLinks.slice(0, 5).map(b => b.id), evidence: `${brokenSuccessorLinks.length} beneficiaries reference a non-existent parent_beneficiary_id`, status: brokenSuccessorLinks.length === 0 ? S.ok : S.fail },
    { label: "Beneficiaries without generation level", checked: beneficiaries.filter(b => !b.is_deleted).length, passed: beneficiaries.filter(b => !b.is_deleted && b.generation_level).length, failed: generationLevelMissing.length, sampleIds: generationLevelMissing.slice(0, 5).map(b => b.id), evidence: `${generationLevelMissing.length} beneficiaries missing generation_level — lineage tree incomplete`, status: generationLevelMissing.length / Math.max(beneficiaries.length, 1) < 0.2 ? S.ok : S.warn },
  ];

  const branchRows = [
    { label: "Families with family branch recorded", checked: families.length, passed: families.length - familiesNoBranch.length, failed: familiesNoBranch.length, sampleIds: familiesNoBranch.slice(0, 5).map(f => f.id), evidence: `${familiesNoBranch.length} families have no family_branch set`, status: familiesNoBranch.length / Math.max(families.length, 1) < 0.3 ? S.ok : S.warn },
    { label: "Families with family head recorded", checked: families.length, passed: families.length - familiesNoHead.length, failed: familiesNoHead.length, sampleIds: familiesNoHead.slice(0, 5).map(f => f.id), evidence: `${familiesNoHead.length} families missing family_head`, status: familiesNoHead.length === 0 ? S.ok : S.fail },
    { label: "Families with lineage type declared", checked: families.length, passed: families.length - familiesNoLineage.length, failed: familiesNoLineage.length, sampleIds: familiesNoLineage.slice(0, 5).map(f => f.id), evidence: `${familiesNoLineage.length} families missing customary lineage type (patrilineal/matrilineal/etc.)`, status: familiesNoLineage.length / Math.max(families.length, 1) < 0.3 ? S.ok : S.warn },
    { label: "Beneficiaries with family branch tagged", checked: beneficiaries.filter(b => !b.is_deleted).length, passed: beneficiaries.filter(b => !b.is_deleted && b.family_branch).length, failed: branchMissing.length, sampleIds: branchMissing.slice(0, 5).map(b => b.id), evidence: `${branchMissing.length} beneficiaries not assigned to a family branch`, status: branchMissing.length / Math.max(beneficiaries.length, 1) < 0.4 ? S.ok : S.warn },
  ];

  const witnessRows = [
    { label: "Active cases with at least one witness", checked: cases.filter(c => c.status !== "draft").length, passed: cases.filter(c => c.status !== "draft").length - casesNoWitness.length, failed: casesNoWitness.length, sampleIds: casesNoWitness.slice(0, 5).map(c => c.id), evidence: `${casesNoWitness.length} non-draft cases have zero witnesses registered`, status: casesNoWitness.length === 0 ? S.ok : S.fail },
    { label: "Cases with ≥ 2 witnesses (minimum)", checked: cases.filter(c => c.status !== "draft").length, passed: cases.filter(c => c.status !== "draft").length - casesLessThan2Witnesses.length, failed: casesLessThan2Witnesses.length, sampleIds: casesLessThan2Witnesses.slice(0, 5).map(c => c.id), evidence: `${casesLessThan2Witnesses.length} cases have fewer than 2 witnesses`, status: casesLessThan2Witnesses.length === 0 ? S.ok : S.warn },
    { label: "Cases with family witness role covered", checked: cases.filter(c => c.status !== "draft").length, passed: cases.filter(c => c.status !== "draft").length - witnessRolesMissingFamily.length, failed: witnessRolesMissingFamily.length, sampleIds: witnessRolesMissingFamily.slice(0, 5).map(c => c.id), evidence: `${witnessRolesMissingFamily.length} cases missing a family_witness`, status: witnessRolesMissingFamily.length === 0 ? S.ok : S.warn },
    { label: "Cases with community witness role covered", checked: cases.filter(c => c.status !== "draft").length, passed: cases.filter(c => c.status !== "draft").length - witnessRolesMissingCommunity.length, failed: witnessRolesMissingCommunity.length, sampleIds: witnessRolesMissingCommunity.slice(0, 5).map(c => c.id), evidence: `${witnessRolesMissingCommunity.length} cases missing a community_witness`, status: witnessRolesMissingCommunity.length === 0 ? S.ok : S.warn },
    { label: "Witnesses with identification number", checked: witnesses.length, passed: witnesses.length - witnessNoId.length, failed: witnessNoId.length, sampleIds: witnessNoId.slice(0, 5).map(w => w.id), evidence: `${witnessNoId.length} witnesses have no NIN/passport/voter card on record`, status: witnessNoId.length === 0 ? S.ok : S.warn },
    { label: "Witnesses with pending verification", checked: witnesses.length, passed: witnesses.filter(w => w.verification_status !== "pending").length, failed: unverifiedWitnesses.length, sampleIds: unverifiedWitnesses.slice(0, 5).map(w => w.id), evidence: `${unverifiedWitnesses.length} witnesses still pending identity verification`, status: unverifiedWitnesses.length === 0 ? S.ok : unverifiedWitnesses.length < 10 ? S.warn : S.fail },
    { label: "Witnesses with rejected verification", checked: witnesses.length, passed: witnesses.length - rejectedWitnesses.length, failed: rejectedWitnesses.length, sampleIds: rejectedWitnesses.slice(0, 5).map(w => w.id), evidence: `${rejectedWitnesses.length} witnesses failed identity verification`, status: rejectedWitnesses.length === 0 ? S.ok : S.fail },
  ];

  const tradRows = [
    { label: "Traditional authority validations present", checked: tradVal.length, passed: tradVal.filter(t => t.validation_status === "approved").length, failed: tradValPending.length, sampleIds: tradValPending.slice(0, 5).map(t => t.id), evidence: `${tradVal.filter(t => t.validation_status === "approved").length} approved · ${tradValPending.length} pending · ${tradValRejected.length} rejected`, status: tradVal.filter(t => t.validation_status === "approved").length > 0 ? S.ok : S.warn },
    { label: "Traditional institution name recorded", checked: tradVal.length, passed: tradVal.length - tradValNoInstitution.length, failed: tradValNoInstitution.length, sampleIds: tradValNoInstitution.slice(0, 5).map(t => t.id), evidence: `${tradValNoInstitution.length} approvals missing traditional_institution name`, status: tradValNoInstitution.length === 0 ? S.ok : S.warn },
    { label: "Traditional ruler name recorded", checked: tradVal.length, passed: tradVal.length - tradValNoRulerName.length, failed: tradValNoRulerName.length, sampleIds: tradValNoRulerName.slice(0, 5).map(t => t.id), evidence: `${tradValNoRulerName.length} approvals missing traditional_ruler_name`, status: tradValNoRulerName.length === 0 ? S.ok : S.warn },
    { label: "Traditional authority rejections", checked: tradVal.length, passed: tradVal.length - tradValRejected.length, failed: tradValRejected.length, sampleIds: tradValRejected.slice(0, 5).map(t => t.id), evidence: `${tradValRejected.length} cases rejected by traditional authority — requires resolution`, status: tradValRejected.length === 0 ? S.ok : S.fail },
  ];

  const consentRows = [
    { label: "Community validation submissions present", checked: communityVal.length, passed: communityValApproved.length, failed: communityVal.filter(c => c.status === "rejected").length, sampleIds: communityVal.filter(c => c.status === "rejected").slice(0, 5).map(c => c.id), evidence: `${communityValApproved.length} approved · ${communityVal.filter(c => c.status === "rejected").length} rejected`, status: communityValApproved.length > 0 ? S.ok : S.warn },
    { label: "Community validations with elder/village head named", checked: communityVal.length, passed: communityVal.length - communityValNoElder.length, failed: communityValNoElder.length, sampleIds: communityValNoElder.slice(0, 5).map(c => c.id), evidence: `${communityValNoElder.length} records have no community_elder, village_head, or ward_head named`, status: communityValNoElder.length === 0 ? S.ok : S.warn },
    { label: "Community validations with validation date", checked: communityVal.length, passed: communityVal.length - communityValNoDate.length, failed: communityValNoDate.length, sampleIds: communityValNoDate.slice(0, 5).map(c => c.id), evidence: `${communityValNoDate.length} community validations have no validation_date recorded`, status: communityValNoDate.length === 0 ? S.ok : S.warn },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3 mb-2">
        {[
          { label: "Families Checked", value: familiesWithBenef.length, color: "text-blue-700" },
          { label: "Share Violations", value: shareNot100.length, color: shareNot100.length === 0 ? "text-emerald-700" : "text-red-600" },
          { label: "Witness Issues", value: casesNoWitness.length + unverifiedWitnesses.length, color: "text-amber-700" },
          { label: "Trad Auth Pending", value: tradValPending.length, color: "text-purple-700" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center"><p className={`text-2xl font-black ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <SectionCard title="Beneficiary Share Totals (must = 100%)" icon={Users} iconColor="text-blue-600" rows={shareRows} summary={`${familiesWithBenef.length} families with beneficiaries checked`} />
      <SectionCard title="Inheritance Ranking & Successor Chains" icon={GitMerge} iconColor="text-emerald-600" rows={rankRows} summary={`${beneficiaries.length} beneficiaries checked for rank and successor chain integrity`} />
      <SectionCard title="Family Branch Structure" icon={GitMerge} iconColor="text-purple-600" rows={branchRows} summary={`${families.length} families checked for branch completeness`} />
      <SectionCard title="Witness Requirements" icon={CheckCircle2} iconColor="text-amber-600" rows={witnessRows} summary={`${witnesses.length} witnesses across ${cases.filter(c => c.status !== "draft").length} active cases`} />
      <SectionCard title="Traditional Ruler Approvals" icon={Shield} iconColor="text-indigo-600" rows={tradRows} summary={`${tradVal.length} traditional authority validation records`} />
      <SectionCard title="Community Consent Records" icon={Users} iconColor="text-teal-600" rows={consentRows} summary={`${communityVal.length} community validation records checked`} />
    </div>
  );
}