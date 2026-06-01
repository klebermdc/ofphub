-- ORDERS: remove public (anon) read, keep authenticated read
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
CREATE POLICY "Authenticated users can read orders"
ON public.orders FOR SELECT TO authenticated
USING (true);

-- SALESPERSON SALARIES: remove public read, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read salaries" ON public.salesperson_salaries;
CREATE POLICY "Authenticated users can read salaries"
ON public.salesperson_salaries FOR SELECT TO authenticated
USING (true);

-- GROWTH METRICS: remove open writes, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can insert growth metrics" ON public.growth_metrics;
DROP POLICY IF EXISTS "Anyone can update growth metrics" ON public.growth_metrics;
CREATE POLICY "Authenticated can insert growth metrics"
ON public.growth_metrics FOR INSERT TO authenticated
WITH CHECK (true);
CREATE POLICY "Authenticated can update growth metrics"
ON public.growth_metrics FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- MARKETING COSTS: remove open writes (owner + marketing-role policies remain)
DROP POLICY IF EXISTS "Anyone can insert marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Anyone can update marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Anyone can delete marketing costs" ON public.marketing_costs;
DROP POLICY IF EXISTS "Anyone can read marketing costs" ON public.marketing_costs;

-- MARKETING DAILY STATS: remove open writes (service_role + role reads remain)
DROP POLICY IF EXISTS "Anyone can insert marketing stats" ON public.marketing_daily_stats;
DROP POLICY IF EXISTS "Anyone can update marketing stats" ON public.marketing_daily_stats;

-- WHATSAPP STATUS: remove open writes (service_role bypasses RLS; read kept)
DROP POLICY IF EXISTS "Anyone can insert whatsapp status" ON public.whatsapp_status;
DROP POLICY IF EXISTS "Anyone can update whatsapp status" ON public.whatsapp_status;

-- STORAGE payment-receipts: remove public read
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;

-- STORAGE marketing-files: replace any-authenticated with owner folder-scoped
DROP POLICY IF EXISTS "Authenticated users can view marketing files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload marketing files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete marketing files" ON storage.objects;
CREATE POLICY "Owners can view marketing files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'marketing-files' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can upload marketing files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marketing-files' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can delete marketing files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'marketing-files' AND (auth.uid())::text = (storage.foldername(name))[1]);