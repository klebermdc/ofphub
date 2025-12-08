-- Permitir que vendedores leiam as configurações de sheet do manager
CREATE POLICY "Salespeople can view manager sheet settings" 
ON public.user_sheet_settings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'salesperson'::app_role)
);