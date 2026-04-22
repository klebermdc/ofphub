import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { DollarSign, TrendingUp, Megaphone, Wrench, FileText, Calendar, Search, Download, X } from "lucide-react";
import { getMonthName } from "@/utils/dateUtils";
import { formatCurrency } from "@/utils/formatters";
import { ChartSkeleton } from "@/components/ui/skeletons";
import { useSalespersonSalaries } from "@/hooks/useSalespersonSalaries";

interface CostRow {
  id: string;
  period_month: number;
  period_year: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  software: number;
  telefonia: number;
  imposto: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyStat {
  id: string;
  date: string;
  meta_spend: number;
  google_spend: number;
  leads_total: number;
  leads_meta: number;
  leads_google: number;
  leads_organic: number;
  meta_clicks: number;
  google_clicks: number;
  meta_impressions: number;
  meta_cpl: number;
  google_cpl: number;
  monthly_budget: number | null;
  updated_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Meta Ads": "hsl(var(--chart-1))",
  "Google Ads": "hsl(var(--chart-2))",
  "Outros Marketing": "hsl(var(--chart-3))",
  "Software": "hsl(var(--chart-4))",
  "Telefonia": "hsl(var(--chart-5))",
  "Salários": "hsl(var(--primary))",
};

export function CostsTab({ userId }: { userId?: string }) {
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const { salaries } = useSalespersonSalaries(userId);

  // Daily table filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date_desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [costsRes, dailyRes] = await Promise.all([
        supabase.from("marketing_costs").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
        supabase
          .from("marketing_daily_stats")
          .select("id, date, meta_spend, google_spend, leads_total, leads_meta, leads_google, leads_organic, meta_clicks, google_clicks, meta_impressions, meta_cpl, google_cpl, monthly_budget, updated_at")
          .order("date", { ascending: false }),
      ]);
      if (costsRes.data) setCosts(costsRes.data as any);
      if (dailyRes.data) setDaily(dailyRes.data as any);
      setLoading(false);
    })();
  }, []);

  const totalSalaries = useMemo(
    () => salaries.reduce((sum, s) => sum + (Number(s.salary) || 0), 0),
    [salaries]
  );

  // Aggregate daily spend per month/year
  const dailyByMonth = useMemo(() => {
    const map: Record<string, { meta: number; google: number }> = {};
    daily.forEach(d => {
      const [y, m] = d.date.split("-").map(Number);
      const key = `${y}-${m}`;
      if (!map[key]) map[key] = { meta: 0, google: 0 };
      map[key].meta += Number(d.meta_spend) || 0;
      map[key].google += Number(d.google_spend) || 0;
    });
    return map;
  }, [daily]);

  const enriched = useMemo(() => {
    return costs.map(c => {
      const ds = dailyByMonth[`${c.period_year}-${c.period_month}`];
      const meta = ds ? ds.meta : Number(c.meta_ads) || 0;
      const google = ds ? ds.google : Number(c.google_ads) || 0;
      const other = Number(c.other_marketing) || 0;
      const software = Number(c.software) || 0;
      const telefonia = Number(c.telefonia) || 0;
      const total = meta + google + other + software + telefonia;
      return { ...c, meta, google, other, software, telefonia, total };
    });
  }, [costs, dailyByMonth]);

  const availableYears = useMemo(() => {
    const ys = Array.from(new Set(enriched.map(e => e.period_year))).sort((a, b) => b - a);
    return ys;
  }, [enriched]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return enriched;
    return enriched.filter(e => e.period_year === parseInt(yearFilter));
  }, [enriched, yearFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => ({
        meta: acc.meta + e.meta,
        google: acc.google + e.google,
        other: acc.other + e.other,
        software: acc.software + e.software,
        telefonia: acc.telefonia + e.telefonia,
        total: acc.total + e.total,
      }),
      { meta: 0, google: 0, other: 0, software: 0, telefonia: 0, total: 0 }
    );
  }, [filtered]);

  // Bar chart - cost evolution per month
  const barData = useMemo(() => {
    return [...filtered]
      .sort((a, b) =>
        a.period_year !== b.period_year ? a.period_year - b.period_year : a.period_month - b.period_month
      )
      .map(e => ({
        period: `${getMonthName(e.period_month).slice(0, 3)}/${String(e.period_year).slice(2)}`,
        "Meta Ads": e.meta,
        "Google Ads": e.google,
        "Outros Marketing": e.other,
        "Software": e.software,
        "Telefonia": e.telefonia,
        Total: e.total,
      }));
  }, [filtered]);

  // Pie chart - category breakdown
  const pieData = useMemo(() => {
    return [
      { name: "Meta Ads", value: totals.meta },
      { name: "Google Ads", value: totals.google },
      { name: "Outros Marketing", value: totals.other },
      { name: "Software", value: totals.software },
      { name: "Telefonia", value: totals.telefonia },
    ].filter(d => d.value > 0);
  }, [totals]);

  if (loading) return <ChartSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header & filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Central de Custos
          </h2>
          <p className="text-sm text-muted-foreground">Visão completa de todos os custos lançados</p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {availableYears.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Custo Total"
          value={formatCurrency(totals.total)}
          icon={DollarSign}
          variant="danger"
        />
        <MetricCard
          title="Marketing (Meta+Google)"
          value={formatCurrency(totals.meta + totals.google)}
          icon={Megaphone}
        />
        <MetricCard
          title="Operacional (Soft+Tel)"
          value={formatCurrency(totals.software + totals.telefonia)}
          icon={Wrench}
        />
        <MetricCard
          title="Outros Marketing"
          value={formatCurrency(totals.other)}
          icon={FileText}
        />
      </div>

      {/* Salary info card */}
      {totalSalaries > 0 && (
        <Card className="glass">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Folha Salarial Mensal (Equipe)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSalaries)}</p>
            </div>
            <Badge variant="outline">{salaries.length} vendedor(es)</Badge>
          </CardContent>
        </Card>
      )}

      {/* Bar chart - evolution */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Custos por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: any) => formatCurrency(Number(v))}
              />
              <Legend />
              <Bar dataKey="Meta Ads" stackId="a" fill={CATEGORY_COLORS["Meta Ads"]} />
              <Bar dataKey="Google Ads" stackId="a" fill={CATEGORY_COLORS["Google Ads"]} />
              <Bar dataKey="Outros Marketing" stackId="a" fill={CATEGORY_COLORS["Outros Marketing"]} />
              <Bar dataKey="Software" stackId="a" fill={CATEGORY_COLORS["Software"]} />
              <Bar dataKey="Telefonia" stackId="a" fill={CATEGORY_COLORS["Telefonia"]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${((entry.value / totals.total) * 100).toFixed(1)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line chart - total trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Tendência do Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => formatCurrency(Number(v))}
                />
                <Line type="monotone" dataKey="Total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalhamento Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Meta Ads</TableHead>
                <TableHead className="text-right">Google Ads</TableHead>
                <TableHead className="text-right">Outros Mkt</TableHead>
                <TableHead className="text-right">Software</TableHead>
                <TableHead className="text-right">Telefonia</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum custo registrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {getMonthName(e.period_month)} {e.period_year}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(e.meta)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.google)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.other)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.software)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.telefonia)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(e.total)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={e.description || ""}>
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.updated_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
