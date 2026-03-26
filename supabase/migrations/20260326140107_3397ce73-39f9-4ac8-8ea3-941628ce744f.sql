
-- 1. Make payment-receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-receipts';

-- 2. Drop existing overly permissive SELECT policy and create scoped one
DROP POLICY IF EXISTS "Authenticated users can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment receipts" ON storage.objects;

-- Scoped SELECT: users can only read files in their own folder
CREATE POLICY "Users can view own payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Scoped INSERT: users can only upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload payment receipts" ON storage.objects;
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Scoped DELETE: users can only delete their own files
DROP POLICY IF EXISTS "Authenticated users can delete payment receipts" ON storage.objects;
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
