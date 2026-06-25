-- RLS: authenticated ambassadors can read/update their own data (direct Supabase client, no Edge Function).

-- ---------- orders ----------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_orders_select_own ON public.orders;
CREATE POLICY ambassador_orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (ambassador_id = auth.uid());

-- Leaderboard: confirmed sales visible across ambassadors (amount/status only via app query)
DROP POLICY IF EXISTS ambassador_orders_select_leaderboard ON public.orders;
CREATE POLICY ambassador_orders_select_leaderboard ON public.orders
  FOR SELECT TO authenticated
  USING (
    ambassador_id IS NOT NULL
    AND lower(coalesce(status, '')) IN (
      'confirmée', 'confirmee', 'confirmed', 'livrée', 'livree', 'delivered',
      'paid', 'payée', 'payee'
    )
  );

-- ---------- ambassador_links ----------
ALTER TABLE public.ambassador_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_links_select_own ON public.ambassador_links;
CREATE POLICY ambassador_links_select_own ON public.ambassador_links
  FOR SELECT TO authenticated
  USING (ambassador_id = auth.uid());

-- ---------- ambassador_clicks ----------
ALTER TABLE public.ambassador_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_clicks_select_own ON public.ambassador_clicks;
CREATE POLICY ambassador_clicks_select_own ON public.ambassador_clicks
  FOR SELECT TO authenticated
  USING (
    link_id IN (
      SELECT id FROM public.ambassador_links WHERE ambassador_id = auth.uid()
    )
  );

-- ---------- ambassador_withdrawal_requests ----------
ALTER TABLE public.ambassador_withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_withdrawals_select_own ON public.ambassador_withdrawal_requests;
CREATE POLICY ambassador_withdrawals_select_own ON public.ambassador_withdrawal_requests
  FOR SELECT TO authenticated
  USING (ambassador_id = auth.uid());

DROP POLICY IF EXISTS ambassador_withdrawals_insert_own ON public.ambassador_withdrawal_requests;
CREATE POLICY ambassador_withdrawals_insert_own ON public.ambassador_withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (ambassador_id = auth.uid());

-- ---------- profiles ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Leaderboard: read other ambassadors' display names
DROP POLICY IF EXISTS profiles_select_leaderboard ON public.profiles;
CREATE POLICY profiles_select_leaderboard ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT DISTINCT ambassador_id FROM public.orders WHERE ambassador_id IS NOT NULL)
  );

-- ---------- ambassador_applications ----------
ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_apps_select_own ON public.ambassador_applications;
CREATE POLICY ambassador_apps_select_own ON public.ambassador_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- promo_codes ----------
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_codes_select_own ON public.promo_codes;
CREATE POLICY promo_codes_select_own ON public.promo_codes
  FOR SELECT TO authenticated
  USING (ambassador_id = auth.uid());

-- ---------- settings (commission rate) ----------
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select_commission ON public.settings;
CREATE POLICY settings_select_commission ON public.settings
  FOR SELECT TO authenticated
  USING (key IN ('ambassador_commission_rate'));

-- ---------- push_outbox (optional in-app read) ----------
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_outbox_select_own ON public.push_outbox;
CREATE POLICY push_outbox_select_own ON public.push_outbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
