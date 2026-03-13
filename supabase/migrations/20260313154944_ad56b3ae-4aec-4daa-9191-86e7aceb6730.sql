
-- Re-normalize all non-ISO dates in orders
UPDATE public.orders
SET data = public.normalize_date_to_iso(data)
WHERE data !~ '^\d{4}-\d{2}-\d{2}$' AND data IS NOT NULL;

-- Re-normalize commission_orders
UPDATE public.commission_orders
SET data = public.normalize_date_to_iso(data)
WHERE data IS NOT NULL AND data !~ '^\d{4}-\d{2}-\d{2}$';
