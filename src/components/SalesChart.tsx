import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', vendas: 4000, comissao: 400 },
  { month: 'Fev', vendas: 3000, comissao: 300 },
  { month: 'Mar', vendas: 5000, comissao: 500 },
  { month: 'Abr', vendas: 4500, comissao: 450 },
  { month: 'Mai', vendas: 6000, comissao: 600 },
  { month: 'Jun', vendas: 5500, comissao: 550 },
];

export function SalesChart() {
  return (
    <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <h3 className="text-lg font-semibold mb-6">Evolução de Vendas e Comissões</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187, 80%, 55%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(187, 80%, 55%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorComissao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262, 80%, 60%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(262, 80%, 60%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 8%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 98%)'
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="hsl(187, 80%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVendas)"
              name="Vendas"
            />
            <Area
              type="monotone"
              dataKey="comissao"
              stroke="hsl(262, 80%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorComissao)"
              name="Comissão"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
