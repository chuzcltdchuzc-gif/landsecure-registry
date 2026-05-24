import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Configuration ────────────────────────────────────────────────────────────
const GFL = { lga: "Greenfield Local Government", state: "Rivers State" };

const COMMUNITIES = [
  { name: "Greenfield Central", lat: 6.455, lng: 3.384 },
  { name: "Emeka Town", lat: 6.472, lng: 3.401 },
  { name: "Okafor Hills", lat: 6.438, lng: 3.366 },
  { name: "Ibrahim Quarters", lat: 6.491, lng: 3.419 },
  { name: "Bello Estate", lat: 6.421, lng: 3.352 },
  { name: "New Danjuma", lat: 6.507, lng: 3.438 },
  { name: "Eze Valley", lat: 6.412, lng: 3.371 },
  { name: "Adeyemi Grove", lat: 6.465, lng: 3.427 },
  { name: "Nwosu Settlement", lat: 6.448, lng: 3.356 },
  { name: "Greenfield South", lat: 6.431, lng: 3.397 },
];

const VILLAGES = [
  "Umueze","Alaojie","Obodo Nnewi","Agulu","Nkwere",
  "Achi","Ozubulu","Ihiala","Orlu","Orsu",
  "Amesi","Umunze","Nnobi","Oba","Igbo-Ukwu",
  "Awka-Etiti","Uli","Osumenyi","Oguta","Mgbidi",
  "Nkpor","Nnewi North","Oraukwu","Akpo","Ukpor",
];

const WARDS = [
  "Central Ward","South Ward","North Ward","East Ward","West Ward",
  "Market Ward","Old Town Ward","New Layout Ward","Industrial Ward",
  "Agricultural Ward","Riverside Ward","Hilltop Ward",
];

const FIRST_NAMES = [
  "Chukwuemeka","Ngozi","Emeka","Ifeoma","Adaeze","Obinna","Chioma","Kelechi",
  "Uchenna","Amarachi","Blessing","Chidi","Nkechi","Ifeanyi","Oluchi",
  "Musa","Fatima","Usman","Aisha","Abdullahi","Hafsa","Yusuf",
  "Sule","Zainab","Halima","Mohammed","Amina","Danladi","Patience",
  "Gideon","Ruth","Daniel","Grace","Adebayo","Funmilayo","Taiwo",
  "Kehinde","Yewande","Olumide","Tunde","Shade","Bola","Femi","Tobi","Lara",
  "Obiora","Amara","Chinyere","Ejike","Ogechukwu","Ikenna","Nnamdi",
];

const LAST_NAMES = [
  "Okafor","Eze","Ibrahim","Bello","Danjuma","Nwosu","Adeyemi","Fashola",
  "Obi","Nwachukwu","Uzoma","Chukwu","Obiora","Aneke","Okorie",
  "Hassan","Aliyu","Garba","Lawan","Bukar","Adamu","Abubakar","Shehu",
  "Adeleke","Bamidele","Afolabi","Adesanya","Odunbaku","Maikano","Ango",
  "Nzeogwu","Onwudiwe","Agwu","Akpan","Umoh","Bassey","Okon",
];

const STREETS = [
  "Mango Street","Palm Avenue","Independence Road","Market Street",
  "Church Lane","River Road","Unity Street","Progress Avenue",
  "Community Road","School Lane","Farm Road","Bridge Street",
  "New Layout Road","Old Town Street","Industrial Way","Estate Close",
  "Nwachukwu Close","Eze Road","Bello Avenue","Ibrahim Lane",
];

const LAND_USES = ["residential","commercial","agricultural","industrial","mixed_use","government"];
const STATUSES = ["pending","approved","approved","approved","approved","disputed","frozen","rejected"];
const DEVICES = ["Samsung Galaxy A53","Tecno Camon 20","Infinix Note 30","iPhone 13","Itel A70"];
const REPORT_TYPES = ["boundary_check","photo_capture","gps_survey","site_inspection","verification"];
const AGENTS = [
  {email:"agent.demo@landsecure.app", name:"Emeka Obi"},
  {email:"agent.demo@landsecure.app", name:"Chioma Nwosu"},
  {email:"agent.demo@landsecure.app", name:"Taiwo Adeleke"},
];

