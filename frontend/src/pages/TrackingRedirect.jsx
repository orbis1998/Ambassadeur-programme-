import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BRAND_LOGO } from '@/constants/branding';

async function resolveTrackTarget(slug) {
  const fallback = `https://www.vsmcollection.com/?ref=${encodeURIComponent(slug || '')}`;
  const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
  const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (BACKEND_URL) {
    try {
      const r = await fetch(`${BACKEND_URL}/api/track/${encodeURIComponent(slug || '')}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.target) return d.target;
      }
    } catch (_e) { /* fall through */ }
  }

  if (SUPABASE_URL && anonKey) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/functions/v1/track-click?slug=${encodeURIComponent(slug || '')}`,
        { headers: { apikey: anonKey } },
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.target) return d.target;
      }
    } catch (_e) { /* fall through */ }
  }

  return fallback;
}

export default function TrackingRedirect() {
  const { slug } = useParams();
  useEffect(() => {
    (async () => {
      const target = await resolveTrackTarget(slug);
      window.location.replace(target);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground grain" data-testid="tracking-redirect">
      <div className="text-center">
        <img src={BRAND_LOGO} alt="VSM" className="w-32 mx-auto mb-6 opacity-70" />
        <div className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Redirection en cours</div>
        <div className="font-display text-2xl">VSM Collection</div>
        <div className="text-xs text-muted-foreground mt-2">Vivre avec style.</div>
      </div>
    </div>
  );
}
