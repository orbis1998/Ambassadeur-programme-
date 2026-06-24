import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
  return arr;
}

async function saveSubscription(token, subscription) {
  const payload = JSON.stringify({ subscription: subscription.toJSON ? subscription.toJSON() : subscription });

  if (SUPABASE_URL) {
    const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/push-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
      },
      body: payload,
    });
    if (edgeRes.ok) return true;
  }

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  if (BACKEND_URL) {
    const backendRes = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: payload,
    });
    if (backendRes.ok) return true;
  }

  throw new Error('Impossible d\'enregistrer la subscription push.');
}

export function usePushSubscription() {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const configured = Boolean(VAPID_PUBLIC_KEY);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription().then((s) => setSubscribed(!!s)))
      .catch(() => {});
  }, [supported]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError('Notifications non supportées sur ce navigateur.');
      return false;
    }
    if (!configured) {
      setError('Clé VAPID manquante (REACT_APP_VAPID_PUBLIC_KEY).');
      return false;
    }
    setBusy(true);
    try {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Permission refusée. Autorisez les notifications dans les paramètres du navigateur.');
        return false;
      }

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
      if (!token) {
        setError('Session expirée — reconnectez-vous.');
        return false;
      }

      await saveSubscription(token, sub);
      setSubscribed(true);
      return true;
    } catch (e) {
      console.warn('push subscribe failed', e);
      setError(e.message || 'Activation impossible. Réessayez sur HTTPS ou installez la PWA.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, configured]);

  return { supported, permission, subscribed, busy, error, configured, subscribe };
}
