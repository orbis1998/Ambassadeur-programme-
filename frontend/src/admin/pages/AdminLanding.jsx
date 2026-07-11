import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { LANDING_PATH } from '@/pages/landing/landingData';
import {
  fetchLandingMediaAdmin,
  updateLandingMediaMeta,
  uploadLandingMediaFile,
  clearLandingMediaFile,
} from '@/admin/lib/landingMediaApi';
import AdminPageHeader, {
  AdminBtn, AdminField, AdminInput, AdminLoading,
} from '@/admin/components/AdminUi';

function SlotCard({ row, userId, onUpdated }) {
  const [title, setTitle] = useState(row.title || '');
  const [caption, setCaption] = useState(row.caption || '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    setTitle(row.title || '');
    setCaption(row.caption || '');
  }, [row.title, row.caption, row.media_url]);

  const saveMeta = async () => {
    setBusy('meta');
    setErr('');
    const { error } = await updateLandingMediaMeta(row.slot_key, { title, caption });
    if (error) setErr(error.message);
    else await onUpdated();
    setBusy('');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('upload');
    setErr('');
    const { error } = await uploadLandingMediaFile(file, row.slot_key, userId);
    if (error) setErr(error.message);
    else await onUpdated();
    setBusy('');
  };

  const onClear = async () => {
    if (!window.confirm('Supprimer le média de cet emplacement ?')) return;
    setBusy('clear');
    setErr('');
    const { error } = await clearLandingMediaFile(row.slot_key);
    if (error) setErr(error.message);
    else await onUpdated();
    setBusy('');
  };

  const isVideo = row.media_type === 'video';
  const accept = isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif';

  return (
    <div className="vsm-card p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">{row.section}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{row.slot_key}</p>
        </div>
        {row.media_url ? (
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-sm">Média actif</span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-sm">Vide</span>
        )}
      </div>

      <div className="aspect-video rounded-sm border border-border bg-secondary/30 overflow-hidden flex items-center justify-center">
        {row.media_url ? (
          isVideo ? (
            <video src={row.media_url} controls className="w-full h-full object-cover bg-black" />
          ) : (
            <img src={row.media_url} alt="" className="w-full h-full object-cover object-top" />
          )
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Aucun fichier — uploadez une capture ou vidéo</p>
          </div>
        )}
      </div>

      <AdminField label="Titre (visible sur la landing si vide)">
        <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </AdminField>
      <AdminField label="Légende / consigne (où placer quelle capture)">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 w-full resize-y min-h-[72px]"
        />
      </AdminField>

      {err && <p className="text-xs text-red-400">{err}</p>}

      <div className="flex flex-wrap gap-2 mt-auto">
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />
        <AdminBtn variant="ghost" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          {busy === 'upload' ? <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> : <Upload className="w-4 h-4 inline mr-1" />}
          {isVideo ? 'Uploader vidéo' : 'Uploader image'}
        </AdminBtn>
        <AdminBtn variant="ghost" disabled={!!busy} onClick={saveMeta}>Enregistrer texte</AdminBtn>
        {row.media_url && (
          <AdminBtn variant="danger" disabled={!!busy} onClick={onClear}>
            <Trash2 className="w-3 h-3 inline mr-1" /> Retirer
          </AdminBtn>
        )}
      </div>
    </div>
  );
}

export default function AdminLanding() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchLandingMediaAdmin();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const sec = r.section || 'Autre';
      if (!map[sec]) map[sec] = [];
      map[sec].push(r);
    });
    return Object.entries(map);
  }, [rows]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Landing page"
        subtitle="Gérez les captures d'écran et vidéos de la page /ambassadeur. Uploadez directement depuis votre appareil."
        actions={(
          <a
            href={LANDING_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold uppercase tracking-wider border border-border hover:border-primary/60 transition"
          >
            <ExternalLink className="w-4 h-4" /> Voir la landing
          </a>
        )}
      />

      <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
        Chaque emplacement affiche un placeholder avec titre et légende tant qu&apos;aucun média n&apos;est uploadé.
        Le bouton « S&apos;inscrire » n&apos;apparaît plus dans le header — les CTAs restent dans le corps de la page.
      </p>

      {loading ? <AdminLoading /> : (
        <div className="space-y-10">
          {grouped.map(([section, items]) => (
            <section key={section}>
              <h2 className="font-display text-lg font-bold uppercase mb-4 border-b border-border pb-2">{section}</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((row) => (
                  <SlotCard key={row.slot_key} row={row} userId={user?.id} onUpdated={load} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
