-- =====================================================
-- INSTRUÇÕES PARA IMPORTAÇÃO DE DADOS
-- Orlando Fast Pass
-- =====================================================

-- IMPORTANTE: Os dados estão exportados em formato JSON em:
-- docs/exports/data/

-- Para importar os dados, você pode usar uma das seguintes opções:

-- OPÇÃO 1: Via SQL Editor do Supabase
-- Converta os arquivos JSON para comandos INSERT

-- OPÇÃO 2: Via API do Supabase
-- Use a biblioteca @supabase/supabase-js para inserir os dados

-- OPÇÃO 3: Via pg_dump/pg_restore (recomendado para grandes volumes)
-- Execute no terminal:
-- pg_dump -h <HOST> -U postgres -d postgres -t public.orders -t public.crm_leads --data-only > data_dump.sql
-- psql -h <NEW_HOST> -U postgres -d postgres < data_dump.sql

-- =====================================================
-- RESUMO DOS DADOS EXPORTADOS
-- =====================================================

-- Tabela: profiles
-- Registros: 7
-- Arquivo: docs/exports/data/profiles.json

-- Tabela: user_roles
-- Registros: 7
-- Arquivo: docs/exports/data/user_roles.json

-- Tabela: sales_goals
-- Registros: 2
-- Arquivo: docs/exports/data/sales_goals.json

-- Tabela: salesperson_goals
-- Registros: 18
-- Arquivo: docs/exports/data/salesperson_goals.json

-- Tabela: marketing_costs
-- Registros: 2
-- Arquivo: docs/exports/data/marketing_costs.json

-- Tabela: commission_reports
-- Registros: 1
-- Arquivo: docs/exports/data/commission_reports.json

-- Tabela: commission_salespeople
-- Registros: 11
-- Arquivo: docs/exports/data/commission_salespeople.json

-- Tabela: commission_payments
-- Registros: 10
-- Arquivo: docs/exports/data/commission_payments.json

-- Tabela: user_sheet_settings
-- Registros: 1
-- Arquivo: docs/exports/data/user_sheet_settings.json

-- Tabela: orders
-- Registros: 1248
-- NOTA: Muito grande para exportar como JSON. Use pg_dump.

-- Tabela: crm_leads
-- Registros: 1165
-- NOTA: Muito grande para exportar como JSON. Use pg_dump.

-- Tabela: commission_orders
-- Registros: 391
-- NOTA: Muito grande para exportar como JSON. Use pg_dump.

-- Tabelas vazias (sem dados):
-- - salesperson_salaries
-- - accounting_entries
-- - accounting_files
-- - marketing_files
-- - nfse_history

-- =====================================================
-- ORDEM DE IMPORTAÇÃO RECOMENDADA
-- =====================================================
-- 1. profiles (primeiro, pois outras tabelas referenciam user_id)
-- 2. user_roles
-- 3. user_sheet_settings
-- 4. sales_goals
-- 5. salesperson_goals
-- 6. marketing_costs
-- 7. commission_reports
-- 8. commission_salespeople (depende de commission_reports)
-- 9. commission_orders (depende de commission_salespeople)
-- 10. commission_payments
-- 11. orders
-- 12. crm_leads
