import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SalesRep } from '@/types/sales';
import { useMemo } from 'react';

interface SupplierChartProps {
  salesReps: SalesRep[];
}

export function SupplierChart({ salesReps }: SupplierChartProps) {
  const chartData = useMemo(() => {
    const supplierSales: Record<string, number> = {};
    
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        const supplier = order.fornecedor || 'Outros';
        supplierSales[supplier] = (supplierSales[supplier] || 0) + order.venda;
      });
    });

    return Object.entries(supplierSales)
      .map(([name, vendas]) => ({ name, vendas }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);
  }, [salesReps]);

  if (chartData.length === 0) {
    return (
      <div className="glass rounded-xl p-6 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Vendas por Fornecedor</h3>
        <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Vendas por Fornecedor (Top 10)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
            <XAxis 
              type="number"
              stroke="hsl(215, 20%, 55%)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="hsl(215, 20%, 55%)" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 8%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 98%)'
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                'Vendas'
              ]}
            />
            <Bar
              dataKey="vendas"
              fill="hsl(142, 70%, 45%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}