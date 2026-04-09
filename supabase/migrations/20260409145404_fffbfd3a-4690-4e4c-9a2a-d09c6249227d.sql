DROP POLICY IF EXISTS "Anon can insert marketing stats" ON public.marketing_daily_stats;
CREATE POLICY "Anon can insert marketing stats" ON public.marketing_daily_stats FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can update marketing stats" ON public.marketing_daily_stats;
CREATE POLICY "Anon can update marketing stats" ON public.marketing_daily_stats FOR UPDATE TO anon USING (true) WITH CHECK (true);