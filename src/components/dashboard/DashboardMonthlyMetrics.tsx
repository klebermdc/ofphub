import { DollarSign, TrendingUp, Users, Megaphone, Briefcase, Receipt, Wallet, Target, CircleDollarSign } from "lucide-react";
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
        />
        <MetricCard
          title="Comissão Total"
          value={formatCurrency(totalComissaoTotal)}
          icon={TrendingUp}
          delay={50}
          variant="warning"
        />
        <MetricCard
          title="Comissão Vendedor"
          value={formatCurrency(totalComissao)}
          icon={TrendingUp}
          delay={75}
        />
        <MetricCard
          title="Ganho Bruto"
          value={formatCurrency(ganhoBruto)}
          icon={TrendingUp}
          delay={85}
          variant="success"
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
        />
        <MetricCard
          title="Marketing"
          value={formatCurrency(marketingCost)}
          icon={Megaphone}
          delay={85}
          variant="warning"
        />
        <MetricCard
          title="Custos Operacionais"
          value={formatCurrency(operationalCost)}
          icon={Briefcase}
          delay={95}
          variant="warning"
        />
        <MetricCard
          title="Imposto Estimado (12%)"
          value={formatCurrency(impostoEstimado)}
          icon={Receipt}
          delay={105}
          variant="warning"
        />
      </div>

      {/* Totais e Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Custo Total"
          value={formatCurrency(totalCost)}
          icon={Wallet}
          delay={115}
          variant="danger"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Target}
          delay={120}
          variant="info"
        />
        <MetricCard
          title="Resultado Parcial"
          value={formatCurrency(resultadoParcial)}
          icon={TrendingUp}
          delay={125}
          variant={resultadoParcial >= 0 ? "success" : "danger"}
        />
        <MetricCard
          title="Resultado Final"
          value={formatCurrency(resultado)}
          icon={CircleDollarSign}
          delay={130}
          variant={resultado >= 0 ? "success" : "danger"}
        />
      </div>
    </div>
  );
}
