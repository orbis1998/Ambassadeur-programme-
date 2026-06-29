import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { ambassadorBadgeCode, formatFC, relativeDate, getTier } from '@/lib/ambassador';
import {
  fetchApprovedAmbassadors, fetchAdminSnapshot, buildLeaderboardRows, PAGE_SIZE,
} from '@/admin/lib/adminApi';
import AdminPageHeader, {
  AdminStatusPill, AdminFilters, AdminField, AdminInput, AdminBtn,
  AdminTableWrap, AdminPagination, AdminEmpty, AdminLoading, ExportMenu,
} from '@/admin/components/AdminUi';
import { exportToCsv, exportToPdfPrint } from '@/admin/lib/export';

export default function AdminAmbassadors() {
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, count: c }, snap] = await Promise.all([
      fetchApprovedAmbassadors({ search, page, limit: PAGE_SIZE }),
      fetchAdminSnapshot(),
    ]);
    const board = buildLeaderboardRows(snap.applications, snap.orders, snap.clicks, snap.links);
    const map = {};
    board.forEach((b) => { map[b.userId] = b; });
    setMetrics(map);
    setRows(data);
    setCount(c);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const enriched = rows.map((r) => {
    const m = metrics[r.user_id] || {};
    return { ...r, ...m, badge: ambassadorBadgeCode(r.user_id) };
  });

  const cols = [
    { label: 'Nom', get: (r) => r.full_name },
    { label: 'Badge', get: (r) => r.badge },
    { label: 'Email', get: (r) => r.email },
    { label: 'Ventes', get: (r) => r.sales || 0 },
    { label: 'Revenus', get: (r) => r.revenue || 0 },
    { label: 'Commissions', get: (r) => r.commissions || 0 },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Ambassadeurs"
        subtitle="Liste complète des ambassadeurs approuvés avec performances."
        actions={(
          <ExportMenu
            onCsv={() => exportToCsv('ambassadeurs.csv', enriched, cols)}
            onPdf={() => exportToPdfPrint('Ambassadeurs VSM')}
          />
        )}
      />

      <AdminFilters>
        <AdminField label="Recherche">
          <AdminInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Nom, email, téléphone…" />
        </AdminField>
      </AdminFilters>

      {loading ? <AdminLoading /> : (
        <>
          <AdminTableWrap>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/20">
                <tr>
                  <th className="text-left py-3 px-4">Ambassadeur</th>
                  <th className="text-left py-3 px-4">Niveau</th>
                  <th className="text-right py-3 px-4">Ventes</th>
                  <th className="text-right py-3 px-4">Revenus</th>
                  <th className="text-right py-3 px-4">Commissions</th>
                  <th className="text-right py-3 px-4">Clics</th>
                  <th className="text-left py-3 px-4">Inscription</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-primary font-mono">{r.badge}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold uppercase" style={{ color: (r.tier || getTier(r.sales || 0).current).color }}>
                        {(r.tier || getTier(r.sales || 0).current).label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">{r.sales || 0}</td>
                    <td className="py-3 px-4 text-right">{formatFC(r.revenue || 0)}</td>
                    <td className="py-3 px-4 text-right text-primary font-bold">{formatFC(r.commissions || 0)}</td>
                    <td className="py-3 px-4 text-right">{r.clicks || 0}</td>
                    <td className="py-3 px-4 text-muted-foreground">{relativeDate(r.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/admin/ambassadors/${r.user_id}`}>
                        <AdminBtn variant="ghost"><Eye className="w-3 h-3 inline mr-1" />Détails</AdminBtn>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <AdminEmpty>Aucun ambassadeur</AdminEmpty>}
          </AdminTableWrap>
          <AdminPagination page={page} total={count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
