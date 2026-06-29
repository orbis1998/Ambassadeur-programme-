import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { relativeDate } from '@/lib/ambassador';
import { fetchWithdrawals, updateWithdrawal, fetchProfilesByIds, PAGE_SIZE } from '@/admin/lib/adminApi';
import AdminPageHeader, {
  AdminStatusPill, AdminFilters, AdminField, AdminSelect, AdminBtn,
  AdminTableWrap, AdminPagination, AdminEmpty, AdminLoading, AdminStatCard, ExportMenu,
} from '@/admin/components/AdminUi';
import { exportToCsv, exportToPdfPrint } from '@/admin/lib/export';
import { Wallet, Clock, CheckCircle } from 'lucide-react';

export default function AdminWithdrawals() {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count: c } = await fetchWithdrawals({ status, page, limit: PAGE_SIZE });
    const pmap = await fetchProfilesByIds(data.map((w) => w.ambassador_id));
    setProfiles(pmap);
    setRows(data);
    setCount(c);
    setLoading(false);
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, patch) => {
    await updateWithdrawal(id, patch);
    load();
  };

  const totals = useMemo(() => {
    const pending = rows.filter((w) => (w.status || '').toLowerCase().includes('pending') || (w.status || '').toLowerCase().includes('attente'));
    const paid = rows.filter((w) => ['paid', 'approved', 'payée'].includes((w.status || '').toLowerCase()));
    return { pending: pending.length, paid: paid.length };
  }, [rows]);

  const cols = [
    { label: 'Bénéficiaire', get: (r) => r.beneficiary_name },
    { label: 'Opérateur', get: (r) => r.mobile_operator },
    { label: 'MSISDN', get: (r) => r.msisdn },
    { label: 'Statut', get: (r) => r.status },
    { label: 'Date', get: (r) => relativeDate(r.created_at) },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Demandes de retrait"
        subtitle="Approuvez, refusez ou marquez comme payé les retraits Mobile Money."
        actions={(
          <ExportMenu
            onCsv={() => exportToCsv('retraits.csv', rows, cols)}
            onPdf={() => exportToPdfPrint('Retraits VSM Ambassador')}
          />
        )}
      />

      <section className="grid grid-cols-3 gap-4 mb-6">
        <AdminStatCard icon={Clock} label="En attente (page)" value={totals.pending} highlight />
        <AdminStatCard icon={CheckCircle} label="Traités (page)" value={totals.paid} />
        <AdminStatCard icon={Wallet} label="Total demandes" value={count} />
      </section>

      <AdminFilters>
        <AdminField label="Statut">
          <AdminSelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvé</option>
            <option value="paid">Payé</option>
            <option value="rejected">Refusé</option>
          </AdminSelect>
        </AdminField>
      </AdminFilters>

      {loading ? <AdminLoading /> : (
        <>
          <AdminTableWrap>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/20">
                <tr>
                  <th className="text-left py-3 px-4">Ambassadeur</th>
                  <th className="text-left py-3 px-4">Bénéficiaire</th>
                  <th className="text-left py-3 px-4">Méthode</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Statut</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const p = profiles[w.ambassador_id];
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="py-3 px-4">{p?.full_name || '—'}</td>
                      <td className="py-3 px-4">
                        <div>{w.beneficiary_name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{w.msisdn}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">{w.mobile_operator}</td>
                      <td className="py-3 px-4 text-muted-foreground">{relativeDate(w.created_at)}</td>
                      <td className="py-3 px-4"><AdminStatusPill status={w.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1">
                          <AdminBtn onClick={() => act(w.id, { status: 'approved' })}>Approuver</AdminBtn>
                          <AdminBtn onClick={() => act(w.id, { status: 'paid' })}>Payer</AdminBtn>
                          <AdminBtn variant="ghost" onClick={() => act(w.id, { status: 'rejected', admin_note: 'Refusé par admin' })}>Refuser</AdminBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && <AdminEmpty>Aucune demande</AdminEmpty>}
          </AdminTableWrap>
          <AdminPagination page={page} total={count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
