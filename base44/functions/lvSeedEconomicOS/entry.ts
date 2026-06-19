import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.target === 'services') {
      const svcs = [
        { service_name: "Parcel Verification", service_code: "PARCEL_VERIFY", service_category: "PARCEL_VERIFICATION", service_description: "Full evidence verification of a single land parcel including confidence scoring, duplicate checks, GPS validation, and ownership structure analysis.", credit_cost: 10, cash_price: 5000, estimated_delivery_time: "24 hours", requires_review: true },
        { service_name: "Survey Plan Verification", service_code: "SURVEY_VERIFY", service_category: "SURVEY_PLAN_VERIFICATION", service_description: "Professional review and verification of submitted survey plans against platform evidence, boundary data, and existing records.", credit_cost: 15, cash_price: 7500, estimated_delivery_time: "48 hours", requires_review: true },
        { service_name: "Community Evidence Report", service_code: "COMMUNITY_EVIDENCE", service_category: "COMMUNITY_EVIDENCE_REPORT", service_description: "Structured report compiling all community attestations, traditional endorsements, and consensus analysis for a parcel.", credit_cost: 8, cash_price: 4000, estimated_delivery_time: "24 hours", requires_review: false },
        { service_name: "Due Diligence Report", service_code: "DD_REPORT", service_category: "DUE_DILIGENCE_REPORT", service_description: "Comprehensive due diligence package including verification status, community consensus, duplicate alerts, fraud signals, and trust score. Suitable for banks, law firms, and investors.", credit_cost: 25, cash_price: 12500, estimated_delivery_time: "3-5 business days", requires_review: true },
        { service_name: "Digital Certificate Generation", service_code: "CERT_GENERATE", service_category: "CERTIFICATE_GENERATION", service_description: "Generation of digital land evidence certificate with QR code verification, tamper-evident hash, and chain of custody documentation.", credit_cost: 5, cash_price: 2500, estimated_delivery_time: "2 hours", requires_review: false },
        { service_name: "Archive Digitization", service_code: "ARCHIVE_DIGITIZE", service_category: "ARCHIVE_DIGITIZATION", service_description: "Professional digitization of historical survey plans, family documents, and paper records into the LandVault evidence system.", credit_cost: 20, cash_price: 10000, estimated_delivery_time: "5-7 business days", requires_review: false },
        { service_name: "Surveyor Validation", service_code: "SURVEYOR_VALIDATE", service_category: "SURVEYOR_VALIDATION", service_description: "Validation and verification of surveyor credentials, professional standing, and historical work quality for institutional due diligence.", credit_cost: 10, cash_price: 5000, estimated_delivery_time: "48 hours", requires_review: true },
        { service_name: "Legal Search Package", service_code: "LEGAL_SEARCH", service_category: "LEGAL_SEARCH_PACKAGE", service_description: "Comprehensive search package for law firms including parcel history, chain of evidence, dispute history, and verification timeline.", credit_cost: 30, cash_price: 15000, estimated_delivery_time: "3-5 business days", requires_review: true },
        { service_name: "Bank Search Package", service_code: "BANK_SEARCH", service_category: "BANK_SEARCH_PACKAGE", service_description: "Due diligence package tailored for financial institutions including fraud risk assessment, duplicate analysis, and evidence confidence scoring.", credit_cost: 30, cash_price: 15000, estimated_delivery_time: "3-5 business days", requires_review: true },
        { service_name: "Compliance Report", service_code: "COMPLIANCE_RPT", service_category: "COMPLIANCE_REPORT", service_description: "Regulatory compliance report for government agencies, auditors, and institutional stakeholders. Includes audit trail verification and trust integrity scoring.", credit_cost: 20, cash_price: 10000, estimated_delivery_time: "5 business days", requires_review: true }
      ];
      const results = [];
      for (const svc of svcs) {
        const r = await sr.entities.ServiceCatalog.create(svc);
        results.push(r.id);
      }
      return Response.json({ created: results.length, ids: results });
    }

    if (body.target === 'institutions') {
      const plans = [
        { plan_name: "Bank Standard", plan_code: "BANK_STANDARD", plan_type: "BANK", monthly_fee: 150000, included_credits: 50, overage_rate: 500, api_access: true, report_access: true, priority_processing: false, max_users: 10, description: "Standard access for commercial banks conducting routine due diligence." },
        { plan_name: "Bank Premium", plan_code: "BANK_PREMIUM", plan_type: "BANK", monthly_fee: 350000, included_credits: 150, overage_rate: 400, api_access: true, report_access: true, priority_processing: true, max_users: 25, description: "Premium access with priority processing for high-volume institutional lenders." },
        { plan_name: "Law Firm Standard", plan_code: "LAW_STANDARD", plan_type: "LAW_FIRM", monthly_fee: 100000, included_credits: 30, overage_rate: 500, api_access: false, report_access: true, priority_processing: false, max_users: 5, description: "Legal due diligence access for property law firms." },
        { plan_name: "Law Firm Premium", plan_code: "LAW_PREMIUM", plan_type: "LAW_FIRM", monthly_fee: 250000, included_credits: 100, overage_rate: 400, api_access: true, report_access: true, priority_processing: true, max_users: 15, description: "Full legal research access with API integration." },
        { plan_name: "Survey Firm Professional", plan_code: "SURVEY_PRO", plan_type: "SURVEY_FIRM", monthly_fee: 75000, included_credits: 40, overage_rate: 300, api_access: true, report_access: true, priority_processing: false, max_users: 10, description: "Professional access for licensed surveying firms." },
        { plan_name: "Local Government Access", plan_code: "LGOV_STANDARD", plan_type: "LOCAL_GOVERNMENT", monthly_fee: 50000, included_credits: 100, overage_rate: 200, api_access: false, report_access: true, priority_processing: false, max_users: 20, description: "Subsidized access for local government authorities." }
      ];
      const results = [];
      for (const p of plans) {
        const r = await sr.entities.InstitutionPlan.create(p);
        results.push(r.id);
      }
      return Response.json({ created: results.length, ids: results });
    }

    return Response.json({ error: "Invalid target" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});