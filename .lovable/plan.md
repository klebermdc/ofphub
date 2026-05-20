## Objetivo
Estender o padrão do popover "Como é calculado o Resultado do Dia" para **todos os KPIs financeiros** do sistema, com o mesmo formato (clique no ícone "i" → popover detalhado com seções coloridas mostrando entradas, deduções e total).

## Abordagem técnica
1. **Estender `MetricCard.tsx`** para aceitar uma nova prop opcional `breakdown?: ReactNode`. Quando presente, o card vira `PopoverTrigger` (em vez de Tooltip simples) e renderiza o `breakdown` dentro de um `PopoverContent` no mesmo estilo do Resultado do Dia (seções coloridas, linhas label → valor).
2. **Criar helpers reutilizáveis** em `src/components/ui/calculation-breakdown.tsx`:
   - `<BreakdownSection title color>` — bloco colorido (emerald/amber/red/blue)
   - `<BreakdownRow label value variant>` — linha label → valor com variantes (default/warning/danger/total)
   - `<BreakdownSubRow>` — linha indentada para detalhes
3. **Plugar `breakdown` em cada KPI** das telas, montando a fórmula real a partir das variáveis já calculadas no componente pai.

## Cards que ganharão breakdown

### Acompanhamento Mensal (`DashboardMonthlyMetrics.tsx`)
- Faturamento → soma de vendas brutas do mês (com contagem de pedidos)
- Comissão Total → comissão bruta da empresa, % média ponderada
- Comissão Vendedores → soma de `comissao_vendedor`
- Comissão Guias → quebra Kleber (100%) + Rafael (50%)
- Ganho Bruto → Comissão Total − Vendedores − Guias
- Custos Fixos → Salários + Operacionais + Marketing s/ ads
- Ads do Mês → Meta + Google de `marketing_daily_stats`
- Imposto Estimado → 12% × Comissão Total
- Resultado Final → Ganho Bruto − Custos Fixos − Ads − Imposto
- Projeção em USD (já tem `formula`, virar breakdown rico)

### Resultado do Dia (`DailySalesTracker.tsx`)
- Ganho do Dia → mesma fórmula do Resultado, parando antes dos custos
- Vendas do Dia → lista de pedidos do dia
- Comissão do Dia → quebra vendedor/guia
- (Resultado do Dia já existe — manter)

### Quinzena (`DashboardFortnightMetrics.tsx`)
- Faturamento, Ganho, Resultado da quinzena → mesma estrutura aplicada à janela de 15 dias

### Operacionais (`DashboardOperationalMetrics.tsx`)
- Ticket Médio → Faturamento ÷ nº de pedidos
- % Comissão Média → ponderada (já documentada em mem)
- Custo por Lead → Ads ÷ leads
- Taxa de Conversão → pedidos ÷ leads

### Marketing (`MarketingTab.tsx`, `MarketingAdsTab.tsx`)
- ROAS, ROI, CAC, Custo/Lead, Conversão → cada um com numerador/denominador

### Custos (`CostsTab.tsx`)
- Total de custos do mês quebrado por categoria

## Detalhes técnicos

```text
MetricCard
├─ se breakdown → Popover (novo)
├─ se formula  → Tooltip (mantido p/ compat)
└─ senão       → card simples
```

Estilo idêntico ao popover atual (`w-[min(28rem,calc(100vw-2rem))]`, seções com `bg-{cor}-500/5 border border-{cor}-500/20 rounded-md p-2`, header maiúsculo com numeração 1., 2., 3.).

Ícone (i) discreto no canto do card (igual o Resultado do Dia já tem).

## Entrega faseada (recomendado)
Esse trabalho toca **8+ arquivos**. Sugiro entregar em ondas para você validar formato antes:

- **Onda 1 (agora):** infraestrutura (`MetricCard` + helpers) + Acompanhamento Mensal completo.
- **Onda 2:** Quinzena + restante do Resultado do Dia.
- **Onda 3:** Marketing + Operacionais + Custos.

## Confirme antes de eu seguir
1. Pode começar pela **Onda 1** (mensal)?
2. Manter o `formula` antigo (tooltip simples) como fallback para cards que ainda não foram migrados, ou converter tudo de uma vez?