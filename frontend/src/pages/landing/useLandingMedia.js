import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const LandingMediaCtx = createContext({ mediaBySlot: {}, loading: true });

export function LandingMediaProvider({ children }) {
  const [mediaBySlot, setMediaBySlot] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('landing_media')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!active) return;
      const map = {};
      (data || []).forEach((row) => { map[row.slot_key] = row; });
      setMediaBySlot(map);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <LandingMediaCtx.Provider value={{ mediaBySlot, loading }}>
      {children}
    </LandingMediaCtx.Provider>
  );
}

export function useLandingMedia() {
  return useContext(LandingMediaCtx);
}

export function getSlotMedia(mediaBySlot, slotKey) {
  return mediaBySlot?.[slotKey] || null;
}

export function slotHasMedia(slot) {
  return Boolean(slot?.media_url);
}
