import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { LeadsBySource } from "@/hooks/useLeadsData";

interface LeadsBySourceChartProps {
  data: LeadsBySource[];
}

const COLORS: { [key: string]: string } = {
  'Google Ads': 'hsl(217, 91%, 60%)',
  'Meta Ads': 'hsl(270, 70%, 60%)',
  'Orgânico': 'hsl(142, 71%, 45%)',
  'Direto': 'hsl(45, 93%, 47%)',
  'Referência': 'hsl(199, 89%, 48%)',
  'Email': 'hsl(340, 82%, 52%)',
  'Outros': 'hsl(0, 0%, 60%)',
};

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  const chartData = data.map(item => ({
    name: item.source,
    value: item.count,
    color: COLORS[item.source] || COLORS['Outros'],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground">
        Nenhum dado de leads disponível
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [
              `${value} leads (${((value / total) * 100).toFixed(1)}%)`,
              ''
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
