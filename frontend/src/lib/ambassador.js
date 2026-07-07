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

// VSM Ambassador tiers — commission rate by cumulative confirmed orders (never reset).
export const TIERS = [
  { key: 'starter', label: 'Starter', min: 0, max: 10, rate: 10, color: '#a3a3a3' },
  { key: 'bronze', label: 'Bronze', min: 11, max: 14, rate: 11, color: '#cd7f32' },
  { key: 'silver', label: 'Silver', min: 15, max: 34, rate: 13, color: '#c0c0c0' },
  { key: 'gold', label: 'Gold', min: 35, max: 74, rate: 15, color: '#ffb000' },
  { key: 'elite', label: 'Elite', min: 75, rate: 20, color: '#e10b2c' },
];

export function getTier(confirmedSales) {
  const sales = Math.max(0, Number(confirmedSales) || 0);
  let current = TIERS[0];
  for (const t of TIERS) if (sales >= t.min) current = t;
  const idx = TIERS.findIndex((t) => t.key === current.key);
  const next = TIERS[idx + 1] || null;
  // Barre alignée sur « X / Y ventes » (comme prod), pas sur la plage interne du palier.
  const progress = next ? Math.min(100, (sales / next.min) * 100) : 100;
  return { current, next, progress };
}

/** Taux appliqué à la N-ième commande confirmée (1-based). 11e commande = 11 %. */
export function getCommissionRateForOrderIndex(orderIndex) {
  const n = Math.max(1, Number(orderIndex) || 1);
  for (const t of TIERS) {
    if (n >= t.min && (t.max == null || n <= t.max)) return t.rate;
  }
  return TIERS[TIERS.length - 1].rate;
}

export function sortConfirmedOrders(orders) {
  return (orders || []).slice().sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    if (da !== db) return da - db;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

export function orderKey(order) {
  if (order?.id != null) return String(order.id);
  return `${order?.created_at || ''}|${order?.total_amount || 0}`;
}

/** Maps each confirmed order to its cumulative rank (1-based, by created_at). */
export function buildOrderRankMap(confirmedOrders) {
  const map = new Map();
  sortConfirmedOrders(confirmedOrders).forEach((o, i) => {
    map.set(orderKey(o), i + 1);
  });
  return map;
}

export function getOrderCommission(order, rankMap) {
  const rank = rankMap.get(orderKey(order));
  if (!rank) return 0;
  return Number(order.total_amount || 0) * getCommissionRateForOrderIndex(rank) / 100;
}

function sumOrderCommissions(orders, rankMap) {
  return (orders || []).reduce((s, o) => s + getOrderCommission(o, rankMap), 0);
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

/** Commandes attribuées à l'ambassadeur (lien direct ou code promo). */
export async function fetchAmbassadorOrders(userId, promoCodes = [], columns = 'id, total_amount, status, created_at, customer_name, ambassador_id, promo_code_id') {
  if (!userId) return [];

  const promoIds = (promoCodes || []).map((p) => p.id).filter(Boolean);
  let q = supabase.from('orders').select(columns).order('created_at', { ascending: false });
  if (promoIds.length) {
    q = q.or(`ambassador_id.eq.${userId},promo_code_id.in.(${promoIds.join(',')})`);
  } else {
    q = q.eq('ambassador_id', userId);
  }

  const { data, error } = await q;
  if (error) console.warn('fetchAmbassadorOrders', error.message);

  const seen = new Set();
  return (data || []).filter((o) => {
    if (o?.id == null || seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

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
export function computeWithdrawalStats({ confirmedOrders, withdrawals }) {
  const confirmed = confirmedOrders || [];
  const rankMap = buildOrderRankMap(confirmed);
  const sorted = (withdrawals || []).slice().sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  const lastWithdrawal = sorted.find((w) => isActiveWithdrawal(w.status));

  const sumRevenue = (rows) => rows.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalConfirmedSales = confirmed.length;
  const totalRevenue = sumRevenue(confirmed);
  const totalCommissions = sumOrderCommissions(confirmed, rankMap);

  const ordersSinceWithdraw = ordersAfterMarker(confirmed, lastWithdrawal);
  const newOrdersSinceWithdraw = ordersSinceWithdraw.length;
  const availableCommissions = sumOrderCommissions(ordersSinceWithdraw, rankMap);

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
