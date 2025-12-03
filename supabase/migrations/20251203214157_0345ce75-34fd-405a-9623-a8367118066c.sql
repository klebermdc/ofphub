-- Create a function to find user by email (for managers to link salespeople)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(_email)
  LIMIT 1
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_by_email TO authenticated;