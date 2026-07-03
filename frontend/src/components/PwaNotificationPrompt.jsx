import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePushSubscription } from '@/lib/usePushSubscription';
import { isStandalonePwa, PWA_KEYS, pwaStorageGet, pwaStorageSet } from '@/lib/pwa';

/** Shown once on dashboard when PWA is installed and push is not yet active. */
export default function PwaNotificationPrompt() {
  const { isApproved, loading } = useAuth();
  const { subscribed, permission, configured, supported, busy, error, subscribe } = usePushSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !isApproved) return undefined;
    const wasInstalled = pwaStorageGet(PWA_KEYS.installCompleted) === '1';
    if (!isStandalonePwa() && !wasInstalled) return undefined;
    if (subscribed || permission === 'denied') {
      pwaStorageSet(PWA_KEYS.notifDone, '1');
      return undefined;
    }
    if (pwaStorageGet(PWA_KEYS.notifDone) === '1') return undefined;
    if (pwaStorageGet(PWA_KEYS.notifDismissed) === '1') return undefined;
    if (!supported || !configured) return undefined;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [loading, isApproved, subscribed, permission, supported, configured]);

  const dismiss = () => {
    pwaStorageSet(PWA_KEYS.notifDismissed, '1');
    setOpen(false);
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      pwaStorageSet(PWA_KEYS.notifDone, '1');
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-notif-title"
      data-testid="pwa-notif-prompt"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />
      <div className="relative w-full max-w-md vsm-card border-primary/30 bg-gradient-to-b from-black to-primary/10 p-6 sm:p-8 shadow-2xl animate-fade-in">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground rounded-sm"
          aria-label="Fermer"
          data-testid="pwa-notif-dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <h2 id="pwa-notif-title" className="font-display text-xl sm:text-2xl font-bold uppercase">
            Activez les notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Soyez alerté dès qu&apos;une vente est confirmée, qu&apos;une commission est créditée ou que votre candidature est validée.
          </p>
        </div>

        {error && (
          <p className="text-xs text-destructive text-center mb-4" role="alert">{error}</p>
        )}

        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          data-testid="pwa-notif-enable-btn"
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold uppercase tracking-wider text-sm py-4 rounded-sm transition"
        >
          <Bell className="w-5 h-5" />
          {busy ? 'Activation…' : 'Activer les notifications'}
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
