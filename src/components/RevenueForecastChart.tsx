import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Info } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RevenueForecastChartProps {
  salesReps: SalesRep[];
  availableMonths: string[];
  monthlyGoal?: number;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthLabel(monthStr: string): string {
  const [m, y] = monthStr.split('/');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(m) - 1]}/${y.slice(-2)}`;
}

export function RevenueForecastChart({ salesReps, availableMonths, monthlyGoal = 0 }: RevenueForecastChartProps) {
  // Get current month to exclude from regression (incomplete data)
  const now = new Date();
  const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  // Sort months chronologically
  const sortedMonths = [...availableMonths].sort((a, b) => {
    const [mA, yA] = a.split('/').map(Number);
    const [mB, yB] = b.split('/').map(Number);
    return yA - yB || mA - mB;
  });

  // Calculate revenue per month
  const monthlyData = sortedMonths.map(month => {
    let revenue = 0;
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (!order.data) return;
        const parts = order.data.split('/');
        if (parts.length >= 2) {
          const m = parts[1].padStart(2, '0');
          let y = parts[2] || new Date().getFullYear().toString();
          if (y.length === 2) y = `20${y}`;
          if (`${m}/${y}` === month) {
            revenue += order.venda;
          }
        }
      });
    });
    return { month, label: getMonthLabel(month), revenue, isCurrentMonth: month === currentMonthStr };
  });

  // Filter only completed months for regression calculation
  const completedMonthsData = monthlyData.filter(d => !d.isCurrentMonth);
  const n = completedMonthsData.length;
  
  if (n < 2) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Projeção de Faturamento</h3>
        </div>
        <p className="text-muted-foreground text-sm">Dados insuficientes para projeção (mínimo 2 meses completos).</p>
      </div>
    );
  }

  // Calculate linear regression using only completed months
  const xValues = completedMonthsData.map((_, i) => i);
  const yValues = completedMonthsData.map(d => d.revenue);
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Build chart data with completed months first
  const chartData = completedMonthsData.map((d, i) => ({
    ...d,
    trend: intercept + slope * i,
    meta: monthlyGoal,
    isForecast: false
  }));

  // Generate forecast for current month + next 3 months
  const forecastMonths = 4;
  const lastCompletedMonth = completedMonthsData[completedMonthsData.length - 1];
  const [lastM, lastY] = lastCompletedMonth.month.split('/').map(Number);
  
  for (let i = 1; i <= forecastMonths; i++) {
    let newMonth = lastM + i;
    let newYear = lastY;
    while (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }
    const monthStr = `${String(newMonth).padStart(2, '0')}/${newYear}`;
    const forecastValue = intercept + slope * (n - 1 + i);
    
    const currentMonthData = monthlyData.find(d => d.month === monthStr && d.isCurrentMonth);
    
    chartData.push({
      month: monthStr,
      label: getMonthLabel(monthStr),
      revenue: currentMonthData?.revenue || 0,
      trend: Math.max(0, forecastValue),
      meta: monthlyGoal,
      isForecast: true,
      isCurrentMonth: monthStr === currentMonthStr
    });
  }

  // Calculate projected growth based on completed months only
  const lastRealRevenue = completedMonthsData[completedMonthsData.length - 1].revenue;
  const projectedRevenue = chartData[chartData.length - 1].trend;
  const projectedGrowth = lastRealRevenue > 0 ? ((projectedRevenue - lastRealRevenue) / lastRealRevenue) * 100 : 0;

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Projeção de Faturamento</h3>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Projeção baseada em regressão linear dos últimos {n} meses completos</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Projeção 3 meses</p>
          <p className={`text-lg font-bold ${projectedGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {projectedGrowth >= 0 ? '+' : ''}{projectedGrowth.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="label" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
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
                name === 'revenue' ? 'Realizado' : name === 'trend' ? 'Projeção' : 'Meta'
              ]}
            />
            {/* Linha Vermelha - Realizado */}
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              name="revenue"
            />
            {/* Linha Verde - Projeção */}
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#22c55e', r: 3 }}
              name="trend"
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

      <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
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
    </div>
  );
}