import { DollarSign, TrendingUp, Users, Megaphone, Briefcase, Receipt, Wallet, Target, CircleDollarSign, Percent } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/utils/formatters";
import { BreakdownContainer, BreakdownSection, BreakdownRow } from "@/components/ui/calculation-breakdown";

interface MonthlyMetricsProps {
  totalVendas: number;
  totalComissaoTotal: number;
  totalComissao: number;
  ganhoBruto: number;
  custoEquipeComercial: number;
  marketingCost: number;
  operationalCost: number;
  impostoEstimado: number;
  totalCost: number;
  ticketMedio: number;
  resultadoParcial: number;
  resultado: number;
  taxaMedia: number;
  // Optional extras para breakdowns detalhados
  numPedidos?: number;
  totalSalaries?: number;
  totalDiscounts?: number;
  realAdSpendToDate?: number;
  custosFixosProporcional?: number;
  proporcao?: number;
  daysInMonth?: number;
  daysElapsed?: number;
  vendedoresAtivos?: number;
  periodoLabel?: string;
}

export function DashboardMonthlyMetrics({
  totalVendas,
  totalComissaoTotal,
  totalComissao,
  ganhoBruto,
  custoEquipeComercial,
  marketingCost,
  operationalCost,
  impostoEstimado,
  totalCost,
  ticketMedio,
  resultadoParcial,
  resultado,
  taxaMedia,
  numPedidos = 0,
  totalSalaries = 0,
  totalDiscounts = 0,
  realAdSpendToDate = 0,
  custosFixosProporcional = 0,
  proporcao = 0,
  daysInMonth = 0,
  daysElapsed = 0,
  vendedoresAtivos = 0,
  periodoLabel,
}: MonthlyMetricsProps) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const periodSubtitle = periodoLabel
    ? `${periodoLabel}${daysInMonth ? ` • ${daysElapsed}/${daysInMonth} dias decorridos` : ""}`
    : undefined;
  const ganhoBrutoCheck = totalComissaoTotal - totalComissao; // == ganhoBruto
  const marketingAds = Math.min(realAdSpendToDate, marketingCost);
  const marketingExtras = Math.max(0, marketingCost - realAdSpendToDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento Mensal</h2>
      </div>

      {/* Receitas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Faturamento"
          value={formatCurrency(totalVendas)}
          icon={DollarSign}
          delay={0}
          variant="success"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Faturamento"
              subtitle={periodSubtitle}
              footer="Soma do valor de venda (campo venda) de todos os pedidos do período, incluindo guiamentos."
            >
              <BreakdownSection title="1. Vendas brutas do período" color="emerald">
                <BreakdownRow label="Total de pedidos lançados" value={numPedidos} />
                <BreakdownRow label="Vendedores ativos" value={vendedoresAtivos} />
                <BreakdownRow label="Ticket médio" value={formatCurrency(ticketMedio)} />
                <BreakdownRow label="= Faturamento" value={formatCurrency(totalVendas)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Comissão Total"
          value={formatCurrency(totalComissaoTotal)}
          icon={TrendingUp}
          delay={50}
          variant="warning"
          breakdown={
            <BreakdownContainer
              title="Como é calculada a Comissão Total"
              subtitle={periodSubtitle}
              footer="Margem bruta da empresa: soma das comissões geradas em cada pedido (venda × % comissão do produto)."
            >
              <BreakdownSection title="1. Margem bruta da empresa" color="amber">
                <BreakdownRow label="Faturamento" value={formatCurrency(totalVendas)} />
                <BreakdownRow label="% média ponderada" value={`${(taxaMedia || 0).toFixed(2)}%`} />
                <BreakdownRow label="= Comissão Total" value={formatCurrency(totalComissaoTotal)} variant="total" />
              </BreakdownSection>
              <BreakdownSection title="2. Para onde vai" color="neutral">
                <BreakdownRow label="(-) Comissão vendedores + guias" value={`-${formatCurrency(totalComissao)}`} variant="warning" />
                <BreakdownRow label="= Ganho bruto da empresa (OFP)" value={formatCurrency(ganhoBruto)} variant="success" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Comissão Vendedor"
          value={formatCurrency(totalComissao)}
          icon={TrendingUp}
          delay={75}
          breakdown={
            <BreakdownContainer
              title="Como é calculada a Comissão dos Vendedores"
              subtitle={periodSubtitle}
              footer="Inclui comissão de vendedores + comissão paga aos guias (Kleber 100%, Rafael 50% — já aplicado em cada pedido)."
            >
              <BreakdownSection title="1. Pagamento à equipe" color="amber">
                <BreakdownRow label="Vendedores ativos" value={vendedoresAtivos} />
                <BreakdownRow label="Total pago (vendedor + guia)" value={formatCurrency(totalComissao)} variant="warning" />
                {totalDiscounts > 0 && (
                  <BreakdownRow label="(-) Descontos aplicados" value={`-${formatCurrency(totalDiscounts)}`} variant="danger" />
                )}
              </BreakdownSection>
              <BreakdownSection title="2. Relação com a margem" color="neutral">
                <BreakdownRow label="Comissão Total empresa" value={formatCurrency(totalComissaoTotal)} />
                <BreakdownRow label="(-) Comissão vendedores+guias" value={`-${formatCurrency(totalComissao)}`} variant="warning" />
                <BreakdownRow label="= Ganho bruto OFP" value={formatCurrency(ganhoBruto)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Ganho Bruto"
          value={formatCurrency(ganhoBruto)}
          icon={TrendingUp}
          delay={85}
          variant="success"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Ganho Bruto"
              subtitle={periodSubtitle}
              footer="Lucro bruto da empresa antes dos custos fixos (salários, marketing, operacional) e do imposto."
            >
              <BreakdownSection title="1. Margem líquida da empresa" color="emerald">
                <BreakdownRow label="Comissão Total (margem bruta)" value={formatCurrency(totalComissaoTotal)} />
                <BreakdownRow label="(-) Pago a vendedores + guias" value={`-${formatCurrency(totalComissao)}`} variant="warning" />
                <BreakdownRow label="= Ganho Bruto OFP" value={formatCurrency(ganhoBrutoCheck)} variant="total" />
              </BreakdownSection>
              <BreakdownSection title="2. Próximos passos" color="neutral">
                <BreakdownRow label="(-) Custo Equipe (salários)" value={`-${formatCurrency(totalSalaries)}`} variant="danger" />
                <BreakdownRow label="(-) Marketing" value={`-${formatCurrency(marketingCost)}`} variant="danger" />
                <BreakdownRow label="(-) Operacional" value={`-${formatCurrency(operationalCost)}`} variant="danger" />
                <BreakdownRow label="(-) Imposto 12%" value={`-${formatCurrency(impostoEstimado)}`} variant="danger" />
                <BreakdownRow label="= Resultado Final" value={formatCurrency(resultado)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />
      </div>

      {/* Custos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Custo Equipe Comercial"
          value={formatCurrency(custoEquipeComercial)}
          icon={Users}
          delay={75}
          variant="warning"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Custo da Equipe Comercial"
              subtitle={periodSubtitle}
              footer="Salários fixos + comissões dos vendedores não-sócios, menos descontos do período. Sócios são excluídos para refletir o custo real da operação comercial."
            >
              <BreakdownSection title="1. Composição" color="amber">
                <BreakdownRow label="Salários fixos da equipe" value={formatCurrency(totalSalaries)} />
                <BreakdownRow label="+ Comissões dos não-sócios" value={formatCurrency(Math.max(0, custoEquipeComercial - totalSalaries + totalDiscounts))} />
                {totalDiscounts > 0 && (
                  <BreakdownRow label="(-) Descontos aplicados" value={`-${formatCurrency(totalDiscounts)}`} variant="danger" />
                )}
                <BreakdownRow label="= Custo Equipe Comercial" value={formatCurrency(custoEquipeComercial)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Marketing"
          value={formatCurrency(marketingCost)}
          icon={Megaphone}
          delay={85}
          variant="warning"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Custo de Marketing"
              subtitle={periodSubtitle}
              footer="Meta Ads + Google Ads vêm em tempo real de marketing_daily_stats. Custos extras (agência, ferramentas) são cadastrados manualmente."
            >
              <BreakdownSection title="1. Mídia paga (real)" color="amber">
                <BreakdownRow label="Meta Ads + Google Ads (acumulado)" value={formatCurrency(realAdSpendToDate)} />
                {marketingExtras > 0 && (
                  <BreakdownRow label="+ Outros custos de marketing" value={formatCurrency(marketingExtras)} />
                )}
                <BreakdownRow label="= Marketing total" value={formatCurrency(marketingCost)} variant="total" />
              </BreakdownSection>
              {daysElapsed > 0 && (
                <BreakdownSection title="2. Ritmo de gasto" color="neutral">
                  <BreakdownRow label="Média/dia de ads" value={formatCurrency(realAdSpendToDate / daysElapsed)} />
                  {daysInMonth > 0 && (
                    <BreakdownRow label="Projeção fim do mês" value={formatCurrency((realAdSpendToDate / daysElapsed) * daysInMonth)} />
                  )}
                </BreakdownSection>
              )}
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Custos Operacionais"
          value={formatCurrency(operationalCost)}
          icon={Briefcase}
          delay={95}
          variant="warning"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Custo Operacional"
              subtitle={periodSubtitle}
              footer="Custos fixos cadastrados na aba Custos: software, telefonia e outras despesas operacionais do mês."
            >
              <BreakdownSection title="1. Custos do mês" color="amber">
                <BreakdownRow label="Total operacional" value={formatCurrency(operationalCost)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Imposto Estimado (12%)"
          value={formatCurrency(impostoEstimado)}
          icon={Receipt}
          delay={105}
          variant="warning"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Imposto Estimado"
              subtitle={periodSubtitle}
              footer="Estimativa simplificada de 12% aplicada sobre a Comissão Total (margem bruta), que é a receita reconhecida pela empresa."
            >
              <BreakdownSection title="1. Base de cálculo" color="amber">
                <BreakdownRow label="Comissão Total (receita)" value={formatCurrency(totalComissaoTotal)} />
                <BreakdownRow label="× alíquota" value="12%" />
                <BreakdownRow label="= Imposto estimado" value={formatCurrency(impostoEstimado)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />
      </div>

      {/* Totais e Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Custo Total"
          value={formatCurrency(totalCost)}
          icon={Wallet}
          delay={115}
          variant="danger"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Custo Total"
              subtitle={periodSubtitle}
              footer="Soma de todos os custos da operação no mês fechado (sem ratear pelo tempo). Usado no cálculo do Resultado Final."
            >
              <BreakdownSection title="1. Custos do período" color="red">
                <BreakdownRow label="Comissão vendedores + guias" value={formatCurrency(totalComissao)} variant="warning" />
                <BreakdownRow label="Salários (equipe)" value={formatCurrency(totalSalaries)} variant="warning" />
                <BreakdownRow label="Marketing" value={formatCurrency(marketingCost)} variant="warning" />
                <BreakdownRow label="Custos operacionais" value={formatCurrency(operationalCost)} variant="warning" />
                <BreakdownRow label="Imposto 12%" value={formatCurrency(impostoEstimado)} variant="warning" />
                <BreakdownRow label="= Custo Total" value={formatCurrency(totalCost)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Target}
          delay={120}
          variant="info"
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Ticket Médio"
              subtitle={periodSubtitle}
              footer="Valor médio de cada pedido lançado no período."
            >
              <BreakdownSection title="1. Fórmula" color="blue">
                <BreakdownRow label="Faturamento" value={formatCurrency(totalVendas)} />
                <BreakdownRow label="÷ Nº de pedidos" value={numPedidos} />
                <BreakdownRow label="= Ticket médio" value={formatCurrency(ticketMedio)} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Comissão Média %"
          value={`${(taxaMedia || 0).toFixed(2)}%`}
          icon={Percent}
          delay={122}
          variant="info"
          breakdown={
            <BreakdownContainer
              title="Como é calculada a Comissão Média %"
              subtitle={periodSubtitle}
              footer="Média ponderada das porcentagens de comissão por pedido, considerando os vendedores ativos do período (exclui guiamentos)."
            >
              <BreakdownSection title="1. Indicador" color="blue">
                <BreakdownRow label="Vendedores ativos" value={vendedoresAtivos} />
                <BreakdownRow label="% média ponderada" value={`${(taxaMedia || 0).toFixed(2)}%`} variant="total" />
              </BreakdownSection>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Resultado Parcial"
          value={formatCurrency(resultadoParcial)}
          icon={TrendingUp}
          delay={125}
          variant={resultadoParcial >= 0 ? "success" : "danger"}
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Resultado Parcial"
              subtitle={periodSubtitle}
              footer={`Alinhado com a lógica do Resultado do Dia: custos fixos rateados pelo tempo decorrido (${pct(proporcao)}), ads acumulados reais, imposto sobre receita real.`}
            >
              <BreakdownSection title="1. Ganho bruto" color="emerald">
                <BreakdownRow label="Comissão Total" value={formatCurrency(totalComissaoTotal)} />
                <BreakdownRow label="(-) Comissão vendedores+guias" value={`-${formatCurrency(totalComissao)}`} variant="warning" />
                <BreakdownRow label="= Ganho bruto" value={formatCurrency(ganhoBruto)} variant="subtotal" />
              </BreakdownSection>
              <BreakdownSection title={`2. Custos fixos × ${pct(proporcao)}`} color="amber">
                <BreakdownRow label="Salários (mês)" value={formatCurrency(totalSalaries)} />
                <BreakdownRow label="Marketing s/ ads (mês)" value={formatCurrency(marketingExtras)} />
                <BreakdownRow label="Operacional (mês)" value={formatCurrency(operationalCost)} />
                <BreakdownRow label={`× proporção (${pct(proporcao)})`} value={`-${formatCurrency(custosFixosProporcional)}`} variant="danger" />
              </BreakdownSection>
              <BreakdownSection title="3. Custos variáveis reais" color="red">
                <BreakdownRow label="Ads reais acumulados" value={`-${formatCurrency(realAdSpendToDate)}`} variant="danger" />
                <BreakdownRow label="Imposto 12% s/ comissão total" value={`-${formatCurrency(impostoEstimado)}`} variant="danger" />
              </BreakdownSection>
              <div className="border-t-2 pt-2 space-y-1">
                <BreakdownRow label="Ganho bruto" value={formatCurrency(ganhoBruto)} />
                <BreakdownRow label="(-) Custos rateados + ads + imposto" value={`-${formatCurrency(custosFixosProporcional + realAdSpendToDate + impostoEstimado)}`} variant="danger" />
                <BreakdownRow label="= Resultado Parcial" value={formatCurrency(resultadoParcial)} variant="total" />
              </div>
            </BreakdownContainer>
          }
        />

        <MetricCard
          title="Resultado Final"
          value={formatCurrency(resultado)}
          icon={CircleDollarSign}
          delay={130}
          variant={resultado >= 0 ? "success" : "danger"}
          breakdown={
            <BreakdownContainer
              title="Como é calculado o Resultado Final"
              subtitle={periodSubtitle}
              footer="Projeção considerando todos os custos do mês fechado (não proporcionais). Para o resultado real acumulado até hoje, veja o Resultado Parcial."
            >
              <BreakdownSection title="1. Receita" color="emerald">
                <BreakdownRow label="Comissão Total (margem bruta)" value={formatCurrency(totalComissaoTotal)} variant="total" />
              </BreakdownSection>
              <BreakdownSection title="2. Custos do mês" color="red">
                <BreakdownRow label="Comissão vendedores+guias" value={`-${formatCurrency(totalComissao)}`} variant="warning" />
                <BreakdownRow label="Salários" value={`-${formatCurrency(totalSalaries)}`} variant="warning" />
                <BreakdownRow label="Marketing" value={`-${formatCurrency(marketingCost)}`} variant="warning" />
                <BreakdownRow label="Operacional" value={`-${formatCurrency(operationalCost)}`} variant="warning" />
                <BreakdownRow label="Imposto 12%" value={`-${formatCurrency(impostoEstimado)}`} variant="warning" />
                <BreakdownRow label="= Custo Total" value={`-${formatCurrency(totalCost)}`} variant="subtotal" />
              </BreakdownSection>
              <div className="border-t-2 pt-2 space-y-1">
                <BreakdownRow label="Comissão Total" value={formatCurrency(totalComissaoTotal)} />
                <BreakdownRow label="(-) Custo Total" value={`-${formatCurrency(totalCost)}`} variant="danger" />
                <BreakdownRow label="= Resultado Final" value={formatCurrency(resultado)} variant="total" />
              </div>
            </BreakdownContainer>
          }
        />
      </div>
    </div>
  );
}
