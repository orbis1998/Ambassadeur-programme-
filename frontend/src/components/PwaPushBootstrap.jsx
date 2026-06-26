import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushSubscription } from '@/lib/usePushSubscription';

/** Auto-enable Web Push once the ambassador is approved. */
export default function PwaPushBootstrap() {
  const { user, isApproved, loading } = useAuth();
  const push = usePushSubscription();
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (loading || !user || !isApproved) return;
    if (push.subscribed || push.permission === 'denied' || !push.configured || !push.supported) return;
    if (attemptsRef.current >= 2) return;

    const timer = setTimeout(() => {
      attemptsRef.current += 1;
      push.subscribe();
    }, attemptsRef.current === 0 ? 2500 : 8000);

    return () => clearTimeout(timer);
  }, [loading, user, isApproved, push.subscribed, push.permission, push.configured, push.supported, push.subscribe]);

  return null;
}
