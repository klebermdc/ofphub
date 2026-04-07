
CREATE TABLE public.marketing_daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  meta_spend numeric NOT NULL DEFAULT 0,
  meta_impressions integer NOT NULL DEFAULT 0,
  meta_clicks integer NOT NULL DEFAULT 0,
  meta_ctr numeric NOT NULL DEFAULT 0,
  meta_conversions integer NOT NULL DEFAULT 0,
  meta_cpl numeric NOT NULL DEFAULT 0,
  meta_campaigns jsonb DEFAULT '[]'::jsonb,
  google_spend numeric NOT NULL DEFAULT 0,
  google_clicks integer NOT NULL DEFAULT 0,
  google_conversions integer NOT NULL DEFAULT 0,
  google_cpl numeric NOT NULL DEFAULT 0,
  google_campaigns jsonb DEFAULT '[]'::jsonb,
  leads_total integer NOT NULL DEFAULT 0,
  leads_meta integer NOT NULL DEFAULT 0,
  leads_google integer NOT NULL DEFAULT 0,
  leads_organic integer NOT NULL DEFAULT 0,
  cpl_real_meta numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_daily_stats ENABLE ROW LEVEL SECURITY;

-- Managers can view
CREATE POLICY "Managers can view marketing daily stats"
  ON public.marketing_daily_stats FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Marketing can view
CREATE POLICY "Marketing can view marketing daily stats"
  ON public.marketing_daily_stats FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'marketing'));

-- Service role full access (for agents)
CREATE POLICY "Service role can manage marketing daily stats"
  ON public.marketing_daily_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_daily_stats_updated_at
  BEFORE UPDATE ON public.marketing_daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
