-- Enable Realtime for live click stats on the ambassador dashboard
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassador_clicks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
