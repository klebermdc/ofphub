-- Create storage bucket for accounting files
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounting-files', 'accounting-files', false);

-- Create RLS policies for accounting files bucket
CREATE POLICY "Users can view their own accounting files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own accounting files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own accounting files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track uploaded files metadata
CREATE TABLE public.accounting_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounting_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounting files metadata"
ON public.accounting_files
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounting files metadata"
ON public.accounting_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounting files metadata"
ON public.accounting_files
FOR DELETE
USING (auth.uid() = user_id);