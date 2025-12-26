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
      />
      <MetricCard
        title="Pedidos"
        value={String(totalNegocios)}
        icon={Package}
        delay={200}
      />
      <MetricCard
        title="Leads"
        value={String(totalLeads)}
        icon={UserPlus}
        delay={225}
      />
      <MetricCard
        title="Taxa de Conversão"
        value={formatPercentage(conversionRate)}
        icon={Percent}
        delay={250}
        variant={conversionRate >= 10 ? "success" : conversionRate >= 5 ? "warning" : "danger"}
      />
    </div>
  );
}
