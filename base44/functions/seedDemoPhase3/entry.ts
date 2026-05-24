// Phase 3: Seed Family Ownerships, Beneficiaries, Inheritance Cases, Witnesses, Ownership History
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_NAMES = [
  "Chukwuemeka","Ngozi","Emeka","Ifeoma","Adaeze","Obinna","Chioma","Kelechi","Uchenna","Amarachi",
  "Blessing","Chidi","Nkechi","Ifeanyi","Oluchi","Musa","Fatima","Usman","Aisha","Abdullahi",
  "Hafsa","Yusuf","Sule","Zainab","Halima","Mohammed","Amina","Danladi","Patience","Gideon",
  "Ruth","Daniel","Grace","Adebayo","Funmilayo","Taiwo","Kehinde","Tobi","Lara","Chinwe",
  "Nnamdi","Obiora","Chiamaka","Onyeka","Chinedu","Amaka","Eze","Ugochi","Nonso","Ebuka"
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
const VILLAGES = ["Umueze","Alaojie","Obodo Nnewi","Agulu","Nkwere","Achi","Ozubulu","Ihiala","Orlu","Orsu","Amesi","Umunze","Nnobi","Oba","Igbo-Ukwu","Oguta","Mgbidi","Nkpor","Akpo","Ukpor"];
const WARDS = ["Central Ward","South Ward","North Ward","East Ward","West Ward","Market Ward","Old Town Ward","New Layout Ward","Industrial Ward","Agricultural Ward","Riverside Ward","Hilltop Ward"];
const STREETS = ["Mango Street","Palm Avenue","Independence Road","Market Street","Church Lane","River Road","Unity Street","Progress Avenue","Community Road","School Lane","Farm Road","Bridge Street","New Layout Road","Old Town Street","Industrial Way","Estate Close"];

const FAMILY_SURNAMES = [
  "Okafor","Eze","Ibrahim","Bello","Danjuma","Nwosu","Adeyemi","Obiora","Aneke","Okorie",
  "Hassan","Aliyu","Garba","Adeleke","Bamidele","Ugwu","Nnaji","Ezeh","Okonkwo","Achebe",
  "Okpara","Onwudiwe","Ogbu","Nweze","Asogwa","Dim","Ojukwu","Okeke","Obasi","Mbah"
];

const CLAN_SUFFIXES = ["Clan","Royal Lineage","Settlement","Umunna","Lineage","Family Union","Kindred","Community"];
const WIFE_GROUPS = [
  "Wife Group A — Mama Chidi","Wife Group B — Mama Ngozi","Wife Group C — Mama Fatima",
  "Senior Wife — Mama Emeka","Junior Wife — Mama Adaeze","First Wife Lineage","Second Wife Lineage"
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
function randomDate(startAgo, endAgo=0) {
  const s = new Date(); s.setDate(s.getDate() - startAgo);
  const e = new Date(); e.setDate(e.getDate() - endAgo);
  return new Date(s.getTime() + Math.random()*(e.getTime()-s.getTime())).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'family_ownerships';

    const parcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 200);
    if (!parcels || parcels.length === 0) {
      return Response.json({ error: 'No parcels found.' }, { status: 400 });
    }

    let created = 0;

    if (mode === 'family_ownerships') {
      const count = body.count || 50;
      const ownerships = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const surname = pick(FAMILY_SURNAMES);
        const wivesCount = rndInt(1, 3);
        const genLevel = rndInt(1, 4);
        ownerships.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          family_name: `${surname} Family`,
          family_head: `${pick(["Elder","Chief","Alhaji","Late Chief","Mallam","Pastor","Prince"])} ${pick(FIRST_NAMES)} ${surname}`,
          parent_name: `Late ${pick(FIRST_NAMES)} ${surname} Snr.`,
          clan_name: `${surname} ${pick(CLAN_SUFFIXES)}`,
          family_branch: rndInt(0,1) ? `${surname} ${pick(["Senior","Junior","First","Second","Nnewi","Orlu"])} Branch` : null,
          generation_level: genLevel,
          wife_lineage_group: rndInt(0,1) ? pick(WIFE_GROUPS) : null,
          village: pick(VILLAGES),
          community: pick(COMMUNITIES),
          lga: "Greenfield Local Government",
          state: "Rivers State",
          family_lineage: pick(["patrilineal","patrilineal","patrilineal","matrilineal","bilateral"]),
          family_representative: `${pick(FIRST_NAMES)} ${surname}`,
          family_representative_role: pick(["eldest son","family secretary","court-appointed administrator","family head"]),
          status: pick(["active","active","active","in_transfer","disputed"]),
          fruit_trees: rndInt(0, 30),
          buildings: rndInt(1, 10),
          boreholes: rndInt(0, 3),
          economic_trees: rndInt(0, 60),
          other_improvements: pick([
            "Perimeter wall, main gate, security post",
            "Bore well, generator house, water tank",
            "Fish pond, poultry pen, goat shed",
            "Warehouse structure, loading bay",
            "Completed bungalow, uncompleted storey building",
            "Community hall, ceremonial meeting ground",
            null, null
          ]),
          family_notes: pick([
            `Family land held since ${rndInt(1920,1980)}. Registered following family meeting resolution.`,
            `Parcel inherited from Late ${pick(FIRST_NAMES)} ${surname}. Succession dispute resolved ${rndInt(2015,2022)}.`,
            `Multiple branches of family have agreed to joint registration. Future subdivision planned.`,
            null, null, null
          ]),
          registered_by: "surveyor.demo@landsecure.app",
        });
      }
      for (let i = 0; i < ownerships.length; i += 50) {
        await base44.asServiceRole.entities.FamilyOwnership.bulkCreate(ownerships.slice(i, i+50));
        created += Math.min(50, ownerships.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'beneficiaries') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 100);
      if (!familyOwnerships || familyOwnerships.length === 0) {
        return Response.json({ error: 'No family ownerships found.' }, { status: 400 });
      }
      const beneficiaries = [];
      for (const fo of familyOwnerships.slice(0, body.foCount || 30)) {
        const surname = fo.family_name.replace(" Family","");
        const memberCount = rndInt(3, 7);
        const relationships = ["son","son","daughter","grandson","granddaughter","nephew","niece","brother","sister"];
        let remaining = 100;
        for (let j = 0; j < memberCount; j++) {
          const isLast = j === memberCount - 1;
          let share = isLast ? remaining : Math.floor(remaining / (memberCount - j) * rnd(0.7, 1.3));
          share = Math.min(Math.max(share, 1), remaining);
          if (isLast) share = remaining;
          remaining -= share;
          const statuses = ["active","active","active","active","minor","deceased","under_verification"];
          const bStatus = j === 0 ? "active" : pick(statuses);
          beneficiaries.push({
            family_ownership_id: fo.id,
            parcel_id: fo.parcel_id,
            parcel_number: fo.parcel_number,
            full_name: `${pick(FIRST_NAMES)} ${surname}`,
            relationship: pick(relationships),
            percentage_share: share,
            inheritance_rank: j + 1,
            generation_level: j < 2 ? 1 : j < 4 ? 2 : 3,
            family_branch: pick([`${surname} Senior Branch`,`${surname} Junior Branch`,`${surname} Orlu Branch`,`${surname} Nnewi Branch`]),
            allocated_plot: j < 3 ? `Plot ${String.fromCharCode(65+j)}` : null,
            status: bStatus,
            verification_status: pick(["verified","verified","pending","unverified"]),
            date_added: dateOnly(300),
            date_of_death: bStatus === "deceased" ? dateOnly(600) : null,
            phone: `080${rndInt(10000000, 99999999)}`,
            address: addr(),
            notes: j === 0 ? "Principal heir as per family meeting resolution." : null,
            is_deleted: false,
          });
        }
      }
      for (let i = 0; i < beneficiaries.length; i += 50) {
        await base44.asServiceRole.entities.FamilyBeneficiary.bulkCreate(beneficiaries.slice(i, i+50));
        created += Math.min(50, beneficiaries.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'inheritance_cases') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 50);
      if (!familyOwnerships || familyOwnerships.length === 0) {
        return Response.json({ error: 'No family ownerships found.' }, { status: 400 });
      }
      const caseTypes = ["succession","partition","allocation","transfer","dispute_resolution","subdivision"];
      const statuses = ["draft","submitted","surveyor_review","compliance_review","approved","approved","approved","rejected"];
      const cases = [];
      const targetCount = Math.min(body.count || 20, familyOwnerships.length);
      for (let i = 0; i < targetCount; i++) {
        const fo = familyOwnerships[i];
        const status = pick(statuses);
        const caseType = pick(caseTypes);
        const yr = rndInt(2023, 2025);
        cases.push({
          family_ownership_id: fo.id,
          parcel_id: fo.parcel_id,
          parcel_number: fo.parcel_number,
          family_name: fo.family_name,
          case_reference: `IC/${yr}/${String(i+10).padStart(3,"0")}`,
          case_title: `${fo.family_name} — ${caseType.replace("_"," ")} case`,
          case_type: caseType,
          status,
          initiated_by: "citizen.demo@landsecure.app",
          initiated_by_name: fo.family_representative || fullName(),
          description: pick([
            "Following the death of the family patriarch, this case initiates the formal succession of land ownership to registered beneficiaries per customary law.",
            "Family members have unanimously agreed to partition the parcel into individual sub-plots for independent title registration.",
            "Formal allocation of defined plot areas to named beneficiaries per the family meeting resolution adopted on 15 January 2025.",
            "Transfer of inherited share from deceased elder to surviving son as per customary law and witnessed family agreement.",
            "Dispute between senior and junior branches of the family regarding proportional allocation. Mediation requested.",
            "Subdivision of agricultural parcel into four equal plots for distribution among four children of the deceased.",
            "Application to convert customary occupancy to certificate of occupancy following resolution of succession dispute.",
          ]),
          surveyor_reviewer: status !== "draft" ? "surveyor.demo@landsecure.app" : null,
          surveyor_review_date: ["compliance_review","approved","rejected"].includes(status) ? randomDate(90, 20) : null,
          surveyor_notes: !["draft","submitted"].includes(status) ? "Survey documents verified. Boundary measurements consistent with original survey plan. All beacons intact." : null,
          compliance_reviewer: ["compliance_review","approved"].includes(status) ? "compliance.demo@landsecure.app" : null,
          compliance_notes: status === "approved" ? "All regulatory requirements met. Family agreement properly witnessed and notarised. Community validation complete." : null,
          final_approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          final_approved_date: status === "approved" ? randomDate(30, 2) : null,
          certificate_generated: status === "approved" && Math.random() > 0.3,
          rejection_reason: status === "rejected" ? "Beneficiary verification incomplete. Two claimants did not submit valid national identification." : null,
          rejection_stage: status === "rejected" ? pick(["surveyor_review","compliance_review"]) : null,
          validation_warnings: Math.random() > 0.7 ? JSON.stringify(["One beneficiary could not be reached for verification","Survey plan older than 5 years — may require re-survey"]) : "[]",
          is_deleted: false,
        });
      }
      for (let i = 0; i < cases.length; i += 50) {
        await base44.asServiceRole.entities.InheritanceCase.bulkCreate(cases.slice(i, i+50));
        created += Math.min(50, cases.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'witnesses') {
      const inhCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 30);
      if (!inhCases || inhCases.length === 0) {
        return Response.json({ error: 'No inheritance cases found.' }, { status: 400 });
      }
      const witnesses = [];
      const roles = ["family_witness","community_witness","traditional_ruler","religious_witness","government_witness"];
      for (const ic of inhCases.slice(0, 20)) {
        const wCount = rndInt(2, 4);
        for (let j = 0; j < wCount; j++) {
          const vStatus = pick(["verified","verified","pending","rejected"]);
          witnesses.push({
            inheritance_case_id: ic.id,
            parcel_id: ic.parcel_id,
            full_name: j === 0 ? `Chief ${fullName()}` : j === 1 ? `Mallam ${fullName()}` : fullName(),
            witness_role: j === 0 ? "family_witness" : j === 1 ? "community_witness" : pick(roles),
            phone: `080${rndInt(10000000, 99999999)}`,
            address: addr(),
            identification: `NIN-${rndInt(10000000000, 99999999999)}`,
            witness_statement: pick([
              "I confirm that the deceased was the sole owner of this parcel and that the listed beneficiaries are the legitimate heirs.",
              "As community elder, I confirm this family has held this land since the founding of the settlement. No competing claims are known.",
              "I witnessed the original allocation of this land by the village head in 1998. The current family are the rightful successors.",
              "I am the religious leader of this community and I witnessed the family agreement meeting on the stated date.",
              "As ward development chairman, I confirm the boundary description matches the physical location I have personally inspected.",
            ]),
            verification_status: vStatus,
            verified_by: vStatus === "verified" ? "sg.demo@landsecure.app" : null,
            verified_date: vStatus === "verified" ? randomDate(30, 1) : null,
            is_deleted: false,
          });
        }
      }
      for (let i = 0; i < witnesses.length; i += 50) {
        await base44.asServiceRole.entities.InheritanceWitness.bulkCreate(witnesses.slice(i, i+50));
        created += Math.min(50, witnesses.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'ownership_history') {
      const count = body.count || 50;
      const history = [];
      const transferTypes = ["purchase","inheritance","government_allocation","reallocation","gift","court_order","family_inheritance","customary_allocation","family_partition"];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const status = pick(["approved","approved","pending","rejected"]);
        history.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          from_owner: fullName(),
          to_owner: parcel.owner_name || fullName(),
          transfer_type: pick(transferTypes),
          transfer_date: dateOnly(500),
          status,
          approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          notes: pick([
            "Transfer completed following probate of the deceased estate.",
            "Voluntary sale — purchase price agreed between parties. Consent obtained.",
            "Government reallocation following review of original allocation records.",
            "Court-ordered transfer per judgment of Greenfield LGA Magistrate Court.",
            "Gift deed executed by donor. Witnessed by two parties.",
            null, null
          ]),
        });
      }
      for (let i = 0; i < history.length; i += 50) {
        await base44.asServiceRole.entities.OwnershipHistory.bulkCreate(history.slice(i, i+50));
        created += Math.min(50, history.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'family_meeting_resolutions') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 30);
      if (!familyOwnerships || familyOwnerships.length === 0) {
        return Response.json({ error: 'No family ownerships found.' }, { status: 400 });
      }
      const resolutions = [];
      const statusList = ["draft","adopted","adopted","adopted","amended","withdrawn"];
      for (let i = 0; i < Math.min(15, familyOwnerships.length); i++) {
        const fo = familyOwnerships[i];
        const status = pick(statusList);
        resolutions.push({
          resolution_reference: `FMR/${rndInt(2023,2025)}/${String(i+1).padStart(3,"0")}`,
          family_name: fo.family_name,
          family_ownership_id: fo.id,
          parcel_id: fo.parcel_id,
          parcel_number: fo.parcel_number,
          meeting_date: dateOnly(200),
          meeting_location: `${fo.family_name} Compound, ${pick(COMMUNITIES)}`,
          meeting_purpose: pick([
            "Distribution of inherited land to registered beneficiaries",
            "Formal resolution of boundary dispute with neighbouring family",
            "Appointment of new family representative for land administration matters",
            "Ratification of subdivision plan approved by Surveyor General",
            "Election of new family head following death of Elder",
            "Discussion of multiple beneficiary claims from second wife lineage",
          ]),
          resolution_summary: pick([
            "Meeting resolved unanimously to proceed with equal distribution of parcel among all registered beneficiaries. All parties signed.",
            "Family agreed to engage a licensed surveyor for formal boundary demarcation before subdivision is registered.",
            "New family head appointed by consensus. Land records to be updated to reflect change in family representative.",
            "Sub-division plan ratified. Three plots allocated — Plot A, Plot B, Plot C. Survey to follow.",
            "Second wife lineage acknowledged. Additional beneficiaries to be registered before distribution proceeds.",
            "Family agreed to delay subdivision pending resolution of outstanding debt on parcel.",
          ]),
          chairperson: fo.family_head || `Chief ${fullName()}`,
          secretary: fullName(),
          number_of_attendees: rndInt(8, 42),
          status,
          version_number: 1,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fo.family_representative || fullName(),
          is_deleted: false,
        });
      }
      for (let i = 0; i < resolutions.length; i += 50) {
        await base44.asServiceRole.entities.FamilyMeetingResolution.bulkCreate(resolutions.slice(i, i+50));
        created += Math.min(50, resolutions.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'death_verifications') {
      const inhCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 20);
      if (!inhCases || inhCases.length === 0) {
        return Response.json({ error: 'No inheritance cases found.' }, { status: 400 });
      }
      const deaths = [];
      for (const ic of inhCases.slice(0, 10)) {
        const vStatus = pick(["pending","verified","verified","verified","escalated"]);
        deaths.push({
          inheritance_case_id: ic.id,
          family_ownership_id: ic.family_ownership_id,
          parcel_id: ic.parcel_id,
          deceased_name: `Late ${fullName()}`,
          date_of_death: dateOnly(600),
          place_of_death: pick([
            "Greenfield General Hospital, Rivers State",
            "Lagos University Teaching Hospital",
            `Home — ${rndInt(1,100)} ${pick(STREETS)}, Greenfield LGA`,
            "Federal Medical Centre, Port Harcourt",
            "Nnamdi Azikiwe University Teaching Hospital, Awka",
          ]),
          family_confirmation: true,
          family_confirmed_by: fullName(),
          family_confirmation_date: dateOnly(500),
          community_confirmation: Math.random() > 0.2,
          community_confirmed_by: `Chief ${fullName()}`,
          community_confirmation_date: dateOnly(480),
          lg_confirmation: Math.random() > 0.3,
          lg_confirmed_by: "LGA Registrar, Greenfield Local Government",
          lg_confirmation_date: dateOnly(450),
          court_confirmation: Math.random() > 0.6,
          court_confirmed_by: "Resident Magistrate, Greenfield LGA Magistrate Court",
          court_confirmation_date: dateOnly(400),
          verification_status: vStatus,
          verified_by: vStatus === "verified" ? "compliance.demo@landsecure.app" : null,
          verified_date: vStatus === "verified" ? randomDate(60, 5) : null,
          notes: "Death verified through multiple channels per LandSecure verification protocol.",
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fullName(),
          is_deleted: false,
        });
      }
      await base44.asServiceRole.entities.DeathVerification.bulkCreate(deaths);
      created = deaths.length;
      return Response.json({ mode, created });
    }

    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});