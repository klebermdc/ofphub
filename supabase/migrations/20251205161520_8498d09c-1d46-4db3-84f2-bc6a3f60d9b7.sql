-- Add goal_resultado column to sales_goals table
ALTER TABLE public.sales_goals 
ADD COLUMN IF NOT EXISTS goal_resultado numeric NOT NULL DEFAULT 0;