import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FALLBACK_STATS } from './landingData';

/**
 * Public stats for landing — falls back to placeholders if RLS blocks anon reads.
 * Ready to wire to a public RPC later (e.g. get_ambassador_program_stats).
 */
export function useLandingStats() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [appsRes, ordersRes] = await Promise.all([
          supabase
            .from('ambassador_applications')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved'),
          supabase
            .from('orders')
            .select('id, total_amount, status', { count: 'exact' })
            .not('ambassador_id', 'is', null)
            .limit(500),
        ]);

        if (!mounted) return;

        const approved = appsRes.count ?? FALLBACK_STATS.ambassadors;
        const orders = ordersRes.data || [];
        const confirmed = orders.filter((o) => {
          const s = (o.status || '').toLowerCase();
          return s.includes('confirm') || s.includes('livr') || s.includes('pay') || s.startsWith('trait');
        });
        const revenue = confirmed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        setStats({
          ambassadors: Math.max(approved, FALLBACK_STATS.ambassadors),
          salesGenerated: Math.max(confirmed.length, FALLBACK_STATS.salesGenerated),
          commissionsPaid: FALLBACK_STATS.commissionsPaid,
          approvalRate: FALLBACK_STATS.approvalRate,
        });
      } catch {
        if (mounted) setStats(FALLBACK_STATS);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { stats, loading };
}
