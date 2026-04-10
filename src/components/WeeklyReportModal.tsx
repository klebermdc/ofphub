import { useEffect, useState, useRef, useMemo } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep } from "@/types/sales";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

interface WeeklyReportModalProps {
  salesReps: SalesRep[];
  currentMonth: string;
  open: boolean;
  onClose: () => void;
}

interface MarketingDay {
  date: string;
  meta_spend: number;
  google_spend: number;
  leads_total: number;
  leads_meta: number;
  leads_google: number;
  leads_organic: number;
  meta_cpl: number;
  meta_ctr: number;
  meta_clicks: number;
  meta_impressions: number;
  meta_conversions: number;
  google_clicks: number;
  google_conversions: number;
  google_cpl: number;
  cpl_real_meta: number;
  top_creatives: any;
  leads_by_campaign: any;
  leads_by_medium: any;
}

interface SalaryEntry {
  salesperson_name: string;
  salary: number;
}

const C = {
  navy: "#0B1426", red: "#E63946", blue: "#457B9D", green: "#2D6A4F",
  amber: "#E9C46A", gold: "#FFD700", silver: "#C0C0C0", bronze: "#CD7F32",
  purple: "#8B5CF6",
};

const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtCurrency2 = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctChange = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

export function WeeklyReportModal({ salesReps, currentMonth, open, onClose }: WeeklyReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [marketingData, setMarketingData] = useState<MarketingDay[]>([]);
  const [prevWeekMarketing, setPrevWeekMarketing] = useState<MarketingDay[]>([]);
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const today = startOfDay(new Date());
  const weekStart = subDays(today, 6);
  const prevWeekEnd = subDays(weekStart, 1);
  const prevWeekStart = subDays(prevWeekEnd, 6);

  const periodLabel = `${format(weekStart, "dd MMM", { locale: ptBR }).toUpperCase()} — ${format(today, "dd MMM yyyy", { locale: ptBR }).toUpperCase()}`;

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: curr }, { data: prev }, { data: sal }] = await Promise.all([
        supabase.from("marketing_daily_stats").select("*").gte("date", format(weekStart, "yyyy-MM-dd")).lte("date", format(today, "yyyy-MM-dd")),
        supabase.from("marketing_daily_stats").select("*").gte("date", format(prevWeekStart, "yyyy-MM-dd")).lte("date", format(prevWeekEnd, "yyyy-MM-dd")),
        supabase.from("salesperson_salaries").select("salesperson_name, salary"),
      ]);
      setMarketingData((curr as any[]) || []);
      setPrevWeekMarketing((prev as any[]) || []);
      setSalaries((sal as any[])?.map(s => ({ salesperson_name: s.salesperson_name, salary: Number(s.salary) })) || []);
      setLoading(false);
    };
    fetchData();
  }, [open]);

  const normalize = (d: string) => {
    if (!d) return "";
    if (d.includes("/")) {
      const parts = d.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const y = year.length === 2 ? `20${year}` : year;
        return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    return d;
  };

  const filterByRange = (rep: SalesRep, start: string, end: string) => {
    const orders = rep.orders.filter(o => { const nd = normalize(o.data); return nd >= start && nd <= end; });
    return { ...rep, orders, sales: orders.reduce((s, o) => s + o.venda, 0), commission: orders.reduce((s, o) => s + o.comissaoVendedor, 0), deals: orders.length };
  };

  const { thisWeekReps, prevWeekReps, thisWeekTotals, prevWeekTotals } = useMemo(() => {
    const ws = format(weekStart, "yyyy-MM-dd");
    const te = format(today, "yyyy-MM-dd");
    const ps = format(prevWeekStart, "yyyy-MM-dd");
    const pe = format(prevWeekEnd, "yyyy-MM-dd");
    const tw = salesReps.map(r => filterByRange(r, ws, te)).filter(r => r.deals > 0).sort((a, b) => b.sales - a.sales);
    const pw = salesReps.map(r => filterByRange(r, ps, pe));
    const sum = (reps: SalesRep[]) => ({ sales: reps.reduce((s, r) => s + r.sales, 0), deals: reps.reduce((s, r) => s + r.deals, 0), commission: reps.reduce((s, r) => s + r.commission, 0) });
    return { thisWeekReps: tw, prevWeekReps: pw, thisWeekTotals: sum(tw), prevWeekTotals: sum(pw) };
  }, [salesReps, open]);

  // Marketing totals
  const mkt = useMemo(() => {
    const s = (arr: MarketingDay[]) => ({
      metaSpend: arr.reduce((a, d) => a + Number(d.meta_spend || 0), 0),
      googleSpend: arr.reduce((a, d) => a + Number(d.google_spend || 0), 0),
      leads: arr.reduce((a, d) => a + Number(d.leads_total || 0), 0),
      leadsMeta: arr.reduce((a, d) => a + Number(d.leads_meta || 0), 0),
      leadsGoogle: arr.reduce((a, d) => a + Number(d.leads_google || 0), 0),
      leadsOrganic: arr.reduce((a, d) => a + Number(d.leads_organic || 0), 0),
      clicks: arr.reduce((a, d) => a + Number(d.meta_clicks || 0) + Number(d.google_clicks || 0), 0),
      impressions: arr.reduce((a, d) => a + Number(d.meta_impressions || 0), 0),
      metaConversions: arr.reduce((a, d) => a + Number(d.meta_conversions || 0), 0),
      googleConversions: arr.reduce((a, d) => a + Number(d.google_conversions || 0), 0),
    });
    const curr = s(marketingData);
    const prev = s(prevWeekMarketing);
    const totalSpend = curr.metaSpend + curr.googleSpend;
    const prevTotalSpend = prev.metaSpend + prev.googleSpend;
    const cpl = curr.leads > 0 ? totalSpend / curr.leads : 0;
    const prevCpl = prev.leads > 0 ? prevTotalSpend / prev.leads : 0;
    const ctr = curr.impressions > 0 ? (curr.clicks / curr.impressions) * 100 : 0;
    const roas = totalSpend > 0 ? thisWeekTotals.sales / totalSpend : 0;
    const convRate = curr.clicks > 0 ? ((curr.metaConversions + curr.googleConversions) / curr.clicks) * 100 : 0;
    return { ...curr, totalSpend, prevTotalSpend, cpl, prevCpl, ctr, roas, convRate, prev };
  }, [marketingData, prevWeekMarketing, thisWeekTotals]);

  // Daily sales breakdown
  const dailySales = useMemo(() => {
    const days: Record<string, { date: string; faturamento: number; pedidos: number; bestSale: string; bestValue: number }> = {};
    const ws = format(weekStart, "yyyy-MM-dd");
    const te = format(today, "yyyy-MM-dd");
    thisWeekReps.forEach(rep => {
      rep.orders.forEach(o => {
        const nd = normalize(o.data);
        if (nd < ws || nd > te) return;
        if (!days[nd]) days[nd] = { date: nd, faturamento: 0, pedidos: 0, bestSale: "", bestValue: 0 };
        days[nd].faturamento += o.venda;
        days[nd].pedidos += 1;
        if (o.venda > days[nd].bestValue) { days[nd].bestValue = o.venda; days[nd].bestSale = o.cliente || "N/A"; }
      });
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [thisWeekReps]);

  // Product analysis
  const productAnalysis = useMemo(() => {
    const map: Record<string, { name: string; faturamento: number; pedidos: number }> = {};
    thisWeekReps.forEach(rep => rep.orders.forEach(o => {
      const key = o.produto || "Outros";
      if (!map[key]) map[key] = { name: key, faturamento: 0, pedidos: 0 };
      map[key].faturamento += o.venda;
      map[key].pedidos += 1;
    }));
    return Object.values(map).sort((a, b) => b.faturamento - a.faturamento);
  }, [thisWeekReps]);

  // Supplier analysis
  const supplierAnalysis = useMemo(() => {
    const map: Record<string, { name: string; faturamento: number; pedidos: number }> = {};
    thisWeekReps.forEach(rep => rep.orders.forEach(o => {
      const key = o.fornecedor || "Outros";
      if (!map[key]) map[key] = { name: key, faturamento: 0, pedidos: 0 };
      map[key].faturamento += o.venda;
      map[key].pedidos += 1;
    }));
    return Object.values(map).sort((a, b) => b.faturamento - a.faturamento);
  }, [thisWeekReps]);

  // Top creatives
  const topCreatives = useMemo(() => {
    const map: Record<string, { name: string; campaign: string; spend: number; conversions: number; ctr: number; count: number }> = {};
    marketingData.forEach(d => {
      const tc = d.top_creatives;
      if (Array.isArray(tc)) {
        tc.forEach((cr: any) => {
          const key = cr.name || "N/A";
          if (!map[key]) map[key] = { name: key, campaign: cr.campaign || "", spend: 0, conversions: 0, ctr: 0, count: 0 };
          map[key].spend += Number(cr.spend || 0);
          map[key].conversions += Number(cr.conversions || 0);
          map[key].ctr += Number(cr.ctr || 0);
          map[key].count += 1;
        });
      }
    });
    return Object.values(map).map(c => ({ ...c, ctr: c.count > 0 ? c.ctr / c.count : 0, cpl: c.conversions > 0 ? c.spend / c.conversions : 0 })).sort((a, b) => a.cpl - b.cpl || b.conversions - a.conversions).slice(0, 5);
  }, [marketingData]);

  // Leads by campaign
  const leadsByCampaign = useMemo(() => {
    const map: Record<string, number> = {};
    marketingData.forEach(d => {
      const lbc = d.leads_by_campaign;
      if (lbc && typeof lbc === "object") {
        Object.entries(lbc).forEach(([k, v]) => { map[k] = (map[k] || 0) + Number(v || 0); });
      }
    });
    return Object.entries(map).map(([name, leads]) => ({ name, leads })).sort((a, b) => b.leads - a.leads).slice(0, 8);
  }, [marketingData]);

  // Lead sources for pie
  const leadSources = useMemo(() => [
    { name: "Meta Ads", value: mkt.leadsMeta, color: C.purple },
    { name: "Google Ads", value: mkt.leadsGoogle, color: C.blue },
    { name: "Orgânico", value: mkt.leadsOrganic, color: C.green },
  ].filter(s => s.value > 0), [mkt]);

  // Daily marketing spend for line chart
  const dailyMktSpend = useMemo(() => {
    return marketingData.map(d => ({
      date: format(new Date(d.date + "T12:00:00"), "EEE", { locale: ptBR }),
      meta: Number(d.meta_spend || 0),
      google: Number(d.google_spend || 0),
    }));
  }, [marketingData]);

  // Salary lookup
  const getSalary = (name: string) => {
    const n = name.trim().toLowerCase();
    const found = salaries.find(s => s.salesperson_name.toLowerCase().includes(n) || n.includes(s.salesperson_name.toLowerCase()));
    return found?.salary || 0;
  };

  // Insights
  const insights = useMemo(() => {
    const list: { type: "green" | "amber" | "red"; text: string }[] = [];
    const salesChg = pctChange(thisWeekTotals.sales, prevWeekTotals.sales);
    if (salesChg >= 10) list.push({ type: "green", text: `Faturamento cresceu ${salesChg.toFixed(0)}% vs semana anterior (${fmtCurrency(thisWeekTotals.sales)} vs ${fmtCurrency(prevWeekTotals.sales)})` });
    else if (salesChg <= -10) list.push({ type: "red", text: `Faturamento caiu ${Math.abs(salesChg).toFixed(0)}% vs semana anterior (${fmtCurrency(thisWeekTotals.sales)} vs ${fmtCurrency(prevWeekTotals.sales)})` });
    else list.push({ type: "amber", text: `Faturamento estável (${salesChg >= 0 ? "+" : ""}${salesChg.toFixed(0)}%) comparado à semana anterior` });

    // Best growth seller
    if (thisWeekReps.length > 0) {
      const growths = thisWeekReps.map(r => {
        const prev = prevWeekReps.find(p => p.name === r.name);
        return { name: r.name, growth: pctChange(r.sales, prev?.sales || 0), sales: r.sales };
      });
      const best = growths.sort((a, b) => b.growth - a.growth)[0];
      if (best && best.growth > 0) list.push({ type: "green", text: `${best.name} foi quem mais cresceu: +${best.growth.toFixed(0)}% (${fmtCurrency(best.sales)})` });
      const worst = growths.sort((a, b) => a.growth - b.growth)[0];
      if (worst && worst.growth < -10) list.push({ type: "red", text: `${worst.name} teve a maior queda: ${worst.growth.toFixed(0)}%` });
    }

    if (productAnalysis.length > 0) list.push({ type: "green", text: `Produto mais vendido: ${productAnalysis[0].name} com ${fmtCurrency(productAnalysis[0].faturamento)} (${productAnalysis[0].pedidos} pedidos)` });

    if (mkt.cpl > 0 && mkt.cpl < 15) list.push({ type: "green", text: `CPL excelente: ${fmtCurrency2(mkt.cpl)} — dentro da meta` });
    else if (mkt.cpl >= 20) list.push({ type: "red", text: `CPL alto: ${fmtCurrency2(mkt.cpl)} — revisar segmentação e criativos` });
    else if (mkt.cpl > 0) list.push({ type: "amber", text: `CPL em ${fmtCurrency2(mkt.cpl)} — monitorar tendência` });

    if (mkt.roas > 5) list.push({ type: "green", text: `ROAS forte: ${mkt.roas.toFixed(1)}x — cada R$1 investido gerou R$${mkt.roas.toFixed(1)}` });
    else if (mkt.roas > 0 && mkt.roas < 2) list.push({ type: "red", text: `ROAS baixo: ${mkt.roas.toFixed(1)}x — avaliar eficiência do investimento` });

    // Inactive sellers
    const allReps = salesReps.filter(r => r.orders.length > 0);
    const ws = format(weekStart, "yyyy-MM-dd");
    const te = format(today, "yyyy-MM-dd");
    const inactive = allReps.filter(r => !thisWeekReps.find(t => t.name === r.name));
    if (inactive.length > 0) list.push({ type: "red", text: `${inactive.length} vendedor(es) sem vendas esta semana: ${inactive.map(r => r.name).join(", ")}` });

    // Concentration
    if (thisWeekReps.length > 0 && thisWeekTotals.sales > 0) {
      const topPct = (thisWeekReps[0].sales / thisWeekTotals.sales) * 100;
      if (topPct > 40) list.push({ type: "amber", text: `Alta concentração: ${thisWeekReps[0].name} representa ${topPct.toFixed(0)}% do faturamento` });
    }

    if (topCreatives.length > 0 && topCreatives[0].conversions > 0) list.push({ type: "green", text: `Melhor criativo: "${topCreatives[0].name.substring(0, 40)}" com CPL ${fmtCurrency2(topCreatives[0].cpl)}` });

    return list.slice(0, 8);
  }, [thisWeekTotals, prevWeekTotals, mkt, thisWeekReps, prevWeekReps, productAnalysis, topCreatives, salesReps]);

  const handlePrint = () => window.print();

  if (!open) return null;

  const ticketThis = thisWeekTotals.deals > 0 ? thisWeekTotals.sales / thisWeekTotals.deals : 0;
  const ticketPrev = prevWeekTotals.deals > 0 ? prevWeekTotals.sales / prevWeekTotals.deals : 0;

  const pageStyle: React.CSSProperties = { width: 794, minHeight: 1123, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden" };

  const SectionHeader = ({ title }: { title: string }) => (
    <>
      <div style={{ background: C.navy, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>{title}</span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>OFP</span>
      </div>
      <div style={{ height: 3, background: C.red }} />
    </>
  );

  const PageNum = ({ n, total = 10 }: { n: number; total?: number }) => (
    <div style={{ position: "absolute", bottom: 16, right: 32, fontSize: 10, color: "#999" }}>{n}/{total}</div>
  );

  const TrendBadge = ({ value }: { value: number }) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: value >= 0 ? C.green : C.red }}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );

  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );

  const bestDay = dailySales.length > 0 ? dailySales.reduce((a, b) => a.faturamento > b.faturamento ? a : b) : null;
  const worstDay = dailySales.length > 0 ? dailySales.reduce((a, b) => a.faturamento < b.faturamento ? a : b) : null;

  const chartData = dailySales.map(d => ({
    day: format(new Date(d.date + "T12:00:00"), "EEE dd", { locale: ptBR }),
    faturamento: d.faturamento,
    pedidos: d.pedidos,
  }));

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 overflow-auto print:bg-white print:static" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b p-3 flex items-center justify-between print:hidden">
        <h2 className="font-semibold text-sm sm:text-base">Relatório Semanal Executivo</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="gap-2"><Download className="h-4 w-4" />Exportar PDF</Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div ref={reportRef} id="weekly-report" className="print:m-0">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #weekly-report, #weekly-report * { visibility: visible; }
              #weekly-report { position: absolute; left: 0; top: 0; width: 100%; }
              .report-page { page-break-after: always; break-after: page; }
              .report-page:last-child { page-break-after: avoid; }
              @page { size: A4 portrait; margin: 0; }
            }
          `}</style>

          {/* ========== PAGE 1 — CAPA ========== */}
          <div className="report-page" style={{ ...pageStyle, background: `linear-gradient(180deg, ${C.navy} 0%, #162544 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: C.red }} />
            <div style={{ position: "absolute", top: 24, right: 32, color: "rgba(255,255,255,0.3)", fontSize: 10 }}>OFP</div>
            <div style={{ textAlign: "center", padding: "0 40px" }}>
              <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, letterSpacing: 2, marginBottom: 16 }}>ORLANDO FAST PASS</h1>
              <div style={{ width: 80, height: 1, background: "rgba(255,255,255,0.3)", margin: "0 auto 24px" }} />
              <p style={{ color: "#cbd5e1", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>RELATÓRIO SEMANAL</p>
              <p style={{ color: "#64748b", fontSize: 12, letterSpacing: 1, marginBottom: 40 }}>PERFORMANCE COMERCIAL & MARKETING</p>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", borderRadius: 24, padding: "10px 28px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>{periodLabel}</span>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 32, color: "#475569", fontSize: 10 }}>Confidencial • Gerado automaticamente</div>
            <PageNum n={1} />
          </div>

          {/* ========== PAGE 2 — RESUMO EXECUTIVO ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="RESUMO EXECUTIVO" />
            <div style={{ padding: "24px 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Faturamento", value: fmtCurrency(thisWeekTotals.sales), trend: pctChange(thisWeekTotals.sales, prevWeekTotals.sales), color: C.blue, prev: prevWeekTotals.sales, curr: thisWeekTotals.sales },
                  { label: "Pedidos", value: String(thisWeekTotals.deals), trend: pctChange(thisWeekTotals.deals, prevWeekTotals.deals), color: C.green, prev: prevWeekTotals.deals, curr: thisWeekTotals.deals },
                  { label: "Ticket Médio", value: fmtCurrency(ticketThis), trend: pctChange(ticketThis, ticketPrev), color: C.amber, prev: ticketPrev, curr: ticketThis },
                  { label: "ROAS", value: `${mkt.roas.toFixed(1)}x`, trend: 0, color: C.purple, prev: 0, curr: mkt.roas },
                  { label: "Leads Gerados", value: String(mkt.leads), trend: pctChange(mkt.leads, mkt.prev.leads), color: C.navy, prev: mkt.prev.leads, curr: mkt.leads },
                  { label: "CPL Médio", value: fmtCurrency2(mkt.cpl), trend: -pctChange(mkt.cpl, mkt.prevCpl), color: C.red, prev: mkt.prevCpl, curr: mkt.cpl },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "16px 20px", borderLeft: `4px solid ${kpi.color}` }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{kpi.value}</div>
                    <TrendBadge value={kpi.trend} />
                    <div style={{ marginTop: 8 }}>
                      <ProgressBar value={kpi.curr} max={Math.max(kpi.curr, kpi.prev) || 1} color={kpi.color} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <h3 style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Esta Semana vs Anterior</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Métrica", "Atual", "Anterior", "Variação", ""].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "8px 12px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Faturamento", curr: thisWeekTotals.sales, prev: prevWeekTotals.sales, fmt: fmtCurrency },
                    { label: "Pedidos", curr: thisWeekTotals.deals, prev: prevWeekTotals.deals, fmt: (v: number) => String(v) },
                    { label: "Ticket Médio", curr: ticketThis, prev: ticketPrev, fmt: fmtCurrency },
                    { label: "Comissão", curr: thisWeekTotals.commission, prev: prevWeekTotals.commission, fmt: fmtCurrency },
                    { label: "Investimento Mkt", curr: mkt.totalSpend, prev: mkt.prevTotalSpend, fmt: fmtCurrency },
                    { label: "Leads", curr: mkt.leads, prev: mkt.prev.leads, fmt: (v: number) => String(v) },
                  ].map((row, i) => {
                    const change = pctChange(row.curr, row.prev);
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{row.label}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{row.fmt(row.curr)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{row.fmt(row.prev)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}><TrendBadge value={change} /></td>
                        <td style={{ padding: "8px 12px", width: 100 }}>
                          <ProgressBar value={Math.abs(change)} max={100} color={change >= 0 ? C.green : C.red} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PageNum n={2} />
          </div>

          {/* ========== PAGE 3 — FATURAMENTO DETALHADO ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="FATURAMENTO DETALHADO" />
            <div style={{ padding: "24px 32px" }}>
              {/* Bar Chart */}
              <div style={{ height: 220, marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Bar dataKey="faturamento" fill={C.blue} radius={[4, 4, 0, 0]} name="Faturamento" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Best/Worst day cards */}
              <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                {bestDay && (
                  <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase" }}>🏆 Melhor Dia</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{fmtCurrency(bestDay.faturamento)}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{format(new Date(bestDay.date + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}</div>
                  </div>
                )}
                {worstDay && (
                  <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ fontSize: 10, color: C.red, fontWeight: 700, textTransform: "uppercase" }}>📉 Menor Dia</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{fmtCurrency(worstDay.faturamento)}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{format(new Date(worstDay.date + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}</div>
                  </div>
                )}
              </div>

              {/* Daily table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Dia", "Faturamento", "Pedidos", "Ticket Médio", "Melhor Venda"].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "8px 10px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailySales.map((d, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 600 }}>{format(new Date(d.date + "T12:00:00"), "EEE dd/MM", { locale: ptBR })}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>{fmtCurrency(d.faturamento)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>{d.pedidos}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmtCurrency(d.pedidos > 0 ? d.faturamento / d.pedidos : 0)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 10, color: "#64748b" }}>{d.bestSale.substring(0, 25)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PageNum n={3} />
          </div>

          {/* ========== PAGE 4 — RANKING DE VENDEDORES ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="RANKING DE VENDEDORES" />
            <div style={{ padding: "24px 32px" }}>
              {/* Podium */}
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24, alignItems: "flex-end" }}>
                {[1, 0, 2].map((idx) => {
                  const rep = thisWeekReps[idx];
                  if (!rep) return <div key={idx} style={{ flex: 1 }} />;
                  const pos = idx + 1;
                  const borderColor = pos === 1 ? C.gold : pos === 2 ? C.silver : C.bronze;
                  const isCenter = idx === 0;
                  return (
                    <div key={idx} style={{ flex: 1, textAlign: "center", padding: isCenter ? "20px 12px" : "14px 12px", border: `3px solid ${borderColor}`, borderRadius: 12, background: isCenter ? "#fffbeb" : "#f8fafc", transform: isCenter ? "scale(1.05)" : "none" }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{rep.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{fmtCurrency(rep.sales)}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{rep.deals} pedidos • Ticket {fmtCurrency(rep.deals > 0 ? rep.sales / rep.deals : 0)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Full table with salary & ROI */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["#", "Vendedor", "Faturamento", "Pedidos", "Ticket", "Comissão", "Salário", "ROI", "% Total"].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "7px 8px", textAlign: i > 1 ? "right" : "left", fontWeight: 600, fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {thisWeekReps.map((rep, i) => {
                    const ticket = rep.deals > 0 ? rep.sales / rep.deals : 0;
                    const salary = getSalary(rep.name);
                    const roi = salary > 0 ? rep.sales / salary : 0;
                    const pctTotal = thisWeekTotals.sales > 0 ? (rep.sales / thisWeekTotals.sales) * 100 : 0;
                    const prevRep = prevWeekReps.find(p => p.name === rep.name);
                    const growth = pctChange(rep.sales, prevRep?.sales || 0);
                    const medalBg = i === 0 ? "#fffbeb" : i === 1 ? "#f5f5f5" : i === 2 ? "#fef3e2" : i % 2 === 0 ? "#f8fafc" : "#fff";
                    return (
                      <tr key={i} style={{ background: medalBg }}>
                        <td style={{ padding: "7px 8px", fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "7px 8px", fontWeight: 600 }}>
                          {rep.name}
                          <span style={{ marginLeft: 6, fontSize: 9, color: growth >= 0 ? C.green : C.red }}>{growth >= 0 ? "▲" : "▼"}{Math.abs(growth).toFixed(0)}%</span>
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{fmtCurrency(rep.sales)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{rep.deals}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{fmtCurrency(ticket)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{fmtCurrency(rep.commission)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>{salary > 0 ? fmtCurrency(salary) : "—"}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: roi > 3 ? C.green : roi > 1 ? C.amber : C.red }}>{roi.toFixed(1)}x</td>
                        <td style={{ padding: "7px 8px", width: 80 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <ProgressBar value={pctTotal} max={100} color={C.blue} />
                            <span style={{ fontSize: 9, color: "#64748b" }}>{pctTotal.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: C.navy }}>
                    <td colSpan={2} style={{ padding: "8px 8px", color: "#fff", fontWeight: 700 }}>TOTAL</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(thisWeekTotals.sales)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{thisWeekTotals.deals}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(ticketThis)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(thisWeekTotals.commission)}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
            <PageNum n={4} />
          </div>

          {/* ========== PAGE 5 — ANÁLISE POR PRODUTO ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="ANÁLISE POR PRODUTO" />
            <div style={{ padding: "24px 32px" }}>
              {/* Top 3 highlight */}
              <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
                {productAnalysis.slice(0, 3).map((p, i) => (
                  <div key={i} style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "14px 16px", borderTop: `3px solid ${i === 0 ? C.gold : i === 1 ? C.silver : C.bronze}` }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>#{i + 1} Produto</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{p.name.substring(0, 30)}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{fmtCurrency(p.faturamento)}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{p.pedidos} pedidos</div>
                  </div>
                ))}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Produto", "Faturamento", "Pedidos", "% do Total", ""].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "8px 10px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productAnalysis.map((p, i) => {
                    const pct = thisWeekTotals.sales > 0 ? (p.faturamento / thisWeekTotals.sales) * 100 : 0;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600 }}>{p.name.substring(0, 40)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>{fmtCurrency(p.faturamento)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{p.pedidos}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{pct.toFixed(1)}%</td>
                        <td style={{ padding: "7px 10px", width: 120 }}>
                          <ProgressBar value={pct} max={100} color={C.blue} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ========== SECTION 6 — ANÁLISE POR FORNECEDOR (same page) ========== */}
            <SectionHeader title="ANÁLISE POR FORNECEDOR" />
            <div style={{ padding: "24px 32px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Fornecedor", "Faturamento", "Pedidos", "Ticket Médio", "% do Total", ""].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "8px 10px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierAnalysis.map((s, i) => {
                    const pct = thisWeekTotals.sales > 0 ? (s.faturamento / thisWeekTotals.sales) * 100 : 0;
                    const ticket = s.pedidos > 0 ? s.faturamento / s.pedidos : 0;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600 }}>{s.name.substring(0, 35)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>{fmtCurrency(s.faturamento)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{s.pedidos}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmtCurrency(ticket)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{pct.toFixed(1)}%</td>
                        <td style={{ padding: "7px 10px", width: 100 }}>
                          <ProgressBar value={pct} max={100} color={C.green} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PageNum n={5} />
          </div>

          {/* ========== PAGE 6 — MARKETING INVESTIMENTO & PERFORMANCE ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="MARKETING — INVESTIMENTO & PERFORMANCE" />
            <div style={{ padding: "24px 32px" }}>
              {/* Spend bars */}
              <div style={{ marginBottom: 20 }}>
                {[
                  { label: "Meta Ads", value: mkt.metaSpend, color: C.purple },
                  { label: "Google Ads", value: mkt.googleSpend, color: C.blue },
                ].map((item, i) => {
                  const maxVal = Math.max(mkt.metaSpend, mkt.googleSpend, 1);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: "#334155" }}>{item.label}</span>
                      <div style={{ flex: 1, height: 22, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(item.value / maxVal) * 100}%`, background: item.color, borderRadius: 6 }} />
                      </div>
                      <span style={{ width: 90, textAlign: "right", fontSize: 12, fontWeight: 700 }}>{fmtCurrency(item.value)}</span>
                    </div>
                  );
                })}
              </div>

              {/* 2x3 metrics grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Gasto Total", value: fmtCurrency(mkt.totalSpend), color: C.red },
                  { label: "Leads Gerados", value: String(mkt.leads), color: C.green },
                  { label: "CPL Médio", value: fmtCurrency2(mkt.cpl), color: C.amber },
                  { label: "CTR Médio", value: `${mkt.ctr.toFixed(2)}%`, color: C.blue },
                  { label: "ROAS", value: `${mkt.roas.toFixed(1)}x`, color: C.purple },
                  { label: "Conv. Rate", value: `${mkt.convRate.toFixed(2)}%`, color: C.navy },
                ].map((m, i) => (
                  <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", textAlign: "center", borderTop: `3px solid ${m.color}` }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Line chart: daily spend */}
              <h4 style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 8, textTransform: "uppercase" }}>Gasto Diário por Canal</h4>
              <div style={{ height: 180, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyMktSpend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                    <Tooltip formatter={(v: number) => fmtCurrency2(v)} />
                    <Line type="monotone" dataKey="meta" stroke={C.purple} strokeWidth={2} name="Meta Ads" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="google" stroke={C.blue} strokeWidth={2} name="Google Ads" dot={{ r: 3 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Efficiency card */}
              <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1e3a5f)`, borderRadius: 10, padding: "16px 24px", textAlign: "center" }}>
                <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>EFICIÊNCIA DO INVESTIMENTO</div>
                <div style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>
                  Cada R$1 investido gerou {mkt.totalSpend > 0 ? `R$${(thisWeekTotals.sales / mkt.totalSpend).toFixed(1)}` : "—"} em vendas
                </div>
              </div>
            </div>
            <PageNum n={6} />
          </div>

          {/* ========== PAGE 7 — MARKETING LEADS & CRIATIVOS ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="MARKETING — LEADS & CRIATIVOS" />
            <div style={{ padding: "24px 32px" }}>
              {/* Donut + Leads by campaign */}
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                {/* Pie Chart */}
                <div style={{ width: 240 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 8, textTransform: "uppercase" }}>Leads por Fonte</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={leadSources} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {leadSources.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leads by campaign */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 8, textTransform: "uppercase" }}>Leads por Campanha</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: C.navy }}>
                        {["Campanha", "Leads", "% Total", ""].map((h, i) => (
                          <th key={i} style={{ color: "#fff", padding: "6px 8px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leadsByCampaign.map((c, i) => {
                        const pct = mkt.leads > 0 ? (c.leads / mkt.leads) * 100 : 0;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                            <td style={{ padding: "6px 8px", fontSize: 10 }}>{c.name.substring(0, 35)}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{c.leads}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{pct.toFixed(1)}%</td>
                            <td style={{ padding: "6px 8px", width: 60 }}>
                              <ProgressBar value={pct} max={100} color={C.purple} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Creatives */}
              <h4 style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 8, textTransform: "uppercase" }}>Top 5 Criativos por Performance</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["#", "Criativo", "Campanha", "Gasto", "Conv.", "CPL"].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "7px 8px", textAlign: i > 1 ? "right" : "left", fontWeight: 600, fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCreatives.map((cr, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                    return (
                      <tr key={i} style={{ background: i < 3 ? (i === 0 ? "#fffbeb" : i === 1 ? "#f5f5f5" : "#fef3e2") : i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "7px 8px", fontWeight: 700 }}>{medal}</td>
                        <td style={{ padding: "7px 8px", fontWeight: 600, fontSize: 10 }}>{cr.name.substring(0, 35)}</td>
                        <td style={{ padding: "7px 8px", fontSize: 10, color: "#64748b" }}>{cr.campaign.substring(0, 25)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{fmtCurrency2(cr.spend)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{cr.conversions}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: cr.cpl < 15 ? C.green : cr.cpl > 20 ? C.red : C.amber }}>{fmtCurrency2(cr.cpl)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PageNum n={7} />
          </div>

          {/* ========== PAGE 8 — FAROL DE SAÚDE ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="FAROL DE SAÚDE" />
            <div style={{ padding: "24px 32px" }}>
              <div style={{ display: "flex", gap: 24 }}>
                {/* Commercial Health */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 16, textTransform: "uppercase", borderBottom: `2px solid ${C.blue}`, paddingBottom: 8 }}>🏢 Farol Comercial</h4>
                  {[
                    { label: "Ticket Médio", value: fmtCurrency(ticketThis), ok: ticketThis > 3000, warn: ticketThis >= 2000, ref: "> R$3.000" },
                    { label: "Vendas/dia", value: (thisWeekTotals.deals / 7).toFixed(1), ok: thisWeekTotals.deals / 7 > 5, warn: thisWeekTotals.deals / 7 >= 3, ref: "> 5/dia" },
                    { label: "Vendedores Ativos", value: String(thisWeekReps.length), ok: thisWeekReps.length >= 4, warn: thisWeekReps.length >= 2, ref: "≥ 4" },
                    { label: "Concentração Top 1", value: thisWeekTotals.sales > 0 ? `${((thisWeekReps[0]?.sales || 0) / thisWeekTotals.sales * 100).toFixed(0)}%` : "0%", ok: thisWeekTotals.sales > 0 && (thisWeekReps[0]?.sales || 0) / thisWeekTotals.sales < 0.35, warn: thisWeekTotals.sales > 0 && (thisWeekReps[0]?.sales || 0) / thisWeekTotals.sales < 0.5, ref: "< 35%" },
                    { label: "Crescimento Semanal", value: `${pctChange(thisWeekTotals.sales, prevWeekTotals.sales).toFixed(0)}%`, ok: pctChange(thisWeekTotals.sales, prevWeekTotals.sales) > 5, warn: pctChange(thisWeekTotals.sales, prevWeekTotals.sales) >= -5, ref: "> 5%" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#f8fafc", borderRadius: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.ok ? C.green : item.warn ? C.amber : C.red, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8" }}>Meta: {item.ref}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Marketing Health */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 16, textTransform: "uppercase", borderBottom: `2px solid ${C.purple}`, paddingBottom: 8 }}>📊 Farol Marketing</h4>
                  {[
                    { label: "CPL Real", value: fmtCurrency2(mkt.cpl), ok: mkt.cpl > 0 && mkt.cpl < 12, warn: mkt.cpl < 18, ref: "< R$12" },
                    { label: "CTR Meta Ads", value: `${mkt.ctr.toFixed(2)}%`, ok: mkt.ctr > 2, warn: mkt.ctr >= 1.5, ref: "> 2%" },
                    { label: "ROAS", value: `${mkt.roas.toFixed(1)}x`, ok: mkt.roas > 5, warn: mkt.roas >= 3, ref: "> 5x" },
                    { label: "Leads/dia", value: (mkt.leads / 7).toFixed(0), ok: mkt.leads / 7 > 60, warn: mkt.leads / 7 >= 40, ref: "> 60/dia" },
                    { label: "Eficiência", value: mkt.totalSpend > 0 ? `${(mkt.leads / (mkt.totalSpend / 100)).toFixed(1)} leads/R$100` : "—", ok: mkt.totalSpend > 0 && (mkt.leads / (mkt.totalSpend / 100)) > 8, warn: mkt.totalSpend > 0 && (mkt.leads / (mkt.totalSpend / 100)) >= 5, ref: "> 8 leads/R$100" },
                    { label: "Conv. Rate", value: `${mkt.convRate.toFixed(2)}%`, ok: mkt.convRate > 10, warn: mkt.convRate >= 5, ref: "> 10%" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#f8fafc", borderRadius: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.ok ? C.green : item.warn ? C.amber : C.red, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8" }}>Meta: {item.ref}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <PageNum n={8} />
          </div>

          {/* ========== PAGE 9 — INSIGHTS & RECOMENDAÇÕES ========== */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            <SectionHeader title="INSIGHTS & RECOMENDAÇÕES" />
            <div style={{ padding: "24px 32px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {insights.map((insight, i) => {
                  const borderColor = insight.type === "green" ? C.green : insight.type === "amber" ? C.amber : C.red;
                  const icon = insight.type === "green" ? "✓" : insight.type === "amber" ? "!" : "✗";
                  const bg = insight.type === "green" ? "#f0fdf4" : insight.type === "amber" ? "#fffbeb" : "#fef2f2";
                  return (
                    <div key={i} style={{ background: bg, borderLeft: `4px solid ${borderColor}`, borderRadius: 6, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: borderColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>{insight.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Next steps */}
              <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1e3a5f)`, borderRadius: 12, padding: "24px 28px" }}>
                <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 PRÓXIMOS PASSOS</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(() => {
                    const steps: string[] = [];
                    if (mkt.cpl >= 15) steps.push("Revisar campanhas com CPL acima de R$15 e realocar budget para criativos de melhor performance");
                    else steps.push("Manter otimização de criativos para sustentar CPL competitivo");
                    const inactive = salesReps.filter(r => r.orders.length > 0).filter(r => !thisWeekReps.find(t => t.name === r.name));
                    if (inactive.length > 0) steps.push(`Investigar inatividade de ${inactive.map(r => r.name).join(", ")} e reforçar acompanhamento`);
                    if (thisWeekTotals.sales > 0 && thisWeekReps[0] && (thisWeekReps[0].sales / thisWeekTotals.sales) > 0.4) steps.push("Diversificar vendas para reduzir dependência de um único vendedor");
                    steps.push("Avaliar ticket médio e implementar estratégias de upsell para os top produtos");
                    if (mkt.roas < 3 && mkt.roas > 0) steps.push("Rever estratégia de investimento em mídia paga para melhorar ROAS");
                    return steps.slice(0, 4).map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
                        <span style={{ color: "#cbd5e1", fontSize: 12 }}>{step}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ marginTop: 40, textAlign: "center", color: "#94a3b8", fontSize: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                Orlando Fast Pass © 2026 | Gerado em {format(new Date(), "dd/MM/yyyy")} às {format(new Date(), "HH:mm")} | Confidencial
              </div>
            </div>
            <PageNum n={9} />
          </div>
        </div>
      )}
    </div>
  );
}
