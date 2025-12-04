-- Allow marketing users to read any sheet settings (to access shared data source)
CREATE POLICY "Marketing can view all sheet settings"
ON public.user_sheet_settings
FOR SELECT
USING (has_role(auth.uid(), 'marketing'::app_role));