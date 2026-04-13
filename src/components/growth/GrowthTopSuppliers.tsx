import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ParsedOrder, formatBRL, formatCompact } from "./growthUtils";

interface Props {
  orders: ParsedOrder[];
  filterYear: number | null;
}

export function GrowthTopSuppliers({ orders, filterYear }: Props) {
  const [localYear, setLocalYear] = useState<number>(2026);
  const year = filterYear || localYear;

  const chartData = useMemo(() => {
    const yearOrders = orders.filter(o => o.year === year);
    const map = new Map<string, number>();
    for (const o of yearOrders) {
      map.set(o.fornecedor, (map.get(o.fornecedor) || 0) + o.venda);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [orders, year]);

  return (
    <Card className="glass">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Faturamento por Fornecedor</CardTitle>
        {!filterYear && (
          <Select value={String(localYear)} onValueChange={v => setLocalYear(Number(v))}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={80} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
