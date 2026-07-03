import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import PwaPushBootstrap from '@/components/PwaPushBootstrap';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import Login from '@/pages/Login';
import Apply from '@/pages/Apply';
import Pending from '@/pages/Pending';
import Dashboard from '@/pages/Dashboard';
import Withdraw from '@/pages/Withdraw';
import Leaderboard from '@/pages/Leaderboard';
import Resources from '@/pages/Resources';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import TrackingRedirect from '@/pages/TrackingRedirect';
import AppShell from '@/components/layout/AppShell';
import AdminShell from '@/admin/layout/AdminShell';
import AdminOverview from '@/admin/pages/AdminOverview';
import AdminApplications from '@/admin/pages/AdminApplications';
import AdminAmbassadors from '@/admin/pages/AdminAmbassadors';
import AdminAmbassadorDetail from '@/admin/pages/AdminAmbassadorDetail';
import AdminTracking from '@/admin/pages/AdminTracking';
import AdminWithdrawals from '@/admin/pages/AdminWithdrawals';
import AdminCommissions from '@/admin/pages/AdminCommissions';
import AdminTiers from '@/admin/pages/AdminTiers';
import AdminLeaderboard from '@/admin/pages/AdminLeaderboard';
import AdminResources from '@/admin/pages/AdminResources';
import AdminNotifications from '@/admin/pages/AdminNotifications';
import AdminAuditLog from '@/admin/pages/AdminAuditLog';
import '@/App.css';
import { OPENING_LOGO } from '@/constants/branding';

const AmbassadorLanding = lazy(() => import('@/pages/landing/AmbassadorLanding'));

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black grain" data-testid="splash">
      <img src={OPENING_LOGO} alt="VSM Ambassador Program" className="w-44 max-w-[70vw]" />
    </div>
  );
}

/** Login page — admin → /admin ; ambassadeur → dashboard ou pending */
function LoginRoute() {
  const { user, loading, isAdmin, isApproved, isPending, isRejected, userDataLoaded } = useAuth();
  if (loading) return <Splash />;
  if (user && userDataLoaded) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isApproved) return <Navigate to="/dashboard" replace />;
    if (isPending || isRejected) return <Navigate to="/pending" replace />;
    return <Navigate to="/apply" replace />;
  }
  if (user && !userDataLoaded) return <Splash />;
  return <Login />;
}

/** Registration — guests only; connected users go to their space */
function ApplyRoute() {
  const { user, loading, isAdmin, isApproved, isPending, isRejected } = useAuth();
  if (loading) return <Splash />;
  if (user) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isApproved) return <Navigate to="/dashboard" replace />;
    if (isPending || isRejected) return <Navigate to="/pending" replace />;
  }
  return <Apply />;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireAuth({ children, requireApproved = false }) {
  const { user, loading, isAdmin, isApproved, isPending, isRejected } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isAdmin && requireApproved) return <Navigate to="/admin" replace />;
  if (requireApproved && !isApproved) {
    if (isPending || isRejected) return <Navigate to="/pending" replace />;
    return <Navigate to="/apply" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/ambassadeur" element={<Suspense fallback={<Splash />}><AmbassadorLanding /></Suspense>} />
      <Route path="/programme-ambassadeur" element={<Navigate to="/ambassadeur" replace />} />
      <Route path="/ambassador" element={<Navigate to="/ambassadeur" replace />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/r/:slug" element={<TrackingRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/apply" element={<ApplyRoute />} />
      <Route path="/pending" element={<RequireAuth><Pending /></RequireAuth>} />
      <Route element={<RequireAuth requireApproved><AppShell /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/withdraw" element={<Withdraw />} />
        <Route path="/dashboard/leaderboard" element={<Leaderboard />} />
        <Route path="/dashboard/resources" element={<Resources />} />
        <Route path="/dashboard/notifications" element={<Notifications />} />
        <Route path="/dashboard/settings" element={<Settings />} />
      </Route>
      <Route element={<RequireAdmin><AdminShell /></RequireAdmin>}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/ambassadors" element={<AdminAmbassadors />} />
        <Route path="/admin/ambassadors/:userId" element={<AdminAmbassadorDetail />} />
        <Route path="/admin/tracking" element={<AdminTracking />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
        <Route path="/admin/commissions" element={<AdminCommissions />} />
        <Route path="/admin/tiers" element={<AdminTiers />} />
        <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
        <Route path="/admin/resources" element={<AdminResources />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/audit" element={<AdminAuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PwaPushBootstrap />
      <BrowserRouter>
        <PwaInstallPrompt />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
