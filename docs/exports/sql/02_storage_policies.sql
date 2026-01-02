-- =====================================================
-- STORAGE POLICIES - Orlando Fast Pass
-- Execute este script para criar as políticas de acesso aos buckets
-- =====================================================

-- =====================================================
-- ACCOUNTING-FILES BUCKET POLICIES
-- =====================================================

-- Policy: Permitir leitura de arquivos próprios
CREATE POLICY "Users can read own accounting files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'accounting-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Permitir upload de arquivos próprios
CREATE POLICY "Users can upload own accounting files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'accounting-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Permitir exclusão de arquivos próprios
CREATE POLICY "Users can delete own accounting files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'accounting-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- MARKETING-FILES BUCKET POLICIES
-- =====================================================

-- Policy: Permitir leitura por usuários autenticados
CREATE POLICY "Authenticated users can read marketing files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Permitir upload por usuários autenticados
CREATE POLICY "Authenticated users can upload marketing files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Permitir exclusão por usuários autenticados
CREATE POLICY "Authenticated users can delete marketing files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketing-files' 
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- PAYMENT-RECEIPTS BUCKET POLICIES
-- =====================================================

-- Policy: Permitir leitura pública (bucket é público)
CREATE POLICY "Anyone can read payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

-- Policy: Permitir upload de arquivos próprios
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Permitir exclusão de arquivos próprios
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
