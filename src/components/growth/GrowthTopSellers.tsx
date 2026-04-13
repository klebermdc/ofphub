import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ParsedOrder, MONTH_NAMES, SELLER_COLORS, formatCompact, formatBRL } from "./growthUtils";

interface Props {
  orders: ParsedOrder[];
  filterYear: number | null;
}

export function GrowthTopSellers({ orders, filterYear }: Props) {
  const [localYear, setLocalYear] = useState<number>(2026);
  const year = filterYear || localYear;

  const { chartData, topSellers } = useMemo(() => {
    const yearOrders = orders.filter(o => o.year === year);
    const sellerTotals = new Map<string, number>();
    for (const o of yearOrders) {
      sellerTotals.set(o.vendedor, (sellerTotals.get(o.vendedor) || 0) + o.venda);
    }
    const sorted = Array.from(sellerTotals.entries()).sort((a, b) => b[1] - a[1]);
    const top6 = sorted.slice(0, 6).map(s => s[0]);
    const hasOthers = sorted.length > 6;

    const data = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthOrders = yearOrders.filter(o => o.month === month);
      const row: any = { month: MONTH_NAMES[i] };
      top6.forEach(seller => {
        row[seller] = monthOrders.filter(o => o.vendedor === seller).reduce((s, o) => s + o.venda, 0) || null;
      });
      if (hasOthers) {
        row["Outros"] = monthOrders.filter(o => !top6.includes(o.vendedor)).reduce((s, o) => s + o.venda, 0) || null;
      }
      return row;
    });

    return { chartData: data, topSellers: hasOthers ? [...top6, "Outros"] : top6 };
  }, [orders, year]);

  return (
    <Card className="glass">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Faturamento por Vendedor</CardTitle>
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
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend />
              {topSellers.map((seller, idx) => (
                <Bar key={seller} dataKey={seller} stackId="a" fill={SELLER_COLORS[idx % SELLER_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
