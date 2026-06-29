-- ambassador_apps_select_own keeps disappearing; ensure ambassadors can read applications.

DROP POLICY IF EXISTS ambassador_apps_select_own ON public.ambassador_applications;
CREATE POLICY ambassador_apps_select_own ON public.ambassador_applications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND email IS NOT NULL
      AND lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    )
  );

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_applications() TO authenticated;
