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
import UserManagement from './pages/gov/UserManagement';
import ParcelFreeze from './pages/gov/ParcelFreeze';
import FraudAlerts from './pages/gov/FraudAlerts';
import GlobalAudit from './pages/gov/GlobalAudit';
import ComplianceReports from './pages/gov/ComplianceReports';
import PendingApprovals from './pages/gov/PendingApprovals';
import BulkImport from './pages/gov/BulkImport';
import PilotDashboard from './pages/gov/PilotDashboard';
import AuditReports from './pages/gov/AuditReports';
import InheritanceManagement from './pages/InheritanceManagement';
import CustomaryGovernanceDashboard from './pages/gov/CustomaryGovernanceDashboard';
import ExecutiveDashboard from './pages/gov/ExecutiveDashboard';
import DemoGuide from './pages/DemoGuide';
import DemoDataSeed from './pages/gov/DemoDataSeed';
import PilotReports from './pages/gov/PilotReports';
import DataIntegrityReport from './pages/gov/DataIntegrityReport';
import PilotValidation from './pages/gov/PilotValidation';
import DemoReadinessReport from './pages/gov/DemoReadinessReport';
import PilotDeploymentPackage from './pages/gov/PilotDeploymentPackage';
import ProductionReadiness from './pages/gov/ProductionReadiness';
import PublicVerify from './pages/PublicVerify';
import EhimeRegisterLand from './pages/EhimeRegisterLand';
import EhimeParcels from './pages/EhimeParcels';
import EhimeParcelDetail from './pages/EhimeParcelDetail';
import PackageManagement from './pages/ehime/PackageManagement';

