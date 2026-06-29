import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchAdminSnapshot, buildLeaderboardRows, aggregateTimeSeries, fetchProfilesByIds,
} from '@/admin/lib/adminApi';
import {
  isConfirmedStatus, buildOrderRankMap, getOrderCommission, formatFC, relativeDate,
} from '@/lib/ambassador';
import AdminPageHeader, {
  AdminFilters, AdminField, AdminInput, AdminSelect, AdminTableWrap, AdminLoading, ExportMenu,
} from '@/admin/components/AdminUi';
import { AdminAreaChart } from '@/admin/components/AdminCharts';
import { exportToCsv, exportToPdfPrint } from '@/admin/lib/export';

export default function AdminCommissions() {
  const [snap, setSnap] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [filterAmbassador, setFilterAmbassador] = useState('');
  const [filterStatus, setFilterStatus] = useState('confirmed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchAdminSnapshot();
      const ids = [...new Set(data.orders.map((o) => o.ambassador_id).filter(Boolean))];
      setProfiles(await fetchProfilesByIds(ids));
      setSnap(data);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    if (!snap) return [];
    let orders = snap.orders.filter((o) => o.ambassador_id);
    if (filterStatus === 'confirmed') orders = orders.filter((o) => isConfirmedStatus(o.status));
    if (filterAmbassador.trim()) {
      const q = filterAmbassador.toLowerCase();
      orders = orders.filter((o) => {
        const p = profiles[o.ambassador_id];
        return (p?.full_name || '').toLowerCase().includes(q) || (p?.email || '').toLowerCase().includes(q);
      });
    }
    const confirmed = orders.filter((o) => isConfirmedStatus(o.status));
    const rankMap = buildOrderRankMap(confirmed);
    return orders.slice(0, 100).map((o) => ({
      ...o,
      commission: isConfirmedStatus(o.status) ? getOrderCommission(o, rankMap) : 0,
      ambassadorName: profiles[o.ambassador_id]?.full_name || '—',
    }));
  }, [snap, profiles, filterAmbassador, filterStatus]);

  const byAmbassador = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (!map[r.ambassador_id]) map[r.ambassador_id] = { name: r.ambassadorName, total: 0, count: 0 };
      map[r.ambassador_id].total += r.commission;
      map[r.ambassador_id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);

  const daily = useMemo(
    () => aggregateTimeSeries(
      rows.filter((r) => isConfirmedStatus(r.status)),
      'created_at',
      (r) => r.commission,
      30,
    ),
    [rows],
  );

  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const sumSince = (since) => rows.filter((r) => new Date(r.created_at) >= since).reduce((s, r) => s + r.commission, 0);

  const cols = [
    { label: 'Date', get: (r) => relativeDate(r.created_at) },
    { label: 'Commande', get: (r) => r.id },
    { label: 'Ambassadeur', get: (r) => r.ambassadorName },
    { label: 'Montant', get: (r) => r.total_amount },
    { label: 'Commission', get: (r) => r.commission },
    { label: 'Statut', get: (r) => r.status },
  ];

  if (loading) return <div className="px-10 py-8"><AdminLoading /></div>;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Commissions"
        subtitle="Suivi des commissions par commande et par ambassadeur."
        actions={(
          <ExportMenu
            onCsv={() => exportToCsv('commissions.csv', rows, cols)}
            onPdf={() => exportToPdfPrint('Commissions VSM')}
          />
        )}
      />

      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="vsm-card p-4"><div className="text-xs uppercase text-muted-foreground">Aujourd'hui</div><div className="font-display text-2xl font-bold text-primary">{formatFC(sumSince(new Date(today.toDateString())))}</div></div>
        <div className="vsm-card p-4"><div className="text-xs uppercase text-muted-foreground">7 jours</div><div className="font-display text-2xl font-bold">{formatFC(sumSince(weekStart))}</div></div>
        <div className="vsm-card p-4"><div className="text-xs uppercase text-muted-foreground">Ce mois</div><div className="font-display text-2xl font-bold">{formatFC(sumSince(monthStart))}</div></div>
      </div>

      <AdminFilters>
        <AdminField label="Ambassadeur">
          <AdminInput value={filterAmbassador} onChange={(e) => setFilterAmbassador(e.target.value)} placeholder="Filtrer par nom…" />
        </AdminField>
        <AdminField label="Statut commande">
          <AdminSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="confirmed">Confirmées</option>
            <option value="all">Toutes</option>
          </AdminSelect>
        </AdminField>
      </AdminFilters>

      <section className="grid lg:grid-cols-2 gap-4 mb-8">
        <AdminAreaChart title="Commissions quotidiennes (30 j)" data={daily} />
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-4">Par ambassadeur</h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {byAmbassador.slice(0, 15).map((a) => (
              <li key={a.name} className="flex justify-between text-sm border-b border-border/30 py-2">
                <span>{a.name}</span>
                <span className="text-primary font-bold">{formatFC(a.total)} <span className="text-muted-foreground font-normal">({a.count})</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <AdminTableWrap>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Commande</th>
              <th className="text-left py-3 px-4">Ambassadeur</th>
              <th className="text-right py-3 px-4">CA</th>
              <th className="text-right py-3 px-4">Commission</th>
              <th className="text-left py-3 px-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="py-2 px-4 text-muted-foreground">{relativeDate(r.created_at)}</td>
                <td className="py-2 px-4 font-mono">#{r.id}</td>
                <td className="py-2 px-4">{r.ambassadorName}</td>
                <td className="py-2 px-4 text-right">{formatFC(r.total_amount)}</td>
                <td className="py-2 px-4 text-right text-primary font-bold">{formatFC(r.commission)}</td>
                <td className="py-2 px-4">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
