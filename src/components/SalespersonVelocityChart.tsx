import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Gauge, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SalesRep } from '@/types/sales';

interface SalespersonVelocityChartProps {
  userId: string;
  month: number;
  year: number;
  salesReps: SalesRep[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function getBusinessDaysInMonth(m: number, y: number): number {
  let bd = 0;
  const days = new Date(y, m, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) bd++;
  }
  return bd;
}

function getBusinessDaysElapsed(m: number, y: number): number {
  const now = new Date();
  if (now.getMonth() + 1 !== m || now.getFullYear() !== y) {
    return now.getMonth() + 1 > m || now.getFullYear() > y
      ? getBusinessDaysInMonth(m, y)
      : 0;
  }
  let bd = 0;
  for (let d = 1; d <= now.getDate(); d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) bd++;
  }
  return bd;
}

export function SalespersonVelocityChart({ userId, month, year, salesReps }: SalespersonVelocityChartProps) {
  const [goals, setGoals] = useState<Record<string, number>>({});

  useEffect(() => {
    loadGoals();
  }, [userId, month, year]);

  const loadGoals = async () => {
    try {
      const { data } = await supabase
        .from('salesperson_goals')
        .select('salesperson_name, goal_vendas')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach(g => { map[g.salesperson_name] = g.goal_vendas; });
        setGoals(map);
      }
    } catch { /* ignore */ }
  };

  const totalBD = getBusinessDaysInMonth(month, year);
  const elapsedBD = getBusinessDaysElapsed(month, year);

  const chartData = useMemo(() => {
    if (elapsedBD === 0) return [];

    return salesReps
      .filter(rep => rep.sales > 0 && goals[rep.name])
      .map(rep => {
        const goal = goals[rep.name] || 0;
        const dailyRate = rep.sales / elapsedBD;
        const projected = dailyRate * totalBD;
        const diff = projected - goal;
        const willHit = projected >= goal;

        return {
          name: rep.name.split(' ')[0],
          fullName: rep.name,
          projecao: Math.round(projected),
          meta: goal,
          diff: Math.round(diff),
          willHit,
          percent: goal > 0 ? Math.round((projected / goal) * 100) : 0,
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [salesReps, goals, elapsedBD, totalBD]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-4 sm:p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="h-5 w-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">Velocidade p/ Meta</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {elapsedBD}/{totalBD} dias úteis
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR')}`,
                name === 'projecao' ? 'Projeção' : 'Meta',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.name === label);
                if (!item) return label;
                return `${item.fullName} — ${item.percent}% da meta`;
              }}
            />
            <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.2} radius={[0, 6, 6, 0]} barSize={16} />
            <Bar dataKey="projecao" name="Projeção" radius={[0, 6, 6, 0]} barSize={16}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.willHit ? 'hsl(142, 76%, 45%)' : 'hsl(0, 84%, 60%)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold text-green-500">
              {chartData.filter(d => d.willHit).length}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">vão bater a meta</span>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-500">
              {chartData.filter(d => !d.willHit).length}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">abaixo do ritmo</span>
        </div>
      </div>
    </div>
  );
}
