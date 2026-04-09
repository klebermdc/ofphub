import { useState, useMemo, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, UserPlus, Target, Banknote, Percent, RefreshCw, BarChart2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { MarketingCostsDialog } from "@/components/MarketingCostsDialog";
import { useCRMLeadsCount } from "@/hooks/useCRMLeadsCount";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getMonthName } from "@/hooks/useCommissionHistory";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";
import { SalesRep } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MarketingCost {
  id: string;
  period_month: number;
  period_year: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  leads: number;
  description: string | null;
}

interface DailyStat {
  date: string;
  meta_spend: number;
  meta_impressions: number;
  meta_clicks: number;
  meta_ctr: number;
  meta_conversions: number;
  meta_cpl: number;
  meta_campaigns: any[];
  google_spend: number;
  google_clicks: number;
  google_conversions: number;
  google_cpl: number;
  google_campaigns: any[];
  leads_total: number;
  leads_meta: number;
  leads_google: number;
  leads_organic: number;
  cpl_real_meta: number;
}

interface DailyStatsAggregated {
  month: number;
  year: number;
  meta_spend: number;
  google_spend: number;
  leads_total: number;
}

interface MarketingTabProps {
  costs: MarketingCost[];
  onSave: (month: number, year: number, googleAds: number, metaAds: number, otherMarketing: number, leads: number, description?: string) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => MarketingCost | undefined;
  salesReps?: SalesRep[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const chartConfig = {
  investment: { label: "Investimento", color: "hsl(var(--warning))" },
  leads: { label: "Leads", color: "hsl(var(--info))" },
  google_ads: { label: "Google Ads", color: "hsl(217, 91%, 60%)" },
  meta_ads: { label: "Meta Ads", color: "hsl(270, 70%, 60%)" },
  other: { label: "Outros", color: "hsl(25, 95%, 53%)" },
  cpl: { label: "Custo por Lead", color: "hsl(var(--destructive))" },
  meta_spend: { label: "Meta Ads", color: "hsl(270, 70%, 60%)" },
  google_spend: { label: "Google Ads", color: "hsl(217, 91%, 60%)" },
  leads_total: { label: "Leads", color: "hsl(var(--info))" },
  cpl_real_meta: { label: "CPL Meta", color: "hsl(var(--warning))" },
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const formatDate = (d: string) => {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
};

export function MarketingTab({ costs, onSave, getCostForMonth, salesReps = [] }: MarketingTabProps) {
  const { leadsData, isLoading: leadsLoading, fetchLeadsData } = useCRMLeadsCount();

  // State
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(`${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`);

  // Daily stats for selected month (detailed)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // All daily stats aggregated by month (for charts)
  const [dailyStatsAgg, setDailyStatsAgg] = useState<DailyStatsAggregated[]>([]);
  const [aggLoading, setAggLoading] = useState(true);

  // Fetch aggregated monthly data
  useEffect(() => {
    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("marketing_daily_stats" as any)
        .select("date, meta_spend, google_spend, leads_total");
      if (error || !data) return;
      const grouped: Record<string, DailyStatsAggregated> = {};
      (data as any[]).forEach((row: any) => {
        const d = new Date(row.date);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const key = `${year}-${month}`;
        if (!grouped[key]) grouped[key] = { month, year, meta_spend: 0, google_spend: 0, leads_total: 0 };
        grouped[key].meta_spend += Number(row.meta_spend) || 0;
        grouped[key].google_spend += Number(row.google_spend) || 0;
        grouped[key].leads_total += Number(row.leads_total) || 0;
      });
      setDailyStatsAgg(Object.values(grouped));
    };
    fetchAll();
  }, []);

  // Fetch daily stats for selected month
  const fetchDailyStats = async () => {
    if (selectedMonth === 'all') { setDailyStats([]); return; }
    const [mStr, yStr] = selectedMonth.split('/');
    const month = parseInt(mStr);
    const year = parseInt(yStr);
    setDailyLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("marketing_daily_stats" as any)
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });
    if (!error && data) setDailyStats(data as unknown as DailyStat[]);
    setDailyLoading(false);
  };

  useEffect(() => { fetchDailyStats(); }, [selectedMonth]);

