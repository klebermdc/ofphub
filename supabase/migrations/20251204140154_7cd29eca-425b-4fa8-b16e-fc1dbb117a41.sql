-- Replace operational_costs with specific columns
ALTER TABLE public.marketing_costs 
ADD COLUMN software numeric NOT NULL DEFAULT 0,
ADD COLUMN telefonia numeric NOT NULL DEFAULT 0,
ADD COLUMN imposto numeric NOT NULL DEFAULT 0;

-- Remove the generic operational_costs column
ALTER TABLE public.marketing_costs DROP COLUMN operational_costs;