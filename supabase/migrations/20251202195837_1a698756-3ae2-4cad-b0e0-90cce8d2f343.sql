-- Create salesperson_salaries table
CREATE TABLE public.salesperson_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  salesperson_name TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, salesperson_name)
);

-- Enable RLS
ALTER TABLE public.salesperson_salaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own salaries"
ON public.salesperson_salaries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own salaries"
ON public.salesperson_salaries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salaries"
ON public.salesperson_salaries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salaries"
ON public.salesperson_salaries
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_salesperson_salaries_updated_at
BEFORE UPDATE ON public.salesperson_salaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();