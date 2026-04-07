-- Marketing daily stats: populated by metaads.js agent every morning
CREATE TABLE IF NOT EXISTS public.marketing_daily_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  -- Meta Ads
  meta_spend numeric DEFAULT 0,
  meta_impressions integer DEFAULT 0,
  meta_clicks integer DEFAULT 0,
  meta_ctr numeric DEFAULT 0,
  meta_conversions integer DEFAULT 0,
  meta_cpl numeric DEFAULT 0,
  meta_campaigns jsonb DEFAULT '[]',
  -- Google Ads (from Scripts webhook)
  google_spend numeric DEFAULT 0,
  google_clicks integer DEFAULT 0,
  google_conversions integer DEFAULT 0,
  google_cpl numeric DEFAULT 0,
  google_campaigns jsonb DEFAULT '[]',
  -- Elementor leads
  leads_total integer DEFAULT 0,
  leads_meta integer DEFAULT 0,
  leads_google integer DEFAULT 0,
  leads_organic integer DEFAULT 0,
  leads_by_source jsonb DEFAULT '{}',
  -- CPL real (Meta spend / Meta leads from Elementor)
  cpl_real_meta numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read marketing stats"
  ON public.marketing_daily_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access marketing stats"
  ON public.marketing_daily_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read marketing stats"
  ON public.marketing_daily_stats FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert marketing stats"
  ON public.marketing_daily_stats FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update marketing stats"
  ON public.marketing_daily_stats FOR UPDATE TO anon USING (true) WITH CHECK (true);
