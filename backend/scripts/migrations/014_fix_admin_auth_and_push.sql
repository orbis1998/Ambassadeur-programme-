-- Fix ambassador application read policy (dropped in 005) and improve admin push broadcast stats.

DROP POLICY IF EXISTS ambassador_apps_select_own ON public.ambassador_applications;
CREATE POLICY ambassador_apps_select_own ON public.ambassador_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public._count_push_subscriptions(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.settings
  WHERE key LIKE ('push_sub_' || p_user_id::text || '_%');
$$;

DROP FUNCTION IF EXISTS public.admin_broadcast_push(uuid[], text, text, text);

CREATE OR REPLACE FUNCTION public.admin_broadcast_push(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text DEFAULT '/dashboard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  queued integer := 0;
  with_subscriptions integer := 0;
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
      IF public._count_push_subscriptions(uid) > 0 THEN
        with_subscriptions := with_subscriptions + 1;
      END IF;
      PERFORM public._enqueue_push(
        uid,
        trim(p_title),
        trim(p_body),
        coalesce(nullif(trim(p_url), ''), '/dashboard'),
        'admin_broadcast',
        jsonb_build_object('source', 'admin_dashboard')
      );
      queued := queued + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'queued', queued,
    'with_subscriptions', with_subscriptions,
    'without_subscriptions', greatest(queued - with_subscriptions, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_broadcast_push(uuid[], text, text, text) TO authenticated;

-- Re-queue pending outbox rows stuck without webhook delivery.
DO $$
DECLARE
  row_rec record;
BEGIN
  FOR row_rec IN
    SELECT id, user_id, title, body, url, event_type, payload
    FROM public.push_outbox
    WHERE processed_at IS NULL
    ORDER BY created_at ASC
    LIMIT 200
  LOOP
    PERFORM public._push_try_webhook(
      jsonb_build_object(
        'outbox_id', row_rec.id,
        'user_id', row_rec.user_id,
        'title', row_rec.title,
        'body', row_rec.body,
        'url', row_rec.url,
        'event_type', row_rec.event_type,
        'payload', row_rec.payload
      )
    );
  END LOOP;
END;
$$;
