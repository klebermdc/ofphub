-- =====================================================
-- ENUMS - Orlando Fast Pass
-- Tipos enumerados do banco de dados
-- =====================================================

-- Enum: Papéis de usuário no sistema
CREATE TYPE public.app_role AS ENUM ('manager', 'salesperson', 'marketing');

-- Enum: Estágios do CRM
CREATE TYPE public.crm_stage AS ENUM (
  'novo_lead',
  'coletando_informacao',
  'proposta_enviada',
  'venda_concluida',
  'venda_perdida'
);
