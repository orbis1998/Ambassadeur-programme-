import { supabase } from './supabase';

const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

/** Load ambassador orders/clicks/withdrawals via Edge Function (bypasses RLS). */
export async function fetchAmbassadorDashboardData(accessToken) {
  if (!SUPABASE_URL || !accessToken) {
    return null;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ambassador-dashboard`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {
    /* fall through */
  }

  return null;
}

/** Fallback: direct Supabase reads (works when RLS allows). */
export async function fetchAmbassadorDashboardDirect(userId) {
  const [{ data: orders }, { data: links }, { data: withdrawals }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, status, created_at, customer_name')
      .eq('ambassador_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('ambassador_links').select('id, slug, created_at, active').eq('ambassador_id', userId),
    supabase
      .from('ambassador_withdrawal_requests')
      .select('*')
      .eq('ambassador_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const linkIds = (links || []).map((l) => l.id);
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

  return { orders: orders || [], links: links || [], clicks, withdrawals: withdrawals || [] };
}
