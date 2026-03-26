
-- Fix 1: marketing_files - restrict SELECT to owner only
DROP POLICY IF EXISTS "Users can view marketing files" ON public.marketing_files;
CREATE POLICY "Users can view marketing files" ON public.marketing_files FOR SELECT USING (auth.uid() = user_id);

-- Also fix DELETE to be owner-scoped
DROP POLICY IF EXISTS "Users can delete marketing files" ON public.marketing_files;
CREATE POLICY "Users can delete marketing files" ON public.marketing_files FOR DELETE USING (auth.uid() = user_id);

-- Also fix INSERT to be owner-scoped
DROP POLICY IF EXISTS "Users can insert marketing files" ON public.marketing_files;
CREATE POLICY "Users can insert marketing files" ON public.marketing_files FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix 2: user_roles - prevent managers from assigning manager role
DROP POLICY IF EXISTS "Managers can insert roles" ON public.user_roles;
CREATE POLICY "Managers can insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND role != 'manager'::app_role);

DROP POLICY IF EXISTS "Managers can update roles" ON public.user_roles;
CREATE POLICY "Managers can update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (role != 'manager'::app_role);

-- Fix 3: user_sheet_settings - restrict salesperson to only see their manager's settings
-- Salespeople need the sheet URL of the manager who owns their orders, filter by manager role
DROP POLICY IF EXISTS "Salespeople can view manager sheet settings" ON public.user_sheet_settings;
CREATE POLICY "Salespeople can view manager sheet settings" ON public.user_sheet_settings FOR SELECT USING (
  has_role(auth.uid(), 'salesperson'::app_role) AND has_role(user_id, 'manager'::app_role)
);
