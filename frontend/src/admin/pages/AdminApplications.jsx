import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { relativeDate } from '@/lib/ambassador';
import { fetchApplications, updateApplication, deleteApplication, PAGE_SIZE } from '@/admin/lib/adminApi';
import AdminPageHeader, {
  AdminStatusPill, AdminFilters, AdminField, AdminSelect, AdminInput,
  AdminBtn, AdminTableWrap, AdminPagination, AdminEmpty, AdminLoading, ExportMenu,
} from '@/admin/components/AdminUi';
import { exportToCsv, exportToPdfPrint } from '@/admin/lib/export';

export default function AdminApplications() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count: c } = await fetchApplications({ status, search, page, limit: PAGE_SIZE });
    setRows(data);
    setCount(c);
    setLoading(false);
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, patch, audit) => {
    await updateApplication(id, patch, audit);
    if (selected?.id === id) setSelected({ ...selected, ...patch });
    load();
  };

  const cols = [
    { label: 'Nom', get: (r) => r.full_name },
    { label: 'Email', get: (r) => r.email },
    { label: 'Téléphone', get: (r) => r.phone },
    { label: 'Statut', get: (r) => r.status },
    { label: 'Date', get: (r) => relativeDate(r.created_at) },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Candidatures"
        subtitle="Validez, refusez ou suspendez les demandes d'adhésion au programme."
        actions={(
          <ExportMenu
            onCsv={() => exportToCsv('candidatures.csv', rows, cols)}
            onPdf={() => exportToPdfPrint('Candidatures VSM Ambassador')}
          />
        )}
      />

      <AdminFilters>
        <AdminField label="Statut">
          <AdminSelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Refusées</option>
            <option value="suspended">Suspendues</option>
          </AdminSelect>
        </AdminField>
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
                  <th className="text-left py-3 px-4">Candidat</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Statut</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">@{r.username || '—'} · {r.main_platform}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div>{r.email}</div>
                      <div className="text-xs">{r.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{relativeDate(r.created_at)}</td>
                    <td className="py-3 px-4"><AdminStatusPill status={r.status} /></td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap justify-end gap-1">
                        <AdminBtn variant="ghost" onClick={() => setSelected(r)}><Eye className="w-3 h-3 inline mr-1" />Dossier</AdminBtn>
                        {r.status !== 'approved' && <AdminBtn onClick={() => act(r.id, { status: 'approved' }, 'approve')}>Approuver</AdminBtn>}
                        {r.status !== 'rejected' && <AdminBtn variant="ghost" onClick={() => act(r.id, { status: 'rejected' }, 'reject')}>Refuser</AdminBtn>}
                        {r.status !== 'suspended' && <AdminBtn variant="ghost" onClick={() => act(r.id, { status: 'suspended' }, 'suspend')}>Suspendre</AdminBtn>}
                        <AdminBtn variant="danger" onClick={() => { if (window.confirm('Supprimer cette candidature ?')) deleteApplication(r.id).then(load); }}>Suppr.</AdminBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <AdminEmpty>Aucune candidature</AdminEmpty>}
          </AdminTableWrap>
          <AdminPagination page={page} total={count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <div className="relative vsm-card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-up">
            <h2 className="font-display text-xl font-bold mb-4">Dossier candidat</h2>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Nom :</span> {selected.full_name}</p>
              <p><span className="text-muted-foreground">Email :</span> {selected.email}</p>
              <p><span className="text-muted-foreground">Téléphone :</span> {selected.phone}</p>
              <p><span className="text-muted-foreground">Plateforme :</span> {selected.main_platform}</p>
              <p><span className="text-muted-foreground">Profil :</span> {selected.profile_url || '—'}</p>
              <p><span className="text-muted-foreground">Motivation :</span></p>
              <pre className="whitespace-pre-wrap text-xs bg-secondary/40 p-3 rounded-sm border border-border">{selected.motivation}</pre>
            </div>
            <div className="flex gap-2 mt-6">
              <AdminBtn onClick={() => act(selected.id, { status: 'approved' }, 'approve')}>Approuver</AdminBtn>
              <AdminBtn variant="ghost" onClick={() => setSelected(null)}>Fermer</AdminBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
