// Phase 2: Seed Field Reports, Disputes, Survey Documents, Fraud Alerts, Audit Logs
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_NAMES = [
  "Chukwuemeka","Ngozi","Emeka","Ifeoma","Adaeze","Obinna","Chioma","Kelechi","Uchenna","Amarachi",
  "Blessing","Chidi","Nkechi","Ifeanyi","Oluchi","Musa","Fatima","Usman","Aisha","Abdullahi",
  "Hafsa","Yusuf","Sule","Zainab","Halima","Mohammed","Amina","Danladi","Patience","Gideon",
  "Adebayo","Funmilayo","Taiwo","Kehinde","Yewande","Tobi","Lara","Chinwe","Nnamdi","Onyeka"
];
const LAST_NAMES = [
  "Okafor","Eze","Ibrahim","Bello","Danjuma","Nwosu","Adeyemi","Fashola","Obi","Nwachukwu",
  "Uzoma","Chukwu","Obiora","Aneke","Okorie","Hassan","Aliyu","Garba","Lawan","Bukar",
  "Adeleke","Bamidele","Afolabi","Adesanya","Okpara","Ugwu","Nnaji","Ezeh","Okonkwo","Achebe"
];
const STREETS = [
  "Mango Street","Palm Avenue","Independence Road","Market Street","Church Lane","River Road",
  "Unity Street","Progress Avenue","Community Road","School Lane","Farm Road","Bridge Street",
  "New Layout Road","Old Town Street","Industrial Way","Estate Close"
];
const WARDS = [
  "Central Ward","South Ward","North Ward","East Ward","West Ward","Market Ward",
  "Old Town Ward","New Layout Ward","Industrial Ward","Agricultural Ward","Riverside Ward","Hilltop Ward"
];
const COMMUNITIES = [
  "Greenfield Central","Emeka Town","Okafor Hills","Ibrahim Quarters","Bello Estate",
  "New Danjuma","Eze Valley","Adeyemi Grove","Nwosu Settlement","Greenfield South"
];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function addr(ward) { return `${rndInt(1,120)} ${pick(STREETS)}, ${ward||pick(WARDS)}`; }
function dateOnly(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - rndInt(0, daysAgo));
  return d.toISOString().split("T")[0];
}
function randomDate(startAgo, endAgo=0) {
  const s = new Date(); s.setDate(s.getDate() - startAgo);
  const e = new Date(); e.setDate(e.getDate() - endAgo);
  return new Date(s.getTime() + Math.random()*(e.getTime()-s.getTime())).toISOString();
}

const FIELD_DESCRIPTIONS = [
  "Boundary markers found intact. No encroachment detected. Owner present and cooperative.",
  "Site cleared. Building foundations visible. Owner confirmed identity.",
  "Agricultural plot — crops growing on northern half. GPS verified.",
  "Commercial plot — existing structure matches survey plan dimensions.",
  "GPS coordinates verified against survey plan. Minor discrepancy of 0.3m — within tolerance.",
  "Neighbouring landowner present and confirmed boundary agreement with surveyor.",
  "Boundary markers partially removed. Re-staking required before approval.",
  "Flood risk visible in south-east corner. Noted for compliance review.",
  "Community land — meeting hall and borehole present. Elders confirmed boundaries.",
  "Industrial site — perimeter fencing complete. No encroachment detected.",
  "Residential compound — 3 completed structures within parcel bounds.",
  "Large agricultural plot with cashew and palm trees. Area matches survey plan.",
  "Disputed parcel — conflicting boundary markers found on eastern edge.",
  "Survey markers freshly planted. Owner claims prior occupation since 2015.",
  "Mixed-use property — ground floor commercial, upper floors residential.",
];

const DISPUTE_DESCRIPTIONS = [
  "Complainant claims the approved survey plan boundary does not match physical markers. Requesting re-survey.",
  "A second person has come forward claiming ownership with an older deed of conveyance predating current registration.",
  "Encroachment by neighbouring property owner who has extended a fence line by approximately 2 metres.",
  "Survey plan submitted appears to duplicate an existing approved survey plan (SN/2023/4421).",
  "Family dispute: two siblings both claim right to inherit this parcel from deceased father.",
  "Community leader objects to reclassification of this parcel from agricultural to commercial use.",
  "Double allocation detected — same plot coordinates assigned by two different officers in 2024.",
  "GPS coordinates submitted do not match physical location. Suspected fraudulent relocation of survey markers.",
  "Traditional ruler claims this parcel falls within communal land designated for public use.",
  "Complainant alleges the registered owner was not present during boundary survey. Documents may be forged.",
  "Boundary overlap of approximately 312sqm with adjacent registered parcel GFL/2024/0003.",
  "Survey plan reference number SN/2024/0778 has been used for two separate parcel registrations.",
  "Claimant presents 1998 allocation letter that predates the 2023 registration currently on record.",
  "Road encroachment — parcel boundary extends 1.8 metres into public road corridor.",
  "Widow claims she was not consulted during the inheritance registration. Customary law violation alleged.",
];

