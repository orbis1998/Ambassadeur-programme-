-- Fix push notifications for VSM order statuses (traitée, etc.) and wire send-push webhook.

CREATE OR REPLACE FUNCTION public._is_confirmed_order_status(st text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(st, '')) = ANY (ARRAY[
    'confirmée','confirmee','confirmed','livrée','livree','delivered',
    'paid','payée','payee','traitée','traitee','traité','traite',
    'validée','validee','validé','valide','complétée','completee','complété','complete'
  ])
  OR lower(coalesce(st, '')) LIKE 'trait%'
  OR lower(coalesce(st, '')) LIKE '%confirm%'
  OR lower(coalesce(st, '')) LIKE '%livr%'
  OR lower(coalesce(st, '')) LIKE '%deliver%'
  OR lower(coalesce(st, '')) LIKE '%pay%';
$$;

CREATE OR REPLACE FUNCTION public.trg_push_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt text;
  was_confirmed boolean;
  is_confirmed boolean;
BEGIN
  IF NEW.ambassador_id IS NULL THEN
    RETURN NEW;
  END IF;

  was_confirmed := public._is_confirmed_order_status(OLD.status);
  is_confirmed := public._is_confirmed_order_status(NEW.status);

  IF TG_OP = 'INSERT' AND is_confirmed THEN
    amt := coalesce(NEW.total_amount::text, '0');
    PERFORM public._enqueue_push(
      NEW.ambassador_id,
      'Nouvelle vente réalisée',
      'Commande #' || NEW.id || ' — ' || amt || ' FC',
      '/dashboard/notifications',
      'order_confirmed',
      jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
    );
  ELSIF TG_OP = 'UPDATE' AND is_confirmed AND NOT was_confirmed THEN
    amt := coalesce(NEW.total_amount::text, '0');
    PERFORM public._enqueue_push(
      NEW.ambassador_id,
      'Commande confirmée',
      'Commande #' || NEW.id || ' — ' || amt || ' FC',
      '/dashboard/notifications',
      'order_confirmed',
      jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
