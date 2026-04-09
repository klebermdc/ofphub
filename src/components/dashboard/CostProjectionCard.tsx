import { Calculator, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface CostProjectionCardProps {
  totalCostSoFar: number;
  projectedTotalCost: number;
  dailyAvgCost: number;
  daysElapsed: number;
  daysInMonth: number;
  threshold?: number;
}

export function CostProjectionCard({
  totalCostSoFar,
  projectedTotalCost,
  dailyAvgCost,
  daysElapsed,
  daysInMonth,
  threshold = 50000,
}: CostProjectionCardProps) {
  const progressPct = Math.min((totalCostSoFar / (projectedTotalCost || 1)) * 100, 100);
  const isOver = projectedTotalCost > threshold;

  return (
    <div className={`glass rounded-xl p-4 ${isOver ? 'border border-destructive/50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Projeção de Custos Mensal</span>
        </div>
        {isOver && (
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Acima de {formatCurrency(threshold)}</span>
          </div>
        )}
      </div>

      <div className="w-full bg-muted rounded-full h-3 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Gasto até agora</p>
          <p className="text-sm font-bold">{formatCurrency(totalCostSoFar)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Projeção</p>
          <p className={`text-sm font-bold ${isOver ? 'text-destructive' : ''}`}>
            ~{formatCurrency(projectedTotalCost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Média/dia</p>
          <p className="text-sm font-bold">{formatCurrency(dailyAvgCost)}/dia</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {daysElapsed} de {daysInMonth} dias no mês • Inclui: Comissões + Salários + Marketing + Custos Op. + Imposto
      </p>
    </div>
  );
}
