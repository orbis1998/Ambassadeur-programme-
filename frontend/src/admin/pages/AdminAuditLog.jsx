import React, { useCallback, useEffect, useState } from 'react';
import { relativeDate } from '@/lib/ambassador';
import { fetchAuditLog, PAGE_SIZE } from '@/admin/lib/adminApi';
import AdminPageHeader, { AdminPagination, AdminTableWrap, AdminLoading, AdminEmpty } from '@/admin/components/AdminUi';

export default function AdminAuditLog() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count: c } = await fetchAuditLog({ page, limit: PAGE_SIZE });
    setRows(data);
    setCount(c);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Historique / Journal"
        subtitle="Traçabilité des actions administrateur sur le programme ambassadeur."
      />

      {loading ? <AdminLoading /> : (
        <>
          <AdminTableWrap>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-secondary/20">
                <tr>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Admin</th>
                  <th className="text-left py-3 px-4">Action</th>
                  <th className="text-left py-3 px-4">Entité</th>
                  <th className="text-left py-3 px-4">Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{relativeDate(r.created_at)}</td>
                    <td className="py-3 px-4">{r.profiles?.full_name || r.profiles?.email || '—'}</td>
                    <td className="py-3 px-4 font-mono text-primary">{r.action}</td>
                    <td className="py-3 px-4">{r.entity_type} {r.entity_id && `#${r.entity_id}`}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-md truncate">{JSON.stringify(r.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <AdminEmpty>Aucune entrée — les actions admin apparaîtront ici.</AdminEmpty>}
          </AdminTableWrap>
          <AdminPagination page={page} total={count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
