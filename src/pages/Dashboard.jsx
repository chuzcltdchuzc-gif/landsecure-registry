import React from "react";
import { useOutletContext } from "react-router-dom";
import GeneralDashboard from "../components/dashboard/GeneralDashboard";
import SurveyorGeneralDashboard from "../components/dashboard/SurveyorGeneralDashboard";
import SurveyorDashboard from "../components/dashboard/SurveyorDashboard";
import FieldAgentDashboard from "../components/dashboard/FieldAgentDashboard";
import SuperAdminDashboard from "../components/dashboard/SuperAdminDashboard";
import ComplianceDashboard from "../components/dashboard/ComplianceDashboard";

export default function Dashboard() {
  const { user } = useOutletContext();
  const role = user?.role || "general_user";

  const dashboards = {
    general_user: GeneralDashboard,
    surveyor_general: SurveyorGeneralDashboard,
    surveyor: SurveyorDashboard,
    field_agent: FieldAgentDashboard,
    super_admin: SuperAdminDashboard,
    compliance_officer: ComplianceDashboard,
  };

  const DashboardComponent = dashboards[role] || GeneralDashboard;

  return <DashboardComponent user={user} />;
}