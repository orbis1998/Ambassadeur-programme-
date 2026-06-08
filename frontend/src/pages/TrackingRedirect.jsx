import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function TrackingRedirect() {
  const { slug } = useParams();
  useEffect(() => {
    (async () => {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      let target = `https://www.vsmcollection.com/?ref=${encodeURIComponent(slug || '')}`;
      try {
        const r = await fetch(`${BACKEND_URL}/api/track/${encodeURIComponent(slug || '')}`);
        if (r.ok) {
          const d = await r.json();
          if (d?.target) target = d.target;
        }
      } catch (_e) { /* fall through to default */ }
      window.location.replace(target);
    })();
  }, [slug]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground grain" data-testid="tracking-redirect">
      <div className="text-center">
        <img src="/icons/logo.png" alt="VSM" className="w-32 mx-auto mb-6 opacity-70" />
        <div className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Redirection en cours</div>
        <div className="font-display text-2xl">VSM Collection</div>
        <div className="text-xs text-muted-foreground mt-2">Vivre avec style.</div>
      </div>
    </div>
  );
}
