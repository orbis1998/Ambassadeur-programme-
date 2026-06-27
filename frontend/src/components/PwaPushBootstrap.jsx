import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushSubscription } from '@/lib/usePushSubscription';

/** Auto-enable Web Push once the ambassador is approved. */
export default function PwaPushBootstrap() {
  const { user, isApproved, loading } = useAuth();
  const { subscribed, permission, configured, supported, subscribe } = usePushSubscription();
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (loading || !user || !isApproved) return;
    if (subscribed || permission === 'denied' || !configured || !supported) return;
    if (attemptsRef.current >= 2) return;

    const timer = setTimeout(() => {
      attemptsRef.current += 1;
      subscribe();
    }, attemptsRef.current === 0 ? 2500 : 8000);

    return () => clearTimeout(timer);
  }, [loading, user, isApproved, subscribed, permission, configured, supported, subscribe]);

  return null;
}