  // Available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (order.data) {
          const parts = order.data.split('/');
          if (parts.length >= 2) {
            const month = parts[1].padStart(2, '0');
            let year = parts[2] || now.getFullYear().toString();
            if (year.length === 2) year = `20${year}`;
            months.add(`${month}/${year}`);
          }
        }
      });
    });
    costs.forEach(cost => months.add(`${cost.period_month.toString().padStart(2, '0')}/${cost.period_year}`));
    dailyStatsAgg.forEach(d => months.add(`${d.month.toString().padStart(2, '0')}/${d.year}`));
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yB - yA || mB - mA;
    });
  }, [salesReps, costs, dailyStatsAgg]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(now.getFullYear().toString());
    costs.forEach(c => years.add(c.period_year.toString()));
    dailyStatsAgg.forEach(d => years.add(d.year.toString()));
    availableMonths.forEach(m => years.add(m.split('/')[1]));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [costs, availableMonths, dailyStatsAgg]);

  const monthsForYear = availableMonths.filter(m => m.endsWith(`/${selectedYear}`));

  // Helper to get aggregated daily stats for a month
  const getDailyStatsForMonth = (month: number, year: number) =>
    dailyStatsAgg.find(d => d.month === month && d.year === year);

  // Merged monthly data (daily_stats priority, fallback to marketing_costs)
  const mergedMonthlyData = useMemo(() => {
    const allKeys = new Set<string>();
    costs.forEach(c => allKeys.add(`${c.period_year}-${c.period_month}`));
    dailyStatsAgg.forEach(d => allKeys.add(`${d.year}-${d.month}`));
    return Array.from(allKeys).map(key => {
      const [yStr, mStr] = key.split('-');
      const year = parseInt(yStr), month = parseInt(mStr);
      const ds = getDailyStatsForMonth(month, year);
      const mc = costs.find(c => c.period_month === month && c.period_year === year);
      const hasDaily = !!ds;
      return {
        id: mc?.id || key, period_month: month, period_year: year,
        google_ads: hasDaily ? ds.google_spend : (mc?.google_ads || 0),
        meta_ads: hasDaily ? ds.meta_spend : (mc?.meta_ads || 0),
        other_marketing: mc?.other_marketing || 0,
        leads: hasDaily ? ds.leads_total : (mc?.leads || 0),
        description: mc?.description || null,
      };
    });
  }, [costs, dailyStatsAgg]);

  // Filtered data for selected period
  const filteredData = useMemo(() => {
    let filtered = mergedMonthlyData.filter(d => d.period_year.toString() === selectedYear);
    if (selectedMonth !== 'all') {
      const [month] = selectedMonth.split('/');
      filtered = filtered.filter(d => d.period_month === parseInt(month));
    }
    return filtered.sort((a, b) => b.period_month - a.period_month);
  }, [mergedMonthlyData, selectedYear, selectedMonth]);

  // Revenue from sales
  const revenue = useMemo(() => {
    if (selectedMonth === 'all') {
      return salesReps.reduce((total, rep) => {
        return total + (rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return year === selectedYear;
        }).reduce((sum, o) => sum + o.venda, 0) || 0);
      }, 0);
    }
    return salesReps.reduce((total, rep) => {
      return total + (rep.orders?.filter(order => {
        if (!order.data) return false;
        const parts = order.data.split('/');
        const month = parts[1]?.padStart(2, '0');
        let year = parts[2] || '';
        if (year.length === 2) year = `20${year}`;
        return `${month}/${year}` === selectedMonth;
      }).reduce((sum, o) => sum + o.venda, 0) || 0);
    }, 0);
  }, [salesReps, selectedYear, selectedMonth]);

  const ordersCount = useMemo(() => {
    if (selectedMonth === 'all') {
      return salesReps.reduce((total, rep) => {
        return total + (rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return year === selectedYear;
        }).length || 0);
      }, 0);
    }
    return salesReps.reduce((total, rep) => {
      return total + (rep.orders?.filter(order => {
        if (!order.data) return false;
        const parts = order.data.split('/');
        const month = parts[1]?.padStart(2, '0');
        let year = parts[2] || '';
        if (year.length === 2) year = `20${year}`;
        return `${month}/${year}` === selectedMonth;
      }).length || 0);
    }, 0);
  }, [salesReps, selectedYear, selectedMonth]);

  // Totals
  const totals = useMemo(() => {
    const totalGoogleAds = filteredData.reduce((sum, d) => sum + d.google_ads, 0);
    const totalMetaAds = filteredData.reduce((sum, d) => sum + d.meta_ads, 0);
    const totalOther = filteredData.reduce((sum, d) => sum + d.other_marketing, 0);
    const totalInvestment = totalGoogleAds + totalMetaAds + totalOther;
    const totalLeads = filteredData.reduce((sum, d) => sum + d.leads, 0);
    const costPerLead = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const conversionRate = totalLeads > 0 ? (ordersCount / totalLeads) * 100 : 0;
    const roi = totalInvestment > 0 ? ((revenue - totalInvestment) / totalInvestment) * 100 : 0;
    return { totalGoogleAds, totalMetaAds, totalOther, totalLeads, totalInvestment, costPerLead, conversionRate, roi };
  }, [filteredData, ordersCount, revenue]);

  // Monthly chart data (yearly evolution)
  const monthlyChartData = useMemo(() => {
    return mergedMonthlyData
      .filter(d => d.period_year.toString() === selectedYear)
      .sort((a, b) => a.period_month - b.period_month)
      .map(d => {
        const total = d.google_ads + d.meta_ads + d.other_marketing;
        return {
          month: getMonthName(d.period_month).substring(0, 3),
          investment: total,
          leads: d.leads,
          google_ads: d.google_ads,
          meta_ads: d.meta_ads,
          other: d.other_marketing,
          cpl: d.leads > 0 ? total / d.leads : 0,
        };
      });
  }, [mergedMonthlyData, selectedYear]);

  // Daily chart data (for selected month)
  const dailyChartData = useMemo(() => dailyStats.map(d => ({
    day: formatDate(d.date),
    meta_spend: d.meta_spend || 0,
    google_spend: d.google_spend || 0,
    leads_total: d.leads_total || 0,
    cpl_real_meta: d.cpl_real_meta || 0,
  })), [dailyStats]);

  const today = dailyStats[dailyStats.length - 1];
  const yesterday = dailyStats[dailyStats.length - 2];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth('all'); }}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthsForYear.map(month => {
                const [m] = month.split('/');
                return <SelectItem key={month} value={month}>{getMonthName(parseInt(m))}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLeadsData()} disabled={leadsLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${leadsLoading ? 'animate-spin' : ''}`} />
            Sync Notion
          </Button>
          <MarketingCostsDialog onSave={onSave} getCostForMonth={getCostForMonth} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="Faturamento" value={formatBRL(revenue)} icon={Banknote} variant="success" />
        <MetricCard title="Investimento" value={formatBRL(totals.totalInvestment)} icon={DollarSign} variant="warning" />
        <MetricCard title="Leads" value={totals.totalLeads.toString()} icon={UserPlus} variant="info" />
        <MetricCard title="Taxa de Conversão" value={`${totals.conversionRate.toFixed(1)}%`} icon={Percent} variant={totals.conversionRate >= 10 ? "success" : "warning"} />
        <MetricCard title="Custo por Lead" value={formatBRL(totals.costPerLead)} icon={Target} variant="default" />
        <MetricCard title="ROI Marketing" value={`${totals.roi.toFixed(1)}%`} icon={TrendingUp} variant={totals.roi >= 0 ? "success" : "danger"} />
      </div>

      {/* Hoje vs Ontem (only when specific month selected and has daily data) */}
      {selectedMonth !== 'all' && today && yesterday && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">
            {new Date(today.date + "T12:00:00").toLocaleDateString("pt-BR")} vs {new Date(yesterday.date + "T12:00:00").toLocaleDateString("pt-BR")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Gasto Meta", today: today.meta_spend, prev: yesterday.meta_spend, currency: true },
              { label: "Leads no site", today: today.leads_total, prev: yesterday.leads_total, currency: false },
              { label: "CPL real Meta", today: today.cpl_real_meta, prev: yesterday.cpl_real_meta, currency: true },
              { label: "CTR Meta", today: today.meta_ctr, prev: yesterday.meta_ctr, currency: false, pct: true },
            ].map((m) => {
              const diff = m.today - m.prev;
              const pct = m.prev > 0 ? ((diff / m.prev) * 100).toFixed(1) : "—";
              const positive = m.label.includes("CPL") ? diff < 0 : diff >= 0;
              return (
                <div key={m.label} className="bg-background/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold mt-1">
                    {m.currency ? formatBRL(m.today) : m.pct ? `${m.today?.toFixed(2)}%` : m.today}
                  </p>
                  <p className={`text-xs mt-1 ${positive ? "text-success" : "text-destructive"}`}>
                    {diff >= 0 ? "+" : ""}{m.currency ? formatBRL(diff) : m.pct ? `${diff.toFixed(2)}%` : diff}
                    {m.prev > 0 && ` (${pct}%)`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Charts (when specific month selected) */}
      {selectedMonth !== 'all' && dailyChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Investimento Diário por Canal</h3>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Bar dataKey="meta_spend" fill="hsl(270, 70%, 60%)" radius={[3, 3, 0, 0]} name="Meta" />
                <Bar dataKey="google_spend" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} name="Google" />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: "hsl(270,70%,60%)" }}></span>Meta</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: "hsl(217,91%,60%)" }}></span>Google</span>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Leads por Dia</h3>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsGradDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="leads_total" stroke="hsl(var(--info))" fill="url(#leadsGradDaily)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">CPL Real Meta (R$)</h3>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={dailyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Line type="monotone" dataKey="cpl_real_meta" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Daily Table */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Detalhamento Diário</h3>
            <div className="overflow-auto max-h-[240px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Google</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...dailyStats].reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-mono text-xs">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatBRL(d.meta_spend || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatBRL(d.google_spend || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-info">{d.leads_total || 0}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.cpl_real_meta > 0 ? formatBRL(d.cpl_real_meta) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Evolution Charts */}
      {monthlyChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução do Investimento</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Area type="monotone" dataKey="investment" stroke="hsl(var(--warning))" fill="url(#investGrad)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução de Leads</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsGradMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--info))" fill="url(#leadsGradMonthly)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Investimento por Canal</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Bar dataKey="google_ads" stackId="a" fill="hsl(217, 91%, 60%)" />
                <Bar dataKey="meta_ads" stackId="a" fill="hsl(270, 70%, 60%)" />
                <Bar dataKey="other" stackId="a" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(217, 91%, 60%)" }}></div><span>Google Ads</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(270, 70%, 60%)" }}></div><span>Meta Ads</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(25, 95%, 53%)" }}></div><span>Outros</span></div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Custo por Lead (CPL)</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Line type="monotone" dataKey="cpl" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Channel Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(217, 91%, 60%)" }}></div>
            <span className="text-sm font-medium">Google Ads</span>
          </div>
          <p className="text-2xl font-bold">{formatBRL(totals.totalGoogleAds)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.totalInvestment > 0 ? ((totals.totalGoogleAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(270, 70%, 60%)" }}></div>
            <span className="text-sm font-medium">Meta Ads</span>
          </div>
          <p className="text-2xl font-bold">{formatBRL(totals.totalMetaAds)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.totalInvestment > 0 ? ((totals.totalMetaAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(25, 95%, 53%)" }}></div>
            <span className="text-sm font-medium">Outros</span>
          </div>
          <p className="text-2xl font-bold">{formatBRL(totals.totalOther)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.totalInvestment > 0 ? ((totals.totalOther / totals.totalInvestment) * 100).toFixed(1) : 0}% do total</p>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Detalhamento Mensal — {selectedYear}</h3>
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de marketing registrado para {selectedYear}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Google Ads</TableHead>
                  <TableHead className="text-right">Meta Ads</TableHead>
                  <TableHead className="text-right">Outros</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((d) => {
                  const monthTotal = d.google_ads + d.meta_ads + d.other_marketing;
                  const cpl = d.leads > 0 ? monthTotal / d.leads : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{getMonthName(d.period_month)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(d.google_ads)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(d.meta_ads)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(d.other_marketing)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatBRL(monthTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-info">{d.leads}</TableCell>
                      <TableCell className="text-right font-mono text-warning">{formatBRL(cpl)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{d.description || '-'}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totals.totalGoogleAds)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totals.totalMetaAds)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totals.totalOther)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totals.totalInvestment)}</TableCell>
                  <TableCell className="text-right font-mono text-info">{totals.totalLeads}</TableCell>
                  <TableCell className="text-right font-mono text-warning">{formatBRL(totals.costPerLead)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
