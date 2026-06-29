import React, { useEffect, useState } from 'react';
import { fetchAdminSnapshot, enqueuePushNotification } from '@/admin/lib/adminApi';
import { TIERS } from '@/lib/ambassador';
import AdminPageHeader, { AdminField, AdminInput, AdminSelect, AdminBtn } from '@/admin/components/AdminUi';

export default function AdminNotifications() {
  const [approvedIds, setApprovedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [tier, setTier] = useState('starter');
  const [singleId, setSingleId] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('approved');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchAdminSnapshot().then((snap) => {
      setApprovedIds(
        snap.applications.filter((a) => (a.status || '').toLowerCase() === 'approved').map((a) => a.user_id).filter(Boolean),
      );
    });
  }, []);

  const resolveRecipients = async () => {
    if (target === 'single') return singleId ? [singleId] : [];
    if (target === 'all') return approvedIds;
    if (target === 'tier') {
      const snap = await fetchAdminSnapshot();
      const { buildLeaderboardRows } = await import('@/admin/lib/adminApi');
      const board = buildLeaderboardRows(snap.applications, snap.orders, snap.clicks, snap.links);
      return board.filter((b) => b.tier?.key === tier).map((b) => b.userId);
    }
    if (target === 'status') {
      const snap = await fetchAdminSnapshot();
      return snap.applications.filter((a) => (a.status || '').toLowerCase() === appStatusFilter).map((a) => a.user_id).filter(Boolean);
    }
    return [];
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setMessage('');
    const userIds = await resolveRecipients();
    const { error } = await enqueuePushNotification({ userIds, title, body });
    setSending(false);
    if (error) setMessage(`Erreur : ${error.message}`);
    else setMessage(`${userIds.length} notification(s) en file d'attente push.`);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-2xl mx-auto">
      <AdminPageHeader
        title="Notifications"
        subtitle="Envoyez des notifications push aux ambassadeurs (via push_outbox)."
      />

      <div className="vsm-card p-6 space-y-4">
        <AdminField label="Cible">
          <AdminSelect value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="all">Tous les ambassadeurs approuvés</option>
            <option value="single">Un seul ambassadeur (user_id)</option>
            <option value="tier">Par niveau</option>
            <option value="status">Par statut candidature</option>
          </AdminSelect>
        </AdminField>

        {target === 'single' && (
          <AdminField label="User ID (UUID)">
            <AdminInput value={singleId} onChange={(e) => setSingleId(e.target.value)} placeholder="uuid ambassadeur" />
          </AdminField>
        )}
        {target === 'tier' && (
          <AdminField label="Niveau">
            <AdminSelect value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </AdminSelect>
          </AdminField>
        )}
        {target === 'status' && (
          <AdminField label="Statut">
            <AdminSelect value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}>
              <option value="approved">Approuvé</option>
              <option value="pending">En attente</option>
              <option value="suspended">Suspendu</option>
            </AdminSelect>
          </AdminField>
        )}

        <AdminField label="Titre"><AdminInput value={title} onChange={(e) => setTitle(e.target.value)} /></AdminField>
        <AdminField label="Message"><AdminInput value={body} onChange={(e) => setBody(e.target.value)} /></AdminField>

        <AdminBtn onClick={send} disabled={sending}>{sending ? 'Envoi…' : 'Envoyer'}</AdminBtn>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
