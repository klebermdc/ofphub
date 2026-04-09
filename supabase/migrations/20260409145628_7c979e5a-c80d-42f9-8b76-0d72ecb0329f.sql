DROP POLICY IF EXISTS "Authenticated can read marketing stats" ON public.marketing_daily_stats;
DROP POLICY IF EXISTS "Anon can read marketing stats" ON public.marketing_daily_stats;
DROP POLICY IF EXISTS "Anon can insert marketing stats" ON public.marketing_daily_stats;
DROP POLICY IF EXISTS "Anon can update marketing stats" ON public.marketing_daily_stats;
DROP POLICY IF EXISTS "Service role full access marketing stats" ON public.marketing_daily_stats;
CREATE POLICY "Anyone can read marketing stats" ON public.marketing_daily_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert marketing stats" ON public.marketing_daily_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update marketing stats" ON public.marketing_daily_stats FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.marketing_daily_stats FOR ALL TO service_role USING (true) WITH CHECK (true);