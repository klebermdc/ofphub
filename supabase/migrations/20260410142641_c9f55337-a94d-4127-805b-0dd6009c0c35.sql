DROP POLICY IF EXISTS "Users can view own marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Users can insert own marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Users can update own marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Users can delete own marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Anyone can insert marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Anyone can update marketing costs" ON public.marketing_costs;

CREATE POLICY "Anyone can read marketing costs" ON public.marketing_costs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert marketing costs" ON public.marketing_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update marketing costs" ON public.marketing_costs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete marketing costs" ON public.marketing_costs FOR DELETE USING (true);