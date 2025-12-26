-- Update handle_new_user function to add input validation for full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  validated_full_name text;
BEGIN
  -- Validate and sanitize full_name: limit to 200 chars, remove control characters
  validated_full_name := NULLIF(TRIM(regexp_replace(
    COALESCE(SUBSTRING(new.raw_user_meta_data ->> 'full_name', 1, 200), ''),
    '[\x00-\x1F\x7F]', '', 'g'
  )), '');
  
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, validated_full_name);
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user registration
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$function$;