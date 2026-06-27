-- Reliable withdrawal history for prod (bypasses RLS edge cases). Same data local & prod.

CREATE OR REPLACE FUNCTION public.get_my_withdrawal_requests()
RETURNS SETOF public.ambassador_withdrawal_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ambassador_withdrawal_requests
  WHERE ambassador_id = auth.uid()
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_withdrawal_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_withdrawal_requests() TO authenticated;
