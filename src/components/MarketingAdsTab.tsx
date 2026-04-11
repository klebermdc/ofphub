import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, UserPlus, Target, RefreshCw, BarChart2, Calendar, Clock, Eye, MousePointerClick, Gauge, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketingHealthIndicators } from "@/components/MarketingHealthIndicators";
import { TopCreativesTable } from "@/components/TopCreativesTable";
import { LeadsBySourceBreakdown } from "@/components/LeadsBySourceBreakdown";
interface DailyStat {
  date: string;
  meta_spend: number;
  meta_impressions: number;
  meta_clicks: number;
  meta_ctr: number;
  meta_conversions: number;
  meta_cpl: number;
  meta_campaigns: Campaign[];
  meta_reach?: number;
  meta_landing_page_views?: number;
  meta_frequency?: number;
  monthly_budget?: number;
  google_spend: number;
  google_clicks: number;
  google_conversions: number;
  google_cpl: number;
  google_campaigns: Campaign[];
  leads_total: number;
  leads_meta: number;
  leads_google: number;
  leads_organic: number;
  cpl_real_meta: number;
  top_creatives?: any[];
  leads_by_campaign?: Record<string, number>;
  leads_by_medium?: Record<string, number>;
  leads_by_term?: Record<string, number>;
  leads_by_content?: Record<string, number>;
  forms_data?: Record<string, number>;
}

