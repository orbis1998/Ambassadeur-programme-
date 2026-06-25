import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthCtx = createContext(null);
const SESSION_TIMEOUT_MS = 8000;

async function getSessionWithTimeout() {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('session_timeout')), SESSION_TIMEOUT_MS);
  });
  return Promise.race([supabase.auth.getSession(), timeout]);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [trackingLink, setTrackingLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  const loadUserData = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setApplication(null);
      setPromoCodes([]);
      setTrackingLink(null);
      return null;
    }

    setUserDataLoaded(false);

    const [{ data: p, error: pErr }, { data: apps, error: aErr }, { data: promos, error: prErr }, { data: links, error: lErr }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('ambassador_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('promo_codes').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
      supabase.from('ambassador_links').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
    ]);

    if (pErr) console.warn('profiles', pErr.message);
    if (aErr) console.warn('ambassador_applications', aErr.message);
    if (prErr) console.warn('promo_codes', prErr.message);
    if (lErr) console.warn('ambassador_links', lErr.message);

    const rows = apps || [];
    const approved = rows.find((x) => (x.status || '').toLowerCase() === 'approved');
    const app = approved || rows[0] || null;
    const linkRows = links || [];
    const link = linkRows.find((l) => l.active !== false) || linkRows[0] || null;

    setProfile(p || null);
    setApplication(app);
    setPromoCodes(promos || []);
    setTrackingLink(link);

    return { profile: p, application: app, promo_codes: promos || [], tracking_link: link };
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session: initialSession } } = await getSessionWithTimeout();
        if (!mounted) return;
        setSession(initialSession);
        if (initialSession?.user) {
          await loadUserData(initialSession.user.id);
        } else {
          setUserDataLoaded(true);
        }
      } catch (_e) {
        if (mounted) setUserDataLoaded(true);
      } finally {
        if (mounted) {
          setUserDataLoaded(true);
          setLoading(false);
        }
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return;
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          setLoading(true);
          try {
            await loadUserData(newSession.user.id);
          } finally {
            if (mounted) {
              setUserDataLoaded(true);
              setLoading(false);
            }
          }
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setApplication(null);
        setPromoCodes([]);
        setTrackingLink(null);
        setUserDataLoaded(true);
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
    if (s?.user) {
      setUserDataLoaded(false);
      try {
        return await loadUserData(s.user.id);
      } finally {
        setUserDataLoaded(true);
      }
    }
    return null;
  }, [session, loadUserData]);

  const signIn = async (email, password) => {
    setLoading(true);
    setUserDataLoaded(false);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (!result.error && result.data?.session) {
        setSession(result.data.session);
        const me = await loadUserData(result.data.session.user.id);
        setUserDataLoaded(true);
        return { ...result, me };
      }
      setUserDataLoaded(true);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    return await supabase.auth.signUp({ email, password, options: { data: metadata } });
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const authLoading = loading || (session?.user && !userDataLoaded);

  const value = {
    session,
    user: session?.user || null,
    profile,
    application,
    promoCodes,
    trackingLink,
    isApproved: (application?.status || '').toLowerCase() === 'approved',
    isPending: (application?.status || '').toLowerCase() === 'pending',
    isRejected: (application?.status || '').toLowerCase() === 'rejected',
    loading: authLoading,
    signIn, signUp, signOut, refresh,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
