-- Push commandes : résoudre l'ambassadeur via promo_code_id + notifier en attente et à la validation.

CREATE OR REPLACE FUNCTION public._resolve_order_ambassador_id(p_ambassador_id uuid, p_promo_code_id bigint)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    p_ambassador_id,
    (SELECT ambassador_id FROM public.promo_codes WHERE id = p_promo_code_id LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.trg_push_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amb_id uuid;
  amt text;
  was_confirmed boolean;
  is_confirmed boolean;
BEGIN
  amb_id := public._resolve_order_ambassador_id(NEW.ambassador_id, NEW.promo_code_id);
  IF amb_id IS NULL THEN
    RETURN NEW;
  END IF;

  was_confirmed := public._is_confirmed_order_status(OLD.status);
  is_confirmed := public._is_confirmed_order_status(NEW.status);
  amt := coalesce(NEW.total_amount::text, '0');

  IF TG_OP = 'INSERT' THEN
    IF is_confirmed THEN
      PERFORM public._enqueue_push(
        amb_id,
        'Nouvelle vente réalisée',
        'Commande #' || NEW.id || ' — ' || amt || ' FC',
        '/dashboard/notifications',
        'order_confirmed',
        jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
      );
    ELSE
      PERFORM public._enqueue_push(
        amb_id,
        'Code promo utilisé',
        'Nouvelle commande #' || NEW.id || ' via votre code — en attente de validation',
        '/dashboard/notifications',
        'promo_used',
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND is_confirmed AND NOT was_confirmed THEN
    PERFORM public._enqueue_push(
      amb_id,
      'Commande confirmée ✓',
      'Commande #' || NEW.id || ' — ' || amt || ' FC validée',
      '/dashboard/notifications',
      'order_confirmed',
      jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
    );
  END IF;

  RETURN NEW;
END;
$$;
