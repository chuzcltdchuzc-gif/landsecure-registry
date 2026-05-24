// ─────────────────────────────────────────────────────────────────────────────
// LandSecure Registry — Greenfield LGA Demo Data Generator
// ─────────────────────────────────────────────────────────────────────────────

export const GFL_CONFIG = {
  lga: "Greenfield Local Government",
  state: "Rivers State",
  center: { lat: 6.455, lng: 3.384 },
};

export const COMMUNITIES = [
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

export const VILLAGES = [
  "Umueze", "Alaojie", "Obodo Nnewi", "Agulu", "Nkwere",
  "Achi", "Ozubulu", "Ihiala", "Orlu", "Orsu",
  "Amesi", "Umunze", "Nnobi", "Oba", "Igbo-Ukwu",
  "Awka-Etiti", "Uli", "Osumenyi", "Oguta", "Mgbidi",
  "Nkpor", "Nnewi North", "Oraukwu", "Akpo", "Ukpor",
];

export const WARDS = [
  "Central Ward", "South Ward", "North Ward", "East Ward", "West Ward",
  "Market Ward", "Old Town Ward", "New Layout Ward", "Industrial Ward",
  "Agricultural Ward", "Riverside Ward", "Hilltop Ward",
];

export const FAMILIES = [
  {
    name: "Okafor", head: "Elder Chukwuemeka Okafor", clan: "Umudike Clan",
    village: "Umueze", lineage: "patrilineal",
    members: ["Ngozi Okafor", "Ifeanyi Okafor", "Ada Okafor", "Chidi Okafor", "Obioma Okafor-Nwosu"],
  },
  {
    name: "Eze", head: "Chief Boniface Eze", clan: "Eze Royal Lineage",
    village: "Agulu", lineage: "patrilineal",
    members: ["Ifeoma Eze", "Emeka Eze", "Chioma Eze-Obi", "Kelechi Eze", "Uzochukwu Eze"],
  },
  {
    name: "Ibrahim", head: "Alhaji Musa Ibrahim", clan: "Ibrahim Fulani Line",
    village: "Orlu", lineage: "patrilineal",
    members: ["Fatima Ibrahim", "Usman Ibrahim", "Aisha Ibrahim-Bello", "Abdullahi Ibrahim"],
  },
  {
    name: "Bello", head: "Alhaji Sule Bello", clan: "Bello Hausa Clan",
    village: "Oguta", lineage: "patrilineal",
    members: ["Zainab Bello", "Yusuf Bello", "Halima Bello-Danjuma", "Mohammed Bello"],
  },
  {
    name: "Danjuma", head: "Gen. (Rtd) Danladi Danjuma", clan: "Danjuma Military Lineage",
    village: "Achi", lineage: "bilateral",
    members: ["Patience Danjuma", "Gideon Danjuma", "Ruth Danjuma-Ibrahim", "Daniel Danjuma"],
  },
];

export const FIRST_NAMES = [
  "Chukwuemeka", "Ngozi", "Emeka", "Ifeoma", "Adaeze", "Obinna", "Chioma", "Kelechi",
  "Uchenna", "Amarachi", "Blessing", "Chidi", "Nkechi", "Ifeanyi", "Oluchi",
  "Musa", "Fatima", "Usman", "Aisha", "Abdullahi", "Hafsa", "Yusuf",
  "Sule", "Zainab", "Halima", "Mohammed", "Amina",
  "Danladi", "Patience", "Gideon", "Ruth", "Daniel", "Grace",
  "Adebayo", "Funmilayo", "Taiwo", "Kehinde", "Yewande", "Olumide",
  "Tunde", "Shade", "Bola", "Femi", "Tobi", "Lara",
];

export const LAST_NAMES = [
  "Okafor", "Eze", "Ibrahim", "Bello", "Danjuma", "Nwosu", "Adeyemi", "Fashola",
  "Obi", "Nwachukwu", "Uzoma", "Chukwu", "Obiora", "Aneke", "Okorie",
  "Hassan", "Aliyu", "Garba", "Lawan", "Bukar", "Adamu",
  "Abubakar", "Shehu", "Maikano", "Ango",
  "Adeleke", "Bamidele", "Afolabi", "Adesanya", "Odunbaku",
];

export const STREET_NAMES = [
  "Mango Street", "Palm Avenue", "Independence Road", "Market Street",
  "Church Lane", "River Road", "Unity Street", "Progress Avenue",
  "Community Road", "School Lane", "Farm Road", "Bridge Street",
  "New Layout Road", "Old Town Street", "Industrial Way", "Estate Close",
];

export function rnd(min, max) { return Math.random() * (max - min) + min; }
export function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function fullName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

export function address(ward) {
  return `${rndInt(1, 120)} ${pick(STREET_NAMES)}, ${ward || pick(WARDS)}`;
}

export function parcelCoords(community) {
  const c = community || pick(COMMUNITIES);
  return {
    lat: c.lat + rnd(-0.025, 0.025),
    lng: c.lng + rnd(-0.025, 0.025),
    community: c.name,
  };
}

export function makePolygon(lat, lng, sizeFactor = 1) {
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

export function randomDate(startDaysAgo, endDaysAgo = 0) {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

export function dateOnly(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - rndInt(0, daysAgo));
  return d.toISOString().split("T")[0];
}

export const LAND_USES = ["residential", "commercial", "agricultural", "industrial", "mixed_use", "government"];
export const STATUSES = ["pending", "approved", "approved", "approved", "disputed", "frozen", "archived", "rejected"];
export const PARCEL_PREFIXES = ["GFL", "GFL", "GFL", "GFL-R", "GFL-C", "GFL-A"];

export function parcelNumber(i) {
  const yr = rndInt(2022, 2025);
  const seq = String(i + 1).padStart(4, "0");
  return `GFL/${yr}/${seq}`;
}

export function fraudReasons(score) {
  const reasons = [];
  if (score > 70) reasons.push("Duplicate GPS coordinates detected");
  if (score > 60) reasons.push("Survey plan number matches another parcel");
  if (score > 50) reasons.push("Ownership registered within 30 days of purchase");
  if (score > 40) reasons.push("Boundary overlaps adjacent parcel by >5%");
  if (score > 30) reasons.push("Multiple claims from same owner email");
  return JSON.stringify(reasons.slice(0, rndInt(1, 3)));
}

// ─── Batch generators ────────────────────────────────────────────────────────

export function generateParcels(count = 200) {
  const parcels = [];
  for (let i = 0; i < count; i++) {
    const community = pick(COMMUNITIES);
    const { lat, lng } = parcelCoords(community);
    const landUse = pick(LAND_USES);
    const status = pick(STATUSES);
    const size = landUse === "agricultural" ? rnd(0.5, 15) : landUse === "industrial" ? rnd(0.3, 5) : rnd(0.05, 1.2);
    const fraudScore = status === "disputed" ? rndInt(55, 95) : rndInt(0, 40);
    const fraudLevel = fraudScore > 70 ? "high" : fraudScore > 40 ? "medium" : fraudScore > 20 ? "low" : "none";
    const createdDate = randomDate(540, 5);
    const approvalDate = status === "approved" || status === "approved_locked"
      ? new Date(new Date(createdDate).getTime() + rndInt(3, 30) * 86400000).toISOString().split("T")[0]
      : null;
    const ward = pick(WARDS);
    const village = pick(VILLAGES);

    parcels.push({
      parcel_number: parcelNumber(i),
      title: `${landUse.charAt(0).toUpperCase() + landUse.slice(1).replace("_", " ")} Parcel — ${community.name}`,
      owner_name: fullName(),
      address: address(ward),
      state: GFL_CONFIG.state,
      lga: GFL_CONFIG.lga,
      land_use: landUse,
      status,
      latitude: lat,
      longitude: lng,
      size_hectares: parseFloat(size.toFixed(4)),
      parcel_boundary: makePolygon(lat, lng, size * 2),
      boundary_area: parseFloat((size * 10000).toFixed(1)),
      boundary_source: pick(["gps_capture", "survey_plan", "manual_entry", "cad_import"]),
      spatial_validation_status: status === "disputed" ? pick(["overlap_warning", "duplicate_warning"]) : pick(["valid", "valid", "valid", "not_validated"]),
      verification_status: status === "approved" ? pick(["field_verified", "survey_verified", "fully_verified"]) : pick(["unverified", "field_verified"]),
      fraud_risk_score: fraudScore,
      fraud_risk_level: fraudLevel,
      fraud_risk_reasons: fraudScore > 20 ? fraudReasons(fraudScore) : "[]",
      registered_by: pick(["surveyor.demo@landsecure.app", "citizen.demo@landsecure.app", "agent.demo@landsecure.app"]),
      approved_by: approvalDate ? "sg.demo@landsecure.app" : null,
      approval_date: approvalDate,
      notes: `${community.name}, ${village} village, ${ward}. Registered under Greenfield LGA pilot programme.`,
      created_date: createdDate,
    });
  }
  return parcels;
}

export function generateFieldReports(parcels, count = 50) {
  const reports = [];
  const types = ["boundary_check", "photo_capture", "gps_survey", "site_inspection", "verification"];
  for (let i = 0; i < count; i++) {
    const parcel = pick(parcels);
    const lat = parcel.latitude + rnd(-0.001, 0.001);
    const lng = parcel.longitude + rnd(-0.001, 0.001);
    const gpsAcc = rnd(1, 15);
    const status = pick(["submitted", "submitted", "reviewed", "reviewed", "draft", "flagged"]);
    reports.push({
      parcel_id: parcel.id,
      parcel_number: parcel.parcel_number,
      agent_email: "agent.demo@landsecure.app",
      agent_name: "Emeka Obi",
      report_type: pick(types),
      latitude: lat,
      longitude: lng,
      gps_accuracy: parseFloat(gpsAcc.toFixed(1)),
      capture_timestamp: randomDate(180, 1),
      device_identifier: pick(["Samsung Galaxy A53", "Tecno Camon 20", "Infinix Note 30", "iPhone 13"]),
      network_status: pick(["online", "online", "offline", "synced_offline"]),
      capture_method: gpsAcc < 5 ? "gps_auto" : "manual_entry",
      description: pick([
        "Boundary markers found intact. No encroachment detected.",
        "Site cleared. Building foundations visible. Owner present.",
        "Agricultural plot — crops growing on northern half.",
        "Commercial plot — existing structure matches survey plan.",
        "GPS coordinates verified against survey plan. Minor discrepancy of 0.3m.",
        "Neighbouring landowner present and confirmed boundary agreement.",
        "Boundary markers partially removed. Re-staking required.",
        "Flood risk visible in south-east corner. Noted for compliance review.",
      ]),
      boundary_valid: gpsAcc < 10,
      status,
      quality_flag: gpsAcc <= 5 ? "pass" : gpsAcc <= 10 ? "warn" : "fail",
      quality_notes: gpsAcc > 10 ? "GPS accuracy below threshold — recommend resurvey" : null,
    });
  }
  return reports;
}

export function generateDisputes(parcels, count = 30) {
  const types = ["boundary", "ownership", "fraud", "encroachment", "documentation", "other"];
  const statuses = ["open", "under_review", "under_review", "resolved", "escalated", "closed"];
  const disputes = [];
  for (let i = 0; i < count; i++) {
    const parcel = pick(parcels);
    const status = pick(statuses);
    disputes.push({
      parcel_id: parcel.id,
      parcel_number: parcel.parcel_number,
      complainant_email: "citizen.demo@landsecure.app",
      complainant_name: fullName(),
      dispute_type: pick(types),
      description: pick([
        "Complainant claims the approved survey plan boundary does not match the physical markers on the ground. Requesting re-survey.",
        "A second person has come forward claiming ownership of this parcel with an older deed of conveyance.",
        "Encroachment by neighbouring property owner who has extended a fence line by approximately 2 metres.",
        "Survey plan submitted appears to duplicate an existing approved survey plan (SN/2023/4421).",
        "Family dispute: two siblings both claim right to inherit this parcel from deceased father.",
        "Community leader objects to reclassification of this parcel from agricultural to commercial.",
        "Double allocation detected — same parcel number assigned by two different officers.",
        "GPS coordinates submitted do not match physical location. Suspected fraudulent relocation.",
      ]),
      status,
      priority: pick(["low", "medium", "high", "critical"]),
      assigned_to: "sg.demo@landsecure.app",
      resolution_notes: status === "resolved" ? "After investigation and field verification, the boundary was re-surveyed and updated. All parties agreed to the revised demarcation." : null,
      resolved_date: status === "resolved" ? dateOnly(30) : null,
    });
  }
  return disputes;
}

export function generateFamilyOwnerships(parcels, count = 10) {
  const ownerships = [];
  const shuffled = [...parcels].sort(() => Math.random() - 0.5).slice(0, count);
  FAMILIES.forEach((fam, i) => {
    const parcel = shuffled[i] || pick(parcels);
    ownerships.push({
      parcel_id: parcel.id,
      parcel_number: parcel.parcel_number,
      family_name: `${fam.name} Family`,
      family_head: fam.head,
      parent_name: `Late ${pick(FIRST_NAMES)} ${fam.name}`,
      clan_name: fam.clan,
      village: fam.village,
      community: pick(COMMUNITIES).name,
      lga: GFL_CONFIG.lga,
      state: GFL_CONFIG.state,
      family_lineage: fam.lineage,
      family_representative: fam.members[0],
      status: pick(["active", "active", "in_transfer", "disputed"]),
      fruit_trees: rndInt(0, 25),
      buildings: rndInt(1, 8),
      boreholes: rndInt(0, 3),
      economic_trees: rndInt(0, 40),
      other_improvements: pick(["Perimeter wall, gate", "Bore well, generator house", "Fish pond, poultry", "Warehouse structure", null]),
      registered_by: "surveyor.demo@landsecure.app",
    });
  });
  return ownerships;
}

export function generateBeneficiaries(familyOwnerships) {
  const beneficiaries = [];
  familyOwnerships.forEach((fo, fi) => {
    const family = FAMILIES[fi % FAMILIES.length];
    const totalMembers = rndInt(3, 6);
    let remaining = 100;
    family.members.slice(0, totalMembers).forEach((name, idx) => {
      const isLast = idx === totalMembers - 1;
      const share = isLast ? remaining : Math.floor(remaining / (totalMembers - idx) * rnd(0.8, 1.2));
      const actualShare = Math.min(share, remaining);
      remaining -= actualShare;
      beneficiaries.push({
        family_ownership_id: fo.id,
        parcel_id: fo.parcel_id,
        parcel_number: fo.parcel_number,
        full_name: name,
        relationship: pick(["son", "daughter", "grandson", "granddaughter", "nephew", "niece"]),
        percentage_share: actualShare,
        inheritance_rank: idx + 1,
        generation_level: idx < 2 ? 1 : 2,
        family_branch: pick([`${family.name} Senior Branch`, `${family.name} Junior Branch`]),
        status: pick(["active", "active", "active", "minor", "deceased"]),
        verification_status: pick(["verified", "pending", "unverified"]),
        date_added: dateOnly(180),
        phone: `080${rndInt(10000000, 99999999)}`,
        address: address(),
        is_deleted: false,
      });
    });
  });
  return beneficiaries;
}

export function generateInheritanceCases(familyOwnerships, count = 8) {
  const caseTypes = ["succession", "partition", "allocation", "transfer", "dispute_resolution", "subdivision"];
  const statuses = ["draft", "submitted", "surveyor_review", "compliance_review", "approved", "approved", "rejected"];
  const cases = [];
  familyOwnerships.slice(0, count).forEach((fo, i) => {
    const status = pick(statuses);
    const yr = 2024;
    cases.push({
      family_ownership_id: fo.id,
      parcel_id: fo.parcel_id,
      parcel_number: fo.parcel_number,
      family_name: fo.family_name,
      case_reference: `IC/${yr}/${String(i + 1).padStart(3, "0")}`,
      case_title: `${fo.family_name} — ${pick(caseTypes).replace("_", " ")} case`,
      case_type: pick(caseTypes),
      status,
      initiated_by: "citizen.demo@landsecure.app",
      initiated_by_name: fullName(),
      description: pick([
        "Following the death of the family patriarch, this case initiates the formal succession of land ownership to registered beneficiaries.",
        "Family members have agreed to partition the parcel into individual sub-plots for independent title registration.",
        "Allocation of specific plot areas to named beneficiaries per the family meeting resolution of January 2025.",
        "Transfer of inherited share from deceased elder to surviving son as per customary law.",
      ]),
      surveyor_reviewer: status !== "draft" ? "surveyor.demo@landsecure.app" : null,
      surveyor_review_date: status === "compliance_review" || status === "approved" ? randomDate(60, 10) : null,
      surveyor_notes: status !== "draft" && status !== "submitted" ? "Survey documents verified. Boundary measurements consistent with original survey plan." : null,
      compliance_reviewer: ["compliance_review", "approved"].includes(status) ? "compliance.demo@landsecure.app" : null,
      compliance_notes: status === "approved" ? "All regulatory requirements met. Family agreement properly witnessed and notarised." : null,
      final_approved_by: status === "approved" ? "sg.demo@landsecure.app" : null,
      final_approved_date: status === "approved" ? randomDate(20, 2) : null,
      certificate_generated: status === "approved" && Math.random() > 0.4,
      is_deleted: false,
    });
  });
  return cases;
}

export function generateCommunityValidations(parcels, count = 8) {
  const statuses = ["submitted", "community_review", "village_head_validation", "traditional_authority_validation", "compliance_review", "approved", "approved"];
  const vals = [];
  for (let i = 0; i < count; i++) {
    const parcel = pick(parcels);
    const community = pick(COMMUNITIES);
    const status = pick(statuses);
    vals.push({
      parcel_id: parcel.id,
      parcel_number: parcel.parcel_number,
      community_name: community.name,
      village_name: pick(VILLAGES),
      ward: pick(WARDS),
      lga: GFL_CONFIG.lga,
      state: GFL_CONFIG.state,
      validation_date: dateOnly(60),
      family_representative: fullName(),
      community_elder: `Chief ${fullName()}`,
      village_head: `Igwe ${pick(LAST_NAMES)} II`,
      traditional_ruler: `Obi ${pick(LAST_NAMES)} III of Greenfield`,
      cdc_chairman: fullName(),
      status,
      submitted_by: "citizen.demo@landsecure.app",
      submitted_by_name: fullName(),
      is_deleted: false,
    });
  }
  return vals;
}

export function generateDeathVerifications(inheritanceCases, count = 5) {
  return inheritanceCases.slice(0, count).map((ic) => ({
    inheritance_case_id: ic.id,
    family_ownership_id: ic.family_ownership_id,
    parcel_id: ic.parcel_id,
    deceased_name: `Late ${fullName()}`,
    date_of_death: dateOnly(400),
    place_of_death: pick([`${pick(COMMUNITIES).name} General Hospital`, "Lagos University Teaching Hospital", "Home — " + address(), "Federal Medical Centre Umuahia"]),
    family_confirmation: true,
    family_confirmed_by: fullName(),
    family_confirmation_date: dateOnly(350),
    community_confirmation: Math.random() > 0.3,
    community_confirmed_by: `Chief ${fullName()}`,
    community_confirmation_date: dateOnly(330),
    lg_confirmation: Math.random() > 0.4,
    lg_confirmed_by: "LGA Registrar, Greenfield LGA",
    lg_confirmation_date: dateOnly(300),
    verification_status: pick(["pending", "verified", "verified", "verified"]),
    submitted_by: "citizen.demo@landsecure.app",
    submitted_by_name: fullName(),
    is_deleted: false,
  }));
}

export function generateFamilyMeetingResolutions(familyOwnerships, count = 5) {
  const statuses = ["draft", "adopted", "adopted", "amended", "withdrawn"];
  return familyOwnerships.slice(0, count).map((fo, i) => ({
    resolution_reference: `FMR/${2024}/${String(i + 1).padStart(3, "0")}`,
    family_name: fo.family_name,
    family_ownership_id: fo.id,
    parcel_id: fo.parcel_id,
    parcel_number: fo.parcel_number,
    meeting_date: dateOnly(120),
    meeting_location: `${fo.family_name} Compound, ${pick(COMMUNITIES).name}`,
    meeting_purpose: pick([
      "Distribution of inherited land to registered beneficiaries",
      "Formal resolution of boundary dispute with neighbouring family",
      "Appointment of new family representative for land matters",
      "Ratification of subdivision plan approved by Surveyor General",
    ]),
    resolution_summary: pick([
      "Meeting resolved unanimously to proceed with equal distribution of parcel among all registered beneficiaries.",
      "Family agreed to engage a licensed surveyor for formal boundary demarcation before subdivision.",
      "New family head elected following demise of previous head. Land records to be updated accordingly.",
    ]),
    chairperson: fo.family_head,
    secretary: fullName(),
    number_of_attendees: rndInt(8, 35),
    status: pick(statuses),
    submitted_by: "citizen.demo@landsecure.app",
    submitted_by_name: fo.family_head,
    is_deleted: false,
  }));
}