-- Create table for marketing costs per month
CREATE TABLE public.marketing_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  google_ads NUMERIC NOT NULL DEFAULT 0,
  meta_ads NUMERIC NOT NULL DEFAULT 0,
  other_marketing NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_month, period_year)
);

-- Enable Row Level Security
ALTER TABLE public.marketing_costs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own marketing costs"
ON public.marketing_costs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own marketing costs"
ON public.marketing_costs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marketing costs"
ON public.marketing_costs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marketing costs"
ON public.marketing_costs
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_costs_updated_at
BEFORE UPDATE ON public.marketing_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();