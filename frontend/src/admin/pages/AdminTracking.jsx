import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminSnapshot, buildLeaderboardRows, aggregateTimeSeries } from '@/admin/lib/adminApi';
import { isConfirmedStatus, formatFC } from '@/lib/ambassador';
import AdminPageHeader, { AdminStatCard, AdminLoading } from '@/admin/components/AdminUi';
import { AdminAreaChart, AdminBarChart } from '@/admin/components/AdminCharts';
import { MousePointerClick, Target, TrendingUp, Link2 } from 'lucide-react';

export default function AdminTracking() {
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminSnapshot().then((d) => { setSnap(d); setLoading(false); });
  }, []);

  const board = useMemo(
    () => (snap ? buildLeaderboardRows(snap.applications, snap.orders, snap.clicks, snap.links) : []),
    [snap],
  );

  const linkStats = useMemo(() => {
    if (!snap) return [];
    const byLink = {};
    snap.links.forEach((l) => {
      byLink[l.id] = { slug: l.slug, clicks: 0, ambassador_id: l.ambassador_id };
    });
    snap.clicks.forEach((c) => {
      if (byLink[c.link_id]) byLink[c.link_id].clicks += 1;
    });
    const ordersByAmb = {};
    snap.orders.filter((o) => isConfirmedStatus(o.status)).forEach((o) => {
      ordersByAmb[o.ambassador_id] = (ordersByAmb[o.ambassador_id] || 0) + 1;
    });
    return Object.values(byLink).map((l) => ({
      slug: l.slug,
      clicks: l.clicks,
      conversions: ordersByAmb[l.ambassador_id] || 0,
      rate: l.clicks > 0 ? ((ordersByAmb[l.ambassador_id] || 0) / l.clicks) * 100 : 0,
    })).sort((a, b) => b.clicks - a.clicks);
  }, [snap]);

  const clicksDaily = useMemo(
    () => (snap ? aggregateTimeSeries(snap.clicks, 'clicked_at', () => 1, 14) : []),
    [snap],
  );

  const bestLink = linkStats[0];
  const worstLink = linkStats.filter((l) => l.clicks > 0).slice(-1)[0];
  const totalClicks = snap?.clicks?.length || 0;
  const totalConv = snap?.orders?.filter((o) => isConfirmedStatus(o.status)).length || 0;
  const globalRate = totalClicks > 0 ? (totalConv / totalClicks) * 100 : 0;

  if (loading) return <div className="px-10 py-8"><AdminLoading /></div>;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader title="Tracking" subtitle="Suivi en temps réel des clics, conversions et performances des liens." />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard icon={MousePointerClick} label="Clics totaux" value={totalClicks} highlight />
        <AdminStatCard icon={Target} label="Conversions" value={totalConv} />
        <AdminStatCard icon={TrendingUp} label="Taux global" value={`${globalRate.toFixed(1)} %`} />
        <AdminStatCard icon={Link2} label="Liens actifs" value={snap.links.length} sub={bestLink ? `Top : ${bestLink.slug}` : ''} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4 mb-8">
        <AdminAreaChart title="Clics — 14 derniers jours" data={clicksDaily} />
        <AdminBarChart
          title="Top liens par clics"
          data={linkStats.slice(0, 8).map((l) => ({ name: l.slug, value: l.clicks }))}
        />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-4">Meilleurs ambassadeurs (activité)</h3>
          <ul className="space-y-2">
            {board.sort((a, b) => b.clicks - a.clicks).slice(0, 10).map((r) => (
              <li key={r.userId} className="flex justify-between text-sm border-b border-border/40 py-2">
                <Link to={`/admin/ambassadors/${r.userId}`} className="hover:text-primary">{r.name}</Link>
                <span>{r.clicks} clics · {r.conversion.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-4">Liens — détail conversion</h3>
          {bestLink && <p className="text-sm mb-2">Meilleur lien : <strong className="text-primary">{bestLink.slug}</strong> ({bestLink.clicks} clics)</p>}
          {worstLink && worstLink !== bestLink && <p className="text-sm mb-4 text-muted-foreground">À optimiser : {worstLink.slug} ({worstLink.rate.toFixed(1)}% conv.)</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr><th className="text-left py-1">Slug</th><th className="text-right py-1">Clics</th><th className="text-right py-1">Conv.</th><th className="text-right py-1">Taux</th></tr>
              </thead>
              <tbody>
                {linkStats.slice(0, 15).map((l) => (
                  <tr key={l.slug} className="border-t border-border/30">
                    <td className="py-2 font-mono text-primary">{l.slug}</td>
                    <td className="py-2 text-right">{l.clicks}</td>
                    <td className="py-2 text-right">{l.conversions}</td>
                    <td className="py-2 text-right">{l.rate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
