import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import PwaPushBootstrap from '@/components/PwaPushBootstrap';
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
import '@/App.css';
import { OPENING_LOGO } from '@/constants/branding';

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black grain" data-testid="splash">
      <img src={OPENING_LOGO} alt="VSM Ambassador Program" className="w-44 max-w-[70vw]" />
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading, isPending, isRejected } = useAuth();
  if (loading) return <Splash />;
  if (user) {
    if (isPending || isRejected) return <Navigate to="/pending" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
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
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/apply" element={<Apply />} />
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
      <PwaPushBootstrap />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
