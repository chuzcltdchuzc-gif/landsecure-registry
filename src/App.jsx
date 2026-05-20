import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import LandRegistry from './pages/LandRegistry';
import GISMap from './pages/GISMap';
import Approvals from './pages/Approvals';
import RegisterLand from './pages/RegisterLand';
import Disputes from './pages/Disputes';
import MySubmissions from './pages/MySubmissions';
import MyClaims from './pages/MyClaims';
import SurveyDocuments from './pages/SurveyDocuments';
import SurveyReviews from './pages/SurveyReviews';
import FieldReports from './pages/FieldReports';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import AssignedParcels from './pages/AssignedParcels';
import DemoAccess from './pages/DemoAccess';
import RoleSelection from './pages/RoleSelection';
import UserManagement from './pages/governance/UserManagement';
import FraudAlerts from './pages/governance/FraudAlerts';
import GovernanceAuditLog from './pages/governance/GovernanceAuditLog';
import ComplianceReports from './pages/governance/ComplianceReports';
import PlatformSettings from './pages/governance/PlatformSettings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, checkUserAuth } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading LandSecure Registry...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // New user with no role assigned yet — show role selection before entering the app
  // (excludes /demo which is public, and governance/admin roles which are assigned by admins)
  const governanceRoles = ['surveyor_general', 'super_admin', 'compliance_officer'];
  if (user && !user.role_confirmed && !governanceRoles.includes(user.role) && window.location.pathname !== '/demo') {
    return <RoleSelection onRoleSelected={() => checkUserAuth()} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lands" element={<LandRegistry />} />
        <Route path="/gis-map" element={<GISMap />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/register-land" element={<RegisterLand />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/my-submissions" element={<MySubmissions />} />
        <Route path="/my-claims" element={<MyClaims />} />
        <Route path="/survey-documents" element={<SurveyDocuments />} />
        <Route path="/survey-reviews" element={<SurveyReviews />} />
        <Route path="/field-reports" element={<FieldReports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/assigned-parcels" element={<AssignedParcels />} />
        {/* Governance routes */}
        <Route path="/governance/users" element={<UserManagement />} />
        <Route path="/governance/fraud-alerts" element={<FraudAlerts />} />
        <Route path="/governance/audit" element={<GovernanceAuditLog />} />
        <Route path="/governance/compliance-reports" element={<ComplianceReports />} />
        <Route path="/governance/settings" element={<PlatformSettings />} />
      </Route>
      <Route path="/demo" element={<DemoAccess />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App