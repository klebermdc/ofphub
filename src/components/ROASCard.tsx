import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep } from "@/types/sales";
import { parseOrderDate } from "@/utils/dateUtils";

interface ROASCardProps {
  salesReps: SalesRep[];
  currentMonth: string; // "MM/YYYY"
}

export function ROASCard({ salesReps, currentMonth }: ROASCardProps) {
  const [totalAdSpend, setTotalAdSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse month/year
  const parts = currentMonth.split("/");
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);

  // Calculate revenue from salesReps filtered by month
  const faturamento = salesReps.reduce((acc, rep) => {
    const filtered = (rep.orders || []).filter(o => {
      const d = parseOrderDate(o.data);
      return d && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    return acc + filtered.reduce((s, o) => s + (o.venda || 0), 0);
  }, 0);

  useEffect(() => {
    const fetchAdSpend = async () => {
      setLoading(true);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("marketing_daily_stats")
        .select("meta_spend, google_spend")
        .gte("date", startDate)
        .lt("date", endDate);

      if (!error && data && data.length > 0) {
        const total = data.reduce((s, d) => s + Number(d.meta_spend || 0) + Number(d.google_spend || 0), 0);
        setTotalAdSpend(total);
      } else {
        setTotalAdSpend(null);
      }
      setLoading(false);
    };
    fetchAdSpend();
  }, [month, year]);

  const hasData = totalAdSpend !== null && totalAdSpend > 0;
  const roas = hasData ? faturamento / totalAdSpend! : 0;
  const roiPercent = hasData ? ((faturamento - totalAdSpend!) / totalAdSpend!) * 100 : 0;

  const getColor = () => {
    if (!hasData) return "muted";
    if (roas >= 5) return "green";
    if (roas >= 3) return "yellow";
    return "red";
  };
  const color = getColor();

  const colorClasses = {
    green: {
      bg: "dark:from-emerald-950/60 dark:via-emerald-900/40 dark:to-emerald-950/60 from-emerald-50 via-emerald-100/50 to-emerald-50 border-emerald-500/50 dark:border-emerald-500/50 border-emerald-300",
      blob: "bg-emerald-500",
      icon: "dark:text-emerald-400 text-emerald-600",
      text: "dark:text-emerald-400 text-emerald-700",
      iconBg: "bg-emerald-500/20",
    },
    yellow: {
      bg: "dark:from-amber-950/60 dark:via-amber-900/40 dark:to-amber-950/60 from-amber-50 via-amber-100/50 to-amber-50 border-amber-500/50 dark:border-amber-500/50 border-amber-300",
      blob: "bg-amber-500",
      icon: "dark:text-amber-400 text-amber-600",
      text: "dark:text-amber-400 text-amber-700",
      iconBg: "bg-amber-500/20",
    },
    red: {
      bg: "dark:from-red-950/60 dark:via-red-900/40 dark:to-red-950/60 from-red-50 via-red-100/50 to-red-50 border-red-500/50 dark:border-red-500/50 border-red-300",
      blob: "bg-red-500",
      icon: "dark:text-red-400 text-red-600",
      text: "dark:text-red-400 text-red-700",
      iconBg: "bg-red-500/20",
    },
    muted: {
      bg: "dark:from-muted/60 dark:via-muted/40 dark:to-muted/60 from-muted/50 via-muted/30 to-muted/50 border-border",
      blob: "bg-muted-foreground",
      icon: "text-muted-foreground",
      text: "text-muted-foreground",
      iconBg: "bg-muted",
    },
  };

  const c = colorClasses[color];

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-pulse bg-muted/30 border-2 border-border h-36" />
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-slide-up",
      "bg-gradient-to-br border-2",
      c.bg
    )}>
      <div className={cn("absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 rounded-full blur-3xl opacity-20", c.blob)} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={cn("flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl", c.iconBg)}>
            <BarChart3 className={cn("h-7 w-7 sm:h-8 sm:w-8", c.icon)} />
          </div>
          <div>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">ROAS & ROI</p>
            {hasData ? (
              <>
                <span className={cn("text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight", c.text)}>
                  {roas.toFixed(1)}x
                </span>
              </>
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">Sem dados de ads</span>
            )}
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex flex-col items-start lg:items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">ROI</span>
              <div className="flex items-center gap-1.5">
                {roiPercent >= 0 ? (
                  <TrendingUp className={cn("h-4 w-4 sm:h-5 sm:w-5", c.icon)} />
                ) : (
                  <TrendingDown className={cn("h-4 w-4 sm:h-5 sm:w-5", c.icon)} />
                )}
                <span className={cn("text-xl sm:text-2xl font-bold", c.text)}>
                  {roiPercent >= 0 ? "+" : ""}{roiPercent.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="hidden sm:flex flex-col gap-1 border-l border-border/30 pl-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Faturamento:</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(faturamento)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ads:</span>
                <span className="text-sm font-medium text-amber-500">{formatCurrency(totalAdSpend!)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
