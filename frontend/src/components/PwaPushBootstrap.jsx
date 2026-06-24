import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushSubscription } from '@/lib/usePushSubscription';

const AUTO_KEY = 'vsm-push-auto-requested';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** After PWA install / standalone launch, request push permission once for approved ambassadors. */
export default function PwaPushBootstrap() {
  const { isApproved } = useAuth();
  const push = usePushSubscription();
  const tried = useRef(false);

  useEffect(() => {
    const tryAutoSubscribe = async () => {
      if (tried.current) return;
      if (!isStandalone() || !isApproved || !push.supported || push.subscribed) return;
      if (push.permission === 'denied') return;
      if (localStorage.getItem(AUTO_KEY) === '1') return;

      tried.current = true;
      localStorage.setItem(AUTO_KEY, '1');
      await push.subscribe();
    };

    window.addEventListener('vsm-pwa-installed', tryAutoSubscribe);
    tryAutoSubscribe();

    return () => window.removeEventListener('vsm-pwa-installed', tryAutoSubscribe);
  }, [isApproved, push.supported, push.subscribed, push.permission, push.subscribe]);

  useEffect(() => {
    const onInstalled = () => window.dispatchEvent(new Event('vsm-pwa-installed'));
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  return null;
}
