-- Drop the existing constraint that doesn't include user_id
ALTER TABLE public.commission_reports DROP CONSTRAINT IF EXISTS commission_reports_period_month_period_year_key;

-- Add a new unique constraint that includes user_id
ALTER TABLE public.commission_reports ADD CONSTRAINT sales_goals_user_period_unique UNIQUE (user_id, period_month, period_year);