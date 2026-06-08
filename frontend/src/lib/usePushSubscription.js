import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export function usePushSubscription() {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription().then((s) => setSubscribed(!!s))).catch(() => {});
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    setBusy(true);
    try {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON ? sub.toJSON() : sub }),
      });
      setSubscribed(true);
      return true;
    } catch (e) {
      console.warn('push subscribe failed', e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, busy, subscribe };
}
