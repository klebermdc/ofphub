-- Add enviado column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS enviado boolean NOT NULL DEFAULT false;

-- Allow salespeople to update their own orders (for the enviado field)
CREATE POLICY "Salespeople can update own orders enviado" 
ON public.orders 
FOR UPDATE 
USING (
  (vendedor = get_salesperson_name(auth.uid())) 
  AND (get_salesperson_name(auth.uid()) IS NOT NULL)
);