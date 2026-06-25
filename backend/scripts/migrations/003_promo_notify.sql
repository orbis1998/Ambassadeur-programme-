-- Notify ambassador when a new order is attributed (promo/link) and when it is confirmed.

CREATE OR REPLACE FUNCTION public.trg_push_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmed text[] := ARRAY['confirmée','confirmee','confirmed','livrée','livree','delivered','paid','payée','payee'];
  st text;
  amt text;
BEGIN
  IF NEW.ambassador_id IS NULL THEN
    RETURN NEW;
  END IF;
  st := lower(coalesce(NEW.status, ''));
  amt := coalesce(NEW.total_amount::text, '0');

  IF TG_OP = 'INSERT' THEN
    IF NOT (st = ANY (confirmed)) THEN
      PERFORM public._enqueue_push(
        NEW.ambassador_id,
        'Code promo utilisé',
        'Nouvelle commande #' || NEW.id || ' via votre code — en attente de validation',
        '/dashboard/notifications',
        'promo_used',
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
    ELSE
      PERFORM public._enqueue_push(
        NEW.ambassador_id,
        'Nouvelle vente réalisée',
        'Commande #' || NEW.id || ' — ' || amt || ' FC',
        '/dashboard/notifications',
        'order_confirmed',
        jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE'
     AND st = ANY (confirmed)
     AND NOT (lower(coalesce(OLD.status, '')) = ANY (confirmed)) THEN
    PERFORM public._enqueue_push(
      NEW.ambassador_id,
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
