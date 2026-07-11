import { supabase } from '@/lib/supabase';
import { AMBASSADOR_RESOURCES_BUCKET, isImageFile } from '@/admin/lib/resourceUpload';

export async function fetchLandingMediaAdmin() {
  const { data, error } = await supabase
    .from('landing_media')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function updateLandingMediaMeta(slotKey, { title, caption }) {
  const { data, error } = await supabase
    .from('landing_media')
    .update({
      title: title?.trim() || '',
      caption: caption?.trim() || '',
      updated_at: new Date().toISOString(),
    })
    .eq('slot_key', slotKey)
    .select('*')
    .single();
  return { data, error };
}

function sanitizeFilename(name) {
  return (name || 'file')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export async function uploadLandingMediaFile(file, slotKey, userId) {
  if (!file || !slotKey) return { error: new Error('Fichier ou emplacement manquant') };
  if (file.size > 50 * 1024 * 1024) return { error: new Error('Fichier trop volumineux (max 50 Mo)') };

  const isVideo = (file.type || '').startsWith('video/');
  const isImage = isImageFile(file);
  if (!isVideo && !isImage) {
    return { error: new Error('Format non supporté — image ou vidéo uniquement') };
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : (isVideo ? 'mp4' : 'jpg');
  const path = `landing/${slotKey}/${Date.now()}-${sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AMBASSADOR_RESOURCES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) return { error: uploadError };

  const { data: urlData } = supabase.storage.from(AMBASSADOR_RESOURCES_BUCKET).getPublicUrl(path);
  const mediaUrl = urlData?.publicUrl || '';

  const { data, error } = await supabase
    .from('landing_media')
    .update({
      media_url: mediaUrl,
      storage_path: path,
      media_type: isVideo ? 'video' : 'image',
      updated_at: new Date().toISOString(),
    })
    .eq('slot_key', slotKey)
    .select('*')
    .single();

  return { data, error, publicUrl: mediaUrl, storagePath: path };
}

export async function clearLandingMediaFile(slotKey) {
  const { data: row } = await supabase.from('landing_media').select('storage_path').eq('slot_key', slotKey).maybeSingle();
  if (row?.storage_path) {
    await supabase.storage.from(AMBASSADOR_RESOURCES_BUCKET).remove([row.storage_path]);
  }
  const { data, error } = await supabase
    .from('landing_media')
    .update({
      media_url: null,
      storage_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('slot_key', slotKey)
    .select('*')
    .single();
  return { data, error };
}
