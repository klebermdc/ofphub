-- Fix 1: commission_salespeople - Replace ILIKE wildcard with exact match
DROP POLICY IF EXISTS "Salespeople can read their own data" ON public.commission_salespeople;
CREATE POLICY "Salespeople can read their own data" ON public.commission_salespeople
FOR SELECT USING (
  name = get_salesperson_name(auth.uid()) AND get_salesperson_name(auth.uid()) IS NOT NULL
);

-- Fix 2: commission_orders - Replace ILIKE wildcard with exact match
DROP POLICY IF EXISTS "Salespeople can read their own orders" ON public.commission_orders;
CREATE POLICY "Salespeople can read their own orders" ON public.commission_orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM commission_salespeople cs
    WHERE cs.id = commission_orders.salesperson_id
      AND cs.name = get_salesperson_name(auth.uid())
      AND get_salesperson_name(auth.uid()) IS NOT NULL
  )
);

-- Fix 3: agent_activity - restrict to managers only
DROP POLICY IF EXISTS "Authenticated users can view agent activity" ON public.agent_activity;
CREATE POLICY "Managers can view agent activity" ON public.agent_activity
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix 4: agent_execution_history - restrict to managers only
DROP POLICY IF EXISTS "Authenticated users can view agent execution history" ON public.agent_execution_history;
CREATE POLICY "Managers can view agent execution history" ON public.agent_execution_history
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix 5: agent_reports - restrict to managers only
DROP POLICY IF EXISTS "Authenticated users can view agent reports" ON public.agent_reports;
CREATE POLICY "Managers can view agent reports" ON public.agent_reports
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));