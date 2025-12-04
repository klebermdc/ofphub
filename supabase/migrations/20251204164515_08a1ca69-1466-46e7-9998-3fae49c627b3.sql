-- Create marketing_files table
CREATE TABLE public.marketing_files (
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
ALTER TABLE public.marketing_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view marketing files" 
ON public.marketing_files 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert marketing files" 
ON public.marketing_files 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete marketing files" 
ON public.marketing_files 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for marketing files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketing-files', 'marketing-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Marketing files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'marketing-files');

CREATE POLICY "Users can upload marketing files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'marketing-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete marketing files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'marketing-files' AND auth.uid() IS NOT NULL);