-- Allow salespeople to view goals where their name matches
CREATE POLICY "Salespeople can view their own goals by name" 
ON public.salesperson_goals 
FOR SELECT 
USING (
  salesperson_name = get_salesperson_name(auth.uid()) 
  AND get_salesperson_name(auth.uid()) IS NOT NULL
);