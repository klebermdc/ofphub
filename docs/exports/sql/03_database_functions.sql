-- =====================================================
-- DATABASE FUNCTIONS - Orlando Fast Pass
-- Funções de banco de dados customizadas
-- =====================================================

-- Função: Verificar se usuário tem determinado papel
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Função: Obter nome do vendedor
CREATE OR REPLACE FUNCTION public.get_salesperson_name(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT salesperson_name
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'salesperson'
  LIMIT 1
$function$;

-- Função: Encontrar usuário por email
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(_email)
  LIMIT 1
$function$;

-- Função: Vincular papel de marketing a usuário
CREATE OR REPLACE FUNCTION public.link_marketing(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Função: Atribuir primeiro manager
CREATE OR REPLACE FUNCTION public.assign_first_manager(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Função: Vincular vendedor a usuário
CREATE OR REPLACE FUNCTION public.link_salesperson(_target_user_id uuid, _salesperson_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Função: Atualizar coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Função: Criar perfil para novo usuário (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
