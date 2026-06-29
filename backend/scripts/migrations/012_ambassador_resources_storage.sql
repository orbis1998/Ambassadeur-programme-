-- Supabase Storage bucket for ambassador marketing resources (admin upload, public read)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ambassador-resources',
  'ambassador-resources',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS ambassador_resources_storage_admin_insert ON storage.objects;
CREATE POLICY ambassador_resources_storage_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ambassador-resources' AND public.is_admin());

DROP POLICY IF EXISTS ambassador_resources_storage_admin_update ON storage.objects;
CREATE POLICY ambassador_resources_storage_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ambassador-resources' AND public.is_admin())
  WITH CHECK (bucket_id = 'ambassador-resources' AND public.is_admin());

DROP POLICY IF EXISTS ambassador_resources_storage_admin_delete ON storage.objects;
CREATE POLICY ambassador_resources_storage_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ambassador-resources' AND public.is_admin());

DROP POLICY IF EXISTS ambassador_resources_storage_public_read ON storage.objects;
CREATE POLICY ambassador_resources_storage_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ambassador-resources');
