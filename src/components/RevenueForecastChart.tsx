import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RevenueForecastChartProps {
  salesReps: SalesRep[];
  currentMonth: string;
  monthlyGoal?: number;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function RevenueForecastChart({ salesReps, currentMonth, monthlyGoal = 0 }: RevenueForecastChartProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === m && now.getFullYear() === y;
  const totalDays = getDaysInMonth(m, y);
  const today = isCurrentMonth ? now.getDate() : totalDays;

  const computed = useMemo(() => {
    // Daily sales map
    const dailySales: Record<number, number> = {};
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (!order.data) return;
        const parts = order.data.split('/');
        if (parts.length >= 3) {
          const oDay = parseInt(parts[0]);
          const oMonth = parseInt(parts[1]);
          let oYear = parseInt(parts[2]);
          if (oYear < 100) oYear += 2000;
          if (oMonth === m && oYear === y) {
            dailySales[oDay] = (dailySales[oDay] || 0) + order.venda;
          }
        }
      });
    });

    // Build cumulative + daily array
    let cumulative = 0;
    const dailyValues: number[] = [];
    const cumulativeByDay: number[] = [];
    for (let d = 1; d <= today; d++) {
      const val = dailySales[d] || 0;
      cumulative += val;
      dailyValues.push(val);
      cumulativeByDay.push(cumulative);
    }

    // Weighted average of last 7 days (recent days weigh more)
    const last7 = dailyValues.slice(-7);
    let weightedSum = 0;
    let weightTotal = 0;
    last7.forEach((v, i) => {
      const w = i + 1; // 1..7, last element = highest weight
      weightedSum += v * w;
      weightTotal += w;
    });
    const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;

    // Trend: avg last 3 vs avg last 7
    const last3 = dailyValues.slice(-3);
    const avg3 = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;
    const avg7 = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const accelerating = avg3 > avg7;

    // Projection from today using weighted average
    const projectedTotal = cumulative + weightedAvg * (totalDays - today);

    // Chart data
    const chartData: Record<string, any>[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const entry: Record<string, any> = {
        day,
        label: `${day}`,
        meta: (monthlyGoal / totalDays) * day,
      };
      if (day <= today) {
        entry.realizado = cumulativeByDay[day - 1];
      }
      if (day >= today) {
        const base = day === today ? cumulative : cumulative + weightedAvg * (day - today);
        entry.projecao = base;
        entry.otimista = base * 1.15;
        entry.pessimista = base * 0.85;
      }
      chartData.push(entry);
    }

    // Days to hit goal
    let daysToGoal: number | null = null;
    if (weightedAvg > 0 && monthlyGoal > 0 && cumulative < monthlyGoal) {
      const remaining = monthlyGoal - cumulative;
      const dNeeded = Math.ceil(remaining / weightedAvg);
      daysToGoal = dNeeded;
    } else if (cumulative >= monthlyGoal && monthlyGoal > 0) {
      daysToGoal = 0;
    }

    const projPct = monthlyGoal > 0 ? (projectedTotal / monthlyGoal) * 100 : 0;
    const projVsGoal = monthlyGoal > 0 ? ((projectedTotal - monthlyGoal) / monthlyGoal) * 100 : 0;

    return {
      chartData,
      projectedTotal,
      projVsGoal,
      projPct,
      weightedAvg,
      avg7,
      accelerating,
      daysToGoal,
      cumulative,
    };
  }, [salesReps, currentMonth, monthlyGoal, today, totalDays, m, y]);

  const { chartData, projectedTotal, projVsGoal, projPct, weightedAvg, avg7, accelerating, daysToGoal, cumulative } = computed;

  const badgeVariant = projPct > 100 ? "default" : projPct >= 80 ? "secondary" : "destructive";
  const badgeLabel = projPct > 100 ? "No ritmo" : projPct >= 80 ? "Atenção" : "Abaixo";

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tendência do Mês - {monthNames[m - 1]}</h3>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Projeção por média ponderada dos últimos 7 dias ({formatCurrency(weightedAvg)}/dia)</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          <Badge variant={badgeVariant} className="ml-1 text-[10px]">{badgeLabel}</Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Projeção vs Meta</p>
          <p className={`text-lg font-bold ${projVsGoal >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
            {projVsGoal >= 0 ? '+' : ''}{projVsGoal.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval={4}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  realizado: 'Realizado',
                  projecao: 'Projeção',
                  meta: 'Meta',
                  otimista: 'Otimista',
                  pessimista: 'Pessimista',
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelFormatter={(label) => {
                const day = parseInt(label);
                const pctMeta = monthlyGoal > 0
                  ? ((day <= today ? (chartData[day - 1]?.realizado || 0) : (chartData[day - 1]?.projecao || 0)) / monthlyGoal * 100).toFixed(1)
                  : '0';
                return `Dia ${label}/${totalDays} • ${pctMeta}% da meta`;
              }}
            />
            {/* Área sombreada entre otimista e pessimista */}
            <Area
              type="monotone"
              dataKey="otimista"
              stroke="none"
              fill="hsl(var(--success))"
              fillOpacity={0.07}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="pessimista"
              stroke="none"
              fill="hsl(var(--background))"
              fillOpacity={1}
              connectNulls
            />
            {/* Linha Amarela - Meta */}
            <Line type="monotone" dataKey="meta" stroke="#eab308" strokeWidth={2} dot={false} name="meta" />
            {/* Linha Vermelha - Realizado */}
            <Line type="monotone" dataKey="realizado" stroke="#ef4444" strokeWidth={2.5} dot={false} name="realizado" connectNulls={false} />
            {/* Linha Verde - Projeção */}
            <Line type="monotone" dataKey="projecao" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="projecao" connectNulls />
            {/* Otimista tracejada */}
            <Line type="monotone" dataKey="otimista" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 4" dot={false} name="otimista" connectNulls />
            {/* Pessimista tracejada */}
            <Line type="monotone" dataKey="pessimista" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 4" dot={false} name="pessimista" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-red-500 rounded" />
          <span>Realizado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: 'repeating-linear-gradient(90deg, #22c55e, #22c55e 3px, transparent 3px, transparent 6px)' }} />
          <span>Projeção</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-yellow-500 rounded" />
          <span>Meta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded opacity-50" style={{ background: 'repeating-linear-gradient(90deg, #22c55e, #22c55e 2px, transparent 2px, transparent 5px)' }} />
          <span>Otimista/Pessimista</span>
        </div>
      </div>

      {/* Footer metrics */}
      <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span>Média 7d: <strong className="text-foreground">{formatCurrency(avg7)}/dia</strong></span>
          <span className="flex items-center gap-1">
            Tendência:
            {accelerating ? (
              <span className="text-[hsl(var(--success))] font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> acelerando
              </span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" /> desacelerando
              </span>
            )}
          </span>
          {daysToGoal !== null && (
            <span>
              {daysToGoal === 0
                ? <strong className="text-[hsl(var(--success))]">Meta atingida! ✓</strong>
                : <>Dias p/ meta: <strong className="text-foreground">{daysToGoal} dias</strong></>
              }
            </span>
          )}
        </div>
        <span>
          Projeção: <strong className="text-foreground">{formatCurrency(projectedTotal)}</strong> | Meta: <strong className="text-foreground">{formatCurrency(monthlyGoal)}</strong>
        </span>
      </div>
    </div>
  );
}
