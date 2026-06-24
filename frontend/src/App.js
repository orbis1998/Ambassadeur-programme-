import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BRAND } from '@/constants/branding';
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
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import PwaPushBootstrap from '@/components/PwaPushBootstrap';
import '@/App.css';

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black grain" data-testid="splash">
      <img
        src={BRAND.logo}
        alt="VSM Ambassador Program"
        className="w-44 max-w-[70vw] animate-fade-in"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}

function LoginRoute() {
  const { user, loading, isApproved, isPending, isRejected } = useAuth();
  if (loading) return <Splash />;
  if (user && isApproved) return <Navigate to="/dashboard" replace />;
  if (user && (isPending || isRejected)) return <Navigate to="/pending" replace />;
  return <Login />;
}

function ApplyRoute() {
  const { user, loading, isApproved, isPending, isRejected } = useAuth();
  if (loading) return <Splash />;
  if (user && isApproved) return <Navigate to="/dashboard" replace />;
  if (user && (isPending || isRejected)) return <Navigate to="/pending" replace />;
  return <Apply />;
}

function RequireAuth({ children, requireApproved = false }) {
  const { user, loading, isApproved, isPending, isRejected, application } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (requireApproved && !isApproved) {
    if (isPending || isRejected) return <Navigate to="/pending" replace />;
    if (!application) return <Navigate to="/apply" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/r/:slug" element={<TrackingRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/apply" element={<ApplyRoute />} />
      <Route path="/pending" element={
        <RequireAuth><Pending /></RequireAuth>
      } />
      <Route element={
        <RequireAuth requireApproved><AppShell /></RequireAuth>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/withdraw" element={<Withdraw />} />
        <Route path="/dashboard/leaderboard" element={<Leaderboard />} />
        <Route path="/dashboard/resources" element={<Resources />} />
        <Route path="/dashboard/notifications" element={<Notifications />} />
        <Route path="/dashboard/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <PwaInstallPrompt />
        <PwaPushBootstrap />
      </BrowserRouter>
    </AuthProvider>
  );
}
