-- Point pg_net webhook to Supabase Edge Function send-push

CREATE OR REPLACE FUNCTION public._push_try_webhook(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url text := '{{EDGE_FUNCTION_URL}}';
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