const AUDIT_ACTIONS = [
  {action:"PARCEL_REGISTERED",entity:"LandParcel",tmpl:"New parcel registered: {parcel} by {user}."},
  {action:"PARCEL_APPROVED",entity:"LandParcel",tmpl:"Parcel {parcel} approved by Surveyor General."},
  {action:"PARCEL_REJECTED",entity:"LandParcel",tmpl:"Parcel {parcel} rejected. Reason: Incomplete documentation."},
  {action:"PARCEL_FROZEN",entity:"LandParcel",tmpl:"Parcel {parcel} frozen pending fraud investigation."},
  {action:"FIELD_REPORT_SUBMITTED",entity:"FieldReport",tmpl:"Field report submitted for parcel {parcel} by field agent."},
  {action:"FIELD_REPORT_REVIEWED",entity:"FieldReport",tmpl:"Field report reviewed and approved for parcel {parcel}."},
  {action:"DISPUTE_FILED",entity:"Dispute",tmpl:"Boundary dispute filed for parcel {parcel} by {user}."},
  {action:"DISPUTE_RESOLVED",entity:"Dispute",tmpl:"Dispute for parcel {parcel} resolved. All parties agreed."},
  {action:"FRAUD_FLAGGED",entity:"FraudAlert",tmpl:"Fraud alert raised for parcel {parcel}. Risk score elevated."},
  {action:"SURVEY_SUBMITTED",entity:"SurveyDocument",tmpl:"Survey plan submitted for parcel {parcel} by licensed surveyor."},
  {action:"SURVEY_APPROVED",entity:"SurveyDocument",tmpl:"Survey plan for parcel {parcel} reviewed and approved."},
  {action:"INHERITANCE_INITIATED",entity:"InheritanceCase",tmpl:"Inheritance case initiated for parcel {parcel} by family representative."},
  {action:"INHERITANCE_APPROVED",entity:"InheritanceCase",tmpl:"Inheritance case approved. Certificate generated for parcel {parcel}."},
  {action:"COMMUNITY_VALIDATION_SUBMITTED",entity:"CommunityValidation",tmpl:"Community validation submitted for parcel {parcel}."},
  {action:"COMMUNITY_VALIDATION_APPROVED",entity:"CommunityValidation",tmpl:"Community validation approved by traditional authority for parcel {parcel}."},
  {action:"OWNERSHIP_TRANSFERRED",entity:"OwnershipHistory",tmpl:"Ownership transferred for parcel {parcel} from {user} to new owner."},
  {action:"BOUNDARY_UPDATED",entity:"LandParcel",tmpl:"Boundary coordinates updated for parcel {parcel} after re-survey."},
  {action:"CERTIFICATE_GENERATED",entity:"InheritanceCase",tmpl:"Certificate of occupancy generated for parcel {parcel}."},
  {action:"LOGIN",entity:"User",tmpl:"User {user} logged in to LandSecure Registry."},
  {action:"BULK_IMPORT",entity:"LandParcel",tmpl:"Bulk import of 50 parcel records completed by administrator."},
];

