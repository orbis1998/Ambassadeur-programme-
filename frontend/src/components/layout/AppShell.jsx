import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { HEADER_LOGO, ACADEMY_URL } from '@/constants/branding';
import {
  LayoutDashboard, Wallet, Image as ImageIcon, Settings as SettingsIcon,
  Bell, LogOut, Menu, X, Award, GraduationCap, ExternalLink,
} from 'lucide-react';
import PwaNotificationPrompt from '@/components/PwaNotificationPrompt';
import { useState } from 'react';

const NAV = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, testid: 'nav-dashboard' },
  { to: '/dashboard/withdraw', label: 'Retraits', icon: Wallet, testid: 'nav-withdraw' },
  { to: '/dashboard/leaderboard', label: 'Classement', icon: Award, testid: 'nav-leaderboard' },
  { to: '/dashboard/resources', label: 'Ressources', icon: ImageIcon, testid: 'nav-resources' },
  { href: ACADEMY_URL, label: 'Académie', icon: GraduationCap, testid: 'nav-academy', external: true },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell, testid: 'nav-notifications' },
  { to: '/dashboard/settings', label: 'Paramètres', icon: SettingsIcon, testid: 'nav-settings' },
];

function navItemClass(active, compact = false) {
  return `flex items-center gap-3 px-3 ${compact ? 'py-3' : 'py-2.5'} rounded-sm text-sm transition-all ${
    active
      ? 'bg-primary/15 text-primary border-l-2 border-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
  }`;
}

function NavItem({ item, active, onNavigate, mobile = false }) {
  const Icon = item.icon;
  const testId = mobile ? `m-${item.testid}` : item.testid;

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        onClick={onNavigate}
        className={`${navItemClass(false, mobile)} border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium flex-1">{item.label}</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link
      to={item.to}
      data-testid={testId}
      onClick={onNavigate}
      className={navItemClass(active, mobile)}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium">{item.label}</span>
    </Link>
  );
}

export default function AppShell() {
  const { signOut, profile, application } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const name = profile?.full_name || application?.full_name || 'Ambassadeur';
  const closeMobile = () => setMobileOpen(false);

  const isActive = (item) => {
    if (item.external) return false;
    return location.pathname === item.to
      || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
  };

  return (
    <div className="min-h-screen flex bg-background grain text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-black/95 backdrop-blur sticky top-0 h-screen" data-testid="sidebar">
        <div className="px-6 py-7 border-b border-border">
          <Link to="/dashboard" className="block" data-testid="logo-link">
            <img src={HEADER_LOGO} alt="VSM Ambassador Program" className="w-32" data-testid="sidebar-logo" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map((item) => (
            <NavItem key={item.testid} item={item} active={isActive(item)} />
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-3 px-2">
            <div className="text-xs text-muted-foreground">Connecté en tant que</div>
            <div className="text-sm font-semibold truncate" data-testid="sidebar-user-name">{name}</div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm border border-border hover:border-primary/60 hover:text-primary transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-black/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="block">
            <img src={HEADER_LOGO} alt="VSM Ambassador" data-testid="mobile-logo" className="h-9" />
          </Link>
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn" className="p-2 rounded-sm hover:bg-secondary">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-black/70" onClick={closeMobile} />
          <div className="absolute right-0 top-0 h-full w-72 bg-card border-l border-border p-5 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <img src={HEADER_LOGO} alt="VSM Ambassador" className="h-9" />
              <button onClick={closeMobile} data-testid="mobile-close-btn" className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <NavItem
                  key={item.testid}
                  item={item}
                  active={isActive(item)}
                  onNavigate={closeMobile}
                  mobile
                />
              ))}
              <button onClick={handleLogout} data-testid="m-logout-btn"
                className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm text-muted-foreground hover:bg-secondary mt-4 border-t border-border pt-4">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <PwaNotificationPrompt />
        <Outlet />
      </main>
    </div>
  );
}
