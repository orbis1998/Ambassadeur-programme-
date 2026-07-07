import { supabase } from '@/lib/supabase';
import {
  isConfirmedStatus,
  isPendingStatus,
  isCancelledStatus,
  buildOrderRankMap,
  getOrderCommission,
  getTier,
  sortConfirmedOrders,
  ambassadorBadgeCode,
} from '@/lib/ambassador';

const PAGE_SIZE = 25;

export { PAGE_SIZE };

export async function logAudit(action, entityType, entityId, details = {}) {
  const { error } = await supabase.rpc('log_ambassador_audit', {
    p_action: action,
    p_entity_type: entityType || null,
    p_entity_id: entityId != null ? String(entityId) : null,
    p_details: details,
  });
  if (error) console.warn('audit', error.message);
}

export async function fetchApplications({ status, search, page = 0, limit = PAGE_SIZE } = {}) {
  let q = supabase
    .from('ambassador_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (status && status !== 'all') q = q.eq('status', status);
  if (search?.trim()) {
    const s = search.trim();
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  const { data, error, count } = await q;
  return { data: data || [], error, count: count || 0 };
}

export async function updateApplication(id, patch, auditAction) {
  const { data, error } = await supabase
    .from('ambassador_applications')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (!error && auditAction) await logAudit(auditAction, 'application', id, patch);
  return { data, error };
}

export async function approveApplication(id) {
  const { data, error } = await supabase.rpc('approve_ambassador_application', {
    p_application_id: id,
  });
  if (!error) await logAudit('approve', 'application', id, { tracking_link: data?.tracking_link?.slug });
  return { data, error };
}

export async function setKitPaid(userId, kitPaid) {
  const patch = {
    kit_paid: kitPaid,
    kit_paid_at: kitPaid ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (!error) await logAudit(kitPaid ? 'kit_paid' : 'kit_unpaid', 'profile', userId, patch);
  return { data, error };
}

export async function generatePromoCode(userId) {
  const { data, error } = await supabase.rpc('generate_ambassador_promo_code', { p_user_id: userId });
  if (!error) await logAudit('promo_generate', 'promo_code', data?.promo_code?.id, { code: data?.promo_code?.code });
  return { data, error };
}

export async function setPromoActive(promoId, active) {
  const { data, error } = await supabase.from('promo_codes').update({ active }).eq('id', promoId).select('*').single();
  if (!error) await logAudit(active ? 'promo_activate' : 'promo_deactivate', 'promo_code', promoId, { active });
  return { data, error };
}

export async function setLinkActive(linkId, active) {
  const { data, error } = await supabase.from('ambassador_links').update({ active }).eq('id', linkId).select('*').single();
  if (!error) await logAudit(active ? 'link_activate' : 'link_deactivate', 'ambassador_link', linkId, { active });
  return { data, error };
}

export async function deleteApplication(id) {
  const { error } = await supabase.from('ambassador_applications').delete().eq('id', id);
  if (!error) await logAudit('delete', 'application', id);
  return { error };
}

export async function fetchApprovedAmbassadors({ search, page = 0, limit = PAGE_SIZE } = {}) {
  let q = supabase
    .from('ambassador_applications')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (search?.trim()) {
    const s = search.trim();
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  const { data, error, count } = await q;
  return { data: data || [], error, count: count || 0 };
}

export async function fetchWithdrawals({ status, page = 0, limit = PAGE_SIZE } = {}) {
  let q = supabase
    .from('ambassador_withdrawal_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error, count } = await q;
  return { data: data || [], error, count: count || 0 };
}

export async function updateWithdrawal(id, patch) {
  const { data, error } = await supabase
    .from('ambassador_withdrawal_requests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (!error) await logAudit('withdrawal_update', 'withdrawal', id, patch);
  return { data, error };
}

export async function fetchResources() {
  const { data, error } = await supabase
    .from('ambassador_resources')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function upsertResource(row) {
  const payload = { ...row, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('ambassador_resources')
    .upsert(payload)
    .select('*')
    .single();
  if (!error) await logAudit(row.id ? 'resource_update' : 'resource_create', 'resource', data?.id, payload);
  return { data, error };
}

export async function deleteResource(id) {
  const { error } = await supabase.from('ambassador_resources').delete().eq('id', id);
  if (!error) await logAudit('resource_delete', 'resource', id);
  return { error };
}

export async function fetchAuditLog({ page = 0, limit = 50 } = {}) {
  const { data, error, count } = await supabase
    .from('ambassador_audit_log')
    .select('*, profiles:actor_id(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  return { data: data || [], error, count: count || 0 };
}

/** Bulk fetch for stats — admin RLS allows full read. */
export async function fetchAdminSnapshot() {
  const [
    appsRes,
    ordersRes,
    withdrawalsRes,
    linksRes,
    clicksRes,
    promosRes,
  ] = await Promise.all([
    supabase.from('ambassador_applications').select('id, user_id, status, created_at, full_name, email, phone'),
    supabase.from('orders').select('id, total_amount, status, created_at, ambassador_id, promo_code_id').not('ambassador_id', 'is', null),
    supabase.from('ambassador_withdrawal_requests').select('id, ambassador_id, status, created_at, updated_at, mobile_operator, msisdn, beneficiary_name'),
    supabase.from('ambassador_links').select('id, slug, ambassador_id, active, created_at'),
    supabase.from('ambassador_clicks').select('id, link_id, clicked_at'),
    supabase.from('promo_codes').select('id, ambassador_id, active, usage_count'),
  ]);

  return {
    applications: appsRes.data || [],
    orders: ordersRes.data || [],
    withdrawals: withdrawalsRes.data || [],
    links: linksRes.data || [],
    clicks: clicksRes.data || [],
    promos: promosRes.data || [],
    errors: [appsRes, ordersRes, withdrawalsRes, linksRes, clicksRes, promosRes]
      .filter((r) => r.error)
      .map((r) => r.error.message),
  };
}

export async function fetchProfilesByIds(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.from('profiles').select('id, full_name, email, phone, avatar_url, role, created_at').in('id', unique);
  const map = {};
  (data || []).forEach((p) => { map[p.id] = p; });
  return map;
}

export async function fetchAmbassadorDetail(userId) {
  const [profile, apps, orders, links, clicksRes, withdrawals, promos] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('ambassador_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('orders').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
    supabase.from('ambassador_links').select('*').eq('ambassador_id', userId),
    supabase.from('ambassador_clicks').select('id, link_id, clicked_at, referrer, user_agent'),
    supabase.from('ambassador_withdrawal_requests').select('*').eq('ambassador_id', userId).order('created_at', { ascending: false }),
    supabase.from('promo_codes').select('*').eq('ambassador_id', userId),
  ]);

  const linkIds = (links.data || []).map((l) => l.id);
  let clicks = [];
  if (linkIds.length) {
    const { data: c } = await supabase
      .from('ambassador_clicks')
      .select('id, link_id, clicked_at, referrer, user_agent')
      .in('link_id', linkIds)
      .order('clicked_at', { ascending: false })
      .limit(500);
    clicks = c || [];
  }

  return {
    profile: profile.data,
    applications: apps.data || [],
    orders: orders.data || [],
    links: links.data || [],
    clicks,
    withdrawals: withdrawals.data || [],
    promos: promos.data || [],
  };
}

export async function globalSearch(query) {
  const q = (query || '').trim();
  if (q.length < 2) return { ambassadors: [], orders: [], withdrawals: [] };

  const [apps, orders, withdrawals] = await Promise.all([
    supabase
      .from('ambassador_applications')
      .select('id, user_id, full_name, email, phone, status')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10),
    supabase.from('orders').select('id, total_amount, status, ambassador_id, customer_name, created_at').or(`id.eq.${Number(q) || -1},customer_name.ilike.%${q}%`).limit(10),
    supabase
      .from('ambassador_withdrawal_requests')
      .select('id, ambassador_id, status, msisdn, beneficiary_name, created_at')
      .or(`msisdn.ilike.%${q}%,beneficiary_name.ilike.%${q}%`)
      .limit(10),
  ]);

  return {
    ambassadors: apps.data || [],
    orders: orders.data || [],
    withdrawals: withdrawals.data || [],
  };
}

export async function enqueuePushNotification({ userIds, title, body, url = '/dashboard' }) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return { error: null, stats: null };
  const { data, error } = await supabase.rpc('admin_broadcast_push', {
    p_user_ids: ids,
    p_title: title,
    p_body: body,
    p_url: url,
  });
  const stats = data && typeof data === 'object' ? data : { queued: data ?? ids.length };
  if (!error) await logAudit('notification_send', 'push', null, { ...stats, title });
  return { error, stats };
}

export function computeAmbassadorMetrics(orders, withdrawals) {
  const activeOrders = (orders || []).filter((o) => !isCancelledStatus(o.status));
  const confirmed = activeOrders.filter((o) => isConfirmedStatus(o.status));
  const rankMap = buildOrderRankMap(confirmed);
  const totalRevenue = confirmed.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const totalCommissions = confirmed.reduce((s, o) => s + getOrderCommission(o, rankMap), 0);
  const paidWithdrawals = (withdrawals || []).filter((w) => {
    const st = (w.status || '').toLowerCase();
    return st === 'paid' || st === 'approved' || st === 'payée' || st === 'payee';
  });
  const pendingWithdrawals = (withdrawals || []).filter((w) => {
    const st = (w.status || '').toLowerCase();
    return st === 'pending' || st === 'en_attente' || st === 'approved';
  });
  const withdrawn = paidWithdrawals.reduce((s, w) => s + Number(w.amount || w.requested_amount || 0), 0);
  const tier = getTier(confirmed.length);
  return {
    confirmedSales: confirmed.length,
    pendingSales: activeOrders.filter((o) => isPendingStatus(o.status)).length,
    totalRevenue,
    totalCommissions,
    availableCommissions: Math.max(0, totalCommissions - withdrawn),
    withdrawn,
    pendingWithdrawals: pendingWithdrawals.length,
    tier,
  };
}

export function buildLeaderboardRows(applications, orders, clicks, links) {
  const approved = (applications || []).filter((a) => (a.status || '').toLowerCase() === 'approved');
  const linkByAmbassador = {};
  (links || []).forEach((l) => {
    if (!linkByAmbassador[l.ambassador_id]) linkByAmbassador[l.ambassador_id] = [];
    linkByAmbassador[l.ambassador_id].push(l.id);
  });
  const clicksByLink = {};
  (clicks || []).forEach((c) => {
    clicksByLink[c.link_id] = (clicksByLink[c.link_id] || 0) + 1;
  });

  return approved.map((app) => {
    const uid = app.user_id;
    const ambOrders = (orders || []).filter((o) => o.ambassador_id === uid && !isCancelledStatus(o.status));
    const confirmed = ambOrders.filter((o) => isConfirmedStatus(o.status));
    const rankMap = buildOrderRankMap(confirmed);
    const revenue = confirmed.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const commissions = confirmed.reduce((s, o) => s + getOrderCommission(o, rankMap), 0);
    const linkIds = linkByAmbassador[uid] || [];
    const clickCount = linkIds.reduce((s, lid) => s + (clicksByLink[lid] || 0), 0);
    const conversion = clickCount > 0 ? (confirmed.length / clickCount) * 100 : 0;
    return {
      userId: uid,
      name: app.full_name,
      email: app.email,
      badge: ambassadorBadgeCode(uid),
      sales: confirmed.length,
      revenue,
      commissions,
      clicks: clickCount,
      conversion,
      joinedAt: app.created_at,
      tier: getTier(confirmed.length).current,
    };
  });
}

export function aggregateTimeSeries(items, dateField, valueFn, days = 30) {
  const now = new Date();
  const buckets = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  (items || []).forEach((item) => {
    const raw = item[dateField];
    if (!raw) return;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (key in buckets) buckets[key] += valueFn(item);
  });
  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

export function computeProgramStats(snapshot) {
  const { applications, orders, withdrawals, links, clicks } = snapshot;
  const approved = applications.filter((a) => (a.status || '').toLowerCase() === 'approved');
  const pendingApps = applications.filter((a) => (a.status || '').toLowerCase() === 'pending');
  const rejected = applications.filter((a) => (a.status || '').toLowerCase() === 'rejected');
  const suspended = applications.filter((a) => (a.status || '').toLowerCase() === 'suspended');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = approved.filter((a) => new Date(a.created_at) >= monthStart).length;

  const activeOrders = orders.filter((o) => !isCancelledStatus(o.status));
  const confirmed = activeOrders.filter((o) => isConfirmedStatus(o.status));
  const rankMap = buildOrderRankMap(confirmed);
  const totalCommissions = confirmed.reduce((s, o) => s + getOrderCommission(o, rankMap), 0);
  const totalRevenue = confirmed.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const paidW = withdrawals.filter((w) => ['paid', 'approved', 'payée', 'payee'].includes((w.status || '').toLowerCase()));
  const pendingW = withdrawals.filter((w) => ['pending', 'en_attente'].includes((w.status || '').toLowerCase()));

  const ambWithOrders = new Set(confirmed.map((o) => o.ambassador_id)).size;
  const inactive = Math.max(0, approved.length - ambWithOrders);

  const globalConversion = clicks.length > 0 ? (confirmed.length / clicks.length) * 100 : 0;

  return {
    totalAmbassadors: approved.length,
    activeAmbassadors: ambWithOrders,
    inactiveAmbassadors: inactive,
    newAmbassadorsMonth: newThisMonth,
    pendingApplications: pendingApps.length,
    rejectedApplications: rejected.length,
    suspendedApplications: suspended.length,
    totalCommissions,
    paidWithdrawals: paidW.length,
    pendingWithdrawals: pendingW.length,
    totalOrders: confirmed.length,
    totalLinks: links.length,
    totalClicks: clicks.length,
    globalConversion,
    totalRevenue,
    totalApplications: applications.length,
  };
}
