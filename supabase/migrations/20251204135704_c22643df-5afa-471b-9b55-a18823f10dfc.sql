-- Add operational_costs column to marketing_costs table
ALTER TABLE public.marketing_costs 
ADD COLUMN operational_costs numeric NOT NULL DEFAULT 0;