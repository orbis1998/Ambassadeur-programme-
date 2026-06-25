import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fetchAmbassadorDashboardData, fetchAmbassadorDashboardDirect } from '@/lib/ambassadorData';
import { CONFIRMED_ORDER_STATUSES, PENDING_ORDER_STATUSES, formatFC, relativeDate } from '@/lib/ambassador';
import { Bell, ShoppingBag, Wallet, AlertCircle, Tag } from 'lucide-react';

function buildEvents(orders, withdrawals) {
  const events = [];
  (orders || []).forEach((o) => {
    const s = (o.status || '').toLowerCase().trim();
    if (CONFIRMED_ORDER_STATUSES.includes(s)) {
      events.push({
        id: `o-${o.id}`,
        kind: 'sale',
        at: o.created_at,
        title: 'Commande confirmée ✓',
        desc: `Commande #${o.id} — ${formatFC(o.total_amount)} validée`,
      });
    } else if (PENDING_ORDER_STATUSES.includes(s)) {
      events.push({
        id: `o-pending-${o.id}`,
        kind: 'promo',
        at: o.created_at,
        title: 'Code promo utilisé',
        desc: `Commande #${o.id} — ${formatFC(o.total_amount)} en attente de validation`,
      });
    }
  });
  (withdrawals || []).forEach((x) => {
    const s = (x.status || '').toLowerCase();
    if (['paid', 'payée', 'approved'].includes(s)) {
      events.push({ id: `w-${x.id}`, kind: 'withdraw', at: x.updated_at || x.created_at, title: 'Retrait validé', desc: `${x.mobile_operator} • ${x.msisdn}` });
    } else if (['rejected', 'refusée'].includes(s)) {
      events.push({ id: `w-${x.id}`, kind: 'alert', at: x.updated_at || x.created_at, title: 'Retrait refusé', desc: x.admin_note || 'Voir détails dans l\'historique' });
    } else {
      events.push({ id: `w-${x.id}`, kind: 'withdraw', at: x.created_at, title: 'Demande de retrait envoyée', desc: `${x.mobile_operator} • ${x.msisdn}` });
    }
  });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  return events;
}

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const bundle = await fetchAmbassadorDashboardData(session?.access_token);
    const source = bundle || await fetchAmbassadorDashboardDirect(user.id);
    const orders = (source.orders || []).slice(0, 30);
    const withdrawals = (source.withdrawals || []).slice(0, 10);
    setItems(buildEvents(orders, withdrawals));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `ambassador_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambassador_withdrawal_requests', filter: `ambassador_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  const ICONS = { sale: ShoppingBag, withdraw: Wallet, alert: AlertCircle, promo: Tag };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-3xl mx-auto animate-fade-in" data-testid="notifications-page">
      <header className="mb-6 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Notifications</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Vos dernières activités</h1>
        <p className="text-sm text-muted-foreground mt-2">Utilisation de votre code promo, commandes validées et retraits.</p>
      </header>

      {loading ? (
        <div className="skeleton h-32 rounded-sm" />
      ) : items.length === 0 ? (
        <div className="vsm-card p-10 text-center text-muted-foreground" data-testid="notifications-empty">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Aucune notification pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const Icon = ICONS[n.kind] || Bell;
            return (
              <div key={n.id} className="vsm-card p-4 flex gap-4 items-start" data-testid={`notif-${n.id}`}>
                <div className="w-10 h-10 rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold">{n.title}</div>
                  <div className="text-sm text-muted-foreground">{n.desc}</div>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex-shrink-0">{relativeDate(n.at)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
