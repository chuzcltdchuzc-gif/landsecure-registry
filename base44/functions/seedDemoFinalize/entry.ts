// Final Demo Finalization: Plot Allocations, Traditional Authority Validations,
// Individual/Community/Traditional Institution Ownership Records, Community Consent
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_NAMES = [
  "Chukwuemeka","Ngozi","Emeka","Ifeoma","Adaeze","Obinna","Chioma","Kelechi","Uchenna","Amarachi",
  "Blessing","Chidi","Nkechi","Ifeanyi","Oluchi","Musa","Fatima","Usman","Aisha","Abdullahi",
  "Hafsa","Yusuf","Sule","Zainab","Halima","Mohammed","Amina","Danladi","Patience","Gideon",
  "Ruth","Daniel","Grace","Adebayo","Funmilayo","Taiwo","Kehinde","Yewande","Chinwe","Nnamdi",
  "Obiora","Chiamaka","Onyeka","Chinedu","Amaka","Eze","Ugochi","Nonso","Ebuka","Tochukwu"
];
const LAST_NAMES = [
  "Okafor","Eze","Ibrahim","Bello","Danjuma","Nwosu","Adeyemi","Fashola","Obi","Nwachukwu",
  "Uzoma","Chukwu","Obiora","Aneke","Okorie","Hassan","Aliyu","Garba","Lawan","Bukar",
  "Adeleke","Bamidele","Afolabi","Adesanya","Okpara","Ugwu","Nnaji","Ezeh","Okonkwo","Achebe",
  "Onwudiwe","Ogbu","Ani","Nwofor","Nweze","Asogwa","Dim","Ojukwu","Okeke","Obasi"
];
const COMMUNITIES = [
  "Greenfield Central","Emeka Town","Okafor Hills","Ibrahim Quarters","Bello Estate",
  "New Danjuma","Eze Valley","Adeyemi Grove","Nwosu Settlement","Greenfield South"
];
const VILLAGES = [
  "Umueze","Alaojie","Obodo Nnewi","Agulu","Nkwere","Achi","Ozubulu","Ihiala","Orlu","Orsu",
  "Amesi","Umunze","Nnobi","Oba","Igbo-Ukwu","Oguta","Mgbidi","Nkpor","Akpo","Ukpor"
];
const WARDS = [
  "Central Ward","South Ward","North Ward","East Ward","West Ward","Market Ward",
  "Old Town Ward","New Layout Ward","Industrial Ward","Agricultural Ward","Riverside Ward","Hilltop Ward"
];
const STREETS = [
  "Mango Street","Palm Avenue","Independence Road","Market Street","Church Lane","River Road",
  "Unity Street","Progress Avenue","Community Road","School Lane","Farm Road","Bridge Street",
  "New Layout Road","Old Town Street","Industrial Way","Estate Close"
];

const TRADITIONAL_INSTITUTIONS = [
  "Obi of Greenfield Kingdom","Igwe's Council of Eze Valley","Eze Nri Traditional Council",
  "Obi of Onitsha Royal Palace","Alaigbo Development Foundation","Nze na Ozo Council of Greenfield",
  "Obiaruku Kingdom Traditional Council","Igwe in Council — Orlu Division",
  "Royal Stool of New Danjuma","Obi Eze Nri — Greenfield District"
];

