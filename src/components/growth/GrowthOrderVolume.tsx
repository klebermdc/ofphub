import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ParsedOrder, MONTH_NAMES, YEAR_COLORS, aggregateOrdersByMonth } from "./growthUtils";

interface Props {
  orders: ParsedOrder[];
  filterYear: number | null;
}

export function GrowthOrderVolume({ orders, filterYear }: Props) {
  const agg = aggregateOrdersByMonth(orders);
  const years = filterYear ? [filterYear] : [2023, 2024, 2025, 2026];

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const row: any = { month: MONTH_NAMES[i] };
    years.forEach(y => {
      const found = agg.find(a => a.year === y && a.month === month);
      row[`${y}`] = found ? found.orders : null;
    });
    return row;
  });

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Pedidos por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend />
              {years.map(y => (
                <Bar key={y} dataKey={`${y}`} fill={YEAR_COLORS[y]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
