-- Fix infinite RLS recursion: profiles_select_leaderboard queried orders while
-- orders policies evaluate is_admin() / profiles → loop. Remove duplicate policies.

DROP POLICY IF EXISTS profiles_select_leaderboard ON public.profiles;

-- Redundant duplicates from 004 (DB already had equivalent policies)
DROP POLICY IF EXISTS ambassador_orders_select_own ON public.orders;
DROP POLICY IF EXISTS ambassador_orders_select_leaderboard ON public.orders;
DROP POLICY IF EXISTS ambassador_links_select_own ON public.ambassador_links;
DROP POLICY IF EXISTS ambassador_clicks_select_own ON public.ambassador_clicks;
DROP POLICY IF EXISTS ambassador_withdrawals_select_own ON public.ambassador_withdrawal_requests;
DROP POLICY IF EXISTS ambassador_withdrawals_insert_own ON public.ambassador_withdrawal_requests;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS ambassador_apps_select_own ON public.ambassador_applications;
DROP POLICY IF EXISTS promo_codes_select_own ON public.promo_codes;
DROP POLICY IF EXISTS settings_select_commission ON public.settings;
DROP POLICY IF EXISTS push_outbox_select_own ON public.push_outbox;
