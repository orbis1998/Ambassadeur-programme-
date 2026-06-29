import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminSnapshot, buildLeaderboardRows } from '@/admin/lib/adminApi';
import { formatFC } from '@/lib/ambassador';
import AdminPageHeader, { AdminFilters, AdminField, AdminSelect, AdminLoading, ExportMenu } from '@/admin/components/AdminUi';
import { exportToCsv, exportToPdfPrint } from '@/admin/lib/export';

const SORTS = [
  { key: 'revenue', label: 'Revenus' },
  { key: 'sales', label: 'Ventes' },
  { key: 'clicks', label: 'Clics' },
  { key: 'conversion', label: 'Conversions' },
  { key: 'commissions', label: 'Commissions' },
];

export default function AdminLeaderboard() {
  const [board, setBoard] = useState([]);
  const [sort, setSort] = useState('revenue');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminSnapshot().then((snap) => {
      setBoard(buildLeaderboardRows(snap.applications, snap.orders, snap.clicks, snap.links));
      setLoading(false);
    });
  }, []);

  const sorted = [...board].sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

  const cols = [
    { label: 'Rang', get: (_, i) => i + 1 },
    { label: 'Nom', get: (r) => r.name },
    { label: 'Ventes', get: (r) => r.sales },
    { label: 'Revenus', get: (r) => r.revenue },
    { label: 'Clics', get: (r) => r.clicks },
    { label: 'Conversion %', get: (r) => r.conversion.toFixed(1) },
  ];

  if (loading) return <div className="px-10 py-8"><AdminLoading /></div>;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Classement"
        subtitle="Top ambassadeurs dynamique selon plusieurs critères."
        actions={(
          <ExportMenu
            onCsv={() => exportToCsv('classement.csv', sorted, cols)}
            onPdf={() => exportToPdfPrint('Classement VSM Ambassador')}
          />
        )}
      />

      <AdminFilters>
        <AdminField label="Trier par">
          <AdminSelect value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </AdminSelect>
        </AdminField>
      </AdminFilters>

      <div className="space-y-2">
        {sorted.slice(0, 50).map((r, i) => (
          <div
            key={r.userId}
            className={`vsm-card p-4 flex items-center gap-4 ${i < 3 ? 'border-primary/40 bg-primary/5' : ''}`}
          >
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-display font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/admin/ambassadors/${r.userId}`} className="font-semibold hover:text-primary">{r.name}</Link>
              <div className="text-xs text-muted-foreground">{r.badge} · {r.tier?.label}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold text-primary">{formatFC(r.revenue)}</div>
              <div className="text-muted-foreground">{r.sales} ventes · {r.clicks} clics · {r.conversion.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
