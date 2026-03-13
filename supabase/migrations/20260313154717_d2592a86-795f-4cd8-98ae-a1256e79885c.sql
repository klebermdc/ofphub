
-- Function to normalize various date formats to ISO YYYY-MM-DD
CREATE OR REPLACE FUNCTION public.normalize_date_to_iso(date_str text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  parts text[];
  d int;
  m int;
  y int;
BEGIN
  IF date_str IS NULL OR date_str = '' THEN
    RETURN date_str;
  END IF;
  
  -- Already ISO format YYYY-MM-DD
  IF date_str ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
    RETURN date_str;
  END IF;
  
  -- Formats: D/M/YY, DD/MM/YY, D/M/YYYY, DD/MM/YYYY
  IF date_str ~ '^\d{1,2}/\d{1,2}/\d{2,4}$' THEN
    parts := string_to_array(date_str, '/');
    d := parts[1]::int;
    m := parts[2]::int;
    y := parts[3]::int;
    
    -- Convert 2-digit year to 4-digit
    IF y < 100 THEN
      y := 2000 + y;
    END IF;
    
    RETURN y::text || '-' || lpad(m::text, 2, '0') || '-' || lpad(d::text, 2, '0');
  END IF;
  
  -- Return as-is if no pattern matched
  RETURN date_str;
END;
$$;

-- Normalize all existing dates in orders table to ISO format
UPDATE public.orders
SET data = public.normalize_date_to_iso(data)
WHERE data !~ '^\d{4}-\d{2}-\d{2}$';

-- Normalize dates in commission_orders table too
UPDATE public.commission_orders
SET data = public.normalize_date_to_iso(data)
WHERE data IS NOT NULL AND data !~ '^\d{4}-\d{2}-\d{2}$';
