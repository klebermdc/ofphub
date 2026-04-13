import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ParsedOrder, MONTH_NAMES, YEAR_COLORS, formatBRL, formatCompact, aggregateOrdersByMonth } from "./growthUtils";

interface Props {
  orders: ParsedOrder[];
  filterYear: number | null;
}

export function GrowthTicketMedio({ orders, filterYear }: Props) {
  const agg = aggregateOrdersByMonth(orders);
  const years = filterYear ? [filterYear] : [2023, 2024, 2025, 2026];

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const row: any = { month: MONTH_NAMES[i] };
    years.forEach(y => {
      const found = agg.find(a => a.year === y && a.month === month);
      row[`${y}`] = found ? Math.round(found.ticketMedio) : null;
    });
    return row;
  });

  const avg2026 = agg.filter(a => a.year === 2026);
  const avg2025 = agg.filter(a => a.year === 2025);
  const tm2026 = avg2026.length > 0 ? avg2026.reduce((s, a) => s + a.revenue, 0) / avg2026.reduce((s, a) => s + a.orders, 0) : 0;
  const tm2025 = avg2025.length > 0 ? avg2025.reduce((s, a) => s + a.revenue, 0) / avg2025.reduce((s, a) => s + a.orders, 0) : 0;
  const tmChange = tm2025 > 0 ? ((tm2026 - tm2025) / tm2025) * 100 : 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Evolução do Ticket Médio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend />
              {years.map(y => (
                <Line key={y} dataKey={`${y}`} stroke={YEAR_COLORS[y]} strokeWidth={y === 2026 ? 3 : 2} dot={y === 2026 ? { r: 3 } : false} connectNulls strokeDasharray={y === 2023 ? "5 5" : undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!filterYear && (
          <p className="text-sm text-muted-foreground mt-2">
            Ticket médio 2026: <strong>{formatBRL(tm2026)}</strong> vs 2025: <strong>{formatBRL(tm2025)}</strong> ({tmChange >= 0 ? "↑" : "↓"} {Math.abs(tmChange).toFixed(1)}%)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
