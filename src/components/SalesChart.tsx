import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SalesRep } from '@/types/sales';

interface SalesChartProps {
  salesReps: SalesRep[];
}

const COLORS = [
  'hsl(187, 80%, 55%)',
  'hsl(262, 80%, 60%)',
  'hsl(142, 76%, 45%)',
  'hsl(38, 92%, 55%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 80%, 55%)',
  'hsl(320, 80%, 60%)',
  'hsl(60, 80%, 55%)',
  'hsl(280, 80%, 55%)',
  'hsl(160, 80%, 45%)',
  'hsl(20, 90%, 55%)',
];

export function SalesChart({ salesReps }: SalesChartProps) {
  const totalSales = salesReps.reduce((sum, rep) => sum + rep.sales, 0);
  
  const chartData = [...salesReps]
    .sort((a, b) => b.sales - a.sales)
    .map(rep => ({
      name: rep.name,
      vendas: rep.sales,
    }));

  const pieData = salesReps.map((rep) => ({
    name: rep.name,
    value: rep.sales,
    percentage: totalSales > 0 ? ((rep.sales / totalSales) * 100).toFixed(1) : 0,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Bar Chart - Vendas por Vendedor */}
      <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h3 className="text-lg font-semibold mb-6">Vendas por Vendedor</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={120}
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
                fill="hsl(187, 80%, 55%)"
                radius={[0, 4, 4, 0]}
                name="vendas"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart - Participação no Faturamento */}
      <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h3 className="text-lg font-semibold mb-6">Participação no Faturamento</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${props.payload.percentage}%)`,
                  props.payload.name
                ]}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
