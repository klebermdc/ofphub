-- Add column to track Notion lead creation date
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS notion_created_at date NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.crm_leads.notion_created_at IS 'Original lead creation date from Notion (Data Geração Lead)';