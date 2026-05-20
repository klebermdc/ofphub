## Objetivo
Quando um pedido for lançado no OFP Hub, disparar automaticamente um evento `Purchase` para a Meta Conversions API (Pixel `343648994758202`), permitindo que o algoritmo do Meta Ads otimize com base em conversões reais e que o ROAS apareça correto no Ads Manager.

## Arquitetura

```text
[LP externa com Pixel]  →  snippet captura _fbc/_fbp  →  POST /ingest-lead
                                                              ↓
                                                       crm_leads (com fbc/fbp)
                                                              ↓
[Vendedor lança pedido] →  insert em `orders`  →  edge `meta-capi-purchase`
                                                              ↓
                                                  enriquece com fbc/fbp do lead
                                                              ↓
                                                       hasheia user_data (SHA-256)
                                                              ↓
                                          POST graph.facebook.com/v21.0/{PIXEL}/events
                                                              ↓
                                                  log em `meta_capi_events`
```

## Componentes

### 1. Banco de dados (migration)
- **`orders`**: adicionar
  - `fbc text` — cookie _fbc (click ID)
  - `fbp text` — cookie _fbp (browser ID)
  - `client_ip text`, `client_user_agent text` — melhoram match
  - `meta_event_id text unique` — idempotência (= order.id)
  - `meta_event_status text` (`pending` | `sent` | `failed` | `skipped`)
  - `meta_event_sent_at timestamptz`
- **`crm_leads`**: adicionar `fbc`, `fbp`, `client_ip`, `client_user_agent`
- **Nova tabela `meta_capi_events`** (log/auditoria):
  - `order_id`, `event_id`, `event_name`, `event_time`, `status`, `request_payload jsonb`, `response_payload jsonb`, `error text`, `attempt int`, `created_at`
- RLS: só manager lê.

### 2. Edge function `meta-capi-purchase`
- Recebe `{ order_id }` (auth: usuário logado OU `REPORT_API_KEY`)
- Busca o pedido em `orders`
- Tenta encontrar lead correspondente em `crm_leads` por email/telefone → puxa `fbc`, `fbp`, `ip`, `ua`
- Monta payload:
  ```json
  {
    "data": [{
      "event_name": "Purchase",
      "event_time": <unix>,
      "event_id": "<order.id>",
      "action_source": "system_generated",
      "user_data": {
        "em": [sha256(email)],
        "ph": [sha256(phone_e164)],
        "fn": [sha256(first_name)],
        "ln": [sha256(last_name)],
        "fbc": "...",
        "fbp": "...",
        "client_ip_address": "...",
        "client_user_agent": "..."
      },
      "custom_data": {
        "currency": "BRL",
        "value": <venda>,
        "content_name": "<produto>",
        "content_ids": ["<pedido>"],
        "order_id": "<pedido>"
      }
    }]
  }
  ```
- POST `https://graph.facebook.com/v21.0/343648994758202/events?access_token=…`
- Grava resultado em `meta_capi_events` e atualiza `orders.meta_event_status`
- Suporta `?test=1` que adiciona `test_event_code` para validação no Events Manager

### 3. Edge function `ingest-lead` (para a LP externa)
- Endpoint público (sem JWT, com rate limit por IP) que recebe `{ name, email, phone, fbc, fbp }` da LP
- Cria ou atualiza um registro em `crm_leads`
- Captura `client_ip` e `user-agent` do header da request
- Retorna `200 OK`

### 4. Snippet JS para a LP externa
Arquivo entregue em `public/meta-lead-capture.js` para você colar no `<head>` da LP:
```html
<script src="https://ofphub.orlandofastpass.com.br/meta-lead-capture.js"></script>
```
Esse snippet, ao submit do formulário, lê `_fbc`/`_fbp` dos cookies e envia junto pra `ingest-lead`.

### 5. UI — Frontend
- **OrderFormDialog**: após `insert` bem-sucedido, dispara `supabase.functions.invoke('meta-capi-purchase', { body: { order_id } })` em background (não bloqueia o usuário).
- **Lista de pedidos (CommercialTab/etc)**: badge mostrando status Meta (`✅ Enviado` / `⏳ Pendente` / `❌ Falhou`) + botão **"Reenviar para Meta"** (só manager).
- **Card no Marketing tab**: "Eventos CAPI" — totais enviados/falhados nos últimos 7 dias, com link para Events Manager.

### 6. Secret necessário
- `META_CAPI_ACCESS_TOKEN` — token gerado no Events Manager → Configurações → API de Conversões → Gerar token de acesso. (O Pixel ID pode ficar em código por ser público.)

## Entrega em ondas

**Onda 1 (núcleo):**
- Migration completa
- Edge `meta-capi-purchase`
- Disparo automático no OrderFormDialog
- Botão "Reenviar" + badge na lista de pedidos

**Onda 2 (captura LP):**
- Edge `ingest-lead`
- Snippet `meta-lead-capture.js` pronto pra colar na LP

**Onda 3 (BI):**
- Card de saúde CAPI no Marketing tab

## Próximo passo
Preciso que você gere e me forneça o **`META_CAPI_ACCESS_TOKEN`** no Events Manager da Meta (passo a passo no chat após aprovação). Sem ele a função não consegue postar.

Posso seguir?