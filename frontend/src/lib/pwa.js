const KEYS = {
  installSeen: 'vsm_pwa_install_seen',
  installDismissed: 'vsm_pwa_install_dismissed',
  installCompleted: 'vsm_pwa_install_completed',
  notifDismissed: 'vsm_pwa_notif_dismissed',
  notifDone: 'vsm_pwa_notif_done',
};

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true
  );
}

export function pwaStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function pwaStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const PWA_KEYS = KEYS;

/** Public ambassador-facing routes where install prompt may appear */
export function isAmbassadorPublicPath(pathname) {
  return (
    pathname === '/ambassadeur'
    || pathname === '/programme-ambassadeur'
    || pathname === '/ambassador'
    || pathname === '/login'
    || pathname === '/apply'
  );
}
