ALTER TABLE public.marketing_daily_stats
ADD COLUMN IF NOT EXISTS leads_by_campaign jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS leads_by_medium jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS top_creatives jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS forms_data jsonb DEFAULT '{}';