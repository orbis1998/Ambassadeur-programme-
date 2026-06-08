/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Clock, XCircle, LogOut } from 'lucide-react';

export default function Pending() {
  const { application, signOut } = useAuth();
  const navigate = useNavigate();
  const status = application?.status;
  const rejected = status === 'rejected';

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

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
          <p className="text-muted-foreground mb-6">
            Nous vous remercions pour votre intérêt. Votre candidature n'a malheureusement pas été retenue cette fois-ci.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground mb-2">Bonjour <span className="text-foreground font-semibold">{application?.full_name}</span>,</p>
            <p className="text-muted-foreground mb-6">
              Votre candidature est en cours d'examen par notre équipe. Vous recevrez une notification dès qu'une décision sera prise.
            </p>
          </>
        )}
        <div className="text-sm uppercase tracking-wider text-primary font-semibold mb-6">— L'équipe VSM Collection</div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="https://www.vsmcollection.com" target="_blank" data-testid="visit-site-btn"
            className="px-5 py-2.5 rounded-sm border border-border text-sm hover:border-primary/60 transition">
            Visiter VSM Collection
          </Link>
          <button onClick={handleLogout} data-testid="pending-logout-btn"
            className="px-5 py-2.5 rounded-sm border border-border text-sm hover:border-primary/60 transition flex items-center gap-2 justify-center">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
