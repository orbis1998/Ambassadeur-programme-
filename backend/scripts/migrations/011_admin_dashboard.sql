-- Admin dashboard: ambassador resources + audit log

CREATE TABLE IF NOT EXISTS public.ambassador_resources (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text,
  resource_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  thumbnail_url text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.ambassador_audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassador_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_ambassador_resources ON public.ambassador_resources;
CREATE POLICY admin_all_ambassador_resources ON public.ambassador_resources
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS ambassador_resources_read_published ON public.ambassador_resources;
CREATE POLICY ambassador_resources_read_published ON public.ambassador_resources
  FOR SELECT TO authenticated USING (published = true OR is_admin());

DROP POLICY IF EXISTS admin_ambassador_audit_log ON public.ambassador_audit_log;
CREATE POLICY admin_ambassador_audit_log ON public.ambassador_audit_log
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.log_ambassador_audit(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO ambassador_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassador_resources;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassador_audit_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
