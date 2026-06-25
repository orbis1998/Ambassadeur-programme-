import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushSubscription } from '@/lib/usePushSubscription';

/** Auto-enable Web Push once the ambassador is approved (no manual CTA on dashboard). */
export default function PwaPushBootstrap() {
  const { user, isApproved, loading } = useAuth();
  const push = usePushSubscription();
  const triedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || !isApproved || triedRef.current) return;
    if (push.subscribed || push.permission === 'denied' || !push.configured || !push.supported) return;

    triedRef.current = true;
    push.subscribe();
  }, [loading, user, isApproved, push.subscribed, push.permission, push.configured, push.supported, push]);

  return null;
}
