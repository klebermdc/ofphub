-- Create accounting entries table
CREATE TABLE public.accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  valor_recebido NUMERIC NOT NULL DEFAULT 0,
  valor_enviado NUMERIC NOT NULL DEFAULT 0,
  movimentacao TEXT,
  cliente TEXT,
  nf TEXT,
  plano_de_contas TEXT,
  justificativa TEXT,
  forma_de_pagamento TEXT,
  banco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounting entries"
ON public.accounting_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounting entries"
ON public.accounting_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounting entries"
ON public.accounting_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounting entries"
ON public.accounting_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_accounting_entries_updated_at
BEFORE UPDATE ON public.accounting_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();