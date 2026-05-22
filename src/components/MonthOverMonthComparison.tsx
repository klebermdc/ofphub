import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseOrderDate } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  CalendarClock,
  TrendingUp,
  Target,
  Users,
  ShoppingCart,
  DollarSign,
  Percent,
  Trophy,
  Activity,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Metric = "leads" | "pedidos" | "vendas";
type ViewMode = "daily" | "cumulative";
type ChartType = "line" | "bar";

interface DailyPoint {
  day: number;
  leads: number;
  pedidos: number;
  vendas: number;
}

interface OrderRow {
  day: number;
  month: number;
  year: number;
  venda: number;
  vendedor: string;
  produto: string;
  fornecedor: string;
}

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatBRLFull(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildEmptySeries(maxDay: number): DailyPoint[] {
  return Array.from({ length: maxDay }, (_, i) => ({
    day: i + 1,
    leads: 0,
    pedidos: 0,
    vendas: 0,
  }));
}

export function MonthOverMonthComparison() {
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("vendas");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");

  // Filters
  const [vendorFilter, setVendorFilter] = useState<string>("__all__");
  const [supplierFilter, setSupplierFilter] = useState<string>("__all__");
  const [productSearch, setProductSearch] = useState<string>("");

  // Raw data (unfiltered)
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [leadsByDate, setLeadsByDate] = useState<Record<string, number>>({});

  const [tick, setTick] = useState(0);

  // Auto-refresh: every 5 min, at midnight, on tab focus
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const midnightTimeout = setTimeout(() => setTick((t) => t + 1), nextMidnight.getTime() - now.getTime());
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      clearTimeout(midnightTimeout);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const today = useMemo(() => new Date(), [tick]);
  const todayDay = today.getDate();

  // User-selectable comparison periods (both capped at today's day-of-month)
  const defaultB = { month: today.getMonth() + 1, year: today.getFullYear() };
  const _prev = new Date(defaultB.year, defaultB.month - 2, 1);
  const defaultA = { month: _prev.getMonth() + 1, year: _prev.getFullYear() };
  const [periodA, setPeriodA] = useState(`${defaultA.year}-${pad(defaultA.month)}`);
  const [periodB, setPeriodB] = useState(`${defaultB.year}-${pad(defaultB.month)}`);

  const [ay, am] = periodA.split("-").map(Number);
  const [by, bm] = periodB.split("-").map(Number);
  const prev = { month: am, year: ay };
  const curMonth = bm;
  const curYear = by;

  const prevMonthLastDay = new Date(prev.year, prev.month, 0).getDate();
  const prevCompareDay = Math.min(todayDay, prevMonthLastDay);
  const curMonthLastDay = new Date(curYear, curMonth, 0).getDate();
  const curCompareDay = Math.min(todayDay, curMonthLastDay);

  // Month options: last 24 months
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      opts.push({
        value: `${y}-${pad(m)}`,
        label: `${MONTH_NAMES[m - 1]} / ${y}`,
      });
    }
    return opts;
  }, [today]);


  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const startPrev = `${prev.year}-${pad(prev.month)}-01`;
        const endCur = `${curYear}-${pad(curMonth)}-${pad(curMonthLastDay)}`;

        // Leads from marketing_daily_stats
        const { data: statsData } = await supabase
          .from("marketing_daily_stats")
          .select("date, leads_total")
          .gte("date", startPrev)
          .lte("date", endCur);

        const leadsMap: Record<string, number> = {};
        (statsData || []).forEach((row: any) => {
          if (row.date) leadsMap[String(row.date)] = (leadsMap[String(row.date)] || 0) + (Number(row.leads_total) || 0);
        });

        // Orders - paginate full table, filter client-side by month
        const orders: OrderRow[] = [];
        const pageSize = 1000;
        for (let page = 0; page < 20; page++) {
          const { data: rows, error } = await supabase
            .from("orders")
            .select("data, venda, vendedor, produto, fornecedor")
            .range(page * pageSize, page * pageSize + pageSize - 1);
          if (error || !rows || rows.length === 0) break;
          for (const r of rows) {
            const p = parseOrderDate(r.data || "");
            if (!p) continue;
            if (
              (p.month === curMonth && p.year === curYear) ||
              (p.month === prev.month && p.year === prev.year)
            ) {
              orders.push({
                day: p.day,
                month: p.month,
                year: p.year,
                venda: Number(r.venda) || 0,
                vendedor: r.vendedor || "",
                produto: r.produto || "",
                fornecedor: r.fornecedor || "",
              });
            }
          }
          if (rows.length < pageSize) break;
        }

        if (!cancelled) {
          setAllOrders(orders);
          setLeadsByDate(leadsMap);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [curMonth, curYear, prev.month, prev.year, curMonthLastDay, tick]);

  // Filter options
  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach((o) => o.vendedor && set.add(o.vendedor));
    return Array.from(set).sort();
  }, [allOrders]);

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach((o) => o.fornecedor && set.add(o.fornecedor));
    return Array.from(set).sort();
  }, [allOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return allOrders.filter((o) => {
      if (vendorFilter !== "__all__" && o.vendedor !== vendorFilter) return false;
      if (supplierFilter !== "__all__" && o.fornecedor !== supplierFilter) return false;
      if (q && !o.produto.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allOrders, vendorFilter, supplierFilter, productSearch]);

  // Build series from filtered orders
  const { currentSeries, previousSeries } = useMemo(() => {
    const cur = buildEmptySeries(curCompareDay);
    const prv = buildEmptySeries(prevCompareDay);

    filteredOrders.forEach((o) => {
      if (o.month === curMonth && o.year === curYear && o.day <= curCompareDay) {
        cur[o.day - 1].pedidos += 1;
        cur[o.day - 1].vendas += o.venda;
      } else if (o.month === prev.month && o.year === prev.year && o.day <= prevCompareDay) {
        prv[o.day - 1].pedidos += 1;
        prv[o.day - 1].vendas += o.venda;
      }
    });

    // Leads — global (not filterable by vendor/produto)
    Object.entries(leadsByDate).forEach(([date, leads]) => {
      const [y, m, d] = date.split("-").map(Number);
      if (m === curMonth && y === curYear && d <= curCompareDay) {
        cur[d - 1].leads += leads;
      } else if (m === prev.month && y === prev.year && d <= prevCompareDay) {
        prv[d - 1].leads += leads;
      }
    });

    return { currentSeries: cur, previousSeries: prv };
  }, [filteredOrders, leadsByDate, curMonth, curYear, prev.month, prev.year, curCompareDay, prevCompareDay]);

  const curTotals = useMemo(() => ({
    leads: currentSeries.reduce((s, d) => s + d.leads, 0),
    pedidos: currentSeries.reduce((s, d) => s + d.pedidos, 0),
    vendas: currentSeries.reduce((s, d) => s + d.vendas, 0),
  }), [currentSeries]);

  const prvTotals = useMemo(() => ({
    leads: previousSeries.reduce((s, d) => s + d.leads, 0),
    pedidos: previousSeries.reduce((s, d) => s + d.pedidos, 0),
    vendas: previousSeries.reduce((s, d) => s + d.vendas, 0),
  }), [previousSeries]);

  // Derived KPIs
  const kpis = useMemo(() => {
    const ticketCur = curTotals.pedidos > 0 ? curTotals.vendas / curTotals.pedidos : 0;
    const ticketPrv = prvTotals.pedidos > 0 ? prvTotals.vendas / prvTotals.pedidos : 0;
    const convCur = curTotals.leads > 0 ? (curTotals.pedidos / curTotals.leads) * 100 : 0;
    const convPrv = prvTotals.leads > 0 ? (prvTotals.pedidos / prvTotals.leads) * 100 : 0;
    const vplCur = curTotals.leads > 0 ? curTotals.vendas / curTotals.leads : 0;
    const vplPrv = prvTotals.leads > 0 ? prvTotals.vendas / prvTotals.leads : 0;

    const avgDayCur = curCompareDay > 0 ? curTotals.vendas / curCompareDay : 0;
    const avgDayPrv = prevCompareDay > 0 ? prvTotals.vendas / prevCompareDay : 0;

    // Projection for current month: avg daily * total days in month
    const projection = avgDayCur * curMonthLastDay;

    // Previous month FULL total (we only loaded up to compare day, but for projection comparison we use the cap value)
    // For now we use the up-to-day total for previous as proxy reference.
    const bestDayCur = currentSeries.reduce((best, d) => (d.vendas > best.vendas ? d : best), { day: 0, vendas: 0 } as any);
    const bestDayPrv = previousSeries.reduce((best, d) => (d.vendas > best.vendas ? d : best), { day: 0, vendas: 0 } as any);

    const daysWithSalesCur = currentSeries.filter((d) => d.vendas > 0).length;
    const daysWithSalesPrv = previousSeries.filter((d) => d.vendas > 0).length;

    return {
      ticketCur, ticketPrv,
      convCur, convPrv,
      vplCur, vplPrv,
      avgDayCur, avgDayPrv,
      projection,
      bestDayCur, bestDayPrv,
      daysWithSalesCur, daysWithSalesPrv,
    };
  }, [curTotals, prvTotals, curCompareDay, prevCompareDay, curMonthLastDay, currentSeries, previousSeries]);

  // Chart data — supports daily or cumulative
  const chartData = useMemo(() => {
    const maxDay = Math.max(curCompareDay, prevCompareDay);
    let cumCur = 0;
    let cumPrv = 0;
    return Array.from({ length: maxDay }, (_, i) => {
      const day = i + 1;
      const aRaw = currentSeries[i]?.[metric] ?? null;
      const bRaw = previousSeries[i]?.[metric] ?? null;
      if (viewMode === "cumulative") {
        if (aRaw != null) cumCur += aRaw;
        if (bRaw != null) cumPrv += bRaw;
        return {
          day,
          atual: i < curCompareDay ? cumCur : null,
          anterior: i < prevCompareDay ? cumPrv : null,
        };
      }
      return { day, atual: aRaw, anterior: bRaw };
    });
  }, [currentSeries, previousSeries, metric, viewMode, curCompareDay, prevCompareDay]);

  const tableRows = useMemo(() => {
    const maxDay = Math.max(curCompareDay, prevCompareDay);
    return Array.from({ length: maxDay }, (_, i) => {
      const day = i + 1;
      const a = currentSeries[i]?.[metric] ?? 0;
      const b = previousSeries[i]?.[metric] ?? 0;
      const diff = a - b;
      const pct = b === 0 ? (a > 0 ? 100 : 0) : (diff / b) * 100;
      return { day, anterior: b, atual: a, diff, pct };
    });
  }, [currentSeries, previousSeries, metric, curCompareDay, prevCompareDay]);

  function formatValue(value: number, m: Metric = metric) {
    if (m === "vendas") return formatBRL(value);
    return value.toLocaleString("pt-BR");
  }

  function pctChange(a: number, b: number) {
    if (b === 0) return a > 0 ? 100 : 0;
    return ((a - b) / b) * 100;
  }

  // ====== Sub-components ======

  const KPICard = ({
    icon: Icon,
    label,
    value,
    previous,
    formatter = (n: number) => n.toLocaleString("pt-BR"),
    suffix,
    accent = "default",
  }: {
    icon: any;
    label: string;
    value: number;
    previous: number;
    formatter?: (n: number) => string;
    suffix?: string;
    accent?: "default" | "primary";
  }) => {
    const change = pctChange(value, previous);
    return (
      <div
        className={cn(
          "rounded-xl border p-3 space-y-1.5",
          accent === "primary" ? "border-primary/30 bg-primary/5" : "border-border/40 bg-background/40",
        )}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="truncate">{label}</span>
        </div>
        <p className="text-lg font-bold leading-tight">
          {formatter(value)}{suffix}
        </p>
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="text-muted-foreground truncate">
            ant: {formatter(previous)}{suffix}
          </span>
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded shrink-0",
              change > 0 && "text-emerald-500 bg-emerald-500/10",
              change < 0 && "text-red-500 bg-red-500/10",
              change === 0 && "text-muted-foreground bg-muted",
            )}
          >
            {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const refreshLabel = useMemo(() => {
    return today.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [today]);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="glass rounded-xl p-6 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Comparativo mês a mês (até hoje)</h3>
              <p className="text-xs text-muted-foreground">
                Até dia {prevCompareDay} de {MONTH_NAMES[prev.month - 1]} vs. até dia {curCompareDay} de {MONTH_NAMES[curMonth - 1]}
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  atualizado às {refreshLabel}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Period selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Mês A (referência)</label>
            <Select value={periodA} onValueChange={setPeriodA}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="capitalize">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-center text-xs font-semibold text-muted-foreground pt-5">VS</div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Mês B (comparar)</label>
            <Select value={periodB} onValueChange={setPeriodB}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="capitalize">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ambos os meses são comparados até o dia <strong>{todayDay}</strong> (dia de hoje) ou o último dia do mês, o que vier primeiro.
        </p>


        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os vendedores</SelectItem>
                {vendorOptions.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os fornecedores</SelectItem>
              {supplierOptions.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar produto..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="h-9 text-xs"
          />
          <div className="flex items-center gap-1 bg-muted rounded-md p-1 justify-center">
            {(["leads", "pedidos", "vendas"] as Metric[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={metric === m ? "default" : "ghost"}
                className="h-7 px-3 text-xs capitalize flex-1"
                onClick={() => setMetric(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
        {(vendorFilter !== "__all__" || supplierFilter !== "__all__" || productSearch) && (
          <p className="text-[11px] text-muted-foreground">
            ⓘ Filtros aplicados a pedidos e vendas. Leads são totais globais (não filtráveis).
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-[11px]"
              onClick={() => { setVendorFilter("__all__"); setSupplierFilter("__all__"); setProductSearch(""); }}
            >
              Limpar filtros
            </Button>
          </p>
        )}
      </div>

      {/* Side-by-side month cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl border border-border/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium capitalize">{MONTH_NAMES[prev.month - 1]} / {prev.year}</h4>
            <span className="text-xs text-muted-foreground">até dia {prevCompareDay}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <KPICard icon={Users} label="Leads" value={prvTotals.leads} previous={prvTotals.leads} />
            <KPICard icon={ShoppingCart} label="Pedidos" value={prvTotals.pedidos} previous={prvTotals.pedidos} />
            <KPICard icon={DollarSign} label="Vendas" value={prvTotals.vendas} previous={prvTotals.vendas} formatter={formatBRL} />
          </div>
        </div>
        <div className="glass rounded-xl border border-primary/30 p-4 space-y-3 bg-primary/5">
          <div className="flex items-center justify-between">
            <h4 className="font-medium capitalize">{MONTH_NAMES[curMonth - 1]} / {curYear}</h4>
            <span className="text-xs text-muted-foreground">até dia {curCompareDay}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <KPICard icon={Users} label="Leads" value={curTotals.leads} previous={prvTotals.leads} accent="primary" />
            <KPICard icon={ShoppingCart} label="Pedidos" value={curTotals.pedidos} previous={prvTotals.pedidos} accent="primary" />
            <KPICard icon={DollarSign} label="Vendas" value={curTotals.vendas} previous={prvTotals.vendas} formatter={formatBRL} accent="primary" />
          </div>
        </div>
      </div>

      {/* Advanced KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={DollarSign}
          label="Ticket médio"
          value={kpis.ticketCur}
          previous={kpis.ticketPrv}
          formatter={formatBRLFull}
        />
        <KPICard
          icon={Percent}
          label="Conversão (ped/lead)"
          value={kpis.convCur}
          previous={kpis.convPrv}
          formatter={(n) => n.toFixed(2)}
          suffix="%"
        />
        <KPICard
          icon={Activity}
          label="Venda por lead"
          value={kpis.vplCur}
          previous={kpis.vplPrv}
          formatter={formatBRL}
        />
        <KPICard
          icon={TrendingUp}
          label="Média diária"
          value={kpis.avgDayCur}
          previous={kpis.avgDayPrv}
          formatter={formatBRL}
        />
        <KPICard
          icon={Target}
          label={`Projeção ${MONTH_NAMES[curMonth - 1]}`}
          value={kpis.projection}
          previous={prvTotals.vendas}
          formatter={formatBRL}
        />
        <KPICard
          icon={Trophy}
          label="Melhor dia (vendas)"
          value={kpis.bestDayCur.vendas}
          previous={kpis.bestDayPrv.vendas}
          formatter={(n) => n > 0 ? formatBRL(n) : "—"}
        />
      </div>

      {/* Chart */}
      <div className="glass rounded-xl p-6 space-y-3 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-semibold capitalize">Evolução: {metric}</h4>
            <p className="text-xs text-muted-foreground">
              {viewMode === "cumulative" ? "Visão acumulada" : "Visão diária"} ·
              {" "}{kpis.daysWithSalesCur} dias com venda este mês (vs {kpis.daysWithSalesPrv} no anterior)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              {(["daily", "cumulative"] as ViewMode[]).map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={viewMode === v ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setViewMode(v)}
                >
                  {v === "daily" ? "Diário" : "Acumulado"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              {(["line", "bar"] as ChartType[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={chartType === t ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setChartType(t)}
                >
                  {t === "line" ? "Linha" : "Barra"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(v) => (metric === "vendas" ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any) => formatValue(Number(value))}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="anterior" name={`${MONTH_NAMES[prev.month - 1]} (anterior)`} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="atual" name={`${MONTH_NAMES[curMonth - 1]} (atual)`} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(v) => (metric === "vendas" ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any) => formatValue(Number(value))}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="anterior" name={`${MONTH_NAMES[prev.month - 1]} (anterior)`} fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atual" name={`${MONTH_NAMES[curMonth - 1]} (atual)`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl p-4 animate-slide-up">
        <h4 className="font-semibold mb-3 capitalize">Detalhamento diário: {metric}</h4>
        <div className="overflow-auto max-h-96 rounded-lg border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Dia</th>
                <th className="px-3 py-2 font-medium capitalize">{metric} ({MONTH_NAMES[prev.month - 1]})</th>
                <th className="px-3 py-2 font-medium capitalize">{metric} ({MONTH_NAMES[curMonth - 1]})</th>
                <th className="px-3 py-2 font-medium">Diferença</th>
                <th className="px-3 py-2 font-medium">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.day} className="border-t border-border/30">
                  <td className="px-3 py-1.5">{pad(r.day)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{formatValue(r.anterior)}</td>
                  <td className="px-3 py-1.5 font-medium">{formatValue(r.atual)}</td>
                  <td className={cn("px-3 py-1.5", r.diff > 0 && "text-emerald-500", r.diff < 0 && "text-red-500")}>
                    {r.diff > 0 ? "+" : ""}
                    {formatValue(r.diff)}
                  </td>
                  <td className={cn("px-3 py-1.5 font-medium", r.pct > 0 && "text-emerald-500", r.pct < 0 && "text-red-500")}>
                    {r.pct > 0 ? "+" : ""}
                    {r.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
