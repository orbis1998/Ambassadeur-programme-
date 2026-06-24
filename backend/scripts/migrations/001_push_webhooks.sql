-- Real-time Web Push pipeline: DB triggers → push_outbox → backend worker → VAPID
-- Optional: pg_net immediate HTTP when WEBHOOK_BASE_URL is configured

CREATE TABLE IF NOT EXISTS public.push_outbox (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/dashboard',
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_pending ON public.push_outbox (created_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

-- ---------- helper: optional pg_net webhook (no-op if pg_net unavailable) ----------
CREATE OR REPLACE FUNCTION public._push_try_webhook(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url text := '{{WEBHOOK_BASE_URL}}/api/webhooks/push-event';
  webhook_secret text := '{{WEBHOOK_SECRET}}';
BEGIN
  IF webhook_url IS NULL OR webhook_url = '' OR webhook_url LIKE '%{{%' THEN
    RETURN;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Webhook-Secret', webhook_secret
      ),
      body := payload
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public._enqueue_push(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.push_outbox (user_id, title, body, url, event_type, payload)
  VALUES (p_user_id, p_title, p_body, p_url, p_event_type, p_payload)
  RETURNING id INTO row_id;

  PERFORM public._push_try_webhook(
    jsonb_build_object(
      'outbox_id', row_id,
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'event_type', p_event_type,
      'payload', p_payload
    )
  );
END;
$$;

-- ---------- ambassador approved ----------
CREATE OR REPLACE FUNCTION public.trg_push_ambassador_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND lower(coalesce(NEW.status, '')) = 'approved'
     AND lower(coalesce(OLD.status, '')) IS DISTINCT FROM 'approved' THEN
    PERFORM public._enqueue_push(
      NEW.user_id,
      'Candidature approuvée ✓',
      'Bienvenue dans le Programme Ambassadeur VSM ! Accédez à votre dashboard.',
      '/dashboard',
      'application_approved',
      jsonb_build_object('application_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_ambassador_approved ON public.ambassador_applications;
CREATE TRIGGER push_ambassador_approved
  AFTER UPDATE OF status ON public.ambassador_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_push_ambassador_approved();

-- ---------- new confirmed order / sale ----------
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

  IF TG_OP = 'INSERT' AND st = ANY (confirmed) THEN
    amt := coalesce(NEW.total_amount::text, '0');
    PERFORM public._enqueue_push(
      NEW.ambassador_id,
      'Nouvelle vente réalisée',
      'Commande #' || NEW.id || ' — ' || amt || ' FC',
      '/dashboard/notifications',
      'order_confirmed',
      jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
    );
  ELSIF TG_OP = 'UPDATE'
     AND st = ANY (confirmed)
     AND NOT (lower(coalesce(OLD.status, '')) = ANY (confirmed)) THEN
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

DROP TRIGGER IF EXISTS push_order_event ON public.orders;
CREATE TRIGGER push_order_event
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_push_order_event();

-- ---------- withdrawal status ----------
CREATE OR REPLACE FUNCTION public.trg_push_withdrawal_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st text;
  title text;
  body text;
BEGIN
  IF NEW.ambassador_id IS NULL THEN
    RETURN NEW;
  END IF;
  st := lower(coalesce(NEW.status, ''));

  IF TG_OP = 'UPDATE' AND st IS DISTINCT FROM lower(coalesce(OLD.status, '')) THEN
    IF st IN ('paid', 'payée', 'payee', 'approved') THEN
      title := 'Retrait validé';
      body := coalesce(NEW.mobile_operator, 'Mobile Money') || ' • ' || coalesce(NEW.msisdn, '');
    ELSIF st IN ('rejected', 'refusée', 'refusee') THEN
      title := 'Retrait refusé';
      body := coalesce(NEW.admin_note, 'Voir détails dans l''historique');
    ELSE
      RETURN NEW;
    END IF;
    PERFORM public._enqueue_push(
      NEW.ambassador_id,
      title,
      body,
      '/dashboard/notifications',
      'withdrawal_' || st,
      jsonb_build_object('withdrawal_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_withdrawal_event ON public.ambassador_withdrawal_requests;
CREATE TRIGGER push_withdrawal_event
  AFTER UPDATE OF status ON public.ambassador_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_push_withdrawal_event();

-- Enable Realtime for in-app live updates (Supabase dashboard may also need publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_outbox;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassador_applications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassador_withdrawal_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
