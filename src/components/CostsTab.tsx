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

  // Daily entries enriched with totals
  const dailyEnriched = useMemo(() => {
    return daily.map(d => ({
      ...d,
      total_spend: (Number(d.meta_spend) || 0) + (Number(d.google_spend) || 0),
    }));
  }, [daily]);

  // Filtered + sorted daily table
  const dailyFiltered = useMemo(() => {
    let rows = dailyEnriched;
    if (dateFrom) rows = rows.filter(r => r.date >= dateFrom);
    if (dateTo) rows = rows.filter(r => r.date <= dateTo);
    if (platformFilter === "meta") rows = rows.filter(r => Number(r.meta_spend) > 0);
    if (platformFilter === "google") rows = rows.filter(r => Number(r.google_spend) > 0);
    if (platformFilter === "both") rows = rows.filter(r => Number(r.meta_spend) > 0 && Number(r.google_spend) > 0);
    if (minValue) rows = rows.filter(r => r.total_spend >= parseFloat(minValue));
    if (maxValue) rows = rows.filter(r => r.total_spend <= parseFloat(maxValue));
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(r => r.date.includes(s));
    }
    const sorted = [...rows];
    switch (sortBy) {
      case "date_asc": sorted.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "date_desc": sorted.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "total_desc": sorted.sort((a, b) => b.total_spend - a.total_spend); break;
      case "total_asc": sorted.sort((a, b) => a.total_spend - b.total_spend); break;
      case "leads_desc": sorted.sort((a, b) => (b.leads_total || 0) - (a.leads_total || 0)); break;
    }
    return sorted;
  }, [dailyEnriched, dateFrom, dateTo, platformFilter, minValue, maxValue, search, sortBy]);

  const dailyTotals = useMemo(() => {
    return dailyFiltered.reduce(
      (acc, r) => ({
        meta: acc.meta + (Number(r.meta_spend) || 0),
        google: acc.google + (Number(r.google_spend) || 0),
        total: acc.total + r.total_spend,
        leads: acc.leads + (Number(r.leads_total) || 0),
        clicks: acc.clicks + (Number(r.meta_clicks) || 0) + (Number(r.google_clicks) || 0),
      }),
      { meta: 0, google: 0, total: 0, leads: 0, clicks: 0 }
    );
  }, [dailyFiltered]);

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setPlatformFilter("all");
    setMinValue(""); setMaxValue(""); setSearch(""); setSortBy("date_desc");
  };

  const exportCSV = () => {
    const headers = ["Data", "Meta Ads", "Google Ads", "Total Gasto", "Leads Total", "Leads Meta", "Leads Google", "Leads Organico", "Cliques Meta", "Cliques Google", "CPL Meta", "CPL Google"];
    const rows = dailyFiltered.map(r => [
      r.date, r.meta_spend, r.google_spend, r.total_spend,
      r.leads_total, r.leads_meta, r.leads_google, r.leads_organic,
      r.meta_clicks, r.google_clicks, r.meta_cpl, r.google_cpl,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `custos-diarios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

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

      {/* DAILY ENTRIES TABLE - Lançamentos diários completos */}
      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Lançamentos Diários de Custos
              <Badge variant="secondary" className="ml-2">{dailyFiltered.length} registros</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
              <Button variant="default" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">De</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Até</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plataforma</label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="both">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor mín. (R$)</label>
              <Input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor máx. (R$)</label>
              <Input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="∞" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Buscar data</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="2025-01" className="h-9 pl-8" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ordenar por</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Data ↓</SelectItem>
                  <SelectItem value="date_asc">Data ↑</SelectItem>
                  <SelectItem value="total_desc">Maior gasto</SelectItem>
                  <SelectItem value="total_asc">Menor gasto</SelectItem>
                  <SelectItem value="leads_desc">Mais leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <div className="p-2 rounded bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Total Gasto</p>
              <p className="font-bold text-primary">{formatCurrency(dailyTotals.total)}</p>
            </div>
            <div className="p-2 rounded bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="font-bold">{formatCurrency(dailyTotals.meta)}</p>
            </div>
            <div className="p-2 rounded bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Google</p>
              <p className="font-bold">{formatCurrency(dailyTotals.google)}</p>
            </div>
            <div className="p-2 rounded bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Leads</p>
              <p className="font-bold">{dailyTotals.leads.toLocaleString("pt-BR")}</p>
            </div>
            <div className="p-2 rounded bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Cliques</p>
              <p className="font-bold">{dailyTotals.clicks.toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Meta Ads</TableHead>
                  <TableHead className="text-right">Google Ads</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">L. Meta</TableHead>
                  <TableHead className="text-right">L. Google</TableHead>
                  <TableHead className="text-right">L. Orgânico</TableHead>
                  <TableHead className="text-right">Cliques M.</TableHead>
                  <TableHead className="text-right">Cliques G.</TableHead>
                  <TableHead className="text-right">CPL Meta</TableHead>
                  <TableHead className="text-right">CPL Google</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      Nenhum lançamento encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyFiltered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(r.meta_spend) || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(r.google_spend) || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(r.total_spend)}</TableCell>
                      <TableCell className="text-right">{r.leads_total || 0}</TableCell>
                      <TableCell className="text-right text-xs">{r.leads_meta || 0}</TableCell>
                      <TableCell className="text-right text-xs">{r.leads_google || 0}</TableCell>
                      <TableCell className="text-right text-xs">{r.leads_organic || 0}</TableCell>
                      <TableCell className="text-right text-xs">{r.meta_clicks || 0}</TableCell>
                      <TableCell className="text-right text-xs">{r.google_clicks || 0}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(Number(r.meta_cpl) || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(Number(r.google_cpl) || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
