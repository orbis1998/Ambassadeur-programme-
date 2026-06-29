-- Admin dashboard: broadcast push notifications via _enqueue_push (bypasses RLS + fires webhook).

CREATE OR REPLACE FUNCTION public.admin_broadcast_push(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text DEFAULT '/dashboard'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  sent integer := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' OR p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'title and body required';
  END IF;

  FOREACH uid IN ARRAY coalesce(p_user_ids, ARRAY[]::uuid[])
  LOOP
    IF uid IS NOT NULL THEN
      PERFORM public._enqueue_push(
        uid,
        trim(p_title),
        trim(p_body),
        coalesce(nullif(trim(p_url), ''), '/dashboard'),
        'admin_broadcast',
        jsonb_build_object('source', 'admin_dashboard')
      );
      sent := sent + 1;
    END IF;
  END LOOP;

  RETURN sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_broadcast_push(uuid[], text, text, text) TO authenticated;

-- push_outbox read policies (005 removed select_own without replacement)
DROP POLICY IF EXISTS push_outbox_select_own ON public.push_outbox;
CREATE POLICY push_outbox_select_own ON public.push_outbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_outbox_admin_select ON public.push_outbox;
CREATE POLICY push_outbox_admin_select ON public.push_outbox
  FOR SELECT TO authenticated
  USING (is_admin());