const USERS = [
  {email:"sg.demo@landsecure.app",name:"Dr. Amara Okafor"},
  {email:"surveyor.demo@landsecure.app",name:"Tobi Fashola"},
  {email:"agent.demo@landsecure.app",name:"Emeka Obi"},
  {email:"citizen.demo@landsecure.app",name:"Blessing Eze"},
  {email:"compliance.demo@landsecure.app",name:"Ngozi Adeyemi"},
  {email:"admin.demo@landsecure.app",name:"Super Admin"},
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'field_reports';

    // Fetch parcels to reference
    const parcels = await base44.asServiceRole.entities.LandParcel.list('-created_date', 200);
    if (!parcels || parcels.length === 0) {
      return Response.json({ error: 'No parcels found. Run phase 1 first.' }, { status: 400 });
    }

    let created = 0;

    if (mode === 'field_reports') {
      const count = body.count || 50;
      const reports = [];
      const types = ["boundary_check","photo_capture","gps_survey","site_inspection","verification","drone_survey"];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const gpsAcc = rnd(1, 16);
        const status = pick(["submitted","submitted","reviewed","reviewed","draft","flagged"]);
        reports.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          agent_email: "agent.demo@landsecure.app",
          agent_name: pick(["Emeka Obi","Taiwo Adeleke","Amaka Nwosu","Bello Garba","Funmi Adeyemi"]),
          report_type: pick(types),
          latitude: parseFloat((parcel.latitude + rnd(-0.002,0.002)).toFixed(6)),
          longitude: parseFloat((parcel.longitude + rnd(-0.002,0.002)).toFixed(6)),
          gps_accuracy: parseFloat(gpsAcc.toFixed(1)),
          capture_timestamp: randomDate(180, 1),
          device_identifier: pick(["Samsung Galaxy A53","Tecno Camon 20","Infinix Note 30","iPhone 13","Xiaomi Redmi Note 12"]),
          network_status: pick(["online","online","offline","synced_offline"]),
          capture_method: gpsAcc < 5 ? "gps_auto" : "manual_entry",
          description: pick(FIELD_DESCRIPTIONS),
          boundary_valid: gpsAcc < 10,
          status,
          quality_flag: gpsAcc<=5?"pass":gpsAcc<=10?"warn":"fail",
          quality_notes: gpsAcc>10 ? "GPS accuracy below threshold — recommend resurvey" : null,
        });
      }
      for (let i = 0; i < reports.length; i += 50) {
        await base44.asServiceRole.entities.FieldReport.bulkCreate(reports.slice(i, i+50));
        created += Math.min(50, reports.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'disputes') {
      const count = body.count || 30;
      const statuses = ["open","under_review","under_review","resolved","escalated","closed"];
      const disputes = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const status = pick(statuses);
        disputes.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          complainant_email: "citizen.demo@landsecure.app",
          complainant_name: fullName(),
          dispute_type: pick(["boundary","ownership","fraud","encroachment","documentation","other"]),
          description: pick(DISPUTE_DESCRIPTIONS),
          status,
          priority: pick(["low","medium","high","critical"]),
          assigned_to: "sg.demo@landsecure.app",
          resolution_notes: status==="resolved" ? "After field investigation and boundary re-survey, all parties agreed to the revised demarcation. Survey plan updated." : null,
          resolved_date: status==="resolved" ? dateOnly(30) : null,
        });
      }
      for (let i = 0; i < disputes.length; i += 50) {
        await base44.asServiceRole.entities.Dispute.bulkCreate(disputes.slice(i, i+50));
        created += Math.min(50, disputes.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'fraud_alerts') {
      const count = body.count || 20;
      const alertTypes = ["duplicate_registration","forged_document","boundary_manipulation","ownership_fraud","suspicious_transfer","other"];
      const alerts = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const severity = pick(["medium","medium","high","high","low","critical"]);
        const status = pick(["open","open","under_investigation","resolved","escalated"]);
        alerts.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          flagged_by: pick(["system","system","surveyor.demo@landsecure.app","agent.demo@landsecure.app"]),
          flagged_by_name: pick(["Automated System","Tobi Fashola","Emeka Obi"]),
          alert_type: pick(alertTypes),
          severity,
          description: pick([
            `System detected duplicate GPS coordinates: this parcel shares exact lat/lng with another registered parcel. Suspected fraudulent duplicate registration.`,
            `Parcel boundary overlaps with an adjacent parcel by 312 square metres (8.9%). Spatial validation engine flagged as conflict.`,
            `Multiple ownership claims detected for this plot. Two separate registration attempts using different names but same physical address.`,
            `Survey plan number appears in records of two separate parcels. Possible re-use of survey documentation.`,
            `Allocation letter metadata indicates document was modified after signing. Timestamp inconsistency in PDF metadata.`,
            `GPS coordinates provided by claimant do not match physical location. Markers may have been fraudulently relocated.`,
            `Owner registered parcel within 7 days of alleged purchase date. Suspicious velocity of transactions.`,
            `Three separate claimants have submitted documents for this parcel within 60 days. Possible double allocation by official.`,
            `Survey plan references a cadastral sheet that does not exist in the National Survey Index. Suspected fabricated document.`,
            `Two deeds of conveyance for this parcel traced to same original grantor. One is suspected to be a forgery.`,
          ]),
          status,
          assigned_to: "compliance.demo@landsecure.app",
          investigation_notes: status==="resolved" ? "Investigation completed. Confirmed administrative error — no fraud. Records corrected." : null,
          resolved_date: status==="resolved" ? dateOnly(30) : null,
        });
      }
      for (let i = 0; i < alerts.length; i += 50) {
        await base44.asServiceRole.entities.FraudAlert.bulkCreate(alerts.slice(i, i+50));
        created += Math.min(50, alerts.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'audit_logs') {
      const count = body.count || 100;
      const logs = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const u = pick(USERS);
        const action = pick(AUDIT_ACTIONS);
        logs.push({
          user_email: u.email,
          user_name: u.name,
          action: action.action,
          entity_type: action.entity,
          entity_id: parcel.id,
          details: action.tmpl
            .replace("{parcel}", parcel.parcel_number)
            .replace("{user}", u.name),
        });
      }
      for (let i = 0; i < logs.length; i += 50) {
        await base44.asServiceRole.entities.AuditLog.bulkCreate(logs.slice(i, i+50));
        created += Math.min(50, logs.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'survey_documents') {
      const count = body.count || 50;
      const docs = [];
      const docTypes = ["survey_plan","cad_drawing","topographic_map","boundary_report","gis_data"];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const reviewStatus = pick(["pending","reviewed","approved","approved","rejected"]);
        docs.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          document_type: pick(docTypes),
          file_url: `https://landsecure-docs.example.com/survey/${parcel.parcel_number.replace(/\//g,"-")}-${i}.pdf`,
          surveyor_email: "surveyor.demo@landsecure.app",
          surveyor_name: pick(["Tobi Fashola","Emeka Fashola","Amara Surveyor","Chidi Okoye","Ngozi Survey"]),
          description: pick([
            "Survey plan prepared in accordance with NIS standards. All boundaries verified.",
            "CAD drawing exported from AutoCAD Civil 3D. Coordinate system: WGS84.",
            "Topographic survey showing elevation contours and drainage patterns.",
            "Boundary report following physical demarcation of parcel corners.",
            "GIS shapefile of parcel boundary including attributes.",
            "Survey plan endorsed by licensed surveyor. Filed with State Survey Registry.",
            "Re-survey conducted following boundary dispute resolution.",
          ]),
          review_status: reviewStatus,
          reviewed_by: reviewStatus !== "pending" ? "sg.demo@landsecure.app" : null,
          review_notes: reviewStatus==="approved" ? "Survey plan meets all regulatory standards. Approved." : reviewStatus==="rejected" ? "Survey plan does not meet minimum accuracy requirements. Re-submission required." : null,
        });
      }
      for (let i = 0; i < docs.length; i += 50) {
        await base44.asServiceRole.entities.SurveyDocument.bulkCreate(docs.slice(i, i+50));
        created += Math.min(50, docs.length - i);
      }
      return Response.json({ mode, created });
    }

    if (mode === 'community_validations') {
      const count = body.count || 15;
      const statuses = ["submitted","community_review","village_head_validation","traditional_authority_validation","compliance_review","approved","approved","rejected"];
      const vals = [];
      for (let i = 0; i < count; i++) {
        const parcel = parcels[i % parcels.length];
        const community = pick(COMMUNITIES);
        const status = pick(statuses);
        vals.push({
          parcel_id: parcel.id,
          parcel_number: parcel.parcel_number,
          community_name: community,
          village_name: pick(["Umueze","Agulu","Orlu","Achi","Oguta","Amesi","Nnobi","Mgbidi","Nkpor","Ukpor"]),
          ward: pick(WARDS),
          lga: "Greenfield Local Government",
          state: "Rivers State",
          validation_date: dateOnly(90),
          family_representative: fullName(),
          community_elder: `Chief ${fullName()}`,
          village_head: `Igwe ${pick(LAST_NAMES)} II of ${community}`,
          traditional_ruler: `Obi ${pick(LAST_NAMES)} III of Greenfield`,
          cdc_chairman: fullName(),
          status,
          community_review_by: status !== "submitted" ? `Chief ${fullName()}` : null,
          community_review_date: status !== "submitted" ? randomDate(60,20) : null,
          community_review_notes: status !== "submitted" ? "Community records confirm family has held this land for multiple generations." : null,
          submitted_by: "citizen.demo@landsecure.app",
          submitted_by_name: fullName(),
          is_deleted: false,
        });
      }
      for (let i = 0; i < vals.length; i += 50) {
        await base44.asServiceRole.entities.CommunityValidation.bulkCreate(vals.slice(i, i+50));
        created += Math.min(50, vals.length - i);
      }
      return Response.json({ mode, created });
    }

    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});