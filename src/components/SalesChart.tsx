import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SalesRep } from '@/types/sales';

interface SalesChartProps {
  salesReps: SalesRep[];
}

export function SalesChart({ salesReps }: SalesChartProps) {
  const chartData = salesReps.map(rep => ({
    name: rep.name.split(' ')[0], // Use first name for chart
    vendas: rep.sales,
    comissao: rep.commission
  }));

  return (
    <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <h3 className="text-lg font-semibold mb-6">Vendas e Comissões por Vendedor</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
            <XAxis 
              type="number"
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 8%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 98%)'
              }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                name === 'vendas' ? 'Vendas' : 'Comissão'
              ]}
            />
            <Legend 
              formatter={(value) => value === 'vendas' ? 'Vendas' : 'Comissão'}
            />
            <Bar
              dataKey="vendas"
              fill="hsl(187, 80%, 55%)"
              radius={[0, 4, 4, 0]}
              name="vendas"
            />
            <Bar
              dataKey="comissao"
              fill="hsl(262, 80%, 60%)"
              radius={[0, 4, 4, 0]}
              name="comissao"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
