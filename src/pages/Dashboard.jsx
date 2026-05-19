import React from "react";
import { useOutletContext } from "react-router-dom";
import GeneralDashboard from "../components/dashboard/GeneralDashboard";
import SurveyorGeneralDashboard from "../components/dashboard/SurveyorGeneralDashboard";
import SurveyorDashboard from "../components/dashboard/SurveyorDashboard";
import FieldAgentDashboard from "../components/dashboard/FieldAgentDashboard";

export default function Dashboard() {
  const { user } = useOutletContext();
  const role = user?.role || "general_user";

  const dashboards = {
    general_user: GeneralDashboard,
    surveyor_general: SurveyorGeneralDashboard,
    surveyor: SurveyorDashboard,
    field_agent: FieldAgentDashboard,
  };

  const DashboardComponent = dashboards[role] || GeneralDashboard;

  return <DashboardComponent user={user} />;
}