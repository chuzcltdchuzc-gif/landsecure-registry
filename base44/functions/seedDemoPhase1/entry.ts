// Phase 1: Seed Land Parcels — no auth required (internal seeding only)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
const VILLAGES = ["Umueze","Alaojie","Obodo Nnewi","Agulu","Nkwere","Achi","Ozubulu","Ihiala","Orlu","Orsu","Amesi","Umunze","Nnobi","Oba","Igbo-Ukwu","Awka-Etiti","Uli","Osumenyi","Oguta","Mgbidi","Nkpor","Nnewi North","Oraukwu","Akpo","Ukpor"];
const WARDS = ["Central Ward","South Ward","North Ward","East Ward","West Ward","Market Ward","Old Town Ward","New Layout Ward","Industrial Ward","Agricultural Ward","Riverside Ward","Hilltop Ward"];
const FIRST_NAMES = ["Chukwuemeka","Ngozi","Emeka","Ifeoma","Adaeze","Obinna","Chioma","Kelechi","Uchenna","Amarachi","Blessing","Chidi","Nkechi","Ifeanyi","Oluchi","Musa","Fatima","Usman","Aisha","Abdullahi","Hafsa","Yusuf","Sule","Zainab","Halima","Mohammed","Amina","Danladi","Patience","Gideon","Ruth","Daniel","Grace","Adebayo","Funmilayo","Taiwo","Kehinde","Yewande","Olumide","Tunde","Shade","Bola","Femi","Tobi","Lara","Chinwe","Nnamdi","Obiora","Chiamaka","Onyeka"];
const LAST_NAMES = ["Okafor","Eze","Ibrahim","Bello","Danjuma","Nwosu","Adeyemi","Fashola","Obi","Nwachukwu","Uzoma","Chukwu","Obiora","Aneke","Okorie","Hassan","Aliyu","Garba","Lawan","Bukar","Adamu","Abubakar","Shehu","Maikano","Ango","Adeleke","Bamidele","Afolabi","Adesanya","Odunbaku","Okpara","Ugwu","Nnaji","Onwudiwe","Ezeh","Ogbu","Ani","Nwofor","Okonkwo","Achebe"];
const STREETS = ["Mango Street","Palm Avenue","Independence Road","Market Street","Church Lane","River Road","Unity Street","Progress Avenue","Community Road","School Lane","Farm Road","Bridge Street","New Layout Road","Old Town Street","Industrial Way","Estate Close","Victoria Road","King Street","Queen Avenue","Lagos Road","Abuja Close","Enugu Street"];
const LAND_USES = ["residential","commercial","agricultural","industrial","mixed_use","government"];
const STATUSES = ["pending","approved","approved","approved","approved","disputed","frozen","archived","rejected","pending"];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function addr(ward) { return `${rndInt(1,120)} ${pick(STREETS)}, ${ward || pick(WARDS)}`; }
function dateOnly(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - rndInt(0, daysAgo));
  return d.toISOString().split("T")[0];
}
function makePolygon(lat, lng, size) {
  const d = 0.0008 * Math.max(0.3, size);
  const r = () => (Math.random()-0.5)*0.0003;
  const ring = [[lng-d,lat-d],[lng+d,lat-d],[lng+d+r(),lat+d+r()],[lng-d+r(),lat+d],[lng-d,lat-d]];
  return JSON.stringify({type:"Polygon",coordinates:[ring]});
}
function fraudReasons(score) {
  const r=[];
  if(score>70) r.push("Duplicate GPS coordinates detected");
  if(score>60) r.push("Survey plan number matches another parcel");
  if(score>50) r.push("Ownership registered within 30 days of purchase");
  if(score>40) r.push("Boundary overlaps adjacent parcel by >5%");
  if(score>30) r.push("Multiple claims from same owner email");
  return JSON.stringify(r.slice(0,rndInt(1,3)));
}

function generateParcels(startIdx, count) {
  const parcels = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const community = pick(COMMUNITIES);
    const lat = community.lat + rnd(-0.03, 0.03);
    const lng = community.lng + rnd(-0.03, 0.03);
    const landUse = pick(LAND_USES);
    const status = pick(STATUSES);
    const size = landUse==="agricultural" ? rnd(0.5,15) : landUse==="industrial" ? rnd(0.3,5) : rnd(0.05,1.5);
    const fraudScore = status==="disputed"||status==="frozen" ? rndInt(45,95) : rndInt(0,35);
    const fraudLevel = fraudScore>70?"high":fraudScore>40?"medium":fraudScore>20?"low":"none";
    const ward = pick(WARDS);
    const village = pick(VILLAGES);
    const yr = rndInt(2022,2025);
    const seq = String(idx+11).padStart(4,"0");
    const approvalDate = status==="approved" ? dateOnly(200) : null;
    const spatialStatus = status==="disputed"||status==="frozen" ? pick(["overlap_warning","duplicate_warning","conflict_blocked"]) : pick(["valid","valid","valid","not_validated"]);
    const verif = status==="approved" ? pick(["field_verified","survey_verified","fully_verified"]) : pick(["unverified","field_verified"]);
    parcels.push({
      parcel_number: `GFL/${yr}/${seq}`,
      title: `${landUse.charAt(0).toUpperCase()+landUse.slice(1).replace("_"," ")} Parcel — ${community.name}`,
      owner_name: fullName(),
      address: addr(ward),
      state: "Rivers State",
      lga: "Greenfield Local Government",
      land_use: landUse,
      status,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      size_hectares: parseFloat(size.toFixed(4)),
      parcel_boundary: makePolygon(lat, lng, size),
      boundary_area: parseFloat((size*10000).toFixed(1)),
      boundary_source: pick(["gps_capture","survey_plan","manual_entry","cad_import","legacy_import"]),
      spatial_validation_status: spatialStatus,
      verification_status: verif,
      fraud_risk_score: fraudScore,
      fraud_risk_level: fraudLevel,
      fraud_risk_reasons: fraudScore>20 ? fraudReasons(fraudScore) : "[]",
      registered_by: pick(["surveyor.demo@landsecure.app","citizen.demo@landsecure.app","agent.demo@landsecure.app"]),
      approved_by: approvalDate ? "sg.demo@landsecure.app" : null,
      approval_date: approvalDate,
      notes: `${community.name}, ${village} village, ${ward}. Registered under Greenfield LGA pilot programme.`,
    });
  }
  return parcels;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const startIdx = body.startIdx || 0;
    const count = body.count || 100;
    const parcels = generateParcels(startIdx, count);
    const results = [];
    for (let i = 0; i < parcels.length; i += 50) {
      const batch = parcels.slice(i, i+50);
      const created = await base44.asServiceRole.entities.LandParcel.bulkCreate(batch);
      results.push(...(Array.isArray(created) ? created : [created]));
    }
    return Response.json({ created: results.length, startIdx, count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});