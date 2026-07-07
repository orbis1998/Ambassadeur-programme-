import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { isAmbassadorProgramAdmin } from './roles';

const AuthCtx = createContext(null);

function pickApplication(rows) {
  const list = rows || [];
  const approved = list.find((x) => (x.status || '').toLowerCase() === 'approved');
  if (approved) return approved;
  const pending = list.find((x) => (x.status || '').toLowerCase() === 'pending');
  if (pending) return pending;
  const rejected = list.find((x) => (x.status || '').toLowerCase() === 'rejected');
  if (rejected) return rejected;
  return list[0] || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [trackingLink, setTrackingLink] = useState(null);
  const [adminFlag, setAdminFlag] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const loadGen = useRef(0);

  const loadUserData = useCallback(async (userId, { silent = false } = {}) => {
    if (!userId) {
      setProfile(null);
      setApplication(null);
      setPromoCodes([]);
      setTrackingLink(null);
      setAdminFlag(false);
      setUserDataLoaded(true);
      return null;
    }

    const gen = ++loadGen.current;
    if (!silent) setUserDataLoaded(false);

    const [{ data: p, error: pErr }, { data: apps, error: aErr }, { data: promos, error: prErr }, { data: links, error: lErr }, { data: adminRpc, error: adminErr }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('get_my_ambassador_applications'),
      supabase.from('promo_codes').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
      supabase.from('ambassador_links').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
      supabase.rpc('is_admin'),
    ]);

    if (gen !== loadGen.current) return null;

    if (pErr) console.warn('profiles', pErr.message);
    if (aErr) console.warn('get_my_ambassador_applications', aErr.message);
    if (prErr) console.warn('promo_codes', prErr.message);
    if (lErr) console.warn('ambassador_links', lErr.message);
    if (adminErr) console.warn('is_admin', adminErr.message);

    const app = pickApplication(apps);
    const linkRows = links || [];
    const link = linkRows[0] || null;
    const adminUser = isAmbassadorProgramAdmin(p) || adminRpc === true;

    setProfile(p || null);
    setApplication(app);
    setPromoCodes(promos || []);
    setTrackingLink(link);
    setAdminFlag(adminUser);
    setUserDataLoaded(true);

    return { profile: p, application: app, promo_codes: promos || [], tracking_link: link, isAdmin: adminUser };
  }, []);

  const loadUserDataStable = useCallback(async (userId, { silent = false, retries = 3 } = {}) => {
    let last = null;
    for (let i = 0; i < retries; i += 1) {
      last = await loadUserData(userId, { silent: silent || i > 0 });
      if (last) return last;
      await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
    }
    return last;
  }, [loadUserData]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(current);
      if (current?.user) {
        await loadUserData(current.user.id);
      } else {
        setUserDataLoaded(true);
      }
      if (mounted) setInitializing(false);
    };

    boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);

      if (newSession?.user) {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          loadUserData(newSession.user.id, { silent: true });
          return;
        }
        await loadUserData(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setApplication(null);
        setPromoCodes([]);
        setTrackingLink(null);
        setAdminFlag(false);
        setUserDataLoaded(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refresh = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) return loadUserDataStable(s.user.id, { silent: true });
    return null;
  }, [loadUserDataStable]);

  const signIn = useCallback(async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) return { ...result, me: null };

    const s = result.data?.session;
    if (s) {
      setSession(s);
      const me = await loadUserDataStable(s.user.id);
      return { ...result, me };
    }
    return { ...result, me: null };
  }, [loadUserDataStable]);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    return supabase.auth.signUp({ email, password, options: { data: metadata } });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setApplication(null);
    setPromoCodes([]);
    setTrackingLink(null);
    setAdminFlag(false);
    setUserDataLoaded(true);
  }, []);

  const status = (application?.status || '').toLowerCase();
  const loading = initializing || (session?.user && !userDataLoaded);
  const isAdmin = adminFlag || isAmbassadorProgramAdmin(profile);

  const value = {
    session,
    user: session?.user || null,
    profile,
    application,
    promoCodes,
    trackingLink,
    isAdmin,
    isApproved: status === 'approved',
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    loading,
    userDataLoaded,
    signIn,
    signUp,
    signOut,
    refresh,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function routeAfterAuth(profile, application, options = {}) {
  const isAdmin = options.isAdmin ?? isAmbassadorProgramAdmin(profile);
  if (isAdmin) return '/admin';
  const status = (application?.status || '').toLowerCase();
  if (status === 'approved') return '/dashboard';
  if (status === 'pending' || status === 'rejected') return '/pending';
  return '/apply';
}

/** @deprecated use routeAfterAuth(profile, application) */
export function routeAfterLogin(application) {
  return routeAfterAuth(null, application);
}
