import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { OPENING_LOGO } from '@/constants/branding';
import { isPwaInstallEligiblePath, isStandalonePwa, PWA_KEYS, pwaStorageGet, pwaStorageSet } from '@/lib/pwa';
import { usePwaInstall } from '@/lib/usePwaInstall';

export default function PwaInstallPrompt() {
  const location = useLocation();
  const { canInstall, installing, promptInstall, installed } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (installed || isStandalonePwa()) return undefined;
    if (pwaStorageGet(PWA_KEYS.installDismissed) === '1') return undefined;
    if (pwaStorageGet(PWA_KEYS.installCompleted) === '1') return undefined;
    if (!isPwaInstallEligiblePath(location.pathname)) return undefined;
    if (!canInstall) return undefined;

    const timer = setTimeout(() => {
      pwaStorageSet(PWA_KEYS.installSeen, '1');
      setOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname, canInstall, installed]);

  const dismiss = () => {
    pwaStorageSet(PWA_KEYS.installDismissed, '1');
    setOpen(false);
  };

  const handleInstall = async () => {
    if (!canInstall || installing) return;
    const ok = await promptInstall();
    if (ok) setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      data-testid="pwa-install-prompt"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-md vsm-card border-primary/30 bg-gradient-to-b from-primary/10 to-black p-6 sm:p-8 shadow-2xl shadow-primary/10 animate-fade-in">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground rounded-sm"
          aria-label="Fermer"
          data-testid="pwa-install-dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <img src={OPENING_LOGO} alt="" className="w-20 mx-auto mb-4" width={80} height={80} />
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2">VSM Ambassador</p>
          <h2 id="pwa-install-title" className="font-display text-xl sm:text-2xl font-bold uppercase">
            Installez l&apos;application
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Accédez à votre dashboard, vos commissions et vos notifications en un clic.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInstall}
          disabled={installing || !canInstall}
          data-testid="pwa-install-btn"
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold uppercase tracking-wider text-sm py-4 rounded-sm transition shadow-lg shadow-primary/20"
        >
          <Download className="w-5 h-5" />
          {installing ? 'Installation…' : 'Installer'}
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground py-2"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
