import { Users, Package, UserPlus, Percent } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatPercentage } from "@/utils/formatters";

interface OperationalMetricsProps {
  vendedoresAtivos: number;
  totalNegocios: number;
  totalLeads: number;
  conversionRate: number;
}

export function DashboardOperationalMetrics({
  vendedoresAtivos,
  totalNegocios,
  totalLeads,
  conversionRate,
}: OperationalMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Vendedores"
        value={String(vendedoresAtivos)}
        icon={Users}
        delay={150}
        formula="Quantidade de vendedores com pelo menos 1 pedido no período"
      />
      <MetricCard
        title="Pedidos"
        value={String(totalNegocios)}
        icon={Package}
        delay={200}
        formula="Total de pedidos registrados no período selecionado"
      />
      <MetricCard
        title="Leads"
        value={String(totalLeads)}
        icon={UserPlus}
        delay={225}
        formula="Total de leads cadastrados na planilha de leads do período"
      />
      <MetricCard
        title="Taxa de Conversão"
        value={formatPercentage(conversionRate)}
        icon={Percent}
        delay={250}
        variant={conversionRate >= 10 ? "success" : conversionRate >= 5 ? "warning" : "danger"}
        formula="(Pedidos ÷ Leads) × 100
= Percentual de leads que se tornaram pedidos"
      />
    </div>
  );
}
