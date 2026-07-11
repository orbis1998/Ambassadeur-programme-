import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ambassadorBadgeCode, formatFC, relativeDate, getTier, buildAmbassadorLink,
} from '@/lib/ambassador';
import {
  fetchAmbassadorDetail, computeAmbassadorMetrics, updateApplication, approveApplication,
  setKitPaid, generatePromoCode, setPromoActive, setLinkActive,
} from '@/admin/lib/adminApi';
import AdminPageHeader, {
  AdminStatCard, AdminStatusPill, AdminBtn, AdminLoading, AdminTableWrap,
} from '@/admin/components/AdminUi';
import AdminWhatsAppNotifyBtn from '@/admin/components/AdminWhatsAppNotifyBtn';
import { ShoppingCart, Wallet, MousePointerClick, TrendingUp, ArrowLeft } from 'lucide-react';

export default function AdminAmbassadorDetail() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const reload = async () => {
    const d = await fetchAmbassadorDetail(userId);
    setData(d);
    return d;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const d = await fetchAmbassadorDetail(userId);
      if (active) { setData(d); setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId]);

  const app = data?.applications?.[0];
  const promo = data?.promos?.[0];
  const linkRow = data?.links?.[0];
  const kitPaid = Boolean(data?.profile?.kit_paid);
  const metrics = useMemo(
    () => (data ? computeAmbassadorMetrics(data.orders, data.withdrawals) : null),
    [data],
  );

  const setStatus = async (status) => {
    if (!app) return;
    setBusy('status');
    if (status === 'approved') {
      await approveApplication(app.id);
    } else {
      await updateApplication(app.id, { status }, status === 'approved' ? 'reactivate' : 'suspend');
    }
    await reload();
    setBusy('');
  };

  const toggleKit = async () => {
    setBusy('kit');
    await setKitPaid(userId, !kitPaid);
    await reload();
    setBusy('');
  };

  const onGeneratePromo = async () => {
    setBusy('promo');
    await generatePromoCode(userId);
    await reload();
    setBusy('');
  };

  const togglePromo = async () => {
    if (!promo) return;
    setBusy('promo-toggle');
    await setPromoActive(promo.id, !promo.active);
    await reload();
    setBusy('');
  };

  const toggleLink = async () => {
    if (!linkRow) return;
    setBusy('link-toggle');
    await setLinkActive(linkRow.id, !linkRow.active);
    await reload();
    setBusy('');
  };

  if (loading) return <div className="px-10 py-8"><AdminLoading /></div>;
  if (!data?.profile && !app) return <div className="px-10 py-8 text-muted-foreground">Ambassadeur introuvable</div>;

  const name = data.profile?.full_name || app?.full_name || 'Ambassadeur';
  const phone = data.profile?.phone || app?.phone;
  const badge = ambassadorBadgeCode(userId);
  const slug = linkRow?.slug || badge;
  const link = buildAmbassadorLink(slug);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <Link to="/admin/ambassadors" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour aux ambassadeurs
      </Link>

      <AdminPageHeader
        title={name}
        subtitle={`${badge} · ${data.profile?.email || app?.email} · ${data.profile?.phone || app?.phone || '—'}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <AdminWhatsAppNotifyBtn
              phone={phone}
              fullName={name}
              userId={userId}
              entityType="ambassador"
              entityId={app?.id || userId}
            />
            <AdminBtn onClick={() => setStatus('approved')}>Réactiver</AdminBtn>
            <AdminBtn variant="ghost" onClick={() => setStatus('suspended')}>Suspendre</AdminBtn>
            <AdminBtn variant="danger" onClick={() => setStatus('rejected')}>Désactiver</AdminBtn>
          </div>
        )}
      />

      <div className="flex items-center gap-2 mb-6">
        <AdminStatusPill status={app?.status || 'approved'} />
        <span className="text-sm text-muted-foreground">Inscrit {relativeDate(app?.created_at)}</span>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard icon={ShoppingCart} label="Ventes confirmées" value={metrics.confirmedSales} highlight />
        <AdminStatCard icon={TrendingUp} label="Revenus" value={formatFC(metrics.totalRevenue)} />
        <AdminStatCard icon={Wallet} label="Commissions" value={formatFC(metrics.totalCommissions)} sub={`Dispo ${formatFC(metrics.availableCommissions)}`} />
        <AdminStatCard icon={MousePointerClick} label="Clics" value={data.clicks?.length || 0} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-3">Kit & accès promotionnel</h3>
          <dl className="text-sm space-y-3 mb-4">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Kit Ambassadeur (30 $)</dt>
              <dd>
                <AdminStatusPill status={kitPaid ? 'approved' : 'pending'} />
                {data.profile?.kit_paid_at && (
                  <span className="text-xs text-muted-foreground ml-2">{relativeDate(data.profile.kit_paid_at)}</span>
                )}
              </dd>
            </div>
            <div><dt className="text-muted-foreground inline">Code promo : </dt>{promo ? <span className="font-mono font-bold text-primary">{promo.code}</span> : '—'}</div>
            <div><dt className="text-muted-foreground inline">Statut code : </dt>{promo ? <AdminStatusPill status={promo.active ? 'approved' : 'suspended'} /> : 'Non généré'}</div>
            <div><dt className="text-muted-foreground inline">Lien tracking : </dt>{linkRow ? <span className="font-mono text-xs break-all">{link}</span> : '—'}</div>
            <div><dt className="text-muted-foreground inline">Statut lien : </dt>{linkRow ? <AdminStatusPill status={linkRow.active ? 'approved' : 'suspended'} /> : 'Non créé'}</div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <AdminBtn onClick={toggleKit} disabled={!!busy}>
              {kitPaid ? 'Kit non payé' : 'Kit payé'}
            </AdminBtn>
            <AdminBtn variant="ghost" onClick={onGeneratePromo} disabled={!!busy || Boolean(promo)}>
              {promo ? 'Code existant' : 'Générer le code'}
            </AdminBtn>
            {promo && (
              <AdminBtn variant="ghost" onClick={togglePromo} disabled={!!busy}>
                {promo.active ? 'Désactiver code' : 'Activer code'}
              </AdminBtn>
            )}
            {linkRow && (
              <AdminBtn variant="ghost" onClick={toggleLink} disabled={!!busy}>
                {linkRow.active ? 'Désactiver lien' : 'Activer lien'}
              </AdminBtn>
            )}
          </div>
        </div>
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-3">Palier — {metrics.tier.current.label}</h3>
          <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2">
            <div className="h-full bg-primary" style={{ width: `${metrics.tier.progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">{metrics.confirmedSales} ventes · {metrics.tier.current.rate}% commission</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="vsm-card p-5">
          <h3 className="font-display font-bold mb-3">Profil</h3>
          <dl className="text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">Téléphone : </dt>
              <dd>{phone || '—'}</dd>
              {(app?.status || 'approved').toLowerCase() === 'approved' && (
                <AdminWhatsAppNotifyBtn
                  compact
                  phone={phone}
                  fullName={name}
                  userId={userId}
                  entityType="ambassador"
                  entityId={app?.id || userId}
                />
              )}
            </div>
            <div><dt className="text-muted-foreground inline">Plateforme : </dt>{app?.main_platform}</div>
            <div><dt className="text-muted-foreground inline">Profil social : </dt>{app?.profile_url || '—'}</div>
            <div><dt className="text-muted-foreground inline">Codes promo : </dt>{data.promos?.length || 0}</div>
            <div><dt className="text-muted-foreground inline">Liens : </dt>{data.links?.length || 0}</div>
          </dl>
        </div>
      </div>

      <AdminTableWrap>
        <h3 className="font-display font-bold p-4 border-b border-border">Historique commandes</h3>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2 px-4">Date</th>
              <th className="text-left py-2 px-4">#</th>
              <th className="text-right py-2 px-4">Montant</th>
              <th className="text-left py-2 px-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(data.orders || []).slice(0, 20).map((o) => (
              <tr key={o.id} className="border-t border-border/50">
                <td className="py-2 px-4 text-muted-foreground">{relativeDate(o.created_at)}</td>
                <td className="py-2 px-4 font-mono">#{o.id}</td>
                <td className="py-2 px-4 text-right">{formatFC(o.total_amount)}</td>
                <td className="py-2 px-4"><AdminStatusPill status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
