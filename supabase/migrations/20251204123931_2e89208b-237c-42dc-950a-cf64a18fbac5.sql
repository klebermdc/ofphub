-- RLS policies for marketing role to view marketing costs

-- Marketing users can view all marketing costs (across all users for analysis)
CREATE POLICY "Marketing can view all marketing costs"
ON public.marketing_costs
FOR SELECT
USING (public.has_role(auth.uid(), 'marketing'));

-- Marketing users can create marketing costs
CREATE POLICY "Marketing can create marketing costs"
ON public.marketing_costs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'marketing'));

-- Marketing users can update marketing costs
CREATE POLICY "Marketing can update marketing costs"
ON public.marketing_costs
FOR UPDATE
USING (public.has_role(auth.uid(), 'marketing'));

-- Marketing users can delete marketing costs
CREATE POLICY "Marketing can delete marketing costs"
ON public.marketing_costs
FOR DELETE
USING (public.has_role(auth.uid(), 'marketing'));