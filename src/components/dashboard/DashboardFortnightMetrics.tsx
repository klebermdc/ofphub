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
        />
        <MetricCard
          title="1ª Quinzena - Ganho Bruto"
          value={formatCurrency(primeiraQuinzena.ganhoBruto)}
          icon={Calendar}
          delay={185}
          variant={primeiraQuinzena.ganhoBruto >= 0 ? "success" : "danger"}
        />
        <MetricCard
          title="2ª Quinzena - Comissão Total"
          value={formatCurrency(segundaQuinzena.comissaoTotal)}
          icon={Calendar}
          delay={195}
          variant="warning"
        />
        <MetricCard
          title="2ª Quinzena - Ganho Bruto"
          value={formatCurrency(segundaQuinzena.ganhoBruto)}
          icon={Calendar}
          delay={200}
          variant={segundaQuinzena.ganhoBruto >= 0 ? "success" : "danger"}
        />
      </div>
    </div>
  );
}
