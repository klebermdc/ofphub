import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseOrderDate } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Metric = "leads" | "pedidos" | "vendas";

interface DailyPoint {
  day: number;
  leads: number;
  pedidos: number;
  vendas: number;
}

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
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
  const [currentSeries, setCurrentSeries] = useState<DailyPoint[]>([]);
  const [previousSeries, setPreviousSeries] = useState<DailyPoint[]>([]);

  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();
  const prev = useMemo(() => {
    const d = new Date(curYear, curMonth - 2, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }, [curMonth, curYear]);

  // Cap previous comparison day to last day of previous month (e.g. today=31, prev month has 30 days)
  const prevMonthLastDay = new Date(prev.year, prev.month, 0).getDate();
  const prevCompareDay = Math.min(todayDay, prevMonthLastDay);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Date range for marketing_daily_stats (covers both months)
        const startPrev = `${prev.year}-${pad(prev.month)}-01`;
        const endCur = `${curYear}-${pad(curMonth)}-${pad(todayDay)}`;

        // Fetch leads from marketing_daily_stats
        const { data: statsData } = await supabase
          .from("marketing_daily_stats")
          .select("date, leads_total")
          .gte("date", startPrev)
          .lte("date", endCur);

        // Fetch orders for both months — paginate up to 5000 rows
        const orders: { data: string; venda: number; month: number; year: number; day: number }[] = [];
        const pageSize = 1000;
        for (let page = 0; page < 10; page++) {
          const { data: rows, error } = await supabase
            .from("orders")
            .select("data, venda")
            .range(page * pageSize, page * pageSize + pageSize - 1);
          if (error || !rows || rows.length === 0) break;
          for (const r of rows) {
            const p = parseOrderDate(r.data || "");
            if (!p) continue;
            if (
              (p.month === curMonth && p.year === curYear) ||
              (p.month === prev.month && p.year === prev.year)
            ) {
              orders.push({ data: r.data, venda: Number(r.venda) || 0, ...p });
            }
          }
          if (rows.length < pageSize) break;
        }

        const cur = buildEmptySeries(todayDay);
        const prv = buildEmptySeries(prevCompareDay);

        // Orders -> pedidos + vendas
        orders.forEach((o) => {
          if (o.month === curMonth && o.year === curYear && o.day <= todayDay) {
            cur[o.day - 1].pedidos += 1;
            cur[o.day - 1].vendas += o.venda;
          } else if (o.month === prev.month && o.year === prev.year && o.day <= prevCompareDay) {
            prv[o.day - 1].pedidos += 1;
            prv[o.day - 1].vendas += o.venda;
          }
        });

        // Leads
        (statsData || []).forEach((row: any) => {
          if (!row.date) return;
          const [y, m, d] = String(row.date).split("-").map(Number);
          const leads = Number(row.leads_total) || 0;
          if (m === curMonth && y === curYear && d <= todayDay) {
            cur[d - 1].leads += leads;
          } else if (m === prev.month && y === prev.year && d <= prevCompareDay) {
            prv[d - 1].leads += leads;
          }
        });

        if (!cancelled) {
          setCurrentSeries(cur);
          setPreviousSeries(prv);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [curMonth, curYear, prev.month, prev.year, todayDay, prevCompareDay]);

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

  // Build chart data: merge by day (1..todayDay)
  const chartData = useMemo(() => {
    const maxDay = Math.max(todayDay, prevCompareDay);
    return Array.from({ length: maxDay }, (_, i) => {
      const day = i + 1;
      return {
        day,
        atual: currentSeries[i]?.[metric] ?? null,
        anterior: previousSeries[i]?.[metric] ?? null,
      };
    });
  }, [currentSeries, previousSeries, metric, todayDay, prevCompareDay]);

  const tableRows = useMemo(() => {
    const maxDay = Math.max(todayDay, prevCompareDay);
    return Array.from({ length: maxDay }, (_, i) => {
      const day = i + 1;
      const a = currentSeries[i]?.[metric] ?? 0;
      const b = previousSeries[i]?.[metric] ?? 0;
      const diff = a - b;
      const pct = b === 0 ? (a > 0 ? 100 : 0) : (diff / b) * 100;
      return { day, anterior: b, atual: a, diff, pct };
    });
  }, [currentSeries, previousSeries, metric, todayDay, prevCompareDay]);

  function formatValue(value: number, m: Metric = metric) {
    if (m === "vendas") return formatBRL(value);
    return value.toLocaleString("pt-BR");
  }

  function pctChange(a: number, b: number) {
    if (b === 0) return a > 0 ? 100 : 0;
    return ((a - b) / b) * 100;
  }

  const MetricChip = ({ label, current, previous, m }: { label: string; current: number; previous: number; m: Metric }) => {
    const change = pctChange(current, previous);
    return (
      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{formatValue(current, m)}</p>
        <div className="flex items-center gap-1 text-xs mt-0.5">
          <span className="text-muted-foreground">ant: {formatValue(previous, m)}</span>
          <span
            className={cn(
              "ml-auto flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded",
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

  return (
    <div className="glass rounded-xl p-6 animate-slide-up space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Comparativo mês a mês (até hoje)</h3>
            <p className="text-xs text-muted-foreground">
              Até dia {prevCompareDay} de {MONTH_NAMES[prev.month - 1]} vs. até dia {todayDay} de {MONTH_NAMES[curMonth - 1]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          {(["leads", "pedidos", "vendas"] as Metric[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={metric === m ? "default" : "ghost"}
              className="h-7 px-3 text-xs capitalize"
              onClick={() => setMetric(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      {/* Side-by-side month cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium capitalize">{MONTH_NAMES[prev.month - 1]} / {prev.year}</h4>
            <span className="text-xs text-muted-foreground">até dia {prevCompareDay}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricChip label="Leads" current={prvTotals.leads} previous={prvTotals.leads} m="leads" />
            <MetricChip label="Pedidos" current={prvTotals.pedidos} previous={prvTotals.pedidos} m="pedidos" />
            <MetricChip label="Vendas" current={prvTotals.vendas} previous={prvTotals.vendas} m="vendas" />
          </div>
        </div>
        <div className="rounded-xl border border-primary/30 p-4 space-y-3 bg-primary/5">
          <div className="flex items-center justify-between">
            <h4 className="font-medium capitalize">{MONTH_NAMES[curMonth - 1]} / {curYear}</h4>
            <span className="text-xs text-muted-foreground">até dia {todayDay}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricChip label="Leads" current={curTotals.leads} previous={prvTotals.leads} m="leads" />
            <MetricChip label="Pedidos" current={curTotals.pedidos} previous={prvTotals.pedidos} m="pedidos" />
            <MetricChip label="Vendas" current={curTotals.vendas} previous={prvTotals.vendas} m="vendas" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => (metric === "vendas" ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: any) => formatValue(Number(value))}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="anterior"
                name={`${MONTH_NAMES[prev.month - 1]} (anterior)`}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="atual"
                name={`${MONTH_NAMES[curMonth - 1]} (atual)`}
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-80 rounded-lg border border-border/40">
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
                <td
                  className={cn(
                    "px-3 py-1.5",
                    r.diff > 0 && "text-emerald-500",
                    r.diff < 0 && "text-red-500",
                  )}
                >
                  {r.diff > 0 ? "+" : ""}
                  {formatValue(r.diff)}
                </td>
                <td
                  className={cn(
                    "px-3 py-1.5 font-medium",
                    r.pct > 0 && "text-emerald-500",
                    r.pct < 0 && "text-red-500",
                  )}
                >
                  {r.pct > 0 ? "+" : ""}
                  {r.pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
