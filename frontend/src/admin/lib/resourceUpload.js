import { supabase } from '@/lib/supabase';

export const AMBASSADOR_RESOURCES_BUCKET = 'ambassador-resources';

const MAX_BYTES = 50 * 1024 * 1024;

const MIME_TO_TYPE = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'logo',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'pdf',
};

function sanitizeFilename(name) {
  return (name || 'file')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

export function guessResourceTypeFromFile(file) {
  if (!file) return 'document';
  if (MIME_TO_TYPE[file.type]) return MIME_TO_TYPE[file.type];
  if ((file.type || '').startsWith('image/')) return 'image';
  if ((file.type || '').startsWith('video/')) return 'video';
  if (file.name?.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'document';
}

export function isImageFile(file) {
  return (file?.type || '').startsWith('image/');
}

/** Upload depuis PC ou téléphone vers Supabase Storage. */
export async function uploadAmbassadorResourceFile(file, userId) {
  if (!file) return { error: new Error('Aucun fichier sélectionné') };
  if (file.size > MAX_BYTES) {
    return { error: new Error('Fichier trop volumineux (max 50 Mo)') };
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId || 'admin'}/${Date.now()}-${sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AMBASSADOR_RESOURCES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) return { error: uploadError };

  const { data: urlData } = supabase.storage.from(AMBASSADOR_RESOURCES_BUCKET).getPublicUrl(path);

  return {
    publicUrl: urlData?.publicUrl || '',
    thumbnailUrl: isImageFile(file) ? urlData?.publicUrl || '' : '',
    storagePath: path,
    resourceType: guessResourceTypeFromFile(file),
  };
}
