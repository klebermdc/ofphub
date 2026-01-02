# Guia de Migração Supabase - OFP Dashboard

Este documento contém todas as informações necessárias para migrar este projeto para uma nova conta Supabase.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
4. [Secrets Configurados](#secrets-configurados)
5. [Edge Functions](#edge-functions)
6. [Storage Buckets](#storage-buckets)
7. [Passo a Passo da Migração](#passo-a-passo-da-migração)
8. [Atualizações no Código](#atualizações-no-código)
9. [Verificação Pós-Migração](#verificação-pós-migração)

---

## Visão Geral

**Project ID Atual:** `eypbkwmmoitaprtinpjg`

### Componentes a Migrar

| Componente | Fonte | Migração Automática |
|------------|-------|---------------------|
| Schema do DB | `supabase/migrations/` | ✅ Sim |
| RLS Policies | `supabase/migrations/` | ✅ Sim |
| DB Functions | `supabase/migrations/` | ✅ Sim |
| Triggers | `supabase/migrations/` | ✅ Sim |
| Edge Functions | `supabase/functions/` | ❌ Manual |
| Secrets | Dashboard | ❌ Manual |
| Storage Buckets | Dashboard | ❌ Manual |
| Dados das Tabelas | Backup | ❌ Manual |

---

## Pré-requisitos

1. Nova conta Supabase criada
2. Supabase CLI instalado (`npm install -g supabase`)
3. Acesso ao projeto atual para exportar dados
4. Todos os secrets/API keys em mãos

---

## Estrutura do Banco de Dados

### Tabelas (17 total)

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `profiles` | Dados adicionais dos usuários | ✅ |
| `user_roles` | Roles: manager, salesperson, marketing | ✅ |
| `orders` | Pedidos de vendas | ✅ |
| `crm_leads` | Leads do CRM (sync com Notion) | ✅ |
| `commission_reports` | Relatórios de comissão por período | ✅ |
| `commission_salespeople` | Vendedores por relatório | ✅ |
| `commission_orders` | Pedidos por vendedor | ✅ |
| `commission_payments` | Pagamentos de comissão | ✅ |
| `sales_goals` | Metas de vendas gerais | ✅ |
| `salesperson_goals` | Metas individuais por vendedor | ✅ |
| `salesperson_salaries` | Salários dos vendedores | ✅ |
| `marketing_costs` | Custos de marketing | ✅ |
| `marketing_files` | Arquivos de marketing | ✅ |
| `accounting_entries` | Lançamentos contábeis | ✅ |
| `accounting_files` | Arquivos contábeis | ✅ |
| `nfse_history` | Histórico de NFS-e emitidas | ✅ |
| `user_sheet_settings` | Configurações de planilhas | ✅ |

### Enums

```sql
-- Roles de usuário
CREATE TYPE public.app_role AS ENUM ('manager', 'salesperson', 'marketing');

-- Estágios do CRM
CREATE TYPE public.crm_stage AS ENUM (
  'novo_lead',
  'coletando_informacao', 
  'proposta_enviada',
  'venda_concluida',
  'venda_perdida'
);
```

### Funções do Banco de Dados

| Função | Descrição |
|--------|-----------|
| `has_role(uuid, app_role)` | Verifica se usuário tem role específico |
| `get_salesperson_name(uuid)` | Retorna nome do vendedor pelo user_id |
| `find_user_by_email(text)` | Busca user_id pelo email |
| `link_salesperson(uuid, text)` | Vincula usuário como vendedor |
| `link_marketing(uuid)` | Vincula usuário como marketing |
| `assign_first_manager(uuid)` | Atribui primeiro manager |
| `handle_new_user()` | Trigger para criar profile automático |
| `update_updated_at_column()` | Trigger para atualizar updated_at |

---

## Secrets Configurados

### ⚠️ CRÍTICO: Estes secrets precisam ser reconfigurados manualmente

| Secret | Usado Em | Descrição |
|--------|----------|-----------|
| `SUPABASE_URL` | Edge Functions | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Edge Functions | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Chave de serviço (admin) |
| `SUPABASE_DB_URL` | Edge Functions | URL do banco PostgreSQL |
| `SUPABASE_PUBLISHABLE_KEY` | Edge Functions | Chave pública |
| `LOVABLE_API_KEY` | `parse-bank-statement`, `parse-proposal-cart` | API do Lovable AI |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `parse-google-sheet`, `write-google-sheet` | Service account Google |
| `NOTION_API_KEY` | `notion-crm-sync` | API do Notion |
| `INTER_CLIENT_ID` | `banco-inter` | Client ID Banco Inter |
| `INTER_CLIENT_SECRET` | `banco-inter` | Client Secret Banco Inter |
| `INTER_CERTIFICATE` | `banco-inter` | Certificado mTLS Inter |
| `INTER_CERTIFICATE_KEY` | `banco-inter` | Chave do certificado Inter |
| `NFSE_SP_CNPJ` | `nfse-sp` | CNPJ para NFS-e SP |
| `NFSE_SP_CCM` | `nfse-sp` | CCM para NFS-e SP |
| `NFSE_SP_CERTIFICATE` | `nfse-sp` | Certificado NFS-e |
| `NFSE_SP_CERTIFICATE_PASSWORD` | `nfse-sp` | Senha do certificado |

---

## Edge Functions

### Localização: `supabase/functions/`

| Função | JWT | Descrição |
|--------|-----|-----------|
| `parse-google-sheet` | ✅ Required | Importa dados de Google Sheets |
| `write-google-sheet` | ✅ Required | Escreve dados em Google Sheets |
| `parse-leads-sheet` | ✅ Required | Processa planilha de leads |
| `parse-proposal-cart` | ✅ Required | Gera propostas com IA |
| `parse-bank-statement` | ✅ Required | Processa extratos bancários com IA |
| `notion-crm-sync` | ✅ Required | Sincroniza leads do Notion |
| `banco-inter` | ✅ Required | Integração Banco Inter (saldo/extrato) |
| `nfse-sp` | ✅ Required | Emissão de NFS-e São Paulo |

### Configuração (`supabase/config.toml`)

```toml
project_id = "SEU_NOVO_PROJECT_ID"

[functions.parse-google-sheet]
verify_jwt = true

[functions.parse-leads-sheet]
verify_jwt = true

[functions.notion-crm-sync]
verify_jwt = true

[functions.parse-proposal-cart]
verify_jwt = true

[functions.banco-inter]
verify_jwt = true

[functions.nfse-sp]
verify_jwt = true

[functions.write-google-sheet]
verify_jwt = true

[functions.parse-bank-statement]
verify_jwt = true
```

---

## Storage Buckets

### Buckets a Criar

| Bucket | Público | Descrição |
|--------|---------|-----------|
| `accounting-files` | ❌ Não | Arquivos contábeis |
| `marketing-files` | ❌ Não | Arquivos de marketing |
| `payment-receipts` | ✅ Sim | Comprovantes de pagamento |

### Políticas de Storage Necessárias

```sql
-- accounting-files: Usuários podem gerenciar seus próprios arquivos
CREATE POLICY "Users can upload accounting files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their accounting files"
ON storage.objects FOR SELECT
USING (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their accounting files"
ON storage.objects FOR DELETE
USING (bucket_id = 'accounting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- marketing-files: Similar ao accounting
-- payment-receipts: Público para leitura
```

---

## Passo a Passo da Migração

### 1. Criar Novo Projeto Supabase

```bash
# No dashboard Supabase, crie um novo projeto
# Anote:
# - Project ID
# - URL
# - Anon Key
# - Service Role Key
```

### 2. Aplicar Migrations

```bash
# Clone o repositório
git clone [seu-repo]
cd [seu-repo]

# Link ao novo projeto
supabase link --project-ref SEU_NOVO_PROJECT_ID

# Aplicar todas as migrations
supabase db push
```

### 3. Configurar Secrets

No Dashboard Supabase → Settings → Edge Functions → Secrets:

```bash
# Secrets automáticos (serão diferentes no novo projeto)
SUPABASE_URL=https://SEU_NOVO_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=sua_nova_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_nova_service_role_key

# Secrets manuais (copiar os mesmos valores)
LOVABLE_API_KEY=valor_atual
GOOGLE_SERVICE_ACCOUNT_KEY=valor_atual
NOTION_API_KEY=valor_atual
INTER_CLIENT_ID=valor_atual
INTER_CLIENT_SECRET=valor_atual
INTER_CERTIFICATE=valor_atual
INTER_CERTIFICATE_KEY=valor_atual
NFSE_SP_CNPJ=valor_atual
NFSE_SP_CCM=valor_atual
NFSE_SP_CERTIFICATE=valor_atual
NFSE_SP_CERTIFICATE_PASSWORD=valor_atual
```

### 4. Criar Storage Buckets

No Dashboard → Storage:

1. Criar bucket `accounting-files` (privado)
2. Criar bucket `marketing-files` (privado)
3. Criar bucket `payment-receipts` (público)
4. Aplicar políticas de acesso

### 5. Deploy Edge Functions

```bash
# Deploy todas as funções
supabase functions deploy parse-google-sheet
supabase functions deploy write-google-sheet
supabase functions deploy parse-leads-sheet
supabase functions deploy parse-proposal-cart
supabase functions deploy parse-bank-statement
supabase functions deploy notion-crm-sync
supabase functions deploy banco-inter
supabase functions deploy nfse-sp
```

### 6. Exportar/Importar Dados (Opcional)

```bash
# Exportar dados do projeto antigo
pg_dump -h db.eypbkwmmoitaprtinpjg.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --exclude-table=auth.* \
  -f backup.sql

# Importar no novo projeto
psql -h db.SEU_NOVO_PROJECT_ID.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

---

## Atualizações no Código

### Arquivo `.env`

```env
VITE_SUPABASE_PROJECT_ID="SEU_NOVO_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_NOVA_ANON_KEY"
VITE_SUPABASE_URL="https://SEU_NOVO_PROJECT_ID.supabase.co"
```

### Arquivo `supabase/config.toml`

```toml
project_id = "SEU_NOVO_PROJECT_ID"
# ... resto permanece igual
```

---

## Verificação Pós-Migração

### Checklist de Testes

- [ ] **Autenticação**
  - [ ] Login funciona
  - [ ] Signup funciona
  - [ ] Roles são atribuídos corretamente

- [ ] **Dashboard Manager**
  - [ ] Importação de planilha funciona
  - [ ] Dados de vendas aparecem
  - [ ] Gráficos renderizam

- [ ] **CRM**
  - [ ] Leads aparecem
  - [ ] Drag & drop funciona
  - [ ] Sync Notion funciona

- [ ] **Propostas**
  - [ ] Geração de proposta com IA funciona
  - [ ] PDF é gerado

- [ ] **Contabilidade**
  - [ ] Lançamentos salvam
  - [ ] Upload de arquivos funciona
  - [ ] Import de extrato funciona

- [ ] **Banco Inter**
  - [ ] Consulta de saldo funciona
  - [ ] Extrato é carregado

- [ ] **NFS-e**
  - [ ] Emissão funciona (testar em homologação)

- [ ] **Storage**
  - [ ] Upload de arquivos funciona
  - [ ] Download funciona

---

## Troubleshooting

### Erro: "JWT verification failed"
- Verifique se a função está configurada com `verify_jwt = true` no config.toml
- Confirme que o token está sendo enviado no header Authorization

### Erro: "Secret not found"
- Verifique se todos os secrets foram configurados no novo projeto
- Nomes são case-sensitive

### Erro: "RLS policy violation"
- Confirme que as migrations foram aplicadas corretamente
- Verifique se o usuário tem o role correto

### Erro: "Storage bucket not found"
- Crie os buckets manualmente no dashboard
- Aplique as políticas de acesso

---

## Contatos e Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Migrations Guide](https://supabase.com/docs/guides/cli/managing-environments)

---

*Documento gerado em: Janeiro 2026*
*Versão: 1.0*
