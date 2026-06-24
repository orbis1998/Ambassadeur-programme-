import { useEffect } from 'react';
import { supabase } from './supabase';

/** Subscribe to Supabase Realtime postgres changes for a table filter. */
export function useSupabaseRealtime(table, filter, onChange, enabled = true) {
  useEffect(() => {
    if (!enabled || !filter) return undefined;
    const channel = supabase
      .channel(`rt-${table}-${filter}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => onChange(payload),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled, onChange]);
}
