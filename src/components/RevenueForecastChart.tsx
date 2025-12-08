import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Info } from "lucide-react";
import { SalesRep } from "@/types/sales";
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

export function RevenueForecastChart({ salesReps, currentMonth, monthlyGoal = 0 }: RevenueForecastChartProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === m && now.getFullYear() === y;
  const totalDays = getDaysInMonth(m, y);
  // Se for o mês atual, mostra até hoje; se for mês passado, mostra o mês completo
  const today = isCurrentMonth ? now.getDate() : totalDays;
  
  // Calculate daily sales for the current month
  const dailySales: { [day: number]: number } = {};
  
  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.data) return;
      const parts = order.data.split('/');
      if (parts.length >= 3) {
        const orderDay = parseInt(parts[0]);
        const orderMonth = parseInt(parts[1]);
        let orderYear = parseInt(parts[2]);
        if (orderYear < 100) orderYear += 2000;
        
        if (orderMonth === m && orderYear === y) {
          dailySales[orderDay] = (dailySales[orderDay] || 0) + order.venda;
        }
      }
    });
  });

  // Build cumulative data up to today
  let cumulative = 0;
  const chartData: { day: number; label: string; realizado: number; meta: number; projecao?: number }[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    if (day <= today) {
      cumulative += dailySales[day] || 0;
      chartData.push({
        day,
        label: `${day}`,
        realizado: cumulative,
        meta: (monthlyGoal / totalDays) * day,
        projecao: undefined
      });
    } else {
      chartData.push({
        day,
        label: `${day}`,
        realizado: 0,
        meta: (monthlyGoal / totalDays) * day,
        projecao: undefined
      });
    }
  }

  // Calculate projection based on current pace
  const dailyAverage = today > 0 ? cumulative / today : 0;
  
  // Add projection line from today to end of month
  for (let i = 0; i < chartData.length; i++) {
    const day = chartData[i].day;
    if (day >= today) {
      chartData[i].projecao = dailyAverage * day;
    }
  }
  // Also set projection at today
  if (today > 0 && today <= totalDays) {
    const todayIndex = today - 1;
    chartData[todayIndex].projecao = cumulative;
  }

  // Calculate projected end of month
  const projectedTotal = dailyAverage * totalDays;
  const projectedVsGoal = monthlyGoal > 0 ? ((projectedTotal - monthlyGoal) / monthlyGoal) * 100 : 0;

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
                <p>Projeção baseada na média diária atual ({formatCurrency(dailyAverage)}/dia)</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Projeção vs Meta</p>
          <p className={`text-lg font-bold ${projectedVsGoal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {projectedVsGoal >= 0 ? '+' : ''}{projectedVsGoal.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'realizado' ? 'Realizado' : name === 'projecao' ? 'Projeção' : 'Meta'
              ]}
              labelFormatter={(label) => `Dia ${label}`}
            />
            {/* Linha Vermelha - Realizado */}
            <Line
              type="monotone"
              dataKey="realizado"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="realizado"
              connectNulls={false}
            />
            {/* Linha Verde - Projeção */}
            <Line
              type="monotone"
              dataKey="projecao"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="projecao"
              connectNulls
            />
            {/* Linha Amarela - Meta */}
            <Line
              type="monotone"
              dataKey="meta"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              name="meta"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 rounded" />
            <span>Realizado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ background: 'repeating-linear-gradient(90deg, #22c55e, #22c55e 3px, transparent 3px, transparent 6px)' }} />
            <span>Projeção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-yellow-500 rounded" />
            <span>Meta</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Projeção: {formatCurrency(projectedTotal)} | Meta: {formatCurrency(monthlyGoal)}
        </div>
      </div>
    </div>
  );
}