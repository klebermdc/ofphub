ALTER TABLE public.salesperson_discounts
  ADD COLUMN IF NOT EXISTS order_date text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percentage numeric NOT NULL DEFAULT 0;