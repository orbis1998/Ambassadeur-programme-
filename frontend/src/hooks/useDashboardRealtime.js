import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to Supabase Realtime changes relevant to the ambassador dashboard
 * (orders, clicks, withdrawals) and call `onRefresh` when data may have changed.
 */
export function useDashboardRealtime(userId, onRefresh, enabled = true) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    let debounceTimer;
    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onRefreshRef.current?.(), 400);
    };

    const channel = supabase
      .channel(`dashboard-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `ambassador_id=eq.${userId}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ambassador_withdrawal_requests', filter: `ambassador_id=eq.${userId}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ambassador_clicks' },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, enabled]);
}