// LandVault
import LandVaultDashboard from './pages/landvault/LandVaultDashboard';
import SurveyorNetwork from './pages/landvault/SurveyorNetwork';
import ArchiveImportWizard from './pages/landvault/ArchiveImportWizard';
import SurveyorPublicProfile from './pages/landvault/SurveyorPublicProfile';
// Trust Architecture (public)
import TrustArchitecture from './pages/TrustArchitecture';
import FieldAgentDashboard from './pages/landvault/FieldAgentDashboard';
import LeadsList from './pages/landvault/LeadsList';
import LeadForm from './pages/landvault/LeadForm';
import LeadDetail from './pages/landvault/LeadDetail';
import ParcelsList from './pages/landvault/ParcelsList';
import ParcelForm from './pages/landvault/ParcelForm';
import ParcelDetail from './pages/landvault/ParcelDetail';
import EvidenceUpload from './pages/landvault/EvidenceUpload';
import SurveyorDashboard from './pages/landvault/SurveyorDashboard';
import CommunityValidatorQueue from './pages/landvault/CommunityValidatorQueue';
import PaymentRecord from './pages/landvault/PaymentRecord';
import GovernmentObserver from './pages/landvault/GovernmentObserver';
import LandVaultPublicVerify from './pages/landvault/LandVaultPublicVerify';
import DuplicateAlertDashboard from './pages/landvault/DuplicateAlertDashboard';
import EvidenceDetail from './pages/landvault/EvidenceDetail';
import ConsentCapture from './pages/landvault/ConsentCapture';
import PilotReadinessReport from './pages/landvault/PilotReadinessReport';
import DeploymentGovernanceAudit from './pages/landvault/DeploymentGovernanceAudit';
// Community Attestation Engine
import CommunityAttestationDashboard from './pages/landvault/CommunityAttestationDashboard';
import CommunityAttestationForm from './pages/landvault/CommunityAttestationForm';
import CommunityAttestationReview from './pages/landvault/CommunityAttestationReview';
import CommunityTransparency from './pages/landvault/CommunityTransparency';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, checkUserAuth } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading Aquasavannah LandVault...</p>
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
  // (excludes /demo which is public and doesn't need a role)
  const GOVERNANCE_ROLES = ['surveyor_general', 'super_admin', 'compliance_officer', 'licensed_surveyor', 'surveyor_partner', 'community_validator', 'government_observer'];
  if (user && !user.role_confirmed && !GOVERNANCE_ROLES.includes(user.role) && window.location.pathname !== '/demo') {
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
        <Route path="/gov/user-management" element={<UserManagement />} />
        <Route path="/gov/parcel-freeze" element={<ParcelFreeze />} />
        <Route path="/gov/fraud-alerts" element={<FraudAlerts />} />
        <Route path="/gov/global-audit" element={<GlobalAudit />} />
        <Route path="/gov/compliance-reports" element={<ComplianceReports />} />
        <Route path="/gov/pending-approvals" element={<PendingApprovals />} />
        <Route path="/gov/bulk-import" element={<BulkImport />} />
        <Route path="/gov/pilot-dashboard" element={<PilotDashboard />} />
        <Route path="/gov/audit-reports" element={<AuditReports />} />
        <Route path="/inheritance" element={<InheritanceManagement />} />
        <Route path="/gov/customary-governance" element={<CustomaryGovernanceDashboard />} />
        <Route path="/gov/executive-dashboard" element={<ExecutiveDashboard />} />
        <Route path="/gov/demo-seed" element={<DemoDataSeed />} />
        <Route path="/gov/pilot-reports" element={<PilotReports />} />
        <Route path="/gov/data-integrity" element={<DataIntegrityReport />} />
        <Route path="/gov/pilot-validation" element={<PilotValidation />} />
        <Route path="/gov/demo-readiness" element={<DemoReadinessReport />} />
        <Route path="/gov/deployment-package" element={<PilotDeploymentPackage />} />
        <Route path="/gov/production-readiness" element={<ProductionReadiness />} />
        <Route path="/demo-guide" element={<DemoGuide />} />
        {/* Ehime Mbano LGA Registry */}
        <Route path="/ehime/parcels" element={<EhimeParcels />} />
        <Route path="/ehime/register" element={<EhimeRegisterLand />} />
        <Route path="/ehime/parcel/:id" element={<EhimeParcelDetail />} />
        <Route path="/ehime/packages" element={<PackageManagement />} />
        {/* LandVault */}
        <Route path="/lv" element={<LandVaultDashboard />} />
        <Route path="/lv/field" element={<FieldAgentDashboard />} />
        <Route path="/lv/leads" element={<LeadsList />} />
        <Route path="/lv/leads/new" element={<LeadForm />} />
        <Route path="/lv/leads/:id" element={<LeadDetail />} />
        <Route path="/lv/leads/:id/edit" element={<LeadForm />} />
        <Route path="/lv/parcels" element={<ParcelsList />} />
        <Route path="/lv/parcels/new" element={<ParcelForm />} />
        <Route path="/lv/parcels/:id" element={<ParcelDetail />} />
        <Route path="/lv/parcels/:id/edit" element={<ParcelForm />} />
        <Route path="/lv/evidence" element={<EvidenceUpload />} />
        <Route path="/lv/evidence/new" element={<EvidenceUpload />} />
        <Route path="/lv/surveyor" element={<SurveyorDashboard />} />
        <Route path="/lv/validate" element={<CommunityValidatorQueue />} />
        <Route path="/lv/payments/new" element={<PaymentRecord />} />
        <Route path="/lv/observer" element={<GovernmentObserver />} />
        <Route path="/lv/duplicates" element={<DuplicateAlertDashboard />} />
        <Route path="/lv/evidence/:id" element={<EvidenceDetail evidenceId={null} parcelId={null} />} />
        <Route path="/lv/consent/:parcelId" element={<ConsentCapture />} />
        <Route path="/lv/readiness" element={<PilotReadinessReport />} />
        <Route path="/lv/governance" element={<DeploymentGovernanceAudit />} />
        <Route path="/lv/surveyor-network" element={<SurveyorNetwork />} />
        <Route path="/lv/archive-import" element={<ArchiveImportWizard />} />
        <Route path="/lv/surveyor/:id" element={<SurveyorPublicProfile />} />
        {/* Community Attestation Engine */}
        <Route path="/community-attestation" element={<CommunityAttestationDashboard />} />
        <Route path="/community-attestation/new" element={<CommunityAttestationForm />} />
        <Route path="/community-attestation/review" element={<CommunityAttestationReview />} />
        <Route path="/community-attestation/review/:id" element={<CommunityAttestationReview />} />
        <Route path="/community-attestation/:id" element={<CommunityAttestationReview />} />
      </Route>
      <Route path="/demo" element={<DemoAccess />} />
      <Route path="/verify" element={<PublicVerify />} />
      <Route path="/lv/verify" element={<LandVaultPublicVerify />} />
      <Route path="/trust" element={<TrustArchitecture />} />
      <Route path="/community-transparency" element={<CommunityTransparency />} />
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