import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ParsedOrder, formatBRL, formatCompact } from "./growthUtils";

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#94A3B8"];

interface Props {
  orders: ParsedOrder[];
  filterYear: number | null;
}

export function GrowthProductMix({ orders, filterYear }: Props) {
  const [localYear, setLocalYear] = useState<number>(2026);
  const year = filterYear || localYear;

  const products = useMemo(() => {
    const yearOrders = orders.filter(o => o.year === year);
    const map = new Map<string, { revenue: number; count: number }>();
    for (const o of yearOrders) {
      const cur = map.get(o.produto) || { revenue: 0, count: 0 };
      cur.revenue += o.venda;
      cur.count += 1;
      map.set(o.produto, cur);
    }
    const total = yearOrders.reduce((s, o) => s + o.venda, 0);
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        revenue: v.revenue,
        count: v.count,
        pct: total > 0 ? (v.revenue / total) * 100 : 0,
        ticketMedio: v.count > 0 ? v.revenue / v.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, year]);

  const pieData = products.slice(0, 7);
  if (products.length > 7) {
    const rest = products.slice(7);
    pieData.push({
      name: "Outros",
      revenue: rest.reduce((s, p) => s + p.revenue, 0),
      count: rest.reduce((s, p) => s + p.count, 0),
      pct: rest.reduce((s, p) => s + p.pct, 0),
      ticketMedio: 0,
    });
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Distribuição por Produto</CardTitle>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs text-right">Faturamento</TableHead>
                  <TableHead className="text-xs text-right">Pedidos</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                  <TableHead className="text-xs text-right">Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.slice(0, 10).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs text-right">{formatCompact(p.revenue)}</TableCell>
                    <TableCell className="text-xs text-right">{p.count}</TableCell>
                    <TableCell className="text-xs text-right">{p.pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-xs text-right">{formatCompact(p.ticketMedio)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
