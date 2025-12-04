-- Create table for individual salesperson goals
CREATE TABLE public.salesperson_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salesperson_name TEXT NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  goal_vendas NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, salesperson_name, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.salesperson_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own salesperson goals"
ON public.salesperson_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own salesperson goals"
ON public.salesperson_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salesperson goals"
ON public.salesperson_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salesperson goals"
ON public.salesperson_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_salesperson_goals_updated_at
BEFORE UPDATE ON public.salesperson_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();