import { useEffect } from 'react';
import { SEO } from './landingData';

function setMeta(name, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useLandingSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO.title;
    setMeta('description', SEO.description);
    setMeta('og:title', SEO.title, true);
    setMeta('og:description', SEO.description, true);
    setMeta('og:url', SEO.url, true);
    setMeta('og:type', 'website', true);
    setMeta('og:image', SEO.image, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', SEO.title);
    setMeta('twitter:description', SEO.description);
    setMeta('twitter:image', SEO.image);
    return () => { document.title = prevTitle; };
  }, []);
}
