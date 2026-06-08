import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthCtx = createContext(null);

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
      return null;
    }
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${BACKEND_URL}/api/ambassador/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile || null);
        setApplication(data.application || null);
        setMeExtras({ promo_codes: data.promo_codes || [], tracking_link: data.tracking_link || null });
        return data;
      }
    } catch (_e) { /* fallthrough */ }
    const [{ data: p }, { data: app }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('ambassador_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(p || null);
    setApplication(app || null);
    return { profile: p, application: app };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        loadUserData(session.user.id, session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setLoading(true);
        await loadUserData(newSession.user.id, newSession.access_token);
        setLoading(false);
      } else {
        setProfile(null);
        setApplication(null);
      }
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refresh = useCallback(async () => {
    if (session?.user) return await loadUserData(session.user.id);
    return null;
  }, [session, loadUserData]);

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
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
    isApproved: application?.status === 'approved',
    isPending: application?.status === 'pending',
    isRejected: application?.status === 'rejected',
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
