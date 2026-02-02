-- Create table for salesperson discounts per month
CREATE TABLE public.salesperson_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salesperson_name TEXT NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, salesperson_name, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.salesperson_discounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own discounts"
ON public.salesperson_discounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discounts"
ON public.salesperson_discounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discounts"
ON public.salesperson_discounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discounts"
ON public.salesperson_discounts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_salesperson_discounts_updated_at
BEFORE UPDATE ON public.salesperson_discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();