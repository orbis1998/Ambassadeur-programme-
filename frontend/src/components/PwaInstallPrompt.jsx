import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'vsm-pwa-install-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] max-w-md mx-auto animate-fade-up" data-testid="pwa-install-prompt">
      <div className="vsm-card p-4 border-primary/40 bg-black/95 backdrop-blur shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/15 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm mb-1">Installer VSM Ambassador</div>
            <p className="text-xs text-muted-foreground mb-3">
              Ajoutez l&apos;app sur votre écran d&apos;accueil pour un accès rapide et les notifications.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={install}
                data-testid="pwa-install-btn"
                className="px-3 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-semibold uppercase tracking-wider"
              >
                Installer
              </button>
              <button
                type="button"
                onClick={dismiss}
                data-testid="pwa-install-dismiss"
                className="px-3 py-2 border border-border rounded-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