const FAMILIES = [
  { name:"Okafor", head:"Elder Chukwuemeka Okafor", clan:"Umudike Clan", village:"Umueze", lineage:"patrilineal",
    wives:["Mama Ngozi","Mama Adaeze"], members:["Ngozi Okafor","Ifeanyi Okafor","Adaeze Okafor","Chidi Okafor","Obioma Okafor-Nwosu","Uchenna Okafor"] },
  { name:"Eze", head:"Chief Boniface Eze", clan:"Eze Royal Lineage", village:"Agulu", lineage:"patrilineal",
    wives:["Lolo Ifeoma","Lolo Chisom"], members:["Ifeoma Eze","Emeka Eze","Chioma Eze-Obi","Kelechi Eze","Uzochukwu Eze"] },
  { name:"Ibrahim", head:"Alhaji Musa Ibrahim", clan:"Ibrahim Fulani Line", village:"Orlu", lineage:"patrilineal",
    wives:["Mama Fatima","Mama Aisha","Mama Hafsa"], members:["Fatima Ibrahim","Usman Ibrahim","Aisha Ibrahim-Bello","Abdullahi Ibrahim","Hafsa Ibrahim"] },
  { name:"Bello", head:"Alhaji Sule Bello", clan:"Bello Hausa Clan", village:"Oguta", lineage:"patrilineal",
    wives:["Mama Zainab","Mama Halima"], members:["Zainab Bello","Yusuf Bello","Halima Bello-Danjuma","Mohammed Bello","Amina Bello"] },
  { name:"Danjuma", head:"Gen. (Rtd) Danladi Danjuma", clan:"Danjuma Military Lineage", village:"Achi", lineage:"bilateral",
    wives:["Mama Patience","Mama Ruth"], members:["Patience Danjuma","Gideon Danjuma","Ruth Danjuma-Ibrahim","Daniel Danjuma","Grace Danjuma"] },
  { name:"Nwosu", head:"Chief Emeka Nwosu", clan:"Nwosu Igbo Clan", village:"Nkwere", lineage:"patrilineal",
    wives:["Mama Blessing"], members:["Blessing Nwosu","Chukwuemeka Nwosu","Adaeze Nwosu-Eze","Obiora Nwosu"] },
  { name:"Adeyemi", head:"Pa Adebayo Adeyemi", clan:"Adeyemi Yoruba Line", village:"Amesi", lineage:"bilateral",
    wives:["Mama Funmilayo","Mama Yewande"], members:["Funmilayo Adeyemi","Taiwo Adeyemi","Kehinde Adeyemi","Yewande Adeyemi-Bello"] },
  { name:"Hassan", head:"Mallam Garba Hassan", clan:"Hassan Kanuri Line", village:"Mgbidi", lineage:"patrilineal",
    wives:["Mama Amina"], members:["Amina Hassan","Bukar Hassan","Shehu Hassan","Aliyu Hassan"] },
  { name:"Obi", head:"Mazi Obiora Obi", clan:"Obi Anambra Clan", village:"Nnobi", lineage:"patrilineal",
    wives:["Mama Chioma"], members:["Chioma Obi","Ikenna Obi","Nnamdi Obi","Chinyere Obi-Eze"] },
  { name:"Uzoma", head:"Elder Ejike Uzoma", clan:"Uzoma Delta Clan", village:"Oba", lineage:"bilateral",
    wives:["Mama Ogechukwu","Mama Amara"], members:["Ogechukwu Uzoma","Amara Uzoma","Ejike Uzoma Jr.","Kelechi Uzoma"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function addr(ward) { return `${rndInt(1, 120)} ${pick(STREETS)}, ${ward || pick(WARDS)}`; }

function makePolygon(lat, lng, sizeFactor = 1) {
  const d = 0.001 * sizeFactor;
  const ring = [
    [lng - d, lat - d],
    [lng + d, lat - d],
    [lng + d + rnd(-0.0003, 0.0003), lat + d + rnd(-0.0002, 0.0002)],
    [lng - d + rnd(-0.0002, 0.0002), lat + d],
    [lng - d, lat - d],
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function dateRange(startDaysAgo, endDaysAgo = 0) {
  const start = new Date(); start.setDate(start.getDate() - startDaysAgo);
  const end = new Date(); end.setDate(end.getDate() - endDaysAgo);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split("T")[0];
}

function fraudReasons(score) {
  const r = [];
  if (score > 70) r.push("Duplicate GPS coordinates detected");
  if (score > 60) r.push("Survey plan number matches another parcel");
  if (score > 50) r.push("Ownership registered within 30 days of purchase");
  if (score > 40) r.push("Boundary overlaps adjacent parcel by >5%");
  if (score > 30) r.push("Multiple claims from same owner email");
  return JSON.stringify(r.slice(0, rndInt(1, 3)));
}

function batchInsert(items, batchSize = 50) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// ─── Main Seeder ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const phase = body.phase || 'parcels';
    const offset = body.offset || 0;
    const batchSize = body.batchSize || 100;

    // ── PHASE: parcels ────────────────────────────────────────────────────────
    if (phase === 'parcels') {
      const parcels = [];
      for (let i = offset; i < offset + batchSize; i++) {
        const community = pick(COMMUNITIES);
        const lat = community.lat + rnd(-0.025, 0.025);
        const lng = community.lng + rnd(-0.025, 0.025);
        const landUse = pick(LAND_USES);
        const status = pick(STATUSES);
        const size = landUse === "agricultural" ? rnd(0.5, 15) : landUse === "industrial" ? rnd(0.3, 5) : rnd(0.05, 1.5);
        const fraudScore = status === "disputed" || status === "frozen" ? rndInt(45, 92) : rndInt(0, 38);
        const fraudLevel = fraudScore > 70 ? "high" : fraudScore > 40 ? "medium" : fraudScore > 20 ? "low" : "none";
        const ward = pick(WARDS);
        const village = pick(VILLAGES);
        const yr = rndInt(2022, 2025);
        const seq = String(i + 20).padStart(4, "0"); // offset to avoid duplicates with existing
        const approvalDate = (status === "approved") ? dateRange(540, 10) : null;

        parcels.push({
          parcel_number: `GFL/${yr}/${seq}`,
          title: `${landUse.charAt(0).toUpperCase() + landUse.slice(1).replace("_"," ")} Parcel — ${community.name}`,
          owner_name: fullName(),
          address: addr(ward),
          state: GFL.state,
          lga: GFL.lga,
          land_use: landUse,
          status,
          latitude: lat,
          longitude: lng,
          size_hectares: parseFloat(size.toFixed(4)),
          parcel_boundary: makePolygon(lat, lng, size * 2),
          boundary_area: parseFloat((size * 10000).toFixed(1)),
          boundary_source: pick(["gps_capture","survey_plan","manual_entry","cad_import","legacy_import"]),
          boundary_capture_date: dateRange(400, 5),
          spatial_validation_status: status === "disputed" ? pick(["overlap_warning","duplicate_warning","conflict_blocked"]) : pick(["valid","valid","valid","not_validated"]),
          verification_status: status === "approved" ? pick(["field_verified","survey_verified","fully_verified"]) : pick(["unverified","field_verified","unverified"]),
          fraud_risk_score: fraudScore,
          fraud_risk_level: fraudLevel,
          fraud_risk_reasons: fraudScore > 20 ? fraudReasons(fraudScore) : "[]",
          registered_by: pick(["surveyor.demo@landsecure.app","citizen.demo@landsecure.app","agent.demo@landsecure.app"]),
          approved_by: approvalDate ? "sg.demo@landsecure.app" : null,
          approval_date: approvalDate,
          notes: `${community.name}, ${village}, ${ward}. Registered under Greenfield LGA pilot programme. Land use: ${landUse}.`,
        });
      }

      // Insert in sub-batches of 50
      let inserted = 0;
      for (const batch of batchInsert(parcels, 50)) {
        await base44.asServiceRole.entities.LandParcel.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted, offset, next_offset: offset + batchSize });
    }

    // ── PHASE: fieldReports ───────────────────────────────────────────────────
    if (phase === 'fieldReports') {
      // Get parcels to attach reports to
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 500);
      const reports = [];
      const count = body.count || 150;
      const agentNames = ["Emeka Obi","Chioma Nwosu","Taiwo Adeleke","Adebayo Fashola","Ikenna Uzoma"];
      const descOptions = [
        "Boundary markers found intact. No encroachment detected. Owner present and cooperative.",
        "Site cleared. Building foundations visible. Dimensions match survey plan.",
        "Agricultural plot — crops growing on northern half. Healthy cassava and yam.",
        "Commercial plot — existing structure matches CAD drawings.",
        "GPS coordinates verified. Minor discrepancy of 0.3m — within acceptable tolerance.",
        "Neighbouring landowner confirmed boundary agreement. No dispute.",
        "Boundary markers partially removed on eastern edge. Re-staking required.",
        "Flood risk visible in south-east corner. Noted for compliance review.",
        "Community borehole visible on parcel boundary. Ownership clarification needed.",
        "Perimeter fence extends into public road easement by approx 1.2m.",
        "Large mango tree on boundary — potential point of dispute with neighbour.",
        "Physical inspection confirms land use matches registration. Crops growing.",
        "Survey beacons confirmed at all four corners. GPS reading: excellent accuracy.",
        "Owner presented title documents on site. Cross-checked with registry records.",
        "Drone flyover conducted. Boundary polygon matches satellite imagery.",
        "Occupied structure found on parcel not listed in registration documents.",
        "Parcel marker matches registered GPS coordinates. No anomalies.",
        "Site inspection: parcel vacant and well-maintained. No encroachment visible.",
      ];

      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const gpsAcc = rnd(1.2, 18);
        const status = pick(["submitted","submitted","reviewed","reviewed","draft","flagged","reviewed"]);
        const agentName = pick(agentNames);
        reports.push({
          parcel_id: parcel.id,
          parcel_number: parcel.data?.parcel_number || parcel.parcel_number,
          agent_email: "agent.demo@landsecure.app",
          agent_name: agentName,
          report_type: pick(REPORT_TYPES),
          latitude: (parcel.data?.latitude || 6.455) + rnd(-0.001, 0.001),
          longitude: (parcel.data?.longitude || 3.384) + rnd(-0.001, 0.001),
          gps_accuracy: parseFloat(gpsAcc.toFixed(1)),
          capture_timestamp: `${dateRange(180, 1)}T${String(rndInt(6,18)).padStart(2,'0')}:${String(rndInt(0,59)).padStart(2,'0')}:00Z`,
          device_identifier: pick(DEVICES),
          network_status: pick(["online","online","online","offline","synced_offline"]),
          capture_method: gpsAcc < 5 ? "gps_auto" : "manual_entry",
          description: pick(descOptions),
          boundary_valid: gpsAcc < 12,
          status,
          quality_flag: gpsAcc <= 5 ? "pass" : gpsAcc <= 10 ? "pass" : gpsAcc <= 14 ? "warn" : "fail",
          quality_notes: gpsAcc > 14 ? "GPS accuracy below threshold — recommend resurvey" : null,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(reports, 50)) {
        await base44.asServiceRole.entities.FieldReport.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: disputes ───────────────────────────────────────────────────────
    if (phase === 'disputes') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 300);
      const count = body.count || 30;
      const types = ["boundary","ownership","fraud","encroachment","documentation","other"];
      const statuses = ["open","under_review","under_review","resolved","escalated","closed"];
      const complainants = [
        "Chief Emmanuel Nwosu","Obioma Okafor","Adaeze Chukwu","Taiwo Adeleke","Ifeoma Eze",
        "Mallam Garba Hassan","Pastor Gideon Danjuma","Mrs. Patience Nwachukwu","Elder Ejike Uzoma",
        "Alhaji Bukar Adamu","Chief Amara Okafor","Ngozi Fashola","Mazi Ikenna Obi",
      ];
      const descOptions = [
        "Complainant asserts the boundary markers were moved 3.2m into his land during recent construction. Physical inspection required.",
        "Two parties claiming ownership of same plot with different documentation. Older deed of conveyance presented.",
        "Encroachment by neighbouring property — fence extended by approximately 2 metres without permission.",
        "Survey plan submitted appears to duplicate an existing approved plan. Suspected fraudulent re-use.",
        "Family dispute: two siblings claim right to inherit from deceased father. Both have supporting letters.",
        "Community leader objects to reclassification from agricultural to commercial use.",
        "Double allocation detected — same parcel number assigned to two different applicants.",
        "GPS coordinates submitted do not match physical location. Suspected fraudulent relocation of marker.",
        "Boundary overlap confirmed by field survey. Adjoining owner disputes 8% overlap area.",
        "Parcel registration based on outdated 2008 survey plan that has since been superseded.",
        "Corporate entity claiming plot allocated to community in 1995 government gazette.",
        "Inheritance dispute: family member excluded from beneficiary list despite valid claim.",
      ];

      const disputes = [];
      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const status = pick(statuses);
        disputes.push({
          parcel_id: parcel.id,
          parcel_number: parcel.data?.parcel_number || parcel.parcel_number,
          complainant_email: "citizen.demo@landsecure.app",
          complainant_name: pick(complainants),
          dispute_type: pick(types),
          description: pick(descOptions),
          status,
          priority: pick(["low","medium","medium","high","critical"]),
          assigned_to: "sg.demo@landsecure.app",
          resolution_notes: status === "resolved" ? "After field investigation and re-survey, the boundary was demarcated and all parties agreed to the revised markers. Case closed." : null,
          resolved_date: status === "resolved" ? dateRange(90, 5) : null,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(disputes, 50)) {
        await base44.asServiceRole.entities.Dispute.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: familyOwnerships ───────────────────────────────────────────────
    if (phase === 'familyOwnerships') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 500);
      const count = body.count || 50;
      const branchNames = ["Senior Branch","Junior Branch","Maternal Line","Paternal Line","First Wife's Line","Second Wife's Line"];
      const ownerships = [];

      for (let i = 0; i < count; i++) {
        const fam = FAMILIES[i % FAMILIES.length];
        const parcel = pick(allParcels);
        const numWives = fam.wives.length;
        const wifeLine = numWives > 1 ? pick(fam.wives) : null;

        ownerships.push({
          parcel_id: parcel.id,
          parcel_number: parcel.data?.parcel_number || parcel.parcel_number,
          family_name: `${fam.name} Family`,
          family_head: fam.head,
          parent_name: `Late ${pick(FIRST_NAMES)} ${fam.name}`,
          family_branch: pick(branchNames),
          generation_level: rndInt(1, 3),
          clan_name: fam.clan,
          village: fam.village,
          community: pick(COMMUNITIES).name,
          lga: GFL.lga,
          state: GFL.state,
          wife_lineage_group: wifeLine ? `Wife Group ${wifeLine.split(" ")[1] || "A"} — ${wifeLine}` : null,
          family_lineage: fam.lineage,
          family_representative: fam.members[0],
          family_notes: `Multi-generational ownership. ${fam.name} family has held this land since ${rndInt(1960, 1995)}.`,
          status: pick(["active","active","active","in_transfer","disputed"]),
          fruit_trees: rndInt(0, 30),
          buildings: rndInt(1, 8),
          boreholes: rndInt(0, 3),
          economic_trees: rndInt(0, 50),
          other_improvements: pick([
            "Perimeter wall, gate, security post",
            "Bore well, generator house, water tank",
            "Fish pond, poultry house, store room",
            "Warehouse structure, loading bay",
            "Mango grove, cashew farm",
            null, null,
          ]),
          registered_by: "surveyor.demo@landsecure.app",
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(ownerships, 50)) {
        await base44.asServiceRole.entities.FamilyOwnership.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: beneficiaries ──────────────────────────────────────────────────
    if (phase === 'beneficiaries') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 60);
      const beneficiaries = [];

      for (const fo of familyOwnerships) {
        const foData = fo.data || fo;
        const familyName = foData.family_name || '';
        const famKey = FAMILIES.find(f => familyName.includes(f.name)) || FAMILIES[0];
        const members = famKey.members;
        const numMembers = rndInt(3, Math.min(6, members.length + 1));
        let remaining = 100;

        for (let idx = 0; idx < numMembers; idx++) {
          const isLast = idx === numMembers - 1;
          const share = isLast ? remaining : Math.min(remaining - (numMembers - idx - 1), Math.floor(100 / numMembers + rndInt(-5, 10)));
          const actualShare = Math.max(1, Math.min(share, remaining - (numMembers - idx - 1)));
          remaining -= actualShare;

          const statusOptions = ["active","active","active","minor","deceased","under_verification"];
          const memberStatus = pick(statusOptions);

          beneficiaries.push({
            family_ownership_id: fo.id,
            parcel_id: foData.parcel_id,
            parcel_number: foData.parcel_number,
            full_name: members[idx % members.length] || fullName(),
            relationship: pick(["son","daughter","grandson","granddaughter","nephew","niece","brother","sister"]),
            percentage_share: actualShare,
            inheritance_rank: idx + 1,
            generation_level: idx < 2 ? 1 : idx < 4 ? 2 : 3,
            family_branch: pick([`${famKey.name} Senior Branch`,`${famKey.name} Junior Branch`,"Maternal Line"]),
            status: memberStatus,
            verification_status: pick(["verified","verified","pending","unverified"]),
            date_added: dateRange(360, 10),
            date_of_death: memberStatus === "deceased" ? dateRange(730, 90) : null,
            phone: `080${rndInt(10000000, 99999999)}`,
            address: addr(),
            notes: memberStatus === "deceased" ? "Deceased. Share to be redistributed per family meeting resolution." : null,
            is_deleted: false,
          });
        }
      }

      let inserted = 0;
      for (const batch of batchInsert(beneficiaries, 50)) {
        await base44.asServiceRole.entities.FamilyBeneficiary.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: inheritanceCases ───────────────────────────────────────────────
    if (phase === 'inheritanceCases') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 25);
      const count = Math.min(body.count || 20, familyOwnerships.length);
      const caseTypes = ["succession","partition","allocation","transfer","dispute_resolution","subdivision"];
      const statuses = ["draft","submitted","surveyor_review","compliance_review","approved","approved","rejected"];
      const cases = [];

      for (let i = 0; i < count; i++) {
        const fo = familyOwnerships[i];
        const foData = fo.data || fo;
        const status = pick(statuses);
        const yr = rndInt(2023, 2025);
        const seq = String(i + 10).padStart(3, "0");
        const caseType = pick(caseTypes);

        cases.push({
          family_ownership_id: fo.id,
          parcel_id: foData.parcel_id,
          parcel_number: foData.parcel_number,
          family_name: foData.family_name,
          case_reference: `IC/${yr}/${seq}`,
          case_title: `${foData.family_name} — ${caseType.replace("_"," ")} case`,
          case_type: caseType,
          status,
          initiated_by: "citizen.demo@landsecure.app",
          initiated_by_name: foData.family_representative || fullName(),
          description: pick([
            "Following the passing of the family patriarch, this case formally initiates succession of land ownership to registered beneficiaries per the family meeting resolution.",
            "Family members have unanimously agreed to partition this parcel into individual sub-plots for independent title registration.",
            "Formal allocation of defined plot areas to named beneficiaries. Three sub-plots to be created per survey plan.",
            "Transfer of inherited share from deceased senior beneficiary to surviving children as per customary law.",
            "Dispute between two branches of the family regarding proportional allocation. Mediation in progress.",
            "Subdivision plan approved. Survey complete. Awaiting Surveyor General final endorsement.",
          ]),
          surveyor_reviewer: ["surveyor_review","compliance_review","approved"].includes(status) ? "surveyor.demo@landsecure.app" : null,
          surveyor_review_date: ["compliance_review","approved"].includes(status) ? `${dateRange(60, 10)}T10:00:00Z` : null,
          surveyor_notes: ["compliance_review","approved"].includes(status) ? "Survey documents verified. Boundary measurements consistent with original plan." : null,
          compliance_reviewer: ["compliance_review","approved"].includes(status) ? "compliance.demo@landsecure.app" : null,
          compliance_review_date: status === "approved" ? `${dateRange(30, 5)}T14:00:00Z` : null,
          compliance_notes: status === "approved" ? "All regulatory requirements met. Family agreement witnessed and notarised." : null,
          final_approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          final_approved_date: status === "approved" ? `${dateRange(20, 2)}T09:00:00Z` : null,
          certificate_generated: status === "approved" && Math.random() > 0.4,
          is_deleted: false,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(cases, 25)) {
        await base44.asServiceRole.entities.InheritanceCase.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: communityValidations ───────────────────────────────────────────
    if (phase === 'communityValidations') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 200);
      const count = body.count || 15;
      const statuses = ["submitted","community_review","village_head_validation","traditional_authority_validation","compliance_review","approved","approved","rejected"];
      const vals = [];

      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const pd = parcel.data || parcel;
        const community = pick(COMMUNITIES);
        const status = pick(statuses);

        vals.push({
          parcel_id: parcel.id,
          parcel_number: pd.parcel_number,
          community_name: community.name,
          village_name: pick(VILLAGES),
          ward: pick(WARDS),
          district: pick(["Northern District","Southern District","Central District","Eastern District"]),
          lga: GFL.lga,
          state: GFL.state,
          validation_date: dateRange(90, 5),
          validation_notes: pick([
            "Community confirms multi-generational ownership. All elders present.",
            "Boundary confirmed by community witnesses. No objections raised.",
            "Historical records reviewed. Ownership consistent with community register.",
            "Family presented evidence accepted by community council.",
          ]),
          family_representative: fullName(),
          community_elder: `Chief ${fullName()}`,
          village_head: `Igwe ${pick(LAST_NAMES)} II of ${pick(VILLAGES)}`,
          ward_head: `Ward Head ${fullName()}`,
          traditional_ruler: `Obi ${pick(LAST_NAMES)} IV of Greenfield`,
          cdc_chairman: fullName(),
          status,
          community_review_by: status !== "submitted" ? `Chief ${fullName()}` : null,
          community_review_date: status !== "submitted" ? `${dateRange(80, 20)}T10:00:00Z` : null,
          community_review_notes: status !== "submitted" ? "Community confirms ownership. Records consistent." : null,
          village_head_validated_by: ["village_head_validation","traditional_authority_validation","compliance_review","approved"].includes(status) ? `Igwe ${pick(LAST_NAMES)} II` : null,
          village_head_validation_date: ["traditional_authority_validation","compliance_review","approved"].includes(status) ? `${dateRange(60, 15)}T14:00:00Z` : null,
          trad_authority_validated_by: ["compliance_review","approved"].includes(status) ? `Obi ${pick(LAST_NAMES)} IV` : null,
          trad_authority_validation_date: status === "approved" ? `${dateRange(40, 10)}T11:00:00Z` : null,
          final_approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          final_approved_date: status === "approved" ? `${dateRange(20, 2)}T09:00:00Z` : null,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fullName(),
          is_deleted: false,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(vals, 25)) {
        await base44.asServiceRole.entities.CommunityValidation.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: fraudAlerts ────────────────────────────────────────────────────
    if (phase === 'fraudAlerts') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 300);
      const count = body.count || 20;
      const fraudScenarios = [
        { type: "duplicate_registration", severity: "high", desc: "System detected duplicate GPS coordinates: this parcel shares exact coordinates with an existing approved parcel. Suspected fraudulent duplicate registration attempt.", inv: "Field investigation confirmed physical markers at same location. Parcel frozen pending SG review." },
        { type: "forged_document", severity: "high", desc: "Document metadata analysis indicates the uploaded survey plan may have been digitally altered. Original timestamp inconsistency detected in PDF metadata.", inv: null },
        { type: "boundary_manipulation", severity: "medium", desc: "Parcel boundary polygon has been extended since the initial submission. Difference of 312 sqm detected between submission version and current record.", inv: "Spatial audit confirmed boundary was modified after initial approval. Compliance review initiated." },
        { type: "ownership_fraud", severity: "high", desc: "Multiple ownership claims detected. System identified two separate registration attempts within 30 days using different names but same physical address.", inv: null },
        { type: "suspicious_transfer", severity: "medium", desc: "Rapid transfer sequence detected: parcel changed ownership three times in 45 days. Pattern consistent with land laundering scheme.", inv: "Ownership chain under review. All three parties notified." },
        { type: "duplicate_registration", severity: "critical" , desc: "Survey plan number SN/2023/4421 appears in records of two separate approved parcels. One registration is fraudulent.", inv: null },
        { type: "forged_document", severity: "medium", desc: "Allocation letter uploaded appears to reference a government acquisition order that was never gazetted. Verification with Ministry required.", inv: null },
        { type: "boundary_manipulation", severity: "low", desc: "Minor boundary discrepancy of 0.8% detected between survey plan and GPS capture. Within tolerance but flagged for review.", inv: null },
      ];

      const alerts = [];
      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const pd = parcel.data || parcel;
        const scenario = pick(fraudScenarios);
        const status = pick(["open","open","under_investigation","under_investigation","resolved","escalated"]);

        alerts.push({
          parcel_id: parcel.id,
          parcel_number: pd.parcel_number,
          flagged_by: pick(["system","system","system","agent.demo@landsecure.app","compliance.demo@landsecure.app"]),
          alert_type: scenario.type,
          severity: scenario.severity,
          description: scenario.desc,
          status,
          assigned_to: "sg.demo@landsecure.app",
          investigation_notes: status !== "open" ? scenario.inv : null,
          resolved_by: status === "resolved" ? "sg.demo@landsecure.app" : null,
          resolved_date: status === "resolved" ? dateRange(30, 2) : null,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(alerts, 25)) {
        await base44.asServiceRole.entities.FraudAlert.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: auditLogs ──────────────────────────────────────────────────────
    if (phase === 'auditLogs') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 200);
      const count = body.count || 200;
      const actions = [
        { action: "PARCEL_REGISTERED", entity: "LandParcel", userEmail: "citizen.demo@landsecure.app", userName: "Blessing Eze" },
        { action: "PARCEL_APPROVED", entity: "LandParcel", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "PARCEL_REJECTED", entity: "LandParcel", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "PARCEL_FROZEN", entity: "LandParcel", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "FIELD_REPORT_SUBMITTED", entity: "FieldReport", userEmail: "agent.demo@landsecure.app", userName: "Emeka Obi" },
        { action: "FIELD_REPORT_REVIEWED", entity: "FieldReport", userEmail: "surveyor.demo@landsecure.app", userName: "Tobi Fashola" },
        { action: "DISPUTE_FILED", entity: "Dispute", userEmail: "citizen.demo@landsecure.app", userName: "Chief Emmanuel Nwosu" },
        { action: "DISPUTE_RESOLVED", entity: "Dispute", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "FRAUD_ALERT_RAISED", entity: "FraudAlert", userEmail: "system", userName: "System Auto-Detection" },
        { action: "FRAUD_INVESTIGATION_OPENED", entity: "FraudAlert", userEmail: "compliance.demo@landsecure.app", userName: "Ngozi Adeyemi" },
        { action: "INHERITANCE_CASE_CREATED", entity: "InheritanceCase", userEmail: "citizen.demo@landsecure.app", userName: "Ifeoma Eze" },
        { action: "INHERITANCE_CASE_REVIEWED", entity: "InheritanceCase", userEmail: "surveyor.demo@landsecure.app", userName: "Tobi Fashola" },
        { action: "INHERITANCE_APPROVED", entity: "InheritanceCase", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "COMMUNITY_VALIDATION_SUBMITTED", entity: "CommunityValidation", userEmail: "citizen.demo@landsecure.app", userName: "Ngozi Okafor" },
        { action: "COMMUNITY_VALIDATION_APPROVED", entity: "CommunityValidation", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "SURVEY_DOCUMENT_UPLOADED", entity: "SurveyDocument", userEmail: "surveyor.demo@landsecure.app", userName: "Tobi Fashola" },
        { action: "FAMILY_OWNERSHIP_REGISTERED", entity: "FamilyOwnership", userEmail: "citizen.demo@landsecure.app", userName: "Blessing Eze" },
        { action: "BENEFICIARY_ADDED", entity: "FamilyBeneficiary", userEmail: "citizen.demo@landsecure.app", userName: "Ngozi Okafor" },
        { action: "CERTIFICATE_GENERATED", entity: "InheritanceCase", userEmail: "sg.demo@landsecure.app", userName: "Dr. Amara Okafor" },
        { action: "USER_LOGIN", entity: "User", userEmail: pick(["citizen.demo@landsecure.app","surveyor.demo@landsecure.app","sg.demo@landsecure.app"]), userName: fullName() },
      ];

      const detailOptions = [
        "Record successfully created and submitted for review.",
        "Administrative decision applied. Notification sent to registrant.",
        "Spatial validation completed. No conflicts detected.",
        "Document upload confirmed. File integrity verified.",
        "Status change applied following supervisor review.",
        "Community validation chain completed. Traditional authority endorsement received.",
        "Fraud detection engine flagged record for manual review.",
        "Field inspection completed. GPS data logged.",
        "Certificate generated and dispatched to registered owner.",
        "Survey plan cross-referenced with national archive. No duplicate found.",
        "Boundary re-survey ordered following dispute escalation.",
        "Ownership transfer approved. New title issued.",
        "Family meeting resolution adopted. Beneficiary shares updated.",
        "Compliance check completed. No regulatory violations found.",
        "Parcel freeze applied pending investigation outcome.",
      ];

      const logs = [];
      for (let i = 0; i < count; i++) {
        const act = pick(actions);
        const parcel = pick(allParcels);
        const pd = parcel.data || parcel;
        logs.push({
          user_email: act.userEmail,
          user_name: act.userName,
          action: act.action,
          entity_type: act.entity,
          entity_id: parcel.id,
          details: `${pick(detailOptions)} [Parcel: ${pd.parcel_number || 'N/A'}]`,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(logs, 100)) {
        await base44.asServiceRole.entities.AuditLog.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: surveyDocuments ────────────────────────────────────────────────
    if (phase === 'surveyDocuments') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 300);
      const count = body.count || 50;
      const docTypes = ["survey_plan","cad_drawing","topographic_map","boundary_report","gis_data","other"];
      const docs = [];

      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const pd = parcel.data || parcel;
        const status = pick(["pending","reviewed","approved","rejected"]);

        docs.push({
          parcel_id: parcel.id,
          parcel_number: pd.parcel_number,
          document_type: pick(docTypes),
          file_url: `https://storage.landsecure.app/surveys/${pd.parcel_number?.replace(/\//g,"-") || "GFL-DOC"}-${rndInt(1000,9999)}.pdf`,
          surveyor_email: "surveyor.demo@landsecure.app",
          surveyor_name: pick(["Tobi Fashola","Adebayo Williams","Chioma Nwosu","Ikenna Ezeh"]),
          description: pick([
            "Official survey plan drawn to scale. Coordinates verified with GPS ground-truthing.",
            "CAD drawing exported from AutoCAD Civil 3D. Boundary polygon imported to GIS layer.",
            "Topographic map showing elevation contours and drainage patterns.",
            "Boundary report following field demarcation exercise. All four corners staked.",
            "GIS data package including shapefile, projection file, and attribute table.",
            "Updated survey following boundary dispute resolution. All parties signed.",
          ]),
          review_status: status,
          reviewed_by: status !== "pending" ? "sg.demo@landsecure.app" : null,
          review_notes: status === "approved" ? "Survey plan verified against national grid coordinates. Approved for registration." : status === "rejected" ? "Plan does not meet minimum accuracy standards. Resurvey required." : null,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(docs, 50)) {
        await base44.asServiceRole.entities.SurveyDocument.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: ownershipHistory ────────────────────────────────────────────────
    if (phase === 'ownershipHistory') {
      const allParcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 300);
      const count = body.count || 100;
      const transferTypes = ["purchase","inheritance","government_allocation","gift","court_order","family_inheritance","customary_allocation","family_partition"];
      const histories = [];

      for (let i = 0; i < count; i++) {
        const parcel = pick(allParcels);
        const pd = parcel.data || parcel;
        const status = pick(["pending","approved","approved","rejected"]);
        const transferType = pick(transferTypes);

        histories.push({
          parcel_id: parcel.id,
          parcel_number: pd.parcel_number,
          from_owner: `Late ${fullName()}`,
          to_owner: pd.owner_name || fullName(),
          transfer_type: transferType,
          transfer_date: dateRange(730, 30),
          document_url: `https://storage.landsecure.app/transfers/${pd.parcel_number?.replace(/\//g,"-") || "GFL-T"}-${rndInt(1000,9999)}.pdf`,
          status,
          approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
          notes: pick([
            "Transfer following death of original owner.",
            "Purchase agreement executed with consent of all family members.",
            "Government allocation under 2018 housing scheme.",
            "Gift inter vivos — witnessed by community elders.",
            "Court order following resolution of ownership dispute.",
            "Family inheritance as per customary law of the community.",
          ]),
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(histories, 50)) {
        await base44.asServiceRole.entities.OwnershipHistory.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: deathVerifications ─────────────────────────────────────────────
    if (phase === 'deathVerifications') {
      const inheritanceCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 20);
      const verifications = [];

      for (const ic of inheritanceCases.slice(0, 15)) {
        const icd = ic.data || ic;
        const status = pick(["pending","verified","verified","verified","rejected"]);
        verifications.push({
          inheritance_case_id: ic.id,
          family_ownership_id: icd.family_ownership_id,
          parcel_id: icd.parcel_id,
          deceased_name: `Late ${fullName()}`,
          date_of_death: dateRange(730, 180),
          place_of_death: pick([
            "Greenfield Central General Hospital",
            "Lagos University Teaching Hospital",
            `Home — ${addr()}`,
            "Federal Medical Centre Umuahia",
            "Port Harcourt Teaching Hospital",
          ]),
          family_confirmation: true,
          family_confirmed_by: fullName(),
          family_confirmation_date: dateRange(600, 60),
          community_confirmation: Math.random() > 0.25,
          community_confirmed_by: `Chief ${fullName()}`,
          community_confirmation_date: dateRange(580, 50),
          lg_confirmation: Math.random() > 0.35,
          lg_confirmed_by: "LGA Registrar, Greenfield Local Government",
          lg_confirmation_date: dateRange(540, 40),
          court_confirmation: Math.random() > 0.6,
          court_confirmed_by: "Chief Registrar, Greenfield Magistrate Court",
          court_confirmation_date: dateRange(500, 30),
          verification_status: status,
          verified_by: status === "verified" ? "sg.demo@landsecure.app" : null,
          verified_date: status === "verified" ? `${dateRange(300, 10)}T10:00:00Z` : null,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fullName(),
          is_deleted: false,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(verifications, 25)) {
        await base44.asServiceRole.entities.DeathVerification.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: familyMeetingResolutions ───────────────────────────────────────
    if (phase === 'familyMeetingResolutions') {
      const familyOwnerships = await base44.asServiceRole.entities.FamilyOwnership.list('-created_date', 25);
      const resolutions = [];

      for (const fo of familyOwnerships.slice(0, 20)) {
        const fod = fo.data || fo;
        const status = pick(["draft","adopted","adopted","adopted","amended","withdrawn"]);
        const idx = resolutions.length + 1;

        resolutions.push({
          resolution_reference: `FMR/${rndInt(2023,2025)}/${String(idx).padStart(3,"0")}`,
          family_name: fod.family_name,
          family_ownership_id: fo.id,
          parcel_id: fod.parcel_id,
          parcel_number: fod.parcel_number,
          meeting_date: dateRange(180, 10),
          meeting_location: `${fod.family_name} Compound, ${pick(COMMUNITIES).name}`,
          meeting_purpose: pick([
            "Distribution of inherited land to registered beneficiaries per family agreement",
            "Formal resolution of boundary dispute with neighbouring family",
            "Election of new family representative for land administration matters",
            "Ratification of subdivision plan approved by Surveyor General",
            "Agreement on percentage shares for partition of jointly-owned parcel",
            "Appointment of legal representative for inheritance case proceedings",
          ]),
          resolution_summary: pick([
            "Meeting resolved unanimously to proceed with equal distribution among all registered beneficiaries.",
            "Family agreed to engage licensed surveyor for formal boundary demarcation before subdivision.",
            "New family head elected following demise of previous head. Land records to be updated.",
            "Partition plan approved by majority vote. Senior branch to receive northern plot.",
            "Beneficiary shares confirmed: eldest son 40%, daughters 20% each, youngest son 20%.",
            "Resolution adopted that no parcel shall be sold outside the family without full family consent.",
          ]),
          chairperson: fod.family_head,
          secretary: fullName(),
          number_of_attendees: rndInt(8, 42),
          meeting_minutes: `Minutes of the ${fod.family_name} family meeting held on ${dateRange(180,10)}. The meeting was called to order by ${fod.family_head}. All registered beneficiaries were present or represented. The agenda was approved unanimously. Proceedings were conducted in accordance with the customary laws of the community.`,
          status,
          version_number: 1,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fod.family_head,
          is_deleted: false,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(resolutions, 25)) {
        await base44.asServiceRole.entities.FamilyMeetingResolution.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: inheritanceDisputes ────────────────────────────────────────────
    if (phase === 'inheritanceDisputes') {
      const inheritanceCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 20);
      const disputes = [];

      for (const ic of inheritanceCases.slice(0, 10)) {
        const icd = ic.data || ic;
        const status = pick(["open","under_investigation","mediation","hearing","resolved","appealed"]);

        disputes.push({
          case_number: `ID/${rndInt(2023,2025)}/${String(rndInt(1,99)).padStart(3,"0")}`,
          parcel_id: icd.parcel_id,
          parcel_number: icd.parcel_number,
          family_ownership_id: icd.family_ownership_id,
          inheritance_case_id: ic.id,
          dispute_type: pick(["beneficiary_allocation","share_percentage","lineage","successor","witness_objection","community_objection"]),
          complainant_name: fullName(),
          complainant_email: "citizen.demo@landsecure.app",
          complainant_relationship: pick(["son","daughter","nephew","cousin","spouse"]),
          respondent_name: fullName(),
          description: pick([
            "Complainant disputes the share allocation, claiming entitlement under the customary law of the community is greater than assigned.",
            "Witness objects to the inheritance case proceeding without verification of all family members.",
            "Community elder challenges the lineage claim, stating the deceased was not the biological father.",
            "Second wife's children claim exclusion from beneficiary list was unlawful under customary law.",
            "Eldest son disputes the validity of the family meeting resolution citing lack of quorum.",
            "Claimant challenges authenticity of death certificate presented in support of succession.",
          ]),
          status,
          priority: pick(["low","medium","medium","high","critical"]),
          assigned_to: "sg.demo@landsecure.app",
          assigned_to_name: "Dr. Amara Okafor",
          resolution_notes: status === "resolved" ? "Mediation concluded. Parties agreed to revised allocation. Consent recorded and certified." : null,
          resolved_date: status === "resolved" ? dateRange(60, 5) : null,
          filed_by: "citizen.demo@landsecure.app",
          filed_by_name: fullName(),
          is_deleted: false,
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(disputes, 25)) {
        await base44.asServiceRole.entities.InheritanceDispute.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: witnesses ──────────────────────────────────────────────────────
    if (phase === 'witnesses') {
      const inheritanceCases = await base44.asServiceRole.entities.InheritanceCase.list('-created_date', 20);
      const witnesses = [];
      const roles = ["family_witness","community_witness","traditional_ruler","religious_witness","government_witness"];
      const statements = [
        "I, the undersigned, confirm that I personally knew the deceased and can attest to the family relationships stated herein.",
        "As a community elder, I confirm the family has held this land for more than three generations.",
        "In my capacity as the traditional ruler of this community, I hereby endorse the succession as described.",
        "I witnessed the family meeting and can confirm the resolution was adopted by a unanimous vote.",
        "As the ward representative, I confirm the community has no objection to this inheritance proceeding.",
        "I confirm the boundary markers of this parcel and attest that they have not been moved in my lifetime.",
      ];

      for (const ic of inheritanceCases.slice(0, 15)) {
        const icd = ic.data || ic;
        const numWitnesses = rndInt(2, 4);
        for (let w = 0; w < numWitnesses; w++) {
          witnesses.push({
            inheritance_case_id: ic.id,
            parcel_id: icd.parcel_id,
            full_name: fullName(),
            witness_role: pick(roles),
            phone: `080${rndInt(10000000, 99999999)}`,
            address: addr(),
            identification: `NIN-${rndInt(10000000000, 99999999999)}`,
            witness_statement: pick(statements),
            verification_status: pick(["pending","verified","verified","verified"]),
            verified_by: Math.random() > 0.4 ? "surveyor.demo@landsecure.app" : null,
            verified_date: Math.random() > 0.4 ? `${dateRange(60, 5)}T10:00:00Z` : null,
            is_deleted: false,
          });
        }
      }

      let inserted = 0;
      for (const batch of batchInsert(witnesses, 50)) {
        await base44.asServiceRole.entities.InheritanceWitness.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    // ── PHASE: notifications ──────────────────────────────────────────────────
    if (phase === 'notifications') {
      const count = body.count || 50;
      const emails = ["citizen.demo@landsecure.app","surveyor.demo@landsecure.app","sg.demo@landsecure.app","agent.demo@landsecure.app","compliance.demo@landsecure.app"];
      const notifTypes = [
        { type: "approval", title: "Parcel Registration Approved", msg: "Your land parcel registration has been reviewed and approved by the Surveyor General. You may now collect your title document." },
        { type: "rejection", title: "Registration Requires Attention", msg: "Your land parcel registration has been returned for additional documentation. Please review the comments and resubmit." },
        { type: "dispute", title: "Dispute Filed Against Your Parcel", msg: "A formal dispute has been filed against a parcel registered in your name. Please respond within 14 days." },
        { type: "transfer", title: "Ownership Transfer Approved", msg: "The ownership transfer for your parcel has been approved and the new title has been issued." },
        { type: "alert", title: "Fraud Alert: Your Parcel Flagged", msg: "An automated review has flagged your parcel for investigation. A compliance officer will contact you shortly." },
        { type: "system", title: "Field Inspection Scheduled", msg: "A field agent has been assigned to inspect your registered parcel. Please ensure access is available on the scheduled date." },
        { type: "system", title: "Survey Document Uploaded", msg: "A new survey document has been uploaded for your parcel. Please review and confirm accuracy." },
        { type: "approval", title: "Inheritance Case Approved", msg: "Your inheritance case has been approved by the Surveyor General. Certificates are being prepared." },
      ];

      const notifs = [];
      for (let i = 0; i < count; i++) {
        const n = pick(notifTypes);
        notifs.push({
          user_email: pick(emails),
          title: n.title,
          message: n.msg,
          type: n.type,
          read: Math.random() > 0.6,
          link: pick(["/lands", "/inheritance", "/disputes", "/my-submissions", "/gov/fraud-alerts"]),
        });
      }

      let inserted = 0;
      for (const batch of batchInsert(notifs, 50)) {
        await base44.asServiceRole.entities.Notification.bulkCreate(batch);
        inserted += batch.length;
      }
      return Response.json({ phase, inserted });
    }

    return Response.json({ error: `Unknown phase: ${phase}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack?.slice(0, 500) }, { status: 500 });
  }
});