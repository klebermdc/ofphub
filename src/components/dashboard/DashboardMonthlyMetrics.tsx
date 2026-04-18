import { DollarSign, TrendingUp, Users, Megaphone, Briefcase, Receipt, Wallet, Target, CircleDollarSign, Percent } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/utils/formatters";

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
}: MonthlyMetricsProps) {
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
          formula="Soma de todas as vendas (valor de venda) de todos os vendedores no período"
        />
        <MetricCard
          title="Comissão Total"
          value={formatCurrency(totalComissaoTotal)}
          icon={TrendingUp}
          delay={50}
          variant="warning"
          formula="Soma de todas as comissões geradas por cada pedido (percentual aplicado sobre a venda)"
        />
        <MetricCard
          title="Comissão Vendedor"
          value={formatCurrency(totalComissao)}
          icon={TrendingUp}
          delay={75}
          formula="Soma das comissões pagas aos vendedores (parte do vendedor na comissão de cada pedido)"
        />
        <MetricCard
          title="Ganho Bruto"
          value={formatCurrency(ganhoBruto)}
          icon={TrendingUp}
          delay={85}
          variant="success"
          formula="Comissão Total − Comissão Vendedor
= Lucro bruto da empresa antes dos custos operacionais"
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
          formula="Soma dos salários fixos de todos os vendedores cadastrados"
        />
        <MetricCard
          title="Marketing"
          value={formatCurrency(marketingCost)}
          icon={Megaphone}
          delay={85}
          variant="warning"
          formula="Meta Ads + Google Ads (dados automáticos) + custos extras de marketing do período"
        />
        <MetricCard
          title="Custos Operacionais"
          value={formatCurrency(operationalCost)}
          icon={Briefcase}
          delay={95}
          variant="warning"
          formula="Software + Telefonia cadastrados para o período"
        />
        <MetricCard
          title="Imposto Estimado (12%)"
          value={formatCurrency(impostoEstimado)}
          icon={Receipt}
          delay={105}
          variant="warning"
          formula="Comissão Total × 12%
= Estimativa de imposto sobre a receita de comissões"
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
          formula="Comissão Vendedor + Salários + Marketing + Custos Operacionais + Imposto Estimado
= Soma de todos os custos da operação"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Target}
          delay={120}
          variant="info"
          formula="Faturamento Total ÷ Número de Pedidos
= Valor médio por pedido"
        />
        <MetricCard
          title="Comissão Média %"
          value={`${(taxaMedia || 0).toFixed(2)}%`}
          icon={Percent}
          delay={122}
          variant="info"
          formula="Média das porcentagens de comissão de todos os vendedores ativos no período"
        />
        <MetricCard
          title="Resultado Parcial"
          value={formatCurrency(resultadoParcial)}
          icon={TrendingUp}
          delay={125}
          variant={resultadoParcial >= 0 ? "success" : "danger"}
          formula="Ganho Bruto − (Custos Fixos Proporcionais + Gasto Real de Ads acumulado + Imposto 12% sobre Comissão Total)
= Lucro real do período até hoje, alinhado com a lógica do Resultado do Dia"
        />
        <MetricCard
          title="Resultado Final"
          value={formatCurrency(resultado)}
          icon={CircleDollarSign}
          delay={130}
          variant={resultado >= 0 ? "success" : "danger"}
          formula="Comissão Total − Custo Total
= Comissão Total − (Comissão Vendedor + Salários + Marketing + Custos Op. + Imposto 12%)"
        />
      </div>
    </div>
  );
}
