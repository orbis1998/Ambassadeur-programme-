-- Reliable push subscription lookup for send-push Edge Function.

DROP FUNCTION IF EXISTS public.list_user_push_subscriptions(uuid);

CREATE OR REPLACE FUNCTION public.list_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (setting_key text, setting_value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value
  FROM public.settings s
  WHERE s.key LIKE ('push_sub_' || p_user_id::text || '_%')
    AND s.value IS NOT NULL
    AND s.value LIKE '%"endpoint"%';
$$;

REVOKE ALL ON FUNCTION public.list_user_push_subscriptions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_push_subscriptions(uuid) TO service_role;
