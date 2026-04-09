ALTER TABLE public.marketing_daily_stats
ADD COLUMN IF NOT EXISTS meta_reach integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_landing_page_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_frequency numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_budget numeric DEFAULT 0;