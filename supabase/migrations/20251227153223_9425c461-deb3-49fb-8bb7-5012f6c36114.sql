-- First, delete duplicate leads keeping only the most recently updated one
DELETE FROM public.crm_leads a
USING public.crm_leads b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
  AND COALESCE(LOWER(TRIM(a.phone)), '') = COALESCE(LOWER(TRIM(b.phone)), '')
  AND a.stage NOT IN ('venda_concluida', 'venda_perdida')
  AND b.stage NOT IN ('venda_concluida', 'venda_perdida');

-- Add UNIQUE constraint to prevent duplicate leads by name and phone
-- Only applies to active leads (not completed or lost sales)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_unique_name_phone 
ON public.crm_leads (user_id, LOWER(TRIM(name)), COALESCE(LOWER(TRIM(phone)), ''))
WHERE stage NOT IN ('venda_concluida', 'venda_perdida');