-- Fix commission_orders RLS policies
DROP POLICY IF EXISTS "Allow public read on commission_orders" ON public.commission_orders;
DROP POLICY IF EXISTS "Allow public insert on commission_orders" ON public.commission_orders;
DROP POLICY IF EXISTS "Allow public delete on commission_orders" ON public.commission_orders;

-- Create proper user-based policies for commission_orders
-- Orders are linked through salespeople which are linked to reports which have user_id
CREATE POLICY "Users can read orders from their reports"
ON public.commission_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_salespeople cs
    JOIN public.commission_reports cr ON cs.report_id = cr.id
    WHERE cs.id = commission_orders.salesperson_id
    AND cr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert orders for their salespeople"
ON public.commission_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.commission_salespeople cs
    JOIN public.commission_reports cr ON cs.report_id = cr.id
    WHERE cs.id = commission_orders.salesperson_id
    AND cr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete orders from their reports"
ON public.commission_orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.commission_salespeople cs
    JOIN public.commission_reports cr ON cs.report_id = cr.id
    WHERE cs.id = commission_orders.salesperson_id
    AND cr.user_id = auth.uid()
  )
);

-- Fix commission_salespeople RLS policies
DROP POLICY IF EXISTS "Allow public read on commission_salespeople" ON public.commission_salespeople;
DROP POLICY IF EXISTS "Allow public insert on commission_salespeople" ON public.commission_salespeople;
DROP POLICY IF EXISTS "Allow public delete on commission_salespeople" ON public.commission_salespeople;

CREATE POLICY "Users can read their own salespeople"
ON public.commission_salespeople
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_reports cr
    WHERE cr.id = commission_salespeople.report_id
    AND cr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert salespeople for their reports"
ON public.commission_salespeople
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.commission_reports cr
    WHERE cr.id = commission_salespeople.report_id
    AND cr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own salespeople"
ON public.commission_salespeople
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.commission_reports cr
    WHERE cr.id = commission_salespeople.report_id
    AND cr.user_id = auth.uid()
  )
);

-- Fix commission_reports policy to remove NULL condition
DROP POLICY IF EXISTS "Users can view their own reports" ON public.commission_reports;

CREATE POLICY "Users can view their own reports"
ON public.commission_reports
FOR SELECT
USING (auth.uid() = user_id);