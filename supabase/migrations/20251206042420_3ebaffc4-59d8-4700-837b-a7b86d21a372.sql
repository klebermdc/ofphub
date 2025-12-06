-- Create enum for CRM stages
CREATE TYPE public.crm_stage AS ENUM ('novo_lead', 'coletando_informacao', 'proposta_enviada', 'venda_concluida', 'venda_perdida');

-- Create CRM leads table
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  estimated_value NUMERIC DEFAULT 0,
  product TEXT,
  salesperson_name TEXT,
  notes TEXT,
  stage crm_stage NOT NULL DEFAULT 'novo_lead',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Managers can view all leads
CREATE POLICY "Managers can view all leads"
ON public.crm_leads
FOR SELECT
USING (has_role(auth.uid(), 'manager'));

-- Managers can create leads
CREATE POLICY "Managers can create leads"
ON public.crm_leads
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND auth.uid() = user_id);

-- Managers can update all leads
CREATE POLICY "Managers can update all leads"
ON public.crm_leads
FOR UPDATE
USING (has_role(auth.uid(), 'manager'));

-- Managers can delete leads
CREATE POLICY "Managers can delete leads"
ON public.crm_leads
FOR DELETE
USING (has_role(auth.uid(), 'manager'));

-- Salespeople can view their own leads
CREATE POLICY "Salespeople can view own leads"
ON public.crm_leads
FOR SELECT
USING (
  salesperson_name = get_salesperson_name(auth.uid()) 
  AND get_salesperson_name(auth.uid()) IS NOT NULL
);

-- Salespeople can update their own leads
CREATE POLICY "Salespeople can update own leads"
ON public.crm_leads
FOR UPDATE
USING (
  salesperson_name = get_salesperson_name(auth.uid()) 
  AND get_salesperson_name(auth.uid()) IS NOT NULL
);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();