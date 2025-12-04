-- Create link_marketing function for managers to link marketing users
CREATE OR REPLACE FUNCTION public.link_marketing(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is a manager
  IF NOT public.has_role(auth.uid(), 'manager') THEN
    RETURN false;
  END IF;
  
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id) THEN
    -- Update existing
    UPDATE public.user_roles 
    SET role = 'marketing', salesperson_name = NULL
    WHERE user_id = _target_user_id;
  ELSE
    -- Insert new
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'marketing');
  END IF;
  
  RETURN true;
END;
$$;