# Edge Functions - Orlando Fast Pass

Lista de todas as Edge Functions do projeto e seus arquivos fonte.

## Funções Disponíveis

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `parse-google-sheet` | `supabase/functions/parse-google-sheet/index.ts` | Lê dados de planilhas do Google Sheets |
| `write-google-sheet` | `supabase/functions/write-google-sheet/index.ts` | Escreve dados em planilhas do Google Sheets |
| `parse-leads-sheet` | `supabase/functions/parse-leads-sheet/index.ts` | Processa planilha de leads |
| `parse-proposal-cart` | `supabase/functions/parse-proposal-cart/index.ts` | Processa carrinho de propostas |
| `parse-bank-statement` | `supabase/functions/parse-bank-statement/index.ts` | Processa extratos bancários |
| `notion-crm-sync` | `supabase/functions/notion-crm-sync/index.ts` | Sincroniza CRM com Notion |
| `banco-inter` | `supabase/functions/banco-inter/index.ts` | Integração com API do Banco Inter |
| `nfse-sp` | `supabase/functions/nfse-sp/index.ts` | Emissão de NFS-e São Paulo |

## Dependências de Secrets por Função

### parse-google-sheet / write-google-sheet / parse-leads-sheet
- `GOOGLE_SERVICE_ACCOUNT_KEY`

### notion-crm-sync
- `NOTION_API_KEY`

### banco-inter
- `INTER_CLIENT_ID`
- `INTER_CLIENT_SECRET`
- `INTER_CERTIFICATE`
- `INTER_CERTIFICATE_KEY`

### nfse-sp
- `NFSE_SP_CNPJ`
- `NFSE_SP_CCM`
- `NFSE_SP_CERTIFICATE`
- `NFSE_SP_CERTIFICATE_PASSWORD`

## Comando de Deploy

```bash
# Deploy de todas as funções
supabase functions deploy parse-google-sheet
supabase functions deploy write-google-sheet
supabase functions deploy parse-leads-sheet
supabase functions deploy parse-proposal-cart
supabase functions deploy parse-bank-statement
supabase functions deploy notion-crm-sync
supabase functions deploy banco-inter
supabase functions deploy nfse-sp

# Ou deploy de uma função específica
supabase functions deploy [NOME_DA_FUNCAO]
```

## Notas Importantes

1. Certifique-se de que todos os secrets necessários estejam configurados antes do deploy
2. O arquivo `supabase/config.toml` deve estar atualizado com o `project_id` correto
3. Use `supabase link --project-ref [PROJECT_ID]` para conectar ao projeto correto
