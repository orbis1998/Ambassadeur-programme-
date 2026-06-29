import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Link2, Smartphone, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchResources, upsertResource, deleteResource } from '@/admin/lib/adminApi';
import {
  uploadAmbassadorResourceFile,
  guessResourceTypeFromFile,
  isImageFile,
} from '@/admin/lib/resourceUpload';
import AdminPageHeader, {
  AdminBtn, AdminField, AdminInput, AdminSelect, AdminTableWrap, AdminLoading, AdminStatusPill,
} from '@/admin/components/AdminUi';

const TYPES = ['image', 'logo', 'banner', 'flyer', 'video', 'document', 'pdf'];

const ACCEPT = 'image/*,video/*,.pdf,application/pdf';

const emptyForm = {
  title: '',
  description: '',
  resource_type: 'image',
  url: '',
  thumbnail_url: '',
  storage_path: '',
  published: false,
  sort_order: 0,
};

export default function AdminResources() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchResources();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setPendingFile(null);
    setUploadError('');
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setPendingFile(file);
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (isImageFile(file)) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl('');

    if (!form.title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '');
      setForm((f) => ({
        ...f,
        title: base,
        resource_type: guessResourceTypeFromFile(file),
      }));
    }
  };

  const uploadFile = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError('');
    const result = await uploadAmbassadorResourceFile(pendingFile, user?.id);
    setUploading(false);
    if (result.error) {
      setUploadError(result.error.message || 'Échec de l\'upload');
      return;
    }
    setForm((f) => ({
      ...f,
      url: result.publicUrl,
      storage_path: result.storagePath,
      thumbnail_url: result.thumbnailUrl || f.thumbnail_url,
      resource_type: result.resourceType || f.resource_type,
    }));
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    if (!form.url?.trim()) {
      setUploadError('Ajoutez une URL ou uploadez un fichier depuis votre appareil.');
      return;
    }
    await upsertResource({
      ...(editId ? { id: editId } : {}),
      title: form.title,
      description: form.description,
      resource_type: form.resource_type,
      url: form.url,
      thumbnail_url: form.thumbnail_url || null,
      published: form.published,
      sort_order: form.sort_order,
      created_by: user?.id,
    });
    resetForm();
    load();
  };

  const edit = (r) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      description: r.description || '',
      resource_type: r.resource_type,
      url: r.url,
      thumbnail_url: r.thumbnail_url || '',
      storage_path: '',
      published: r.published,
      sort_order: r.sort_order || 0,
    });
    setPendingFile(null);
    setPreviewUrl(r.thumbnail_url || (r.resource_type === 'image' ? r.url : ''));
    setUploadError('');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Ressources marketing"
        subtitle="Uploadez depuis votre PC ou téléphone, ou collez un lien externe."
      />

      <div className="vsm-card p-5 mb-8">
        <h3 className="font-display font-bold mb-4">{editId ? 'Modifier' : 'Ajouter'} une ressource</h3>

        {/* Upload depuis appareil */}
        <div className="mb-6 p-4 border border-dashed border-primary/40 rounded-sm bg-primary/5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
            <Smartphone className="w-4 h-4" />
            Depuis mon PC ou téléphone
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            id="resource-file-input"
            onChange={handleFilePick}
          />
          <label
            htmlFor="resource-file-input"
            className="flex flex-col sm:flex-row items-center justify-center gap-3 py-8 px-4 border border-border rounded-sm bg-input/50 cursor-pointer hover:border-primary/60 transition"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center sm:text-left">
              <div className="font-medium text-sm">Choisir un fichier</div>
              <div className="text-xs text-muted-foreground mt-1">
                Images, vidéos, PDF — max 50 Mo. Sur mobile : appareil photo ou galerie.
              </div>
            </div>
          </label>

          {pendingFile && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-secondary/40 rounded-sm">
              <div className="text-sm min-w-0">
                <div className="font-medium truncate">{pendingFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(pendingFile.size / 1024 / 1024).toFixed(2)} Mo · {pendingFile.type || 'fichier'}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <AdminBtn onClick={uploadFile} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 inline animate-spin mr-1" />Envoi…</> : 'Uploader vers le stockage'}
                </AdminBtn>
                <AdminBtn variant="ghost" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  <X className="w-4 h-4" />
                </AdminBtn>
              </div>
            </div>
          )}

          {previewUrl && (
            <div className="mt-4">
              <img src={previewUrl} alt="Aperçu" className="max-h-40 rounded-sm border border-border object-contain" />
            </div>
          )}

          {form.url && form.storage_path && (
            <p className="mt-3 text-xs text-emerald-400">Fichier en ligne — prêt à enregistrer.</p>
          )}
        </div>

        {/* Lien externe */}
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Link2 className="w-4 h-4" />
          Ou lien externe
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <AdminField label="Titre">
            <AdminInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </AdminField>
          <AdminField label="Type">
            <AdminSelect value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="URL (si pas d'upload)">
            <AdminInput
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value, storage_path: '' })}
              placeholder="https://…"
            />
          </AdminField>
          <AdminField label="Miniature (optionnel)">
            <AdminInput value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
          </AdminField>
          <AdminField label="Description">
            <AdminInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </AdminField>
          <AdminField label="Ordre">
            <AdminInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </AdminField>
        </div>

        {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}

        <label className="flex items-center gap-2 mt-4 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Publié (visible ambassadeurs)
        </label>
        <div className="flex gap-2 mt-4">
          <AdminBtn onClick={save} disabled={uploading}>{editId ? 'Mettre à jour' : 'Ajouter'}</AdminBtn>
          {editId && <AdminBtn variant="ghost" onClick={resetForm}>Annuler</AdminBtn>}
        </div>
      </div>

      {loading ? <AdminLoading /> : (
        <AdminTableWrap>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-3 px-4">Titre</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Source</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-3 px-4">
                    <div className="font-medium">{r.title}</div>
                  </td>
                  <td className="py-3 px-4 capitalize">{r.resource_type}</td>
                  <td className="py-3 px-4">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px] block">
                      {r.url.includes('ambassador-resources') ? 'Stockage VSM' : 'Lien externe'}
                    </a>
                  </td>
                  <td className="py-3 px-4"><AdminStatusPill status={r.published ? 'active' : 'inactive'} /></td>
                  <td className="py-3 px-4 text-right">
                    <AdminBtn variant="ghost" onClick={() => edit(r)}>Modifier</AdminBtn>
                    <AdminBtn variant="danger" onClick={() => { if (window.confirm('Supprimer ?')) deleteResource(r.id).then(load); }}>Suppr.</AdminBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableWrap>
      )}
    </div>
  );
}
