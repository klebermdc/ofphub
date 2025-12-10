-- Ensure payment-receipts bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy for public read access
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;
CREATE POLICY "Public can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

-- Create policy for authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload payment receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);

-- Create policy for authenticated users to update their receipts
DROP POLICY IF EXISTS "Users can update their payment receipts" ON storage.objects;
CREATE POLICY "Users can update their payment receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to delete their receipts
DROP POLICY IF EXISTS "Users can delete their payment receipts" ON storage.objects;
CREATE POLICY "Users can delete their payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);