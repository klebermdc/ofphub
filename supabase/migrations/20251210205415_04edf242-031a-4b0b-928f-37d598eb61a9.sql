-- Tabela para rastrear comissões pagas por vendedor/mês
CREATE TABLE public.commission_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    salesperson_name TEXT NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, salesperson_name, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Policies for managers
CREATE POLICY "Users can view their own commission payments"
ON public.commission_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own commission payments"
ON public.commission_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commission payments"
ON public.commission_payments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commission payments"
ON public.commission_payments
FOR DELETE
USING (auth.uid() = user_id);