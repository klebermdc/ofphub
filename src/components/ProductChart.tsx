import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SalesRep } from '@/types/sales';
import { useMemo } from 'react';

interface ProductChartProps {
  salesReps: SalesRep[];
}

export function ProductChart({ salesReps }: ProductChartProps) {
  const chartData = useMemo(() => {
    const productSales: Record<string, number> = {};
    
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        const product = order.produto || 'Outros';
        productSales[product] = (productSales[product] || 0) + order.venda;
      });
    });

    return Object.entries(productSales)
      .map(([name, vendas]) => ({ name, vendas }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);
  }, [salesReps]);

  if (chartData.length === 0) {
    return (
      <div className="glass rounded-xl p-6 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Vendas por Produto</h3>
        <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Vendas por Produto (Top 10)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                'Vendas'
              ]}
            />
            <Bar
              dataKey="vendas"
              fill="hsl(32, 95%, 55%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
