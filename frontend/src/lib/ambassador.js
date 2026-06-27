import { supabase, SITE_URL } from './supabase';

// Default commission rate (in %) — fallback if settings table empty.
export const DEFAULT_COMMISSION_RATE = 10;

// Statuts orders — normalisés sans accents pour matcher la DB VSM (traitée, nouvelle, etc.)
export const CONFIRMED_ORDER_STATUSES = [
  'confirmee', 'confirmed', 'livree', 'delivered', 'payee', 'paid',
  'traitee', 'traite', 'validee', 'valide', 'completee', 'complete',
];
export const PENDING_ORDER_STATUSES = [
  'en_attente', 'en attente', 'pending', 'nouvelle', 'new', 'en_cours', 'encours',
];
export const CANCELLED_ORDER_STATUSES = [
  'annulee', 'cancelled', 'canceled', 'refusee', 'refused',
];

/** Lowercase + strip accents so "traitée" matches "traitee". */
export function normalizeOrderStatus(status) {
  return (status || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isConfirmedStatus(status) {
  const s = normalizeOrderStatus(status);
  if (CONFIRMED_ORDER_STATUSES.includes(s)) return true;
  // Statuts VSM boutique (traitée, confirmée, livrée…)
  if (s.startsWith('trait')) return true;
  if (s.includes('confirm') || s.includes('livr') || s.includes('deliver') || s.includes('pay')) return true;
  return false;
}

export function isPendingStatus(status) {
  return PENDING_ORDER_STATUSES.includes(normalizeOrderStatus(status));
}

export function isCancelledStatus(status) {
  return CANCELLED_ORDER_STATUSES.includes(normalizeOrderStatus(status));
}

// VSM Ambassador tiers — progressive commission boosts.
export const TIERS = [
  { key: 'starter', label: 'Starter', min: 0, bonus: 0, color: '#a3a3a3' },
  { key: 'bronze', label: 'Bronze', min: 5, bonus: 1, color: '#cd7f32' },
  { key: 'silver', label: 'Silver', min: 15, bonus: 2, color: '#c0c0c0' },
  { key: 'gold', label: 'Gold', min: 35, bonus: 3, color: '#ffb000' },
  { key: 'elite', label: 'Elite', min: 75, bonus: 5, color: '#e10b2c' },
];

export function getTier(confirmedSales) {
  let current = TIERS[0];
  for (const t of TIERS) if (confirmedSales >= t.min) current = t;
  const idx = TIERS.findIndex((t) => t.key === current.key);
  const next = TIERS[idx + 1] || null;
  return { current, next, progress: next ? Math.min(100, ((confirmedSales - current.min) / (next.min - current.min)) * 100) : 100 };
}

export function getBadges(stats) {
  const sales = stats?.confirmedSales || 0;
  const out = [];
  out.push({ id: 'new', label: 'Nouvel Ambassadeur', earned: true, icon: 'sparkles' });
  out.push({ id: '10', label: '10 Ventes Réalisées', earned: sales >= 10, icon: 'trophy' });
  out.push({ id: '50', label: '50 Ventes Réalisées', earned: sales >= 50, icon: 'medal' });
  out.push({ id: 'elite', label: 'Ambassadeur Elite', earned: sales >= 75, icon: 'crown' });
  out.push({ id: 'topmonth', label: 'Top Vendeur du Mois', earned: !!stats?.isTopMonthly, icon: 'flame' });
  return out;
}

export function ambassadorBadgeCode(profileId) {
  if (!profileId) return 'VSM-0000';
  const hash = profileId.replace(/-/g, '').slice(-4).toUpperCase();
  return `VSM-${hash}`;
}

export function getAmbassadorAppOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return (process.env.REACT_APP_APP_URL || 'https://ambassadeur-programme.vercel.app').replace(/\/$/, '');
}

/** Shareable tracking URL — records a visit via /r/:slug then redirects to vsmcollection.com */
export function buildAmbassadorLink(slug) {
  const code = slug || 'VSM';
  return `${getAmbassadorAppOrigin()}/r/${encodeURIComponent(code)}`;
}

/** Final destination on the official VSM shop (no click tracking). */
export function buildSiteRefLink(slug) {
  const code = slug || 'VSM';
  const base = (SITE_URL || 'https://www.vsmcollection.com').replace(/\/$/, '');
  return `${base}/?ref=${encodeURIComponent(code)}`;
}

// Fetch commission rate (% as integer or float). Falls back to DEFAULT_COMMISSION_RATE.
export async function fetchCommissionRate() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'ambassador_commission_rate')
      .maybeSingle();
    if (data?.value) {
      const v = parseFloat(data.value);
      if (!Number.isNaN(v)) return v;
    }
  } catch (_e) { /* ignore */ }
  return DEFAULT_COMMISSION_RATE;
}

export const MIN_WITHDRAWAL_ORDERS = 10;

