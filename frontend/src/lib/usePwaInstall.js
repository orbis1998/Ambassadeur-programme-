import { useCallback, useEffect, useState } from 'react';
import { isStandalonePwa, PWA_KEYS, pwaStorageGet, pwaStorageSet } from './pwa';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalonePwa());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (pwaStorageGet(PWA_KEYS.installCompleted) === '1') {
      setInstalled(true);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      pwaStorageSet(PWA_KEYS.installCompleted, '1');
      pwaStorageSet(PWA_KEYS.installSeen, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        pwaStorageSet(PWA_KEYS.installCompleted, '1');
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    installed: installed || isStandalonePwa(),
    installing,
    promptInstall,
  };
}
