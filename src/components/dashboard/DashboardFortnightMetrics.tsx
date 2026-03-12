import { Calendar } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/utils/formatters";

interface FortnightMetricsProps {
  primeiraQuinzena: {
    comissaoTotal: number;
    ganhoBruto: number;
  };
  segundaQuinzena: {
    comissaoTotal: number;
    ganhoBruto: number;
  };
}

export function DashboardFortnightMetrics({
  primeiraQuinzena,
  segundaQuinzena,
}: FortnightMetricsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento por Quinzena</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="1ª Quinzena - Comissão Total"
          value={formatCurrency(primeiraQuinzena.comissaoTotal)}
          icon={Calendar}
          delay={175}
          variant="warning"
          formula="Soma das comissões totais dos pedidos com data entre dia 1 e 15 do mês"
        />
        <MetricCard
          title="1ª Quinzena - Ganho Bruto"
          value={formatCurrency(primeiraQuinzena.ganhoBruto)}
          icon={Calendar}
          delay={185}
          variant={primeiraQuinzena.ganhoBruto >= 0 ? "success" : "danger"}
          formula="Comissão Total (1ª quinzena) − Comissão Vendedor (1ª quinzena)
= Lucro bruto da empresa nos dias 1-15"
        />
        <MetricCard
          title="2ª Quinzena - Comissão Total"
          value={formatCurrency(segundaQuinzena.comissaoTotal)}
          icon={Calendar}
          delay={195}
          variant="warning"
          formula="Soma das comissões totais dos pedidos com data entre dia 16 e fim do mês"
        />
        <MetricCard
          title="2ª Quinzena - Ganho Bruto"
          value={formatCurrency(segundaQuinzena.ganhoBruto)}
          icon={Calendar}
          delay={200}
          variant={segundaQuinzena.ganhoBruto >= 0 ? "success" : "danger"}
          formula="Comissão Total (2ª quinzena) − Comissão Vendedor (2ª quinzena)
= Lucro bruto da empresa nos dias 16-31"
        />
      </div>
    </div>
  );
}
