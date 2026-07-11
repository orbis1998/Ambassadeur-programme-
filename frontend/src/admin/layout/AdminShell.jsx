import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { HEADER_LOGO } from '@/constants/branding';
import AdminGlobalSearch from '@/admin/components/AdminGlobalSearch';
import {
  LayoutDashboard, Users, FileCheck, Wallet, Percent, Award, BarChart3,
  MousePointerClick, Image as ImageIcon, Bell, ScrollText, LogOut, Shield, Monitor,
} from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/applications', label: 'Candidatures', icon: FileCheck },
  { to: '/admin/ambassadors', label: 'Ambassadeurs', icon: Users },
  { to: '/admin/tracking', label: 'Tracking', icon: MousePointerClick },
  { to: '/admin/withdrawals', label: 'Retraits', icon: Wallet },
  { to: '/admin/commissions', label: 'Commissions', icon: Percent },
  { to: '/admin/tiers', label: 'Niveaux', icon: Award },
  { to: '/admin/leaderboard', label: 'Classement', icon: BarChart3 },
  { to: '/admin/resources', label: 'Ressources', icon: ImageIcon },
  { to: '/admin/landing', label: 'Landing page', icon: Monitor },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/audit', label: 'Historique', icon: ScrollText },
];

export default function AdminShell() {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const name = profile?.full_name || profile?.name || 'Administrateur';

  const isActive = (item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <div className="min-h-screen flex bg-background grain text-foreground admin-shell">
      <aside className={`hidden lg:flex flex-col border-r border-border bg-black/95 backdrop-blur sticky top-0 h-screen ${collapsed ? 'w-20' : 'w-64'}`} data-testid="admin-sidebar">
        <div className="px-6 py-6 border-b border-border">
          <Link to="/admin" className="block">
            <img src={HEADER_LOGO} alt="VSM Ambassador Admin" className="w-28" />
          </Link>
          <div className="flex items-center gap-2 mt-3 text-[10px] uppercase tracking-wider text-primary">
            <Shield className="w-3 h-3" /> Programme Ambassadeur
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all ${
                  active ? 'bg-primary/15 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-3 px-2">
            <div className="text-xs text-muted-foreground">Admin</div>
            <div className="text-sm font-semibold truncate">{name}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm border border-border hover:border-primary/60 hover:text-primary transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-black/90 backdrop-blur px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
          <div className="lg:hidden font-display font-bold text-primary text-sm uppercase tracking-wider">Admin Ambassadeur</div>
          <AdminGlobalSearch />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