const WITHDRAWAL_REJECTED_STATUSES = ['rejected', 'refusee', 'refusée', 'refusé', 'cancelled', 'annulee', 'annulée'];

function normalizeWithdrawalStatus(status) {
  return (status || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isRejectedWithdrawal(status) {
  const s = normalizeWithdrawalStatus(status);
  return WITHDRAWAL_REJECTED_STATUSES.some((x) => s.includes(x.replace(/é/g, 'e')) || s === x);
}

function isActiveWithdrawal(status) {
  if (isRejectedWithdrawal(status)) return false;
  const s = normalizeWithdrawalStatus(status);
  if (!s) return true;
  return (
    ['pending', 'en_attente', 'approved', 'paid', 'payee', 'validate', 'valide', 'processed', 'complete'].includes(s)
    || s.includes('pending')
    || s.includes('attente')
    || s.includes('paid')
    || s.includes('pay')
    || s.includes('valid')
    || s.includes('approv')
  );
}

function ordersAfterMarker(orders, marker) {
  if (!marker?.created_at) return orders || [];
  const t = new Date(marker.created_at).getTime();
  return (orders || []).filter((o) => new Date(o.created_at || 0).getTime() > t);
}

/**
 * Retrait par paliers de 10 nouvelles commandes depuis le dernier retrait enregistré.
 * Totaux ventes / CA / commissions gagnées = cumulatif.
 * Solde disponible = commissions des commandes confirmées après le dernier retrait actif.
 */
export function computeWithdrawalStats({ confirmedOrders, withdrawals, commissionRate }) {
  const rate = Number(commissionRate) / 100;
  const confirmed = confirmedOrders || [];
  const sorted = (withdrawals || []).slice().sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  const lastWithdrawal = sorted.find((w) => isActiveWithdrawal(w.status));

  const sumRevenue = (rows) => rows.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalConfirmedSales = confirmed.length;
  const totalRevenue = sumRevenue(confirmed);
  const totalCommissions = totalRevenue * rate;

  const ordersSinceWithdraw = ordersAfterMarker(confirmed, lastWithdrawal);
  const newOrdersSinceWithdraw = ordersSinceWithdraw.length;
  const availableCommissions = sumRevenue(ordersSinceWithdraw) * rate;

  const canWithdraw = newOrdersSinceWithdraw >= MIN_WITHDRAWAL_ORDERS && availableCommissions > 0;

  return {
    totalConfirmedSales,
    totalRevenue,
    totalCommissions,
    availableCommissions,
    newOrdersSinceWithdraw,
    ordersUntilWithdraw: Math.max(0, MIN_WITHDRAWAL_ORDERS - newOrdersSinceWithdraw),
    canWithdraw,
    hasWithdrawalHistory: Boolean(lastWithdrawal),
  };
}

const WITHDRAWAL_COLUMNS = 'id, ambassador_id, status, mobile_operator, msisdn, beneficiary_name, created_at, updated_at, admin_note';

/** Charge l'historique retraits — RPC SECURITY DEFINER (prod = local), repli table directe. */
export async function fetchAmbassadorWithdrawals(userId) {
  if (!userId) return [];

  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_withdrawal_requests');
  if (!rpcErr && Array.isArray(rpcData)) return rpcData;

  const { data, error } = await supabase
    .from('ambassador_withdrawal_requests')
    .select(WITHDRAWAL_COLUMNS)
    .eq('ambassador_id', userId)
    .order('created_at', { ascending: false });
  if (error) console.warn('fetchAmbassadorWithdrawals', error.message);
  return data || [];
}

export const MOBILE_OPERATORS = [
  { value: 'airtel', label: 'Airtel Money', color: '#e60000' },
  { value: 'mpesa', label: 'M-Pesa (Vodacom)', color: '#27ae60' },
  { value: 'orange', label: 'Orange Money', color: '#ff7900' },
];

export function formatFC(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '0 FC';
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n))) + ' FC';
}

export function relativeDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function packMotivation(form) {
  const lines = [];
  lines.push(form.motivation?.trim() || '');
  lines.push('');
  lines.push('---DÉTAILS COMPLÉMENTAIRES---');
  lines.push(`Ville: ${form.city || ''}`);
  lines.push(`Âge: ${form.age || ''}`);
  lines.push(`Instagram: ${form.instagram || ''}`);
  lines.push(`Facebook: ${form.facebook || ''}`);
  lines.push(`TikTok: ${form.tiktok || ''}`);
  lines.push(`Abonnés cumulés: ${form.followers || ''}`);
  lines.push(`Programme antérieur: ${form.prior_program ? 'Oui' : 'Non'}`);
  if (form.prior_program && form.prior_program_details) {
    lines.push(`Détails programme: ${form.prior_program_details}`);
  }
  lines.push(`Plan de promotion: ${form.promotion_plan || ''}`);
  lines.push(`Portée mensuelle estimée: ${form.monthly_reach || ''}`);
  return lines.join('\n');
}
