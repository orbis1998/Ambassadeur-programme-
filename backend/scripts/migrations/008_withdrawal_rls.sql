-- Ensure ambassadors can read their withdrawal history in prod (005 may have dropped 004 policy).

DROP POLICY IF EXISTS ambassador_withdrawals_select_own ON public.ambassador_withdrawal_requests;
CREATE POLICY ambassador_withdrawals_select_own ON public.ambassador_withdrawal_requests
  FOR SELECT TO authenticated
  USING (ambassador_id = auth.uid());

DROP POLICY IF EXISTS ambassador_withdrawals_insert_own ON public.ambassador_withdrawal_requests;
CREATE POLICY ambassador_withdrawals_insert_own ON public.ambassador_withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (ambassador_id = auth.uid());
