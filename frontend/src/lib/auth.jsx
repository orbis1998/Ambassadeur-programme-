import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthCtx = createContext(null);
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [meExtras, setMeExtras] = useState({ promo_codes: [], tracking_link: null });
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId, accessToken) => {
    if (!userId) {
      setProfile(null);
      setApplication(null);
      setMeExtras({ promo_codes: [], tracking_link: null });
      return null;
    }
    const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token;

    const applyMe = (data) => {
      setProfile(data.profile || null);
      setApplication(data.application || null);
      setMeExtras({ promo_codes: data.promo_codes || [], tracking_link: data.tracking_link || null });
      return data;
    };

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      if (BACKEND_URL && token) {
        const res = await fetchWithTimeout(`${BACKEND_URL}/api/ambassador/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) return applyMe(await res.json());
      }
    } catch (_e) {
      /* fall through */
    }

    try {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (SUPABASE_URL && SUPABASE_ANON_KEY && token) {
        const res = await fetchWithTimeout(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/ambassador-me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        if (res.ok) return applyMe(await res.json());
      }
    } catch (_e) {
      /* fall through */
    }

    const [{ data: p }, { data: apps }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('ambassador_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    const rows = apps || [];
    const approved = rows.find((x) => (x.status || '').toLowerCase() === 'approved');
    const app = approved || rows[0] || null;
    setProfile(p || null);
    setApplication(app);
    setMeExtras({ promo_codes: [], tracking_link: null });
    return { profile: p, application: app };
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(initialSession);
        if (initialSession?.user) {
          await loadUserData(initialSession.user.id, initialSession.access_token);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // INITIAL_SESSION is handled by getSession() above — skip to avoid double-load / stuck splash
      if (event === 'INITIAL_SESSION') return;

      if (!mounted) return;
      setSession(newSession);

      if (newSession?.user) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await loadUserData(newSession.user.id, newSession.access_token);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setApplication(null);
        setMeExtras({ promo_codes: [], tracking_link: null });
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refresh = useCallback(async (overrideSession) => {
    const s = overrideSession || session;
    if (s?.user) return await loadUserData(s.user.id, s.access_token);
    return null;
  }, [session, loadUserData]);

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error && result.data?.session) {
      setSession(result.data.session);
      const me = await loadUserData(result.data.session.user.id, result.data.session.access_token);
      return { ...result, me };
    }
    return result;
  };

  const signUp = async (email, password, metadata = {}) => {
    return await supabase.auth.signUp({ email, password, options: { data: metadata } });
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const value = {
    session,
    user: session?.user || null,
    profile,
    application,
    promoCodes: meExtras.promo_codes,
    trackingLink: meExtras.tracking_link,
    isApproved: (application?.status || '').toLowerCase() === 'approved',
    isPending: (application?.status || '').toLowerCase() === 'pending',
    isRejected: (application?.status || '').toLowerCase() === 'rejected',
    loading,
    signIn, signUp, signOut, refresh,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
