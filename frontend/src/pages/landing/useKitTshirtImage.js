import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { KIT_TSHIRT_IMAGE_FALLBACK } from './landingData';

/** Official VSM t-shirt from products catalog (category: t-shirts). */
export function useKitTshirtImage() {
  const [src, setSrc] = useState(KIT_TSHIRT_IMAGE_FALLBACK);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('image_url, images')
          .eq('category', 't-shirts')
          .eq('is_active', true)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted || !data) return;

        const url = data.image_url
          || (Array.isArray(data.images) ? data.images[0] : null);

        if (url) setSrc(url);
      } catch {
        /* keep fallback */
      }
    })();

    return () => { mounted = false; };
  }, []);

  return src;
}
