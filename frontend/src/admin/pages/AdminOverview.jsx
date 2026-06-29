import React, { useEffect, useState, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Clock, Wallet, TrendingUp, ShoppingCart,
  Link2, MousePointerClick, Percent, Banknote,
} from 'lucide-react';
import { formatFC } from '@/lib/ambassador';
import {
  fetchAdminSnapshot,
  computeProgramStats,
  aggregateTimeSeries,
  buildLeaderboardRows,
} from '@/admin/lib/adminApi';
import AdminPageHeader, { AdminStatCard, AdminLoading } from '@/admin/components/AdminUi';
import { AdminAreaChart, AdminMultiLineChart, AdminBarChart, mergeTimeSeries } from '@/admin/components/AdminCharts';
import { isConfirmedStatus } from '@/lib/ambassador';

export default function AdminOverview() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await fetchAdminSnapshot();
      if (active) {
        setSnapshot(data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => (snapshot ? computeProgramStats(snapshot) : null), [snapshot]);

  const chartData = useMemo(() => {
    if (!snapshot) return null;
    const ordersDaily = aggregateTimeSeries(
      snapshot.orders.filter((o) => isConfirmedStatus(o.status)),
      'created_at',
      () => 1,
      30,
    );
    const signupsDaily = aggregateTimeSeries(snapshot.applications, 'created_at', () => 1, 30);
    const clicksDaily = aggregateTimeSeries(snapshot.clicks, 'clicked_at', () => 1, 30);
    const revenueDaily = aggregateTimeSeries(
      snapshot.orders.filter((o) => isConfirmedStatus(o.status)),
      'created_at',
      (o) => Number(o.total_amount || 0),
      30,
    );
    const multi = mergeTimeSeries([
      { key: 'orders', data: ordersDaily },
      { key: 'signups', data: signupsDaily },
      { key: 'clicks', data: clicksDaily },
    ]);
    const top = buildLeaderboardRows(snapshot.applications, snapshot.orders, snapshot.clicks, snapshot.links)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((r) => ({ name: (r.name || r.email || '—').slice(0, 14), value: r.revenue }));
    return { ordersDaily, revenueDaily, multi, top };
  }, [snapshot]);

  if (loading || !stats) return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminLoading />
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto animate-fade-in">
      <AdminPageHeader
        title="Centre de contrôle"
        subtitle="Vue globale du Programme Ambassadeur VSM — statistiques, tendances et performances."
      />

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <AdminStatCard icon={Users} label="Ambassadeurs total" value={stats.totalAmbassadors} sub={`${stats.newAmbassadorsMonth} ce mois`} />
        <AdminStatCard icon={UserCheck} label="Actifs" value={stats.activeAmbassadors} highlight />
        <AdminStatCard icon={UserX} label="Inactifs" value={stats.inactiveAmbassadors} />
        <AdminStatCard icon={Clock} label="Candidatures en attente" value={stats.pendingApplications} highlight={stats.pendingApplications > 0} />
        <AdminStatCard icon={TrendingUp} label="Commissions générées" value={formatFC(stats.totalCommissions)} />
        <AdminStatCard icon={Banknote} label="Revenus ambassadeurs" value={formatFC(stats.totalRevenue)} />
        <AdminStatCard icon={Wallet} label="Retraits en attente" value={stats.pendingWithdrawals} />
        <AdminStatCard icon={ShoppingCart} label="Commandes générées" value={stats.totalOrders} />
        <AdminStatCard icon={Link2} label="Liens créés" value={stats.totalLinks} />
        <AdminStatCard icon={MousePointerClick} label="Clics totaux" value={stats.totalClicks} />
        <AdminStatCard icon={Percent} label="Taux conversion global" value={`${stats.globalConversion.toFixed(1)} %`} />
        <AdminStatCard icon={Users} label="Candidatures totales" value={stats.totalApplications} sub={`${stats.rejectedApplications} refusées`} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4 mb-8">
        <AdminAreaChart title="Évolution quotidienne — commandes (30 j)" data={chartData.ordersDaily} />
        <AdminAreaChart title="Évolution quotidienne — revenus (30 j)" data={chartData.revenueDaily} />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mb-8">
        <AdminMultiLineChart
          title="Activité combinée — commandes, inscriptions, clics"
          data={chartData.multi}
          lines={[
            { key: 'orders', name: 'Commandes' },
            { key: 'signups', name: 'Inscriptions' },
            { key: 'clicks', name: 'Clics' },
          ]}
        />
        <AdminBarChart title="Top ambassadeurs — revenus" data={chartData.top} dataKey="value" nameKey="name" />
      </section>
    </div>
  );
}
