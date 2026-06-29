-- Ambassadors could not read their own application (policy missing after 005).
-- Also link orphan applications (approved but user_id NULL) via account email.

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

CREATE OR REPLACE FUNCTION public.get_my_ambassador_applications()
RETURNS SETOF public.ambassador_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(trim(email)) INTO uemail
  FROM auth.users
  WHERE id = uid;

  IF uemail IS NOT NULL AND uemail <> '' THEN
    UPDATE public.ambassador_applications a
    SET user_id = uid
    WHERE a.user_id IS NULL
      AND lower(trim(a.email)) = uemail;
  END IF;

  RETURN QUERY
  SELECT a.*
  FROM public.ambassador_applications a
  WHERE a.user_id = uid
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_applications() TO authenticated;