const TRADITIONAL_TITLES = [
  "His Royal Highness","His Excellency","Igwe","Obi","Eze","Chief","Ezeji","Onowu","Ozo","Lolo"
];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function addr() { return `${rndInt(1,120)} ${pick(STREETS)}, ${pick(WARDS)}`; }
function dateOnly(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - rndInt(0, daysAgo));
  return d.toISOString().split("T")[0];
}
function randomDate(startAgo, endAgo = 0) {
  const s = new Date(); s.setDate(s.getDate() - startAgo);
  const e = new Date(); e.setDate(e.getDate() - endAgo);
  return new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime())).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'plot_allocations';
    let created = 0;

    // ── PLOT ALLOCATIONS ──────────────────────────────────────────────────────
    if (mode === 'plot_allocations') {
      const inhCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 30);
      if (!inhCases || inhCases.length === 0) {
        return Response.json({ error: 'No inheritance cases found.' }, { status: 400 });
      }

      const allocs = [];
      for (const ic of inhCases.slice(0, 20)) {
        const beneficiaries = await base44.asServiceRole.entities.FamilyBeneficiary.filter(
          { family_ownership_id: ic.family_ownership_id }, '-created_date', 8
        );
        const useBenefs = (beneficiaries || []).slice(0, rndInt(2, 4));
        const totalPct = 100;
        const perSlice = Math.floor(totalPct / Math.max(useBenefs.length, 1));
        let remaining = 100;

        useBenefs.forEach((b, j) => {
          const isLast = j === useBenefs.length - 1;
          const pct = isLast ? remaining : perSlice + rndInt(-5, 5);
          const safePct = Math.max(Math.min(pct, remaining - (useBenefs.length - 1 - j)), 1);
          remaining -= safePct;
          allocs.push({
            inheritance_case_id: ic.id,
            family_ownership_id: ic.family_ownership_id,
            parcel_id: ic.parcel_id,
            parcel_number: ic.parcel_number,
            beneficiary_id: b.id,
            beneficiary_name: b.full_name,
            planned_plot_number: `Plot ${String.fromCharCode(65 + j)}`,
            area_sqm: parseFloat((safePct * rnd(80, 150)).toFixed(1)),
            allocation_percentage: safePct,
            allocation_status: pick(["draft","confirmed","confirmed","confirmed","disputed"]),
            notes: j === 0 ? "Principal heir — first allocation priority per family resolution." : null,
            allocated_by: "sg.demo@landsecure.app",
            is_deleted: false,
          });
        });
      }

      for (let i = 0; i < allocs.length; i += 50) {
        await base44.asServiceRole.entities.PlotAllocation.bulkCreate(allocs.slice(i, i + 50));
        created += Math.min(50, allocs.length - i);
      }
      return Response.json({ mode, created });
    }

    // ── TRADITIONAL AUTHORITY VALIDATIONS ────────────────────────────────────
    if (mode === 'traditional_authority_validations') {
      const communityVals = await base44.asServiceRole.entities.CommunityValidation.list('-created_date', 30);
      if (!communityVals || communityVals.length === 0) {
        return Response.json({ error: 'No community validations found.' }, { status: 400 });
      }
      const tavs = [];
      for (const cv of communityVals.slice(0, 20)) {
        const vStatus = pick(["pending","pending","approved","approved","approved","conditionally_approved","rejected"]);
        const institution = pick(TRADITIONAL_INSTITUTIONS);
        const rulerName = `${pick(TRADITIONAL_TITLES)} ${fullName()}`;
        tavs.push({
          parcel_id: cv.parcel_id,
          parcel_number: cv.parcel_number,
          family_ownership_id: cv.family_ownership_id || null,
          community_validation_id: cv.id,
          traditional_institution: institution,
          traditional_ruler_name: rulerName,
          title: pick(TRADITIONAL_TITLES),
          validation_status: vStatus,
          validation_date: vStatus !== "pending" ? randomDate(60, 5) : null,
          comments: vStatus === "approved" ? pick([
            "This land has been occupied by this family for generations. The traditional council confirms the rightful ownership.",
            "Council has verified community records dating back to 1952. Family claim is authentic and undisputed.",
            "After consultation with village elders, the traditional authority confirms no competing customary claims exist.",
            "The family representative appeared before the council and all documentation was reviewed. Approved.",
          ]) : vStatus === "conditionally_approved" ? pick([
            "Approval conditional upon demarcation of communal footpath through northern boundary.",
            "Council approves subject to payment of customary dues to community development fund.",
            "Conditionally approved — second wife lineage must be formally acknowledged within 30 days.",
          ]) : vStatus === "rejected" ? "Traditional authority records indicate this land is communal farmland. Individual claim rejected." : null,
          conditions: vStatus === "conditionally_approved" ? "Comply with stated conditions within 60 days or approval lapses." : null,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: cv.submitted_by_name || fullName(),
          is_deleted: false,
        });
      }
      for (let i = 0; i < tavs.length; i += 50) {
        await base44.asServiceRole.entities.TraditionalAuthorityValidation.bulkCreate(tavs.slice(i, i + 50));
        created += Math.min(50, tavs.length - i);
      }
      return Response.json({ mode, created });
    }

    // ── INDIVIDUAL OWNERSHIP RECORDS (OwnershipHistory, individual type) ────
    if (mode === 'individual_ownership') {
      const count = body.count || 200;
      const parcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 300);
      if (!parcels || parcels.length === 0) {
        return Response.json({ error: 'No parcels found.' }, { status: 400 });
      }

      const transferTypes = ["purchase","inheritance","government_allocation","gift","court_order","customary_allocation"];
      const history = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const tType = pick(transferTypes);
        const status = pick(["approved","approved","approved","pending","pending","rejected"]);
        const yr = rndInt(2015, 2024);
        const month = String(rndInt(1,12)).padStart(2,"0");
        const day = String(rndInt(1,28)).padStart(2,"0");
        history.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          from_owner: tType === "government_allocation"
            ? "Greenfield Local Government / State Ministry of Lands"
            : tType === "inheritance" ? `Late ${fullName()}` : fullName(),
          to_owner: parcel.owner_name || fullName(),
          transfer_type: tType,
          transfer_date: `${yr}-${month}-${day}`,
          status,
          approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          notes: pick([
            "Transfer completed following probate of the deceased estate.",
            "Voluntary sale — purchase price agreed between parties. Consent of occupier obtained.",
            "Government reallocation following review of original 1999 allocation records.",
            "Court-ordered transfer per judgment of Greenfield LGA Magistrate Court Ref: MAG/CV/2024/112.",
            "Gift deed executed by donor in favour of donee. Witnessed by two parties at Federal Notary.",
            "Customary allocation confirmed by village head and two community elders.",
            "Inheritance per last will and testament deposited at Federal High Court, Port Harcourt.",
            null, null
          ]),
        });
      }
      for (let i = 0; i < history.length; i += 50) {
        await base44.asServiceRole.entities.OwnershipHistory.bulkCreate(history.slice(i, i + 50));
        created += Math.min(50, history.length - i);
      }
      return Response.json({ mode, created });
    }

    // ── COMMUNITY OWNERSHIP RECORDS ────────────────────────────────────────
    if (mode === 'community_ownership') {
      const parcels = await base44.asServiceRole.entities.LandParcel.filter(
        { land_use: "government" }, '-created_date', 20
      );
      if (!parcels || parcels.length === 0) {
        return Response.json({ error: 'No government parcels found.' }, { status: 400 });
      }
      const records = [];
      for (let i = 0; i < 10; i++) {
        const parcel = parcels[i % parcels.length];
        const community = pick(COMMUNITIES);
        records.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          family_name: `${community} Community`,
          family_head: `CDC Chairman, ${community}`,
          parent_name: `Community of ${community}`,
          clan_name: `${community} Community Union`,
          generation_level: 1,
          village: pick(VILLAGES),
          community,
          lga: "Greenfield Local Government",
          state: "Rivers State",
          family_lineage: "bilateral",
          family_representative: `Sec. ${fullName()}`,
          status: pick(["active","active","in_transfer"]),
          fruit_trees: 0,
          buildings: rndInt(1, 5),
          boreholes: rndInt(1, 3),
          economic_trees: 0,
          other_improvements: pick([
            "Community hall, bore well, solar-powered street lighting",
            "Market stalls, public toilets, drainage channel",
            "Primary school building, community health centre",
            "Town hall, car park, community radio station",
          ]),
          family_notes: `Communal land owned by all registered residents of ${community}. Administered by CDC.`,
          registered_by: "admin.demo@landsecure.app",
        });
      }
      await base44.asServiceRole.entities.FamilyOwnership.bulkCreate(records);
      created = records.length;
      return Response.json({ mode, created });
    }

    // ── TRADITIONAL INSTITUTION OWNERSHIP RECORDS ──────────────────────────
    if (mode === 'traditional_institution_ownership') {
      const parcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 50);
      if (!parcels || parcels.length === 0) {
        return Response.json({ error: 'No parcels found.' }, { status: 400 });
      }
      const records = [];
      for (let i = 0; i < 10; i++) {
        const parcel = parcels[i % parcels.length];
        const institution = TRADITIONAL_INSTITUTIONS[i % TRADITIONAL_INSTITUTIONS.length];
        const rulerName = `${pick(TRADITIONAL_TITLES)} ${fullName()}`;
        records.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          family_name: institution,
          family_head: rulerName,
          parent_name: `${institution} — Founding Charter`,
          clan_name: institution,
          generation_level: 1,
          village: pick(VILLAGES),
          community: pick(COMMUNITIES),
          lga: "Greenfield Local Government",
          state: "Rivers State",
          family_lineage: "patrilineal",
          family_representative: `Registrar, ${institution}`,
          status: "active",
          fruit_trees: 0,
          buildings: rndInt(2, 8),
          boreholes: rndInt(0, 2),
          economic_trees: rndInt(0, 20),
          other_improvements: pick([
            "Royal palace complex, ceremonial grounds, ancestral shrine",
            "Chief's court, guest house, administrative block",
            "Traditional council chambers, palace gate house, cultural museum",
            "Palace complex with staff quarters and protocol wing",
          ]),
          family_notes: `Land vested in ${institution} under customary law. Not subject to individual transfer without full council resolution.`,
          registered_by: "admin.demo@landsecure.app",
        });
      }
      await base44.asServiceRole.entities.FamilyOwnership.bulkCreate(records);
      created = records.length;
      return Response.json({ mode, created });
    }

    // ── COMMUNITY CONSENT RECORDS ──────────────────────────────────────────
    if (mode === 'community_consent') {
      const inhCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 25);
      if (!inhCases || inhCases.length === 0) {
        return Response.json({ error: 'No inheritance cases found.' }, { status: 400 });
      }
      const consents = [];
      for (const ic of inhCases.slice(0, 15)) {
        const status = pick(["pending","granted","granted","granted","revoked","expired"]);
        consents.push({
          parcel_id: ic.parcel_id,
          parcel_number: ic.parcel_number,
          family_ownership_id: ic.family_ownership_id,
          inheritance_case_id: ic.id,
          community_name: pick(COMMUNITIES),
          consent_type: pick(["family","community","traditional_authority"]),
          representatives: JSON.stringify([
            { name: `Chief ${fullName()}`, role: "Community Elder" },
            { name: fullName(), role: "Ward Development Chairman" },
            { name: `Pastor ${fullName()}`, role: "Religious Leader" },
          ]),
          date_granted: status === "granted" ? dateOnly(90) : null,
          expiry_date: status === "granted" ? dateOnly(-365) : null,
          consent_notes: status === "granted" ? pick([
            "Community has no objection to the registered inheritance transfer. All elders concur.",
            "Consent granted following community meeting. Minutes attached.",
            "No competing claims from community. Family's customary right confirmed.",
          ]) : null,
          status,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: ic.initiated_by_name || fullName(),
          is_deleted: false,
        });
      }
      for (let i = 0; i < consents.length; i += 50) {
        await base44.asServiceRole.entities.CommunityConsent.bulkCreate(consents.slice(i, i + 50));
        created += Math.min(50, consents.length - i);
      }
      return Response.json({ mode, created });
    }

    // ── INHERITANCE DISPUTES ───────────────────────────────────────────────
    if (mode === 'inheritance_disputes') {
      const inhCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 25);
      if (!inhCases || inhCases.length === 0) {
        return Response.json({ error: 'No inheritance cases found.' }, { status: 400 });
      }
      const disputes = [];
      const disputeTypes = [
        "beneficiary_allocation","share_percentage","lineage","successor",
        "witness_objection","community_objection","traditional_authority_objection"
      ];
      const disputeDescriptions = [
        "Senior branch objects to equal-share allocation. Customary law precedence claimed for first-born son.",
        "Second wife lineage disputes exclusion from beneficiary list. Claims 30% share per oral agreement.",
        "Community elder witnesses dispute claim that the deceased explicitly disinherited the listed beneficiaries.",
        "Neighbouring family claims part of the parcel under a 1987 boundary agreement not reflected in current survey.",
        "Traditional authority objects to subdivision — cites risk of creating plots below the minimum 500sqm threshold.",
        "Nephew disputes nephew's exclusion from the inheritance case. Claims adoption by the deceased patriarch.",
        "Two brothers both claim to be the rightful family representative after the death of the family head.",
      ];

      for (const ic of inhCases.slice(0, 8)) {
        const status = pick(["open","under_investigation","mediation","hearing","resolved","appealed"]);
        disputes.push({
          case_number: `ID/${rndInt(2023,2025)}/${String(rndInt(100,999))}`,
          parcel_id: ic.parcel_id,
          parcel_number: ic.parcel_number,
          family_ownership_id: ic.family_ownership_id,
          inheritance_case_id: ic.id,
          dispute_type: pick(disputeTypes),
          complainant_name: fullName(),
          complainant_email: "citizen.demo@landsecure.app",
          complainant_relationship: pick(["son","daughter","nephew","sister","cousin"]),
          respondent_name: ic.initiated_by_name || fullName(),
          description: pick(disputeDescriptions),
          status,
          priority: pick(["medium","medium","high","critical","low"]),
          assigned_to: "compliance.demo@landsecure.app",
          assigned_to_name: "Ngozi Adeyemi",
          resolution_notes: status === "resolved" ? "Mediation successful. All parties agreed to revised allocation plan. Case closed." : null,
          resolved_date: status === "resolved" ? dateOnly(30) : null,
          timeline: JSON.stringify([
            { date: randomDate(180, 120), event: "Dispute filed by complainant" },
            { date: randomDate(120, 60), event: "Case assigned to compliance officer" },
            { date: randomDate(60, 20), event: "Mediation session scheduled" },
          ]),
          filed_by: "citizen.demo@landsecure.app",
          filed_by_name: fullName(),
          is_deleted: false,
        });
      }
      for (let i = 0; i < disputes.length; i += 50) {
        await base44.asServiceRole.entities.InheritanceDispute.bulkCreate(disputes.slice(i, i + 50));
        created += Math.min(50, disputes.length - i);
      }
      return Response.json({ mode, created });
    }

    // ── AUDIT LOG TOP-UP ───────────────────────────────────────────────────
    if (mode === 'audit_logs_topup') {
      const count = body.count || 200;
      const parcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 200);
      const USERS = [
        { email: "sg.demo@landsecure.app", name: "Dr. Amara Okafor" },
        { email: "surveyor.demo@landsecure.app", name: "Tobi Fashola" },
        { email: "agent.demo@landsecure.app", name: "Emeka Obi" },
        { email: "citizen.demo@landsecure.app", name: "Blessing Eze" },
        { email: "compliance.demo@landsecure.app", name: "Ngozi Adeyemi" },
        { email: "admin.demo@landsecure.app", name: "Super Admin" },
      ];
      const ACTIONS = [
        { action: "PLOT_ALLOCATED", entity: "PlotAllocation", tmpl: "Plot A allocated for parcel {parcel} to registered beneficiary." },
        { action: "TRADITIONAL_AUTH_VALIDATED", entity: "TraditionalAuthorityValidation", tmpl: "Traditional authority validation approved for parcel {parcel}." },
        { action: "COMMUNITY_CONSENT_GRANTED", entity: "CommunityConsent", tmpl: "Community consent granted for inheritance transfer on parcel {parcel}." },
        { action: "INHERITANCE_DISPUTE_FILED", entity: "InheritanceDispute", tmpl: "Inheritance dispute filed for parcel {parcel} by family member." },
        { action: "INHERITANCE_DISPUTE_RESOLVED", entity: "InheritanceDispute", tmpl: "Inheritance dispute for parcel {parcel} resolved via mediation." },
        { action: "OWNERSHIP_RECORD_CREATED", entity: "OwnershipHistory", tmpl: "Individual ownership record created for parcel {parcel}." },
        { action: "DEATH_VERIFIED", entity: "DeathVerification", tmpl: "Death of land owner verified for inheritance case on parcel {parcel}." },
        { action: "FAMILY_MEETING_ADOPTED", entity: "FamilyMeetingResolution", tmpl: "Family meeting resolution adopted for parcel {parcel}. {num} members attended." },
        { action: "WITNESS_VERIFIED", entity: "InheritanceWitness", tmpl: "Inheritance witness verified for case on parcel {parcel}." },
        { action: "CERTIFICATE_ISSUED", entity: "InheritanceCase", tmpl: "Certificate of occupancy issued for parcel {parcel} following SG approval." },
        { action: "PARCEL_BOUNDARY_VALIDATED", entity: "LandParcel", tmpl: "Spatial validation completed for parcel {parcel}. Status: valid." },
        { action: "FRAUD_INVESTIGATION_CLOSED", entity: "FraudAlert", tmpl: "Fraud investigation closed for parcel {parcel}. No fraud confirmed." },
        { action: "SURVEY_RE_SUBMITTED", entity: "SurveyDocument", tmpl: "Re-survey submitted for parcel {parcel} following boundary dispute." },
        { action: "USER_ROLE_ASSIGNED", entity: "User", tmpl: "User {user} assigned role in LandSecure Registry system." },
        { action: "BULK_EXPORT", entity: "LandParcel", tmpl: "Bulk data export of parcel records performed by {user}." },
      ];
      const logs = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const u = pick(USERS);
        const action = pick(ACTIONS);
        logs.push({
          user_email: u.email,
          user_name: u.name,
          action: action.action,
          entity_type: action.entity,
          entity_id: parcel.id,
          details: action.tmpl
            .replace("{parcel}", parcel.parcel_number)
            .replace("{user}", u.name)
            .replace("{num}", String(rndInt(12, 45))),
        });
      }
      for (let i = 0; i < logs.length; i += 50) {
        await base44.asServiceRole.entities.AuditLog.bulkCreate(logs.slice(i, i + 50));
        created += Math.min(50, logs.length - i);
      }
      return Response.json({ mode, created });
    }

    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});