interface Campaign {
  name: string;
  spend: number;
  ctr: number;
  cpl: number;
  conversions: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}`;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getLast6Months(): { key: string; label: string; month: number; year: number }[] {
  const now = new Date();
  const options: { key: string; label: string; month: number; year: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    options.push({
      key: `${month}-${year}`,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      month,
      year,
    });
  }
  return options;
}

const chartConfig = {
  meta_spend: { label: "Meta Ads", color: "hsl(270, 70%, 60%)" },
  google_spend: { label: "Google Ads", color: "hsl(217, 91%, 60%)" },
  leads_total: { label: "Leads", color: "hsl(var(--info))" },
  cpl_real_meta: { label: "CPL Meta", color: "hsl(var(--warning))" },
};

export function MarketingAdsTab() {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const monthOptions = useMemo(() => getLast6Months(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(monthOptions[0].key);

  const selected = useMemo(
    () => monthOptions.find((o) => o.key === selectedPeriod) || monthOptions[0],
    [selectedPeriod, monthOptions]
  );

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const fetchStats = useCallback(async () => {
    const sel = selectedRef.current;
    setLoading(true);
    const startDate = `${sel.year}-${String(sel.month).padStart(2, "0")}-01`;
    const endDay = new Date(sel.year, sel.month, 0).getDate();
    const endDate = `${sel.year}-${String(sel.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("marketing_daily_stats" as any)
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (!error && data) {
      setStats(data as unknown as DailyStat[]);
    }
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 300000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Update "ago" text every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const getLastUpdateText = () => {
    if (!lastUpdate) return "";
    const diffMs = Date.now() - lastUpdate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Atualizado agora";
    return `Atualizado há ${diffMin} min`;
  };

  const today = stats[stats.length - 1];
  const yesterday = stats[stats.length - 2];

  const totalMeta = stats.reduce((s, d) => s + (d.meta_spend || 0), 0);
  const totalGoogle = stats.reduce((s, d) => s + (d.google_spend || 0), 0);
  const totalLeads = stats.reduce((s, d) => s + (d.leads_total || 0), 0);
  const totalLeadsMeta = stats.reduce((s, d) => s + (d.leads_meta || 0), 0);
  const totalLeadsGoogle = stats.reduce((s, d) => s + (d.leads_google || 0), 0);
  const totalLeadsOrganic = stats.reduce((s, d) => s + (d.leads_organic || 0), 0);
  const totalClicks = stats.reduce((s, d) => s + (d.meta_clicks || 0) + (d.google_clicks || 0), 0);
  const totalImpressions = stats.reduce((s, d) => s + (d.meta_impressions || 0), 0);
  const avgCpl = totalLeads > 0 ? (totalMeta + totalGoogle) / totalLeads : 0;
  const avgCtr = totalImpressions > 0 ? (stats.reduce((s, d) => s + (d.meta_clicks || 0), 0) / totalImpressions * 100) : 0;
  const totalInvestment = totalMeta + totalGoogle;

  // Daily KPIs (last available day)
  const todayMeta = today?.meta_spend || 0;
  const todayGoogle = today?.google_spend || 0;
  const todayLeads = today?.leads_total || 0;
  const todayInvestment = todayMeta + todayGoogle;
  const todayCpl = todayLeads > 0 ? todayInvestment / todayLeads : 0;
  const todayCtr = today?.meta_ctr || 0;
  const todayClicks = (today?.meta_clicks || 0) + (today?.google_clicks || 0);
  const todayConversions = (today?.meta_conversions || 0) + (today?.google_conversions || 0);

  const chartData = stats.map((d) => ({
    day: formatDate(d.date),
    meta_spend: d.meta_spend || 0,
    google_spend: d.google_spend || 0,
    leads_total: d.leads_total || 0,
    cpl_real_meta: d.cpl_real_meta || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Carregando dados de tráfego pago...
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tráfego Pago</h2>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            {lastUpdate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {getLastUpdateText()}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BarChart2 className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhum dado para {selected.label}.</p>
          <p className="text-xs">O agente Jorge publica o relatório diário às 9h.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tráfego Pago — {selected.label}</h2>
          {today && (
            <p className="text-xs text-muted-foreground mt-1">
              Último relatório: {new Date(today.date + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {getLastUpdateText()}
            </div>
          )}
        </div>
      </div>

      {/* KPIs Diários (último dia disponível) */}
      {today && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              Hoje — {new Date(today.date + "T12:00:00").toLocaleDateString("pt-BR")}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Investimento Hoje" value={formatBRL(todayInvestment)} icon={DollarSign} variant="warning" />
            <MetricCard title="Leads Hoje" value={todayLeads.toString()} icon={UserPlus} variant="success" />
            <MetricCard title="CPL Hoje" value={formatBRL(todayCpl)} icon={Target} variant="default" />
            <MetricCard title="CTR Meta Hoje" value={`${todayCtr.toFixed(2)}%`} icon={TrendingUp} variant="info" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Meta Ads Hoje" value={formatBRL(todayMeta)} icon={DollarSign} variant="warning" />
            <MetricCard title="Google Ads Hoje" value={formatBRL(todayGoogle)} icon={DollarSign} variant="info" />
            <MetricCard title="Cliques Hoje" value={todayClicks.toString()} icon={TrendingUp} variant="default" />
            <MetricCard title="Conversões Hoje" value={todayConversions.toString()} icon={Target} variant="success" />
          </div>
          {/* Third row of daily KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Frequência Meta" 
              value={today.meta_frequency?.toFixed(2) || "0"} 
              icon={Eye} 
              variant="default" 
              formula="Vezes que cada pessoa viu o anúncio" 
            />
            <MetricCard 
              title="LP View Rate" 
              value={(() => {
                const lpv = today.meta_landing_page_views || 0;
                const clicks = today.meta_clicks || 0;
                return lpv > 0 && clicks > 0 ? `${(lpv / clicks * 100).toFixed(1)}%` : "—";
              })()} 
              icon={MousePointerClick} 
              variant="info" 
              formula="% dos cliques que viram a LP" 
            />
            <MetricCard 
              title="CPL vs Semana" 
              value={(() => {
                const last7 = stats.slice(-7);
                const avgCpl7 = last7.length > 0 
                  ? last7.reduce((s, d) => {
                      const l = d.leads_total || 0;
                      const spend = (d.meta_spend || 0) + (d.google_spend || 0);
                      return s + (l > 0 ? spend / l : 0);
                    }, 0) / last7.length 
                  : 0;
                if (avgCpl7 === 0) return "—";
                const diff = ((todayCpl - avgCpl7) / avgCpl7) * 100;
                return `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(1)}%`;
              })()} 
              icon={(() => {
                const last7 = stats.slice(-7);
                const avgCpl7 = last7.length > 0 
                  ? last7.reduce((s, d) => {
                      const l = d.leads_total || 0;
                      const spend = (d.meta_spend || 0) + (d.google_spend || 0);
                      return s + (l > 0 ? spend / l : 0);
                    }, 0) / last7.length 
                  : 0;
                return todayCpl <= avgCpl7 ? TrendingDown : TrendingUp;
              })()} 
              variant={(() => {
                const last7 = stats.slice(-7);
                const avgCpl7 = last7.length > 0 
                  ? last7.reduce((s, d) => {
                      const l = d.leads_total || 0;
                      const spend = (d.meta_spend || 0) + (d.google_spend || 0);
                      return s + (l > 0 ? spend / l : 0);
                    }, 0) / last7.length 
                  : 0;
                return todayCpl <= avgCpl7 ? "success" : "destructive";
              })() as any} 
              formula="CPL hoje vs média dos últimos 7 dias" 
            />
            <MetricCard 
              title="Budget Pace" 
              value={(() => {
                const budget = today.monthly_budget || 25000;
                const spentPct = (totalInvestment / budget) * 100;
                const now = new Date();
                const daysInMonth = new Date(selected.year, selected.month, 0).getDate();
                const daysPassed = selected.year === now.getFullYear() && selected.month === (now.getMonth() + 1) 
                  ? now.getDate() 
                  : daysInMonth;
                const timePct = (daysPassed / daysInMonth) * 100;
                return `${spentPct.toFixed(0)}% gasto | ${timePct.toFixed(0)}% do mês`;
              })()} 
              icon={Gauge} 
              variant={(() => {
                const budget = today.monthly_budget || 25000;
                const spentPct = (totalInvestment / budget) * 100;
                const now = new Date();
                const daysInMonth = new Date(selected.year, selected.month, 0).getDate();
                const daysPassed = selected.year === now.getFullYear() && selected.month === (now.getMonth() + 1) 
                  ? now.getDate() 
                  : daysInMonth;
                const timePct = (daysPassed / daysInMonth) * 100;
                return spentPct > timePct + 10 ? "destructive" : "success";
              })() as any} 
              formula="Ritmo de gasto vs dias do mês" 
            />
           </div>
          {/* Fourth row: Top Criativo & Top Público */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Top Criativo" 
              value={(() => {
                const content = today?.leads_by_content;
                if (!content || typeof content !== 'object') return "—";
                const entries = Object.entries(content as Record<string, number>);
                if (entries.length === 0) return "—";
                const top = entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0];
                const name = top[0];
                return name.length > 18 ? name.slice(0, 15) + "…" : name;
              })()} 
              icon={Palette} 
              variant="default" 
            />
            <MetricCard 
              title="Leads do Top Criativo" 
              value={(() => {
                const content = today?.leads_by_content;
                if (!content || typeof content !== 'object') return "0";
                const entries = Object.entries(content as Record<string, number>);
                if (entries.length === 0) return "0";
                const top = entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0];
                return String(Number(top[1]) || 0);
              })()} 
              icon={Target} 
              variant="success" 
            />
            <MetricCard 
              title="Top Público" 
              value={(() => {
                const term = today?.leads_by_term;
                if (!term || typeof term !== 'object') return "—";
                const entries = Object.entries(term as Record<string, number>);
                if (entries.length === 0) return "—";
                const top = entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0];
                const name = top[0];
                return name.length > 18 ? name.slice(0, 15) + "…" : name;
              })()} 
              icon={Users} 
              variant="info" 
            />
            <MetricCard 
              title="Leads do Top Público" 
              value={(() => {
                const term = today?.leads_by_term;
                if (!term || typeof term !== 'object') return "0";
                const entries = Object.entries(term as Record<string, number>);
                if (entries.length === 0) return "0";
                const top = entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0];
                return String(Number(top[1]) || 0);
              })()} 
              icon={Target} 
              variant="success" 
            />
          </div>
        </div>
      )}

      {/* KPIs Mensais */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Acumulado — {selected.label}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Investimento Total" value={formatBRL(totalInvestment)} icon={DollarSign} variant="warning" />
          <MetricCard title="Leads no Mês" value={totalLeads.toString()} icon={UserPlus} variant="success" />
          <MetricCard title="CPL Médio" value={formatBRL(avgCpl)} icon={Target} variant="default" />
          <MetricCard title="CTR Médio Meta" value={`${avgCtr.toFixed(2)}%`} icon={TrendingUp} variant="info" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Meta Ads Total" value={formatBRL(totalMeta)} icon={DollarSign} variant="warning" />
          <MetricCard title="Google Ads Total" value={formatBRL(totalGoogle)} icon={DollarSign} variant="info" />
          <MetricCard title="Cliques Total" value={totalClicks.toString()} icon={TrendingUp} variant="default" />
          <MetricCard title="Leads Orgânicos" value={totalLeadsOrganic.toString()} icon={UserPlus} variant="success" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Alcance Total" 
            value={stats.reduce((s, d) => s + ((d as any).meta_reach || 0), 0).toLocaleString("pt-BR")} 
            icon={Users} 
            variant="default" 
            formula="Soma de alcance Meta no mês" 
          />
          <MetricCard 
            title="LP Views Total" 
            value={stats.reduce((s, d) => s + ((d as any).meta_landing_page_views || 0), 0).toLocaleString("pt-BR")} 
            icon={MousePointerClick} 
            variant="info" 
            formula="Total de visualizações de landing page" 
          />
          <MetricCard 
            title="Frequência Média" 
            value={(stats.reduce((s, d) => s + ((d as any).meta_frequency || 0), 0) / stats.length).toFixed(2)} 
            icon={Eye} 
            variant="default" 
            formula="Frequência média do Meta no mês" 
          />
          <MetricCard 
            title="LP View Rate Mês" 
            value={(() => {
              const totalLpViews = stats.reduce((s, d) => s + ((d as any).meta_landing_page_views || 0), 0);
              const totalMetaClicks = stats.reduce((s, d) => s + (d.meta_clicks || 0), 0);
              return totalMetaClicks > 0 ? `${(totalLpViews / totalMetaClicks * 100).toFixed(1)}%` : "—";
            })()} 
            icon={Target} 
            variant="success" 
            formula="% dos cliques que viram a LP no mês" 
          />
        </div>
      </div>

      {/* Últimos 2 dias disponíveis */}
      {today && yesterday && (
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

      {/* Health Indicators */}
      <MarketingHealthIndicators stats={stats} />

      {/* Top Criativos */}
      <TopCreativesTable stats={stats} />

      {/* Origem dos Leads */}
      <LeadsBySourceBreakdown stats={stats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Investimento por Canal</h3>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
              <Bar dataKey="meta_spend" fill="hsl(270, 70%, 60%)" radius={[3, 3, 0, 0]} name="Meta" />
              <Bar dataKey="google_spend" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} name="Google" />
            </BarChart>
          </ChartContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{background:"hsl(270,70%,60%)"}}></span>Meta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{background:"hsl(217,91%,60%)"}}></span>Google</span>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Leads por Dia</h3>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="leads_total" stroke="hsl(var(--info))" fill="url(#leadsGrad)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">CPL Real Meta (R$)</h3>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
              <Line type="monotone" dataKey="cpl_real_meta" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>

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
                {[...stats].reverse().map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-mono text-xs">
                      {new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(d.meta_spend || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(d.google_spend || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-info">{d.leads_total || 0}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {d.cpl_real_meta > 0 ? formatBRL(d.cpl_real_meta) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
