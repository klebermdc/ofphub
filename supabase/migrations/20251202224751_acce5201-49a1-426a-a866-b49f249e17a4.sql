-- Add leads column to marketing_costs table
ALTER TABLE public.marketing_costs 
ADD COLUMN leads INTEGER NOT NULL DEFAULT 0;