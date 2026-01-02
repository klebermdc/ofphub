-- =====================================================
-- STORAGE BUCKETS - Orlando Fast Pass
-- Execute este script para criar os buckets de storage
-- =====================================================

-- Bucket para arquivos de contabilidade (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounting-files', 'accounting-files', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket para arquivos de marketing (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-files', 'marketing-files', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket para comprovantes de pagamento (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;
