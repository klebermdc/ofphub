-- Create a function to assign manager role (first user or self)
CREATE OR REPLACE FUNCTION public.assign_first_manager(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_count integer;
BEGIN
  -- Check if there are any managers
  SELECT COUNT(*) INTO manager_count FROM public.user_roles WHERE role = 'manager';
  
  -- If no managers exist, allow creating the first one
  IF manager_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'manager')
    ON CONFLICT (user_id) DO UPDATE SET role = 'manager';
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create a function to link salesperson (for managers)
CREATE OR REPLACE FUNCTION public.link_salesperson(_target_user_id uuid, _salesperson_name text)
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
    SET salesperson_name = _salesperson_name, role = 'salesperson'
    WHERE user_id = _target_user_id;
  ELSE
    -- Insert new
    INSERT INTO public.user_roles (user_id, role, salesperson_name)
    VALUES (_target_user_id, 'salesperson', _salesperson_name);
  END IF;
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.assign_first_manager TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_salesperson TO authenticated;