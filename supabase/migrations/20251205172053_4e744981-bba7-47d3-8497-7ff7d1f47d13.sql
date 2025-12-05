-- Make marketing-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'marketing-files';

-- Update storage policies for marketing-files bucket
-- First, drop existing policies
DROP POLICY IF EXISTS "Marketing files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload marketing files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete marketing files" ON storage.objects;

-- Create secure policies that require authentication
CREATE POLICY "Authenticated users can view marketing files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can upload marketing files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete marketing files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);