import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SalesRep } from '@/types/sales';

interface SalespersonGoalChartProps {
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

export function SalespersonGoalChart({ userId, month, year, salesReps }: SalespersonGoalChartProps) {
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

  const chartData = useMemo(() => {
    return salesReps
      .filter(rep => rep.sales > 0 || goals[rep.name])
      .map(rep => ({
        name: rep.name.split(' ')[0],
        fullName: rep.name,
        vendas: rep.sales,
        meta: goals[rep.name] || 0,
        percent: goals[rep.name] ? (rep.sales / goals[rep.name]) * 100 : 0,
      }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [salesReps, goals]);

  if (chartData.length === 0) return null;

  const getBarColor = (percent: number) => {
    if (percent >= 100) return 'hsl(142, 76%, 45%)';
    if (percent >= 70) return 'hsl(38, 92%, 55%)';
    if (percent >= 40) return 'hsl(var(--primary))';
    return 'hsl(0, 84%, 60%)';
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">Meta por Vendedor</h3>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={70} 
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} 
            />
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.name === label);
                return item ? `${item.fullName} (${item.percent.toFixed(0)}% da meta)` : label;
              }}
            />
            <Bar dataKey="vendas" name="Vendas" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.percent)} />
              ))}
            </Bar>
            <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.25} radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 45%)' }} />
          <span>≥100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(38, 92%, 55%)' }} />
          <span>70-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary))' }} />
          <span>40-69%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
          <span>&lt;40%</span>
        </div>
      </div>
    </div>
  );
}
