import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TIERS, getTier } from '@/lib/ambassador';
import { fetchAdminSnapshot, buildLeaderboardRows } from '@/admin/lib/adminApi';
import AdminPageHeader, { AdminLoading } from '@/admin/components/AdminUi';

export default function AdminTiers() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminSnapshot().then((snap) => {
      setBoard(buildLeaderboardRows(snap.applications, snap.orders, snap.clicks, snap.links));
      setLoading(false);
    });
  }, []);

  const byTier = useMemo(() => {
    const counts = {};
    TIERS.forEach((t) => { counts[t.key] = []; });
    board.forEach((b) => {
      const key = b.tier?.key || getTier(b.sales).current.key;
      if (counts[key]) counts[key].push(b);
    });
    return counts;
  }, [board]);

  if (loading) return <div className="px-10 py-8"><AdminLoading /></div>;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Niveaux"
        subtitle="Paliers Starter → Elite et progression des ambassadeurs."
      />

      <section className="grid md:grid-cols-5 gap-4 mb-10">
        {TIERS.map((t) => (
          <div key={t.key} className="vsm-card p-4 text-center" style={{ borderColor: `${t.color}40` }}>
            <div className="font-display font-bold text-lg" style={{ color: t.color }}>{t.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.min}+ ventes</div>
            <div className="text-2xl font-bold mt-2">{t.rate}%</div>
            <div className="text-xs text-muted-foreground mt-2">{(byTier[t.key] || []).length} ambassadeur(s)</div>
          </div>
        ))}
      </section>

      {TIERS.map((t) => (
        <div key={t.key} className="vsm-card p-5 mb-6">
          <h3 className="font-display font-bold mb-4" style={{ color: t.color }}>{t.label} — {t.rate}% commission</h3>
          {(byTier[t.key] || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ambassadeur à ce palier</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Ambassadeur</th>
                    <th className="text-right py-2">Ventes</th>
                    <th className="text-right py-2">Objectif suivant</th>
                    <th className="text-right py-2">Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {(byTier[t.key] || []).map((b) => {
                    const tier = getTier(b.sales);
                    return (
                      <tr key={b.userId} className="border-t border-border/40">
                        <td className="py-2">
                          <Link to={`/admin/ambassadors/${b.userId}`} className="hover:text-primary">{b.name}</Link>
                        </td>
                        <td className="py-2 text-right font-bold">{b.sales}</td>
                        <td className="py-2 text-right text-muted-foreground">{tier.next ? `${tier.next.min} ventes (${tier.next.label})` : 'Max'}</td>
                        <td className="py-2 text-right">
                          <div className="w-24 h-1.5 bg-secondary rounded-full ml-auto overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${tier.progress}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
