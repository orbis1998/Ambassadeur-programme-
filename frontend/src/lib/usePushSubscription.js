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

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker non supporté sur ce navigateur.');
  }
  let reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    await reg.update().catch(() => {});
  }
  await navigator.serviceWorker.ready;
  return reg;
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
    const errBody = await edgeRes.text().catch(() => '');
    throw new Error(errBody || 'Enregistrement push refusé par le serveur.');
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
    ensureServiceWorker()
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
    if (!window.isSecureContext) {
      setError('Les notifications push nécessitent HTTPS.');
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

      const reg = await ensureServiceWorker();
      if (!reg.pushManager) {
        throw new Error('Push non disponible — installez la PWA depuis l\'écran d\'accueil (iPhone) ou utilisez Chrome.');
      }

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
      const msg = e?.message || '';
      if (/push service not available|not supported|registration failed/i.test(msg)) {
        setError('Push indisponible — ouvrez l\'app en PWA installée ou via Chrome/Edge sur HTTPS.');
      } else {
        setError(msg || 'Activation impossible. Réessayez sur HTTPS ou installez la PWA.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, configured]);

  return { supported, permission, subscribed, busy, error, configured, subscribe };
}
