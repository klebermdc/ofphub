import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EBITDACardProps {
  receita: number;
  custoOperacional: number;
}

export function EBITDACard({ receita, custoOperacional }: EBITDACardProps) {
  // EBITDA = Receita - Custos Operacionais (antes de impostos, depreciação e amortização)
  const ebitda = receita - custoOperacional;
  const margemEbitda = receita > 0 ? (ebitda / receita) * 100 : 0;
  const isPositive = ebitda >= 0;

  const formatCurrency = (value: number) => {
    return `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-slide-up",
      "bg-gradient-to-br border-2",
      isPositive 
        ? "dark:from-emerald-950/60 dark:via-emerald-900/40 dark:to-emerald-950/60 from-emerald-50 via-emerald-100/50 to-emerald-50 border-emerald-500/50 dark:border-emerald-500/50 border-emerald-300" 
        : "dark:from-red-950/60 dark:via-red-900/40 dark:to-red-950/60 from-red-50 via-red-100/50 to-red-50 border-red-500/50 dark:border-red-500/50 border-red-300"
    )}>
      {/* Background decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 rounded-full blur-3xl opacity-20",
        isPositive ? "bg-emerald-500" : "bg-red-500"
      )} />
      
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        {/* Main EBITDA Value */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl",
            isPositive ? "bg-emerald-500/20" : "bg-red-500/20"
          )}>
            <BarChart3 className={cn(
              "h-7 w-7 sm:h-8 sm:w-8",
              isPositive ? "dark:text-emerald-400 text-emerald-600" : "dark:text-red-400 text-red-600"
            )} />
          </div>
          <div>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">EBITDA</p>
            <div className="flex items-center gap-2 sm:gap-3">
              {!isPositive && <span className={cn("text-3xl sm:text-4xl lg:text-5xl font-bold", isPositive ? "dark:text-emerald-400 text-emerald-700" : "dark:text-red-400 text-red-700")}>-</span>}
              <span className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
                isPositive ? "dark:text-emerald-400 text-emerald-700" : "dark:text-red-400 text-red-700"
              )}>
                {formatCurrency(ebitda)}
              </span>
            </div>
          </div>
        </div>

        {/* Margin indicator */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex flex-col items-start lg:items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Margem EBITDA</span>
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
              )}
              <span className={cn(
                "text-xl sm:text-2xl font-bold",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {Math.abs(margemEbitda).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="hidden sm:flex flex-col gap-1 border-l border-border/30 pl-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Receita:</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(receita)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Custos Op.:</span>
              <span className="text-sm font-medium text-amber-500">-{formatCurrency(custoOperacional)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
