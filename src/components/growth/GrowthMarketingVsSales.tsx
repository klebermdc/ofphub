import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { ParsedOrder, MONTH_NAMES, formatBRL, formatCompact, GrowthRow } from "./growthUtils";

const tooltipStyle = { backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

interface MonthlyMarketing {
  month: number;
  year: number;
  metaSpend: number;
  googleSpend: number;
  leadsTotal: number;
  leadsMeta: number;
  leadsGoogle: number;
  leadsOrganic: number;
  metaCtr: number;
  cplRealMeta: number;
  days: number;
}

interface Props {
  orders: ParsedOrder[];
  growthData: GrowthRow[];
  filterYear: number | null;
}

export function GrowthMarketingVsSales({ orders, growthData, filterYear }: Props) {
  const [mktData, setMktData] = useState<MonthlyMarketing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("marketing_daily_stats")
        .select("date, meta_spend, google_spend, leads_total, leads_meta, leads_google, leads_organic, meta_ctr, cpl_real_meta");
      if (!data) { setLoading(false); return; }

      const map = new Map<string, MonthlyMarketing>();
      for (const row of data) {
        const d = new Date(row.date);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const key = `${y}-${m}`;
        const cur = map.get(key) || { month: m, year: y, metaSpend: 0, googleSpend: 0, leadsTotal: 0, leadsMeta: 0, leadsGoogle: 0, leadsOrganic: 0, metaCtr: 0, cplRealMeta: 0, days: 0 };
        cur.metaSpend += Number(row.meta_spend) || 0;
        cur.googleSpend += Number(row.google_spend) || 0;
        cur.leadsTotal += Number(row.leads_total) || 0;
        cur.leadsMeta += Number(row.leads_meta) || 0;
        cur.leadsGoogle += Number(row.leads_google) || 0;
        cur.leadsOrganic += Number(row.leads_organic) || 0;
        cur.metaCtr += Number(row.meta_ctr) || 0;
        cur.cplRealMeta += Number(row.cpl_real_meta) || 0;
        cur.days += 1;
        map.set(key, cur);
      }
      // Average CTR and CPL
      for (const v of map.values()) {
        if (v.days > 0) {
          v.metaCtr = v.metaCtr / v.days;
          v.cplRealMeta = v.cplRealMeta / v.days;
        }
      }
      setMktData(Array.from(map.values()));
      setLoading(false);
    }
    fetch();
  }, []);

  const monthlyOrders = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number; sellers: Set<string> }>();
    for (const o of orders) {
      const key = `${o.year}-${o.month}`;
      const cur = map.get(key) || { revenue: 0, count: 0, sellers: new Set<string>() };
      cur.revenue += o.venda;
      cur.count += 1;
      cur.sellers.add(o.vendedor);
      map.set(key, cur);
    }
    return map;
  }, [orders]);

  const combined = useMemo(() => {
    const allKeys = new Set<string>();
    mktData.forEach(m => allKeys.add(`${m.year}-${m.month}`));
    orders.forEach(o => allKeys.add(`${o.year}-${o.month}`));
    growthData.forEach(g => allKeys.add(`${g.year}-${g.month}`));

    const rows = Array.from(allKeys).map(key => {
      const [y, m] = key.split('-').map(Number);
      const mkt = mktData.find(d => d.year === y && d.month === m);
      const ord = monthlyOrders.get(key);
      const gr = growthData.find(d => d.year === y && d.month === m);
      const totalSpend = (mkt?.metaSpend || 0) + (mkt?.googleSpend || 0);
      const revenue = gr?.revenue || ord?.revenue || 0;
      const pedidos = ord?.count || 0;
      const roas = totalSpend > 0 ? revenue / totalSpend : 0;
      const cac = pedidos > 0 ? totalSpend / pedidos : 0;
      const cpl = (mkt?.leadsTotal || 0) > 0 ? totalSpend / mkt!.leadsTotal : 0;
      const ticketMedio = pedidos > 0 ? revenue / pedidos : 0;
      const convRate = (mkt?.leadsTotal || 0) > 0 ? (pedidos / mkt!.leadsTotal) * 100 : 0;
      return {
        key, month: m, year: y, label: `${MONTH_NAMES[m - 1]}/${y.toString().slice(2)}`,
        metaSpend: mkt?.metaSpend || 0, googleSpend: mkt?.googleSpend || 0, totalSpend,
        leadsTotal: mkt?.leadsTotal || 0, leadsMeta: mkt?.leadsMeta || 0, leadsGoogle: mkt?.leadsGoogle || 0,
        leadsOrganic: mkt?.leadsOrganic || 0, cplRealMeta: mkt?.cplRealMeta || 0,
        revenue, pedidos, roas, cac, cpl, ticketMedio, convRate, hasMkt: !!mkt,
      };
    }).sort((a, b) => a.year - b.year || a.month - b.month);

    if (filterYear) return rows.filter(r => r.year === filterYear);
    return rows;
  }, [mktData, orders, growthData, monthlyOrders, filterYear]);

  const withMkt = combined.filter(r => r.hasMkt);

  // Current month KPIs
  const now = new Date();
  const currentMonth = combined.find(r => r.year === now.getFullYear() && r.month === now.getMonth() + 1);
  const yearRows = combined.filter(r => r.year === 2026);
  const totalInvested = yearRows.reduce((s, r) => s + r.totalSpend, 0);
  const totalLeads = yearRows.reduce((s, r) => s + r.leadsTotal, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Marketing vs Vendas</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="ROAS Mês Atual" value={currentMonth ? `${currentMonth.roas.toFixed(1)}x` : "—"} icon={TrendingUp} variant={currentMonth && currentMonth.roas >= 5 ? "success" : currentMonth && currentMonth.roas >= 3 ? "warning" : "danger"} delay={0} formula="Faturamento ÷ Gasto em Ads" />
        <MetricCard title="CAC Mês Atual" value={currentMonth ? formatCompact(currentMonth.cac) : "—"} icon={Target} variant={currentMonth && currentMonth.cac < currentMonth.ticketMedio ? "success" : "danger"} delay={100} formula="Gasto Ads ÷ Nº Pedidos" />
        <MetricCard title="Investido 2026" value={formatCompact(totalInvested)} icon={DollarSign} variant="info" delay={200} />
        <MetricCard title="Leads 2026" value={totalLeads.toLocaleString("pt-BR")} icon={Users} variant="info" delay={300} />
      </div>

      {withMkt.length === 0 && (
        <Card className="glass">
          <CardContent className="py-8 text-center text-muted-foreground">
            Dados de marketing disponíveis a partir de abril 2026. Abaixo, apenas dados de vendas.
          </CardContent>
        </Card>
      )}

      {/* 1. Investimento vs Faturamento */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Investimento Marketing vs Faturamento</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combined} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis yAxisId="left" tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number, name: string) => [formatBRL(v), name]} contentStyle={tooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="metaSpend" stackId="spend" fill="#8B5CF6" name="Meta Ads" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="googleSpend" stackId="spend" fill="#3B82F6" name="Google Ads" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" dataKey="revenue" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3 }} name="Faturamento" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Funil de Conversão */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Funil: Leads → Vendas</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combined} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="leadsTotal" fill="#3B82F6" name="Leads" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pedidos" fill="#22C55E" name="Pedidos" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {withMkt.map(r => (
              <Badge key={r.key} variant="outline" className="text-xs">
                {MONTH_NAMES[r.month - 1]}: {r.convRate.toFixed(1)}% conv.
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. ROAS */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">ROAS — Retorno sobre Investimento em Ads</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={withMkt} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={v => `${v}x`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}x`, "ROAS"]} contentStyle={tooltipStyle} />
                <ReferenceLine y={5} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: "5x", position: "right", fontSize: 11, fill: "#F59E0B" }} />
                <Line dataKey="roas" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4 }} name="ROAS" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Gasto Ads</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-center">ROAS</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withMkt.map((r, i) => (
                  <TableRow key={r.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right text-xs">{formatBRL(r.totalSpend)}</TableCell>
                    <TableCell className="text-right">{r.leadsTotal}</TableCell>
                    <TableCell className="text-right">{r.pedidos}</TableCell>
                    <TableCell className="text-right text-xs">{formatBRL(r.revenue)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.roas >= 5 ? "default" : "destructive"} className={r.roas >= 5 ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : r.roas >= 3 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}>
                        {r.roas.toFixed(1)}x
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{formatBRL(r.cpl)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. CAC */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">CAC — Custo por Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={withMkt} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number, name: string) => [formatBRL(v), name]} contentStyle={tooltipStyle} />
                <Legend />
                <Line dataKey="cac" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} name="CAC" />
                <Line dataKey="ticketMedio" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Ticket Médio" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Quando o CAC ultrapassa o Ticket Médio, indica prejuízo na aquisição.</p>
        </CardContent>
      </Card>

      {/* 5. Eficiência por Canal */}
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Eficiência: Meta vs Google</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const totMeta = withMkt.reduce((s, r) => s + r.metaSpend, 0);
            const totGoogle = withMkt.reduce((s, r) => s + r.googleSpend, 0);
            const ldsMeta = withMkt.reduce((s, r) => s + r.leadsMeta, 0);
            const ldsGoogle = withMkt.reduce((s, r) => s + r.leadsGoogle, 0);
            const cplMeta = ldsMeta > 0 ? totMeta / ldsMeta : 0;
            const cplGoogle = ldsGoogle > 0 ? totGoogle / ldsGoogle : 0;
            const per1kMeta = totMeta > 0 ? (ldsMeta / totMeta) * 1000 : 0;
            const per1kGoogle = totGoogle > 0 ? (ldsGoogle / totGoogle) * 1000 : 0;
            const chartEff = [
              { metric: "Gasto (R$)", Meta: totMeta, Google: totGoogle },
              { metric: "Leads", Meta: ldsMeta, Google: ldsGoogle },
              { metric: "CPL (R$)", Meta: cplMeta, Google: cplGoogle },
              { metric: "Leads/R$1K", Meta: per1kMeta, Google: per1kGoogle },
            ];
            return (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartEff} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis type="category" dataKey="metric" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => v >= 100 ? formatBRL(v) : v.toFixed(1)} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="Meta" fill="#8B5CF6" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="Google" fill="#3B82F6" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
