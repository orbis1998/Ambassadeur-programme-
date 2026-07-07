/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import {
  ambassadorBadgeCode, buildAmbassadorLink, formatFC, relativeDate,
  getTier, getBadges, MIN_WITHDRAWAL_ORDERS, TIERS,
  isConfirmedStatus, isPendingStatus, isCancelledStatus,
  computeWithdrawalStats, fetchAmbassadorWithdrawals,
  buildOrderRankMap, getOrderCommission, fetchAmbassadorOrders,
} from '@/lib/ambassador';
import {
  Copy, Check, Share2, Eye, ShoppingCart, Wallet, TrendingUp, MousePointerClick,
  ArrowUpRight, Award, Sparkles, Trophy, Medal, Crown, Flame, ExternalLink, QrCode as QrIcon,
  Tag, Percent, Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ACCESS_MESSAGES, canShowPromoCode, canShowTrackingLink,
  getLinkDisplayState, getPromoDisplayState,
} from '@/lib/ambassadorAccess';

const ICONS = { sparkles: Sparkles, trophy: Trophy, medal: Medal, crown: Crown, flame: Flame };

export default function Dashboard() {
  const { user, profile, application, promoCodes, trackingLink, loading: authLoading, userDataLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const badge = ambassadorBadgeCode(user?.id);
  const kitPaid = Boolean(profile?.kit_paid);
  const showLink = canShowTrackingLink({ kitPaid, trackingLink });
  const showPromo = canShowPromoCode({ kitPaid, promoCodes });
  const linkState = getLinkDisplayState({ kitPaid, trackingLink });
  const promoState = getPromoDisplayState({ kitPaid, promoCodes });
  const slug = trackingLink?.slug || badge;
  const refLink = buildAmbassadorLink(slug);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    const [orders, linksRes, wRes] = await Promise.all([
      fetchAmbassadorOrders(user.id, promoCodes),
      supabase.from('ambassador_links').select('id, slug, created_at, active').eq('ambassador_id', user.id),
      fetchAmbassadorWithdrawals(user.id),
    ]);
    const links = linksRes.data;
    const lErr = linksRes.error;
    if (lErr) console.warn('ambassador_links', lErr.message);

    const linkIds = (links || []).map((l) => l.id);
    let clicks = [];
    if (linkIds.length) {
      const { data: c, error: cErr } = await supabase.from('ambassador_clicks').select('id, link_id, clicked_at, referrer, user_agent').in('link_id', linkIds).order('clicked_at', { ascending: false }).limit(500);
      if (cErr) console.warn('ambassador_clicks', cErr.message);
      clicks = c || [];
    }

    const ordersArr = (orders || []).filter((o) => !isCancelledStatus(o.status));
    const confirmed = ordersArr.filter((o) => isConfirmedStatus(o.status));
    const pending = ordersArr.filter((o) => isPendingStatus(o.status));
    const rankMap = buildOrderRankMap(confirmed);

    const withdrawalStats = computeWithdrawalStats({
      confirmedOrders: confirmed,
      withdrawals: wRes || [],
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inMonth = (iso) => iso && new Date(iso) >= monthStart;
    const ordersMonth = confirmed.filter((o) => inMonth(o.created_at));
    const allOrdersMonth = ordersArr.filter((o) => inMonth(o.created_at));
    const clicksMonth = clicks.filter((c) => inMonth(c.clicked_at));
    const revenueMonth = ordersMonth.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const commissionsMonth = ordersMonth.reduce((s, o) => s + getOrderCommission(o, rankMap), 0);

    const uniqueVisitorsKey = (c) => `${(c.referrer||'').toString().slice(0,80)}|${(c.user_agent||'').toString().slice(0,80)}`;
    const uniqueVisitors = new Set(clicks.map(uniqueVisitorsKey)).size;

    setStats({
      confirmedSales: withdrawalStats.totalConfirmedSales,
      pendingSales: pending.length,
      totalSales: ordersArr.length,
      totalRevenue: withdrawalStats.totalRevenue,
      totalCommissions: withdrawalStats.totalCommissions,
      availableCommissions: withdrawalStats.availableCommissions,
      newOrdersSinceWithdraw: withdrawalStats.newOrdersSinceWithdraw,
      ordersUntilWithdraw: withdrawalStats.ordersUntilWithdraw,
      canWithdraw: withdrawalStats.canWithdraw,
      totalClicks: clicks.length,
      uniqueVisitors,
      month: {
        clicks: clicksMonth.length,
        orders: allOrdersMonth.length,
        confirmedOrders: ordersMonth.length,
        revenue: revenueMonth,
        commissions: commissionsMonth,
      },
      isTopMonthly: false,
    });
    setRecent(
      ordersArr.slice(0, 15).map((o) => ({
        ...o,
        commission: isConfirmedStatus(o.status) ? getOrderCommission(o, rankMap) : 0,
      })),
    );
    setWithdrawals(wRes || []);
    setLoading(false);
  }, [user?.id, promoCodes]);

  useEffect(() => {
    if (authLoading || !userDataLoaded || !user?.id) return;
    loadDashboardData();
  }, [authLoading, userDataLoaded, user?.id, loadDashboardData]);

  useDashboardRealtime(user?.id, loadDashboardData, !authLoading && userDataLoaded && !!user?.id);

  const copy = async () => {
    try { await navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (_e) { /* clipboard unavailable */ }
  };

  const tier = useMemo(() => getTier(stats?.confirmedSales || 0), [stats?.confirmedSales]);
  const badges = useMemo(() => getBadges(stats), [stats]);

  const name = profile?.full_name || profile?.name || application?.full_name || 'Ambassadeur';
  const joined = application?.created_at;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-fade-up">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Bienvenue</div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight" data-testid="dashboard-greeting">
            Bonjour, <span className="vsm-gradient-text">{name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
            <span className="vsm-badge" data-testid="dashboard-badge-code">{badge}</span>
            <span className="px-2 py-1 text-xs border border-primary/40 text-primary uppercase tracking-wider rounded-sm">Statut : Actif</span>
            {joined && <span>Intégré le {relativeDate(joined)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 vsm-card" data-testid="tier-card">
          <div className="w-12 h-12 rounded-sm border border-primary/40 flex items-center justify-center" style={{ background: `${tier.current.color}20` }}>
            <Award className="w-6 h-6" style={{ color: tier.current.color }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Palier actuel</div>
            <div className="font-display text-lg font-bold">{tier.current.label}</div>
            <div className="text-[11px] text-muted-foreground">{tier.current.rate}% commission</div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={ShoppingCart} label="Ventes totales" value={loading ? '—' : stats.confirmedSales} sub={loading ? '' : `${stats.pendingSales} en attente`} testid="stat-sales" delay="stagger-1" />
        <StatCard icon={TrendingUp} label="CA généré" value={loading ? '—' : formatFC(stats.totalRevenue)} sub={`${tier.current.rate}% commission actuelle`} testid="stat-revenue" delay="stagger-2" />
        <StatCard icon={Wallet} label="Commissions gagnées" value={loading ? '—' : formatFC(stats.totalCommissions)} sub={loading ? '' : `Dispo : ${formatFC(stats.availableCommissions)}`} testid="stat-commissions" highlight delay="stagger-3" />
        <StatCard icon={MousePointerClick} label="Clics totaux" value={loading ? '—' : stats.totalClicks} sub={loading ? '' : `${stats.uniqueVisitors} visiteurs uniques`} testid="stat-clicks" delay="stagger-4" />
      </section>

      {/* Tier Progress */}
      {!loading && (
        <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="tier-progress-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Progression palier</div>
              <div className="font-display text-xl font-bold">{tier.current.label} {tier.next && `→ ${tier.next.label}`}</div>
            </div>
            {tier.next ? (
              <div className="text-right text-sm">
                <div className="font-bold">{stats.confirmedSales} / {tier.next.min} ventes</div>
                <div className="text-xs text-muted-foreground">{Math.max(0, tier.next.min - stats.confirmedSales)} à débloquer</div>
              </div>
            ) : (
              <div className="text-sm text-primary font-bold">Palier max atteint 🏆</div>
            )}
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${tier.progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            {TIERS.map((t) => (
              <div key={t.key} className="text-center">
                <div className="font-bold uppercase tracking-wider" style={{ color: t.color }}>{t.label}</div>
                <div>{t.min}+</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ambassador Link */}
      <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="link-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Mon lien ambassadeur</div>
            <h2 className="font-display text-xl font-bold mt-1">Votre lien personnel</h2>
          </div>
          {showLink && (
            <button onClick={() => setShowQR((s) => !s)} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-primary" data-testid="toggle-qr-btn">
              <QrIcon className="w-4 h-4" /> QR Code
            </button>
          )}
        </div>
        {showLink ? (
          <>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex-1 flex items-center bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono break-all" data-testid="ref-link-display">
                {refLink}
              </div>
              <button onClick={copy} data-testid="copy-link-btn" className="px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 flex items-center justify-center gap-2 min-w-[120px]">
                {copied ? <><Check className="w-4 h-4" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <ShareBtn label="WhatsApp" href={`https://wa.me/?text=${encodeURIComponent('Découvre VSM Collection — Vivre avec style : ' + refLink)}`} testid="share-whatsapp" />
              <ShareBtn label="Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`} testid="share-facebook" />
              <ShareBtn label="X / Twitter" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('VSM Collection — Vivre avec style')}&url=${encodeURIComponent(refLink)}`} testid="share-twitter" />
              <ShareBtn label="Telegram" href={`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Découvre VSM Collection')}`} testid="share-telegram" />
            </div>
            {showQR && (
              <div className="mt-5 flex flex-col items-center gap-3 py-5 border-t border-border" data-testid="qr-display">
                <div className="p-4 bg-white rounded-sm"><QRCodeSVG value={refLink} size={160} bgColor="#ffffff" fgColor="#0a0a0a" /></div>
                <p className="text-xs text-muted-foreground">Partagez ce QR code en physique ou en ligne</p>
              </div>
            )}
          </>
        ) : (
          <AccessPlaceholder state={linkState} testid="link-access-placeholder" />
        )}
      </section>

      {/* Promo codes */}
      <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="promo-codes-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Codes promo</div>
            <h2 className="font-display text-xl font-bold mt-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Mes codes ambassadeur
            </h2>
          </div>
          {showPromo && (
            <span className="text-xs text-muted-foreground">{promoCodes?.length || 0} code{(promoCodes?.length || 0) > 1 ? 's' : ''}</span>
          )}
        </div>
        {showPromo ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {promoCodes.filter((p) => p.active !== false).map((p) => (
              <div key={p.id} className="relative overflow-hidden border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 rounded-sm" data-testid={`promo-code-${p.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" /> {tier.current.rate}% commission
                  </div>
                  <button
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(p.code); setCopiedCode(p.id); setTimeout(() => setCopiedCode(null), 1800); } catch (_e) { /* ignore */ }
                    }}
                    data-testid={`copy-promo-code-${p.id}`}
                    className="text-xs flex items-center gap-1 px-2 py-1 border border-border rounded-sm hover:border-primary/60">
                    {copiedCode === p.id ? <><Check className="w-3 h-3 text-primary" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                  </button>
                </div>
                <div className="font-display text-2xl font-bold tracking-widest text-primary">{p.code}</div>
                {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                <div className="text-[10px] text-muted-foreground mt-2">Utilisations : {p.usage_count || 0}{p.max_usage ? ` / ${p.max_usage}` : ''}</div>
              </div>
            ))}
          </div>
        ) : (
          <AccessPlaceholder state={promoState} testid="promo-access-placeholder" />
        )}
      </section>

      {/* Two-column: This month + Withdrawal CTA */}
      <section className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="vsm-card p-5 lg:col-span-2 animate-fade-up" data-testid="month-perf-card">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Performances ce mois-ci</h2>
          {loading ? <div className="skeleton h-20 rounded-sm" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Visites" value={stats.month.clicks} />
              <MiniStat label="Commandes" value={stats.month.orders} />
              <MiniStat label="Ventes validées" value={formatFC(stats.month.revenue)} />
              <MiniStat label="Commissions" value={formatFC(stats.month.commissions)} highlight />
            </div>
          )}
        </div>
        <div className="vsm-card p-5 animate-fade-up flex flex-col" data-testid="withdraw-cta-card">
          <h2 className="font-display text-xl font-bold mb-2">Mes retraits</h2>
          <div className="text-xs text-muted-foreground mb-3">Solde disponible</div>
          <div className="text-3xl font-display font-bold text-primary mb-3" data-testid="available-balance">{loading ? '—' : formatFC(stats?.availableCommissions)}</div>
          <div className="text-xs text-muted-foreground mb-4">
            Min. <strong>{MIN_WITHDRAWAL_ORDERS} commandes</strong> validées requis.
            {!loading && <> Vous avez <strong className="text-foreground">{stats.confirmedSales}</strong>.</>}
          </div>
          {!loading && stats.canWithdraw ? (
            <Link to="/dashboard/withdraw" data-testid="goto-withdraw-btn"
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wider transition bg-primary text-primary-foreground hover:bg-primary/90">
              Demander un retrait <ArrowUpRight className="w-4 h-4" />
            </Link>
          ) : (
            <span data-testid="goto-withdraw-btn"
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wider bg-secondary text-muted-foreground cursor-not-allowed">
              Demander un retrait <ArrowUpRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </section>

      {/* Commission history */}
      <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="commissions-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Historique des commissions</h2>
          <span className="text-xs text-muted-foreground">{recent.length} entrées récentes</span>
        </div>
        {loading ? <div className="skeleton h-32 rounded-sm" /> : recent.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm" data-testid="commissions-empty">
            Aucune commission pour le moment. Partagez votre lien pour commencer !
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Commande</th>
                  <th className="text-right py-2 px-2">Montant</th>
                  <th className="text-right py-2 px-2">Commission</th>
                  <th className="text-left py-2 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30" data-testid={`commission-row-${o.id}`}>
                    <td className="py-2.5 px-2 text-muted-foreground">{relativeDate(o.created_at)}</td>
                    <td className="py-2.5 px-2 font-mono">#{o.id}</td>
                    <td className="py-2.5 px-2 text-right">{formatFC(o.total_amount)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-primary">{formatFC(o.commission)}</td>
                    <td className="py-2.5 px-2"><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Badges */}
      <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="badges-card">
        <h2 className="font-display text-xl font-bold mb-4">Mes badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {badges.map((b) => {
            const Icon = ICONS[b.icon] || Sparkles;
            return (
              <div key={b.id} className={`p-4 rounded-sm border text-center transition ${b.earned ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/30 opacity-50'}`} data-testid={`badge-${b.id}`}>
                <Icon className={`w-7 h-7 mx-auto mb-2 ${b.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-xs font-semibold uppercase tracking-wider">{b.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Withdrawals history */}
      {withdrawals.length > 0 && (
        <section className="vsm-card p-5 sm:p-6 mb-8 animate-fade-up" data-testid="withdrawals-history-card">
          <h2 className="font-display text-xl font-bold mb-4">Historique des retraits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Opérateur</th>
                  <th className="text-left py-2 px-2">Numéro</th>
                  <th className="text-left py-2 px-2">Bénéficiaire</th>
                  <th className="text-left py-2 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-border/50" data-testid={`withdrawal-row-${w.id}`}>
                    <td className="py-2.5 px-2 text-muted-foreground">{relativeDate(w.created_at)}</td>
                    <td className="py-2.5 px-2 capitalize">{w.mobile_operator}</td>
                    <td className="py-2.5 px-2 font-mono">{w.msisdn}</td>
                    <td className="py-2.5 px-2">{w.beneficiary_name}</td>
                    <td className="py-2.5 px-2"><StatusPill status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, testid, highlight, delay }) {
  return (
    <div className={`vsm-card p-4 sm:p-5 animate-fade-up ${delay || ''} ${highlight ? 'border-primary/40 bg-primary/5' : ''}`} data-testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${highlight ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
function MiniStat({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
function ShareBtn({ label, href, testid }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid}
      className="px-3 py-1.5 rounded-sm border border-border text-xs hover:border-primary/60 hover:text-primary transition flex items-center gap-1.5">
      <Share2 className="w-3 h-3" /> {label} <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}
function AccessPlaceholder({ state, testid }) {
  const msg = ACCESS_MESSAGES[state] || ACCESS_MESSAGES.kit_pending;
  return (
    <div className="text-center py-8 px-4 border border-dashed border-border rounded-sm" data-testid={testid}>
      <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground/60" />
      <div className="font-display font-bold text-base mb-2">{msg.title}</div>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{msg.body}</p>
    </div>
  );
}
function StatusPill({ status }) {
  const s = (status || '').toString().toLowerCase();
  const map = {
    'confirmée': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'confirmee': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'confirmed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'livrée': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'livree': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'delivered': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'paid': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'payée': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'payee': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'traitée': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'traitee': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'nouvelle': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    'en_attente': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    'en attente': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    'approved': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    'rejected': 'bg-red-500/15 text-red-400 border-red-500/40',
    'refusée': 'bg-red-500/15 text-red-400 border-red-500/40',
    'annulée': 'bg-red-500/15 text-red-400 border-red-500/40',
    'annulee': 'bg-red-500/15 text-red-400 border-red-500/40',
    'cancelled': 'bg-red-500/15 text-red-400 border-red-500/40',
  };
  const cls = map[s] || 'bg-secondary text-muted-foreground border-border';
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${cls}`}>{status || '—'}</span>;
}
