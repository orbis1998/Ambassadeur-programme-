/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Copy, Check, Image as ImageIcon, FileText, Video } from 'lucide-react';

const PROMO_TEXTS = [
  {
    title: 'Annonce générale',
    text: "VSM Collection — Vivre avec style. Streetwear premium fait en RDC, porté dans le monde. Découvrez la nouvelle collection avec mon lien et bénéficiez d'une expérience unique.",
  },
  {
    title: 'Story Instagram',
    text: "🔥 La nouvelle collection VSM est dispo ! Utilisez mon lien pour découvrir les pièces avant tout le monde. #VSMCollection #VivreAvecStyle",
  },
  {
    title: 'Promo limitée',
    text: "Édition limitée VSM Collection. Streetwear premium 🇨🇩. Disponible maintenant via mon lien ambassadeur — quantités limitées !",
  },
];

export default function Resources() {
  const [products, setProducts] = useState([]);
  const [hero, setHero] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('products').select('id, name, image_url, images, price, category').eq('is_active', true).limit(12),
        supabase.from('settings').select('key, value').like('key', 'hero_%_image'),
      ]);
      setProducts(p || []);
      setHero((s || []).map((x) => x.value));
    })();
  }, []);

  const copyText = async (i) => {
    try { await navigator.clipboard.writeText(PROMO_TEXTS[i].text); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1800); } catch (_e) { /* clipboard unavailable */ }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-6xl mx-auto animate-fade-in" data-testid="resources-page">
      <header className="mb-6 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Ressources Marketing</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Téléchargez les contenus officiels VSM</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Photos produits, visuels hero et textes promotionnels prêts à partager.</p>
      </header>

      {/* Hero visuals */}
      {hero.length > 0 && (
        <section className="vsm-card p-5 sm:p-6 mb-6" data-testid="hero-section">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Visuels hero</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {hero.map((url, i) => (
              <a key={i} href={url} download className="group block relative overflow-hidden rounded-sm border border-border" data-testid={`hero-img-${i}`}>
                <img src={url} alt={`hero ${i}`} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Download className="w-6 h-6 text-white" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Products photos */}
      <section className="vsm-card p-5 sm:p-6 mb-6" data-testid="products-section">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Photos produits</h2>
        {products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">Aucun produit pour l'instant.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => {
              const src = p.image_url || (Array.isArray(p.images) ? p.images[0] : null);
              if (!src) return null;
              return (
                <a key={p.id} href={src} download target="_blank" rel="noopener noreferrer" className="group block vsm-card overflow-hidden" data-testid={`product-${p.id}`}>
                  <div className="aspect-square overflow-hidden bg-secondary">
                    <img src={src} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3">
                    <div className="font-display font-bold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1"><Download className="w-3 h-3" /> Télécharger</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Promo texts */}
      <section className="vsm-card p-5 sm:p-6" data-testid="promo-texts-section">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Textes promotionnels</h2>
        <div className="space-y-3">
          {PROMO_TEXTS.map((p, i) => (
            <div key={i} className="border border-border rounded-sm p-4 hover:border-primary/40 transition" data-testid={`promo-text-${i}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-primary font-semibold">{p.title}</div>
                <button onClick={() => copyText(i)} className="text-xs flex items-center gap-1 px-2 py-1 border border-border rounded-sm hover:border-primary/60" data-testid={`copy-promo-${i}`}>
                  {copiedIdx === i ? <><Check className="w-3 h-3 text-primary" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                </button>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
