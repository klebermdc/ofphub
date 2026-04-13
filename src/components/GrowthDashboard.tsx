import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Trophy, Target, Pencil, Check, X, ShoppingCart, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import { useGrowthOrders } from "./growth/useGrowthOrders";
import { GrowthTicketMedio } from "./growth/GrowthTicketMedio";
import { GrowthOrderVolume } from "./growth/GrowthOrderVolume";
import { GrowthTopSellers } from "./growth/GrowthTopSellers";
import { GrowthProductMix } from "./growth/GrowthProductMix";
import { GrowthTopSuppliers } from "./growth/GrowthTopSuppliers";
import { GrowthSeasonality } from "./growth/GrowthSeasonality";
import { GrowthRow, MONTH_NAMES, MONTH_FULL, YEAR_COLORS, formatBRL, formatCompact } from "./growth/growthUtils";

const tooltipStyle = { backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

type EditingCell = { month: number; year: number } | null;

export function GrowthDashboard() {
  const [data, setData] = useState<GrowthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState<string>("all");
  const { orders, loading: ordersLoading } = useGrowthOrders();

  const selectedYear = filterYear === "all" ? null : Number(filterYear);

  const fetchData = async () => {
    const { data: rows } = await supabase
      .from("growth_metrics")
      .select("month, year, revenue")
      .order("year")
      .order("month");
    if (rows) setData(rows.map(r => ({ ...r, revenue: Number(r.revenue) })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = (month: number, year: number, currentValue?: number) => {
    setEditing({ month, year });
    setEditValue(currentValue != null ? String(currentValue) : "");
  };
  const cancelEdit = () => { setEditing(null); setEditValue(""); };
  const saveEdit = async () => {
    if (!editing) return;
    const numValue = parseFloat(editValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(numValue)) { toast.error("Valor inválido"); return; }
    setSaving(true);
    const existing = data.find(d => d.month === editing.month && d.year === editing.year);
    let error;
    if (existing) {
      ({ error } = await supabase.from("growth_metrics").update({ revenue: numValue }).eq("month", editing.month).eq("year", editing.year));
    } else {
      ({ error } = await supabase.from("growth_metrics").insert({ month: editing.month, year: editing.year, revenue: numValue }));
    }
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); }
    else { toast.success("Valor atualizado!"); cancelEdit(); fetchData(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  const byYear = (y: number) => data.filter(d => d.year === y);
  const rev2026 = byYear(2026);
  const sum2026 = rev2026.reduce((s, d) => s + d.revenue, 0);
  const months2026 = rev2026.length;
  const months2026Set = new Set(rev2026.map(d => d.month));
  const sum2025SameMonths = byYear(2025).filter(d => months2026Set.has(d.month)).reduce((s, d) => s + d.revenue, 0);
  const yoyGrowth = sum2025SameMonths > 0 ? ((sum2026 - sum2025SameMonths) / sum2025SameMonths) * 100 : 0;
  const bestMonth2026 = rev2026.reduce((best, d) => d.revenue > best.revenue ? d : best, rev2026[0] || { month: 1, revenue: 0 });
  const projection = months2026 > 0 ? (sum2026 / months2026) * 12 : 0;

  // Orders KPIs
  const orders2026 = orders.filter(o => o.year === 2026);
  const orders2025 = orders.filter(o => o.year === 2025);
  const totalOrders2026 = orders2026.length;
  const tm2026 = totalOrders2026 > 0 ? orders2026.reduce((s, o) => s + o.venda, 0) / totalOrders2026 : 0;
  const tm2025 = orders2025.length > 0 ? orders2025.reduce((s, o) => s + o.venda, 0) / orders2025.length : 0;
  const tmChange = tm2025 > 0 ? ((tm2026 - tm2025) / tm2025) * 100 : 0;

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const row: any = { month: MONTH_NAMES[i] };
    [2023, 2024, 2025, 2026].forEach(y => {
      const found = data.find(d => d.year === y && d.month === month);
      row[`${y}`] = found ? found.revenue : null;
    });
    return row;
  });

  const tableData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const get = (y: number) => data.find(d => d.year === y && d.month === month)?.revenue;
    const r2023 = get(2023); const r2024 = get(2024); const r2025 = get(2025); const r2026 = get(2026);
    const growth = (curr?: number, prev?: number) =>
      curr != null && prev != null && prev > 0 ? ((curr - prev) / prev) * 100 : null;
    return { monthIdx: month, month: MONTH_FULL[i], r2023, r2024, r2025, r2026, g24: growth(r2024, r2023), g25: growth(r2025, r2024), g26: growth(r2026, r2025) };
  });

  const totalRow = {
    r2023: byYear(2023).reduce((s, d) => s + d.revenue, 0),
    r2024: byYear(2024).reduce((s, d) => s + d.revenue, 0),
    r2025: byYear(2025).reduce((s, d) => s + d.revenue, 0),
    r2026: sum2026,
  };

  const growthBadge = (v: number | null) => {
    if (v == null) return <span className="text-muted-foreground">—</span>;
    const positive = v >= 0;
    return (
      <Badge variant={positive ? "default" : "destructive"} className={positive ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30" : "bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30"}>
        {positive ? "+" : ""}{v.toFixed(1)}%
      </Badge>
    );
  };

  const progressPercent = projection > 0 ? Math.min((sum2026 / projection) * 100, 100) : 0;

  const isEditing = (month: number, year: number) => editing?.month === month && editing?.year === year;

  const renderRevenueCell = (month: number, year: number, value?: number) => {
    if (isEditing(month, year)) {
      return (
        <div className="flex items-center gap-1">
          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 w-28 text-xs" placeholder="0.00" autoFocus
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit} disabled={saving}><Check className="h-3 w-3 text-emerald-500" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}><X className="h-3 w-3 text-destructive" /></Button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-end gap-1 group">
        <span>{value != null ? formatCurrency(value) : "—"}</span>
        <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(month, year, value)}>
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por ano:</span>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard title="Faturamento 2026" value={formatCompact(sum2026)} icon={DollarSign} variant="success" delay={0} formula={`Soma de todos os meses de 2026\n${months2026} meses com dados`} />
        <MetricCard title="Crescimento YoY" value={`${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} variant={yoyGrowth >= 0 ? "success" : "danger"} delay={100} formula={`Compara ${months2026} meses de 2026 vs mesmos meses de 2025`} />
        <MetricCard title="Melhor Mês" value={`${MONTH_FULL[bestMonth2026.month - 1]}`} change={formatCompact(bestMonth2026.revenue)} changeType="positive" icon={Trophy} variant="info" delay={200} />
        <MetricCard title="Projeção Anual 2026" value={formatCompact(projection)} icon={Target} variant="warning" delay={300} formula={`(${formatBRL(sum2026)} ÷ ${months2026} meses) × 12`} />
        <MetricCard title="Pedidos 2026" value={totalOrders2026.toLocaleString("pt-BR")} icon={ShoppingCart} variant="info" delay={400} formula="Total de pedidos no ano de 2026" />
        <MetricCard title="Ticket Médio 2026" value={formatCompact(tm2026)} icon={Receipt} variant={tmChange >= 0 ? "success" : "danger"} delay={500} change={`${tmChange >= 0 ? "+" : ""}${tmChange.toFixed(1)}% vs 2025`} changeType={tmChange >= 0 ? "positive" : "negative"} formula={`2026: ${formatBRL(tm2026)}\n2025: ${formatBRL(tm2025)}`} />
      </div>

      {/* Revenue Bar Chart */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Faturamento Mensal por Ano</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                <Legend />
                {[2023, 2024, 2025, 2026].map(y => <Bar key={y} dataKey={`${y}`} fill={YEAR_COLORS[y]} radius={[2, 2, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Line Chart */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Evolução do Faturamento</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                <Legend />
                <Line dataKey="2023" stroke={YEAR_COLORS[2023]} strokeDasharray="5 5" dot={false} strokeWidth={1.5} connectNulls />
                <Line dataKey="2024" stroke={YEAR_COLORS[2024]} dot={false} strokeWidth={2} connectNulls />
                <Line dataKey="2025" stroke={YEAR_COLORS[2025]} dot={false} strokeWidth={2} connectNulls />
                <Line dataKey="2026" stroke={YEAR_COLORS[2026]} dot={{ r: 3 }} strokeWidth={3} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* New sections from orders */}
      {!ordersLoading && (
        <>
          <GrowthTicketMedio orders={orders} filterYear={selectedYear} />
          <GrowthOrderVolume orders={orders} filterYear={selectedYear} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GrowthTopSellers orders={orders} filterYear={selectedYear} />
            <GrowthTopSuppliers orders={orders} filterYear={selectedYear} />
          </div>
          <GrowthProductMix orders={orders} filterYear={selectedYear} />
          <GrowthSeasonality orders={orders} />
        </>
      )}
      {ordersLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando pedidos...</span>
        </div>
      )}

      {/* Comparativo Table */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Comparativo Anual</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">2023</TableHead>
                <TableHead className="text-right">2024</TableHead>
                <TableHead className="text-center">Cresc. 24</TableHead>
                <TableHead className="text-right">2025</TableHead>
                <TableHead className="text-center">Cresc. 25</TableHead>
                <TableHead className="text-right">2026</TableHead>
                <TableHead className="text-center">Cresc. 26</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, i) => (
                <TableRow key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right text-xs">{renderRevenueCell(row.monthIdx, 2023, row.r2023)}</TableCell>
                  <TableCell className="text-right text-xs">{renderRevenueCell(row.monthIdx, 2024, row.r2024)}</TableCell>
                  <TableCell className="text-center">{growthBadge(row.g24)}</TableCell>
                  <TableCell className="text-right text-xs">{renderRevenueCell(row.monthIdx, 2025, row.r2025)}</TableCell>
                  <TableCell className="text-center">{growthBadge(row.g25)}</TableCell>
                  <TableCell className="text-right text-xs">{renderRevenueCell(row.monthIdx, 2026, row.r2026)}</TableCell>
                  <TableCell className="text-center">{growthBadge(row.g26)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-xs">{formatCurrency(totalRow.r2023)}</TableCell>
                <TableCell className="text-right text-xs">{formatCurrency(totalRow.r2024)}</TableCell>
                <TableCell className="text-center">{growthBadge(totalRow.r2023 > 0 ? ((totalRow.r2024 - totalRow.r2023) / totalRow.r2023) * 100 : null)}</TableCell>
                <TableCell className="text-right text-xs">{formatCurrency(totalRow.r2025)}</TableCell>
                <TableCell className="text-center">{growthBadge(totalRow.r2024 > 0 ? ((totalRow.r2025 - totalRow.r2024) / totalRow.r2024) * 100 : null)}</TableCell>
                <TableCell className="text-right text-xs">{formatCurrency(totalRow.r2026)}</TableCell>
                <TableCell className="text-center">{growthBadge(totalRow.r2025 > 0 ? ((totalRow.r2026 - totalRow.r2025) / totalRow.r2025) * 100 : null)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Projection Progress */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Projeção vs Acumulado 2026</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progressPercent} className="h-4" />
          <p className="text-sm text-muted-foreground">
            {formatBRL(sum2026)} de ~{formatBRL(projection)} projetado ({progressPercent.toFixed(0)}%)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
