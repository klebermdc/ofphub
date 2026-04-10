import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SalesRep } from '@/types/sales';
import { useAuth } from '@/hooks/useAuth';
import { useSalespersonSalaries } from '@/hooks/useSalespersonSalaries';

interface RevenueWaterfallChartProps {
  salesReps: SalesRep[];
  currentMonth: string;
}

export function RevenueWaterfallChart({ salesReps, currentMonth }: RevenueWaterfallChartProps) {
  const { user } = useAuth();
  const { salaries } = useSalespersonSalaries(user?.id);
  const [gastoAds, setGastoAds] = useState(0);

  useEffect(() => {
    if (!currentMonth || currentMonth === 'all') return;
    const [year, month] = currentMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    supabase
      .from('marketing_daily_stats')
      .select('meta_spend, google_spend')
      .gte('date', startDate)
      .lte('date', endDate)
      .then(({ data }) => {
        if (data) {
          setGastoAds(data.reduce((sum, d) => sum + Number(d.meta_spend || 0) + Number(d.google_spend || 0), 0));
        }
      });
  }, [currentMonth]);

  const gastoSalarios = useMemo(() => 
    salaries.reduce((sum, s) => sum + s.salary, 0), [salaries]);

  const { faturamento, comissaoTotal, resultado, chartData } = useMemo(() => {
    const fat = salesReps.reduce((sum, rep) => sum + rep.sales, 0);
    const com = salesReps.reduce((sum, rep) => sum + rep.orders.reduce((s, o) => s + (o.comissaoTotal || 0), 0), 0);
    const res = fat - com - gastoAds - gastoSalarios;

    // Waterfall: each bar has a hidden base + visible portion
    const data = [
      { name: 'Faturamento', value: fat, base: 0, fill: 'hsl(var(--chart-2))' },
      { name: 'Comissões', value: com, base: fat - com, fill: 'hsl(var(--destructive))' },
      { name: 'Marketing', value: gastoAds, base: fat - com - gastoAds, fill: 'hsl(var(--destructive))' },
      { name: 'Salários', value: gastoSalarios, base: fat - com - gastoAds - gastoSalarios, fill: 'hsl(var(--destructive))' },
      { name: 'Resultado', value: Math.abs(res), base: res >= 0 ? 0 : res, fill: res >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))' },
    ];

    return { faturamento: fat, comissaoTotal: com, resultado: res, chartData: data };
  }, [salesReps, gastoAds, gastoSalarios]);

  const margem = faturamento > 0 ? (resultado / faturamento) * 100 : 0;
  const margemColor = margem > 30 ? 'text-emerald-400' : margem >= 15 ? 'text-yellow-400' : 'text-destructive';

  if (currentMonth === 'all') return null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" />
          Waterfall de Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={90}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(Math.abs(value)), '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              {/* Hidden base bar */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              {/* Visible portion */}
              <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} label={({ x, y, width, index }: any) => {
                const entry = chartData[index];
                if (!entry) return null;
                const displayValue = entry.name === 'Faturamento' || entry.name === 'Resultado' ? entry.value : entry.value;
                return (
                  <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11} fontWeight={600}>
                    {formatCurrency(displayValue)}
                  </text>
                );
              }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Margem:</span>
          <span className={`font-bold ${margemColor}`}>{margem.toFixed(1)}%</span>
          <span className="text-muted-foreground">
            ({formatCurrency(resultado)})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
