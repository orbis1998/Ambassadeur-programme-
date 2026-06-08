/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fetchCommissionRate, formatFC, MOBILE_OPERATORS, CONFIRMED_ORDER_STATUSES, MIN_WITHDRAWAL_ORDERS, relativeDate } from '@/lib/ambassador';
import { Wallet, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Withdraw() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ confirmedSales: 0, available: 0, totalCommissions: 0 });
  const [history, setHistory] = useState([]);

  const [op, setOp] = useState('airtel');
  const [msisdn, setMsisdn] = useState('');
  const [beneficiary, setBeneficiary] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const rate = await fetchCommissionRate();
      const [{ data: orders }, { data: wRes }] = await Promise.all([
        supabase.from('orders').select('total_amount, status').eq('ambassador_id', user.id),
        supabase.from('ambassador_withdrawal_requests').select('*').eq('ambassador_id', user.id).order('created_at', { ascending: false }),
      ]);
      const confirmed = (orders || []).filter((o) => CONFIRMED_ORDER_STATUSES.includes((o.status || '').toString().toLowerCase().trim()));
      const totalRevenue = confirmed.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const totalCommissions = totalRevenue * (rate / 100);
      const wActive = (wRes || []).filter((w) => ['paid','payée','pending','en_attente','approved'].includes((w.status||'').toLowerCase()));
      const used = wActive.reduce((s, w) => s + Number(w.amount || 0), 0);
      if (!active) return;
      setStats({ confirmedSales: confirmed.length, available: Math.max(0, totalCommissions - used), totalCommissions });
      setHistory(wRes || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const canRequest = stats.confirmedSales >= MIN_WITHDRAWAL_ORDERS && stats.available > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canRequest) return;
    setError('');
    setSubmitting(true);
    // Try RPC first (recommended), fallback to direct insert
    let ok = false;
    try {
      const { error: rpcErr } = await supabase.rpc('request_ambassador_withdrawal', {
        p_mobile_operator: op,
        p_msisdn: msisdn.trim(),
        p_beneficiary_name: beneficiary.trim(),
      });
      if (!rpcErr) ok = true;
      else if (rpcErr) {
        // fallback: direct insert
        const { error: insErr } = await supabase.from('ambassador_withdrawal_requests').insert({
          ambassador_id: user.id, mobile_operator: op, msisdn: msisdn.trim(),
          beneficiary_name: beneficiary.trim(), status: 'pending',
        });
        if (insErr) throw insErr;
        ok = true;
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la demande de retrait.');
    }
    setSubmitting(false);
    if (ok) setDone(true);
  };

  if (done) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-2xl mx-auto">
        <div className="vsm-card p-8 text-center animate-fade-up" data-testid="withdraw-success">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Demande envoyée</h1>
          <p className="text-muted-foreground mb-6">Votre demande de retrait a été transmise à l'équipe VSM. Vous recevrez une notification dès qu'elle aura été traitée.</p>
          <button onClick={() => navigate('/dashboard')} data-testid="back-to-dashboard"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-primary/90">
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-4xl mx-auto animate-fade-in">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-4" data-testid="withdraw-back-link">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </Link>

      <header className="mb-6 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Mes retraits</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Demande de retrait</h1>
      </header>

      <section className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="vsm-card p-5 animate-fade-up">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Solde disponible</div>
          <div className="text-3xl font-display font-bold text-primary mt-1" data-testid="withdraw-available">{loading ? '—' : formatFC(stats.available)}</div>
        </div>
        <div className="vsm-card p-5 animate-fade-up">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ventes confirmées</div>
          <div className="text-3xl font-display font-bold mt-1" data-testid="withdraw-sales">{loading ? '—' : stats.confirmedSales}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Min. {MIN_WITHDRAWAL_ORDERS} ventes requis</div>
        </div>
      </section>

      {!canRequest && !loading && (
        <div className="vsm-card p-4 mb-6 border-amber-500/40 bg-amber-500/10 flex items-start gap-3" data-testid="withdraw-blocked">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            {stats.confirmedSales < MIN_WITHDRAWAL_ORDERS ? (
              <>Vous devez atteindre <strong>{MIN_WITHDRAWAL_ORDERS} commandes confirmées</strong> avant de pouvoir demander un retrait. Continuez à partager votre lien !</>
            ) : (
              <>Aucune commission disponible au retrait pour le moment.</>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="vsm-card p-6 space-y-5 animate-fade-up" data-testid="withdraw-form">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Choisissez votre opérateur Mobile Money</h2>

        <div className="grid sm:grid-cols-3 gap-3">
          {MOBILE_OPERATORS.map((m) => (
            <button key={m.value} type="button" onClick={() => setOp(m.value)} data-testid={`op-${m.value}`}
              className={`p-4 rounded-sm border-2 text-left transition ${op === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <div className="w-8 h-8 rounded-sm mb-2 flex items-center justify-center" style={{ background: `${m.color}25`, border: `1px solid ${m.color}` }}>
                <Wallet className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div className="font-display font-bold uppercase tracking-wider text-sm">{m.label}</div>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Numéro de téléphone <span className="text-primary">*</span></label>
          <input data-testid="withdraw-msisdn" required value={msisdn} onChange={(e) => setMsisdn(e.target.value)}
            placeholder="+243 81 ..." className="w-full bg-input border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Nom du bénéficiaire <span className="text-primary">*</span></label>
          <input data-testid="withdraw-beneficiary" required value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="Nom qui apparaîtra lors du transfert" className="w-full bg-input border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-[11px] text-muted-foreground mt-1">Le nom exact qui apparaîtra sur le transfert mobile money.</p>
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2" data-testid="withdraw-error">{error}</div>}

        <button type="submit" disabled={!canRequest || submitting || !msisdn || !beneficiary} data-testid="withdraw-submit-btn"
          className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Envoyer la demande de retrait
        </button>
      </form>

      {history.length > 0 && (
        <section className="vsm-card p-5 sm:p-6 mt-6 animate-fade-up" data-testid="withdraw-history-card">
          <h2 className="font-display text-xl font-bold mb-4">Historique</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Opérateur</th><th className="text-left py-2 px-2">Numéro</th><th className="text-left py-2 px-2">Statut</th></tr>
              </thead>
              <tbody>
                {history.map((w) => (
                  <tr key={w.id} className="border-b border-border/50" data-testid={`history-row-${w.id}`}>
                    <td className="py-2 px-2 text-muted-foreground">{relativeDate(w.created_at)}</td>
                    <td className="py-2 px-2 capitalize">{w.mobile_operator}</td>
                    <td className="py-2 px-2 font-mono">{w.msisdn}</td>
                    <td className="py-2 px-2 capitalize">{w.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
