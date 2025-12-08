-- Create orders table for internal storage
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente TEXT,
  data TEXT NOT NULL,
  pedido TEXT,
  venda NUMERIC NOT NULL DEFAULT 0,
  fornecedor TEXT,
  produto TEXT,
  comissao NUMERIC NOT NULL DEFAULT 0,
  comissao_total NUMERIC NOT NULL DEFAULT 0,
  porcentagem_vendedor NUMERIC NOT NULL DEFAULT 0,
  comissao_vendedor NUMERIC NOT NULL DEFAULT 0,
  vendedor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Managers can do everything with their orders
CREATE POLICY "Managers can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can create orders"
ON public.orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND auth.uid() = user_id);

CREATE POLICY "Managers can update orders"
ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete orders"
ON public.orders FOR DELETE
USING (has_role(auth.uid(), 'manager'));

-- Salespeople can view their own orders
CREATE POLICY "Salespeople can view own orders"
ON public.orders FOR SELECT
USING (vendedor = get_salesperson_name(auth.uid()) AND get_salesperson_name(auth.uid()) IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();