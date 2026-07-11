import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { HEADER_LOGO } from '@/constants/branding';
import AdminGlobalSearch from '@/admin/components/AdminGlobalSearch';
import {
  LayoutDashboard, Users, FileCheck, Wallet, Percent, Award, BarChart3,
  MousePointerClick, Image as ImageIcon, Bell, ScrollText, LogOut, Shield, Monitor,
  Menu, X,
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

function navLinkClass(active, compact = false) {
  return `flex items-center gap-3 px-3 ${compact ? 'py-3' : 'py-2.5'} rounded-sm text-sm transition-all ${
    active
      ? 'bg-primary/15 text-primary border-l-2 border-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
  }`;
}

function AdminNavLink({ item, active, onNavigate, compact = false }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={navLinkClass(active, compact)}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium">{item.label}</span>
    </Link>
  );
}

function AdminSidebarFooter({ name, onLogout, compact = false }) {
  return (
    <div className={`border-t border-border ${compact ? 'p-5 pt-4' : 'p-4'}`}>
      <div className={`mb-3 ${compact ? '' : 'px-2'}`}>
        <div className="text-xs text-muted-foreground">Admin</div>
        <div className="text-sm font-semibold truncate">{name}</div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className={`w-full flex items-center gap-2 px-3 ${compact ? 'py-3' : 'py-2'} text-sm rounded-sm border border-border hover:border-primary/60 hover:text-primary transition`}
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  );
}

export default function AdminShell() {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const name = profile?.full_name || profile?.name || 'Administrateur';
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const isActive = (item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <div className="min-h-screen flex bg-background grain text-foreground admin-shell">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-black/95 backdrop-blur sticky top-0 h-screen shrink-0" data-testid="admin-sidebar">
        <div className="px-6 py-6 border-b border-border">
          <Link to="/admin" className="block">
            <img src={HEADER_LOGO} alt="VSM Ambassador Admin" className="w-28" />
          </Link>
          <div className="flex items-center gap-2 mt-3 text-[10px] uppercase tracking-wider text-primary">
            <Shield className="w-3 h-3" /> Programme Ambassadeur
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <AdminNavLink key={item.to} item={item} active={isActive(item)} />
          ))}
        </nav>
        <AdminSidebarFooter name={name} onLogout={handleLogout} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile + desktop */}
        <header className="sticky top-0 z-30 border-b border-border bg-black/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 py-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-sm hover:bg-secondary shrink-0"
              aria-label="Ouvrir le menu admin"
              data-testid="admin-mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/admin" className="lg:hidden shrink-0">
              <img src={HEADER_LOGO} alt="VSM Admin" className="h-8 w-auto" />
            </Link>
            <div className="flex-1 min-w-0 flex justify-end lg:justify-start">
              <AdminGlobalSearch />
            </div>
          </div>
        </header>

        <main className="flex-1 pb-[env(safe-area-inset-bottom)]">
          <Outlet />
        </main>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" data-testid="admin-mobile-drawer">
          <div className="absolute inset-0 bg-black/70" onClick={closeMobile} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full w-[min(100vw-3rem,18rem)] bg-black/95 border-r border-border flex flex-col animate-fade-in">
            <div className="px-5 py-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <img src={HEADER_LOGO} alt="VSM Admin" className="h-8 w-auto" />
                <div className="flex items-center gap-2 mt-2 text-[10px] uppercase tracking-wider text-primary">
                  <Shield className="w-3 h-3" /> Admin Ambassadeur
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                className="p-2 -mr-1 rounded-sm hover:bg-secondary shrink-0"
                aria-label="Fermer le menu"
                data-testid="admin-mobile-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overscroll-contain">
              {NAV.map((item) => (
                <AdminNavLink
                  key={item.to}
                  item={item}
                  active={isActive(item)}
                  onNavigate={closeMobile}
                  compact
                />
              ))}
            </nav>
            <AdminSidebarFooter name={name} onLogout={handleLogout} compact />
          </aside>
        </div>
      )}
    </div>
  );
}
