ALTER TABLE public.marketing_daily_stats 
  ADD COLUMN IF NOT EXISTS leads_by_term jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS leads_by_content jsonb DEFAULT '{}';