-- Kit Ambassadeur (profiles.kit_paid) + approbation avec lien tracking + génération manuelle code promo

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kit_paid_at timestamptz;

COMMENT ON COLUMN public.profiles.kit_paid IS 'Kit Ambassadeur acquitté — lecture partagée avec Academy';
COMMENT ON COLUMN public.profiles.kit_paid_at IS 'Date de validation du kit par l''admin';

CREATE OR REPLACE FUNCTION public._ambassador_first_name_part(p_full_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(split_part(trim(coalesce(p_full_name, 'AMB')), ' ', 1), '[^a-zA-Z]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION public._ambassador_badge_slug(p_user_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'VSM-' || upper(right(replace(p_user_id::text, '-', ''), 4))
$$;

CREATE OR REPLACE FUNCTION public.provision_ambassador_tracking_link(p_user_id uuid)
RETURNS public.ambassador_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.ambassador_links;
  created public.ambassador_links;
  v_slug text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO existing
  FROM public.ambassador_links
  WHERE ambassador_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    RETURN existing;
  END IF;

  v_slug := public._ambassador_badge_slug(p_user_id);

  INSERT INTO public.ambassador_links (ambassador_id, slug, target_type, active)
  VALUES (p_user_id, v_slug, 'product', false)
  RETURNING * INTO created;

  RETURN created;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_ambassador_application(p_application_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.ambassador_applications;
  link public.ambassador_links;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.ambassador_applications
  SET status = 'approved'
  WHERE id = p_application_id
  RETURNING * INTO app;

  IF app.id IS NULL THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  IF app.user_id IS NOT NULL THEN
    link := public.provision_ambassador_tracking_link(app.user_id);
  END IF;

  RETURN jsonb_build_object(
    'application', to_jsonb(app),
    'tracking_link', CASE WHEN link.id IS NULL THEN NULL ELSE to_jsonb(link) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ambassador_promo_code(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_code text;
  v_existing public.promo_codes;
  v_created public.promo_codes;
  v_link public.ambassador_links;
  v_suffix int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  SELECT * INTO v_existing
  FROM public.promo_codes
  WHERE ambassador_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('promo_code', to_jsonb(v_existing), 'created', false);
  END IF;

  SELECT coalesce(p.full_name, a.full_name, 'AMB')
  INTO v_name
  FROM public.profiles p
  FULL OUTER JOIN LATERAL (
    SELECT full_name FROM public.ambassador_applications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1
  ) a ON true
  WHERE p.id = p_user_id
  LIMIT 1;

  IF v_name IS NULL OR trim(v_name) = '' THEN
    SELECT full_name INTO v_name
    FROM public.ambassador_applications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  v_code := public._ambassador_first_name_part(v_name) || 'VSM';

  WHILE EXISTS (SELECT 1 FROM public.promo_codes WHERE upper(code) = v_code) LOOP
    v_suffix := v_suffix + 1;
    v_code := public._ambassador_first_name_part(v_name) || 'VSM' || v_suffix::text;
  END LOOP;

  INSERT INTO public.promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_global,
    ambassador_id,
    active
  )
  VALUES (
    v_code,
    'Code ambassadeur VSM',
    'percent',
    10,
    false,
    p_user_id,
    false
  )
  RETURNING * INTO v_created;

  SELECT * INTO v_link
  FROM public.ambassador_links
  WHERE ambassador_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_link.id IS NOT NULL AND v_link.promo_code_id IS NULL THEN
    UPDATE public.ambassador_links
    SET promo_code_id = v_created.id
    WHERE id = v_link.id;
  END IF;

  RETURN jsonb_build_object('promo_code', to_jsonb(v_created), 'created', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_ambassador_tracking_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_ambassador_application(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ambassador_promo_code(uuid) TO authenticated;

-- Liens tracking pour ambassadeurs déjà approuvés (sans promo auto)
INSERT INTO public.ambassador_links (ambassador_id, slug, target_type, active)
SELECT DISTINCT aa.user_id, public._ambassador_badge_slug(aa.user_id), 'product', false
FROM public.ambassador_applications aa
WHERE aa.status = 'approved'
  AND aa.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ambassador_links al WHERE al.ambassador_id = aa.user_id
  );
