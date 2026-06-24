/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Clock, XCircle, LogOut } from 'lucide-react';

export default function Pending() {
  const { application, signOut, refresh, user } = useAuth();
  const navigate = useNavigate();
  const status = application?.status;
  const rejected = status === 'rejected';
  const [pulse, setPulse] = useState(0);
  const intervalRef = useRef(null);

  const goIfApproved = useCallback(async () => {
    const fresh = await refresh();
    if (fresh?.application?.status === 'approved') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate('/dashboard', { replace: true });
    }
  }, [refresh, navigate]);

  // Supabase Realtime: instant redirect when admin approves
  useEffect(() => {
    if (rejected || !user?.id) return undefined;
    const channel = supabase
      .channel(`pending-app-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ambassador_applications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if ((payload.new?.status || '').toLowerCase() === 'approved') {
            navigate('/dashboard', { replace: true });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rejected, user?.id, navigate]);

  // Fallback polling every 4s
  useEffect(() => {
    if (rejected) return undefined;
    intervalRef.current = setInterval(async () => {
      setPulse((p) => p + 1);
      await goIfApproved();
    }, 4000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [rejected, goIfApproved]);

  const handleLogout = async () => { await signOut(); navigate('/login', { replace: true }); };

  return (
    <div className="min-h-screen grain flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-lg vsm-card p-8 sm:p-10 text-center animate-fade-up" data-testid="pending-card">
        <div className={`w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center border ${rejected ? 'bg-destructive/15 border-destructive/40' : 'bg-primary/15 border-primary/40'}`}>
          {rejected ? <XCircle className="w-8 h-8 text-destructive" /> : <Clock className="w-8 h-8 text-primary animate-pulse" />}
        </div>
        <h1 className="text-3xl font-display font-bold mb-3">
          {rejected ? 'Candidature non retenue' : 'Candidature en cours d\'examen'}
        </h1>
        {rejected ? (
          <p className="text-muted-foreground mb-6">Nous vous remercions pour votre intérêt. Votre candidature n'a malheureusement pas été retenue cette fois-ci.</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-2">Bonjour <span className="text-foreground font-semibold">{application?.full_name}</span>,</p>
            <p className="text-muted-foreground mb-2">
              Votre candidature est en cours d'examen par notre équipe. Dès qu'elle sera approuvée, votre tableau de bord s'ouvrira automatiquement.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-primary/80 mb-6" data-testid="pending-polling-status">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Surveillance active du statut… {pulse > 0 && <span className="opacity-50">({pulse * 4}s)</span>}
            </div>
          </>
        )}
        <div className="text-sm uppercase tracking-wider text-primary font-semibold mb-6">— L'équipe VSM Collection</div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="https://www.vsmcollection.com" target="_blank" rel="noopener noreferrer" data-testid="visit-site-btn"
            className="px-5 py-2.5 rounded-sm border border-border text-sm hover:border-primary/60 transition">
            Visiter VSM Collection
          </a>
          <button onClick={handleLogout} data-testid="pending-logout-btn"
            className="px-5 py-2.5 rounded-sm border border-border text-sm hover:border-primary/60 transition flex items-center gap-2 justify-center">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
