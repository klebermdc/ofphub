-- Create table for commission reports (monthly snapshots)
CREATE TABLE public.commission_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  total_vendas DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_comissao DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_negocios INTEGER NOT NULL DEFAULT 0,
  vendedores_ativos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(period_month, period_year)
);

-- Create table for salespeople data per report
CREATE TABLE public.commission_salespeople (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.commission_reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_vendas DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_comissao DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_negocios INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual orders per salesperson
CREATE TABLE public.commission_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL REFERENCES public.commission_salespeople(id) ON DELETE CASCADE,
  cliente TEXT,
  data TEXT,
  pedido TEXT,
  venda DECIMAL(15,2) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  produto TEXT,
  comissao DECIMAL(5,2) NOT NULL DEFAULT 0,
  comissao_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  porcentagem_vendedor DECIMAL(5,2) NOT NULL DEFAULT 0,
  comissao_vendedor DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since there's no auth)
CREATE POLICY "Allow public read on commission_reports" 
ON public.commission_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on commission_reports" 
ON public.commission_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete on commission_reports" 
ON public.commission_reports 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read on commission_salespeople" 
ON public.commission_salespeople 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on commission_salespeople" 
ON public.commission_salespeople 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete on commission_salespeople" 
ON public.commission_salespeople 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read on commission_orders" 
ON public.commission_orders 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on commission_orders" 
ON public.commission_orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete on commission_orders" 
ON public.commission_orders 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_commission_salespeople_report ON public.commission_salespeople(report_id);
CREATE INDEX idx_commission_orders_salesperson ON public.commission_orders(salesperson_id);
CREATE INDEX idx_commission_reports_period ON public.commission_reports(period_year, period_month);