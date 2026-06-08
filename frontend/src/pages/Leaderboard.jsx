/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { CONFIRMED_ORDER_STATUSES, ambassadorBadgeCode, formatFC } from '@/lib/ambassador';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      // Group by ambassador_id manually
      const { data: orders } = await supabase
        .from('orders')
        .select('ambassador_id, total_amount, status, created_at')
        .gte('created_at', start)
        .not('ambassador_id', 'is', null);

      const agg = new Map();
      (orders || []).forEach((o) => {
        if (!o.ambassador_id) return;
        const s = (o.status || '').toLowerCase().trim();
        if (!CONFIRMED_ORDER_STATUSES.includes(s)) return;
        const cur = agg.get(o.ambassador_id) || { sales: 0, revenue: 0 };
        cur.sales += 1;
        cur.revenue += Number(o.total_amount || 0);
        agg.set(o.ambassador_id, cur);
      });

      const ids = Array.from(agg.keys());
      let profilesById = new Map();
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (profs || []).forEach((p) => profilesById.set(p.id, p));
      }

      const arr = ids.map((id) => ({
        id,
        name: profilesById.get(id)?.full_name || ambassadorBadgeCode(id),
        ...agg.get(id),
      })).sort((a, b) => b.revenue - a.revenue);

      const rank = arr.findIndex((r) => r.id === user?.id);
      setMyRank(rank === -1 ? null : rank + 1);
      setRows(arr.slice(0, 20));
      setLoading(false);
    })();
  }, [user?.id]);

  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-5xl mx-auto animate-fade-in" data-testid="leaderboard-page">
      <header className="mb-6 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Classement</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Top Ambassadeurs — <span className="vsm-gradient-text capitalize">{month}</span></h1>
        {myRank && (
          <div className="mt-3 inline-block vsm-badge" data-testid="my-rank">Ma position : #{myRank}</div>
        )}
      </header>

      {loading ? (
        <div className="skeleton h-64 rounded-sm" />
      ) : rows.length === 0 ? (
        <div className="vsm-card p-10 text-center text-muted-foreground" data-testid="leaderboard-empty">
          Aucune vente ce mois-ci. Soyez le premier à apparaître au classement !
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.id === user?.id;
            const Icon = i === 0 ? Crown : i === 1 ? Trophy : i === 2 ? Medal : null;
            const podiumColor = ['#FFD700', '#C0C0C0', '#CD7F32'][i] || null;
            return (
              <div key={r.id} className={`vsm-card p-4 flex items-center gap-4 transition ${isMe ? 'border-primary bg-primary/5' : ''}`} data-testid={`leaderboard-row-${i}`}>
                <div className="w-10 text-center font-display text-2xl font-bold" style={{ color: podiumColor || 'inherit' }}>
                  {Icon ? <Icon className="w-6 h-6 inline" /> : `#${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-bold truncate">{r.name} {isMe && <span className="text-primary text-xs">(vous)</span>}</div>
                  <div className="text-xs text-muted-foreground">{r.sales} ventes</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold text-primary">{formatFC(r.revenue)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chiffre d'affaires</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
