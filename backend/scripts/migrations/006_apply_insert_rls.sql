-- Allow authenticated users to submit their own ambassador application (prod registration without backend).

DROP POLICY IF EXISTS ambassador_apps_insert_own ON public.ambassador_applications;
CREATE POLICY ambassador_apps_insert_own ON public.ambassador_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND lower(coalesce(status, '')) = 'pending'
  );

-- Ensure select-own still exists (005 may have dropped 004 duplicate without a replacement).
DROP POLICY IF EXISTS ambassador_apps_select_own ON public.ambassador_applications;
CREATE POLICY ambassador_apps_select_own ON public.ambassador_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Profile row on signup (upsert from Apply page).
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
