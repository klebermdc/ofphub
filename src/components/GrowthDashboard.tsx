import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/utils/formatters";

interface GrowthRow {
  month: number;
  year: number;
  revenue: number;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const COLORS = {
  "2023": "#94A3B8",
  "2024": "#3B82F6",
  "2025": "#8B5CF6",
  "2026": "#22C55E",
};

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatCompact = (v: number) => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`;
  return formatBRL(v);
};

const tooltipFormatter = (value: number) => formatBRL(value);

export function GrowthDashboard() {
  const [data, setData] = useState<GrowthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: rows } = await supabase
        .from("growth_metrics")
        .select("month, year, revenue")
        .order("year")
        .order("month");
      if (rows) setData(rows.map(r => ({ ...r, revenue: Number(r.revenue) })));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  // Helpers
  const byYear = (y: number) => data.filter(d => d.year === y);
  const rev2026 = byYear(2026);
  const sum2026 = rev2026.reduce((s, d) => s + d.revenue, 0);
  const months2026 = rev2026.length;

  // YoY: compare same months
  const months2026Set = new Set(rev2026.map(d => d.month));
  const sum2025SameMonths = byYear(2025).filter(d => months2026Set.has(d.month)).reduce((s, d) => s + d.revenue, 0);
  const yoyGrowth = sum2025SameMonths > 0 ? ((sum2026 - sum2025SameMonths) / sum2025SameMonths) * 100 : 0;

  // Best month 2026
  const bestMonth2026 = rev2026.reduce((best, d) => d.revenue > best.revenue ? d : best, rev2026[0] || { month: 1, revenue: 0 });

  // Projection
  const projection = months2026 > 0 ? (sum2026 / months2026) * 12 : 0;

  // Chart data
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const row: any = { month: MONTH_NAMES[i] };
    [2023, 2024, 2025, 2026].forEach(y => {
      const found = data.find(d => d.year === y && d.month === month);
      row[`${y}`] = found ? found.revenue : null;
    });
    return row;
  });

  // Table data
  const tableData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const get = (y: number) => data.find(d => d.year === y && d.month === month)?.revenue;
    const r2023 = get(2023);
    const r2024 = get(2024);
    const r2025 = get(2025);
    const r2026 = get(2026);
    const growth = (curr?: number, prev?: number) =>
      curr != null && prev != null && prev > 0 ? ((curr - prev) / prev) * 100 : null;
    return {
      month: MONTH_FULL[i],
      r2023, r2024, r2025, r2026,
      g24: growth(r2024, r2023),
      g25: growth(r2025, r2024),
      g26: growth(r2026, r2025),
    };
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

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Faturamento 2026"
          value={formatCompact(sum2026)}
          icon={DollarSign}
          variant="success"
          delay={0}
          formula={`Soma de todos os meses de 2026\n${months2026} meses com dados`}
        />
        <MetricCard
          title="Crescimento YoY"
          value={`${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          variant={yoyGrowth >= 0 ? "success" : "danger"}
          delay={100}
          formula={`Compara ${months2026} meses de 2026 vs mesmos meses de 2025`}
        />
        <MetricCard
          title="Melhor Mês"
          value={`${MONTH_FULL[bestMonth2026.month - 1]}`}
          change={formatCompact(bestMonth2026.revenue)}
          changeType="positive"
          icon={Trophy}
          variant="info"
          delay={200}
        />
        <MetricCard
          title="Projeção Anual 2026"
          value={formatCompact(projection)}
          icon={Target}
          variant="warning"
          delay={300}
          formula={`(${formatBRL(sum2026)} ÷ ${months2026} meses) × 12`}
        />
      </div>

      {/* Bar Chart */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Faturamento Mensal por Ano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="2023" fill={COLORS["2023"]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="2024" fill={COLORS["2024"]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="2025" fill={COLORS["2025"]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="2026" fill={COLORS["2026"]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Evolução do Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Line dataKey="2023" stroke={COLORS["2023"]} strokeDasharray="5 5" dot={false} strokeWidth={1.5} connectNulls />
                <Line dataKey="2024" stroke={COLORS["2024"]} dot={false} strokeWidth={2} connectNulls />
                <Line dataKey="2025" stroke={COLORS["2025"]} dot={false} strokeWidth={2} connectNulls />
                <Line dataKey="2026" stroke={COLORS["2026"]} dot={{ r: 3 }} strokeWidth={3} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Comparativo Anual</CardTitle>
        </CardHeader>
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
                  <TableCell className="text-right text-xs">{row.r2023 != null ? formatCurrency(row.r2023) : "—"}</TableCell>
                  <TableCell className="text-right text-xs">{row.r2024 != null ? formatCurrency(row.r2024) : "—"}</TableCell>
                  <TableCell className="text-center">{growthBadge(row.g24)}</TableCell>
                  <TableCell className="text-right text-xs">{row.r2025 != null ? formatCurrency(row.r2025) : "—"}</TableCell>
                  <TableCell className="text-center">{growthBadge(row.g25)}</TableCell>
                  <TableCell className="text-right text-xs">{row.r2026 != null ? formatCurrency(row.r2026) : "—"}</TableCell>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Projeção vs Acumulado 2026</CardTitle>
        </CardHeader>
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
