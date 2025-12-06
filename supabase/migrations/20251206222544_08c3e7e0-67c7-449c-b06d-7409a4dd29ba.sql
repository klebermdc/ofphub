-- Add follow-up date field to crm_leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS follow_up_date date DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.crm_leads.follow_up_date IS 'Scheduled date for next follow-up contact with the lead';