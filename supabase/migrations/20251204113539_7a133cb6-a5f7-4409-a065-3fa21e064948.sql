-- Create function to get salesperson name for current user
CREATE OR REPLACE FUNCTION public.get_salesperson_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salesperson_name
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'salesperson'
  LIMIT 1
$$;

-- Allow salespeople to read their own data from commission_salespeople
CREATE POLICY "Salespeople can read their own data"
ON public.commission_salespeople
FOR SELECT
USING (
  name ILIKE '%' || COALESCE(public.get_salesperson_name(auth.uid()), '') || '%'
  AND public.get_salesperson_name(auth.uid()) IS NOT NULL
);

-- Allow salespeople to read their own orders from commission_orders
CREATE POLICY "Salespeople can read their own orders"
ON public.commission_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_salespeople cs
    WHERE cs.id = commission_orders.salesperson_id
    AND cs.name ILIKE '%' || COALESCE(public.get_salesperson_name(auth.uid()), '') || '%'
    AND public.get_salesperson_name(auth.uid()) IS NOT NULL
  )
);