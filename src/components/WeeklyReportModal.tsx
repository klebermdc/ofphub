import { useEffect, useState, useRef, useMemo } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep } from "@/types/sales";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  google_clicks: number;
  google_conversions: number;
}

const COLORS = {
  navy: "#0B1426",
  red: "#E63946",
  blue: "#457B9D",
  green: "#2D6A4F",
  amber: "#E9C46A",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  purple: "#8B5CF6",
};

export function WeeklyReportModal({ salesReps, currentMonth, open, onClose }: WeeklyReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [marketingData, setMarketingData] = useState<MarketingDay[]>([]);
  const [prevWeekMarketing, setPrevWeekMarketing] = useState<MarketingDay[]>([]);
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
      const [{ data: curr }, { data: prev }] = await Promise.all([
        supabase.from("marketing_daily_stats").select("*").gte("date", format(weekStart, "yyyy-MM-dd")).lte("date", format(today, "yyyy-MM-dd")),
        supabase.from("marketing_daily_stats").select("*").gte("date", format(prevWeekStart, "yyyy-MM-dd")).lte("date", format(prevWeekEnd, "yyyy-MM-dd")),
      ]);
      setMarketingData((curr as MarketingDay[]) || []);
      setPrevWeekMarketing((prev as MarketingDay[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [open]);

  // Current week sales (filter salesReps orders by date range)
  const { thisWeekReps, prevWeekReps, thisWeekTotals, prevWeekTotals } = useMemo(() => {
    const ws = format(weekStart, "yyyy-MM-dd");
    const te = format(today, "yyyy-MM-dd");
    const ps = format(prevWeekStart, "yyyy-MM-dd");
    const pe = format(prevWeekEnd, "yyyy-MM-dd");

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
      const orders = rep.orders.filter((o) => {
        const nd = normalize(o.data);
        return nd >= start && nd <= end;
      });
      return {
        ...rep,
        orders,
        sales: orders.reduce((s, o) => s + o.venda, 0),
        commission: orders.reduce((s, o) => s + o.comissaoVendedor, 0),
        deals: orders.length,
      };
    };

    const tw = salesReps.map((r) => filterByRange(r, ws, te)).filter((r) => r.deals > 0);
    const pw = salesReps.map((r) => filterByRange(r, ps, pe)).filter((r) => r.deals > 0);

    const sum = (reps: SalesRep[]) => ({
      sales: reps.reduce((s, r) => s + r.sales, 0),
      deals: reps.reduce((s, r) => s + r.deals, 0),
      commission: reps.reduce((s, r) => s + r.commission, 0),
    });

    return {
      thisWeekReps: tw.sort((a, b) => b.sales - a.sales),
      prevWeekReps: pw,
      thisWeekTotals: sum(tw),
      prevWeekTotals: sum(pw),
    };
  }, [salesReps, open]);

  const mktTotals = useMemo(() => {
    const sum = (arr: MarketingDay[]) => ({
      metaSpend: arr.reduce((s, d) => s + Number(d.meta_spend || 0), 0),
      googleSpend: arr.reduce((s, d) => s + Number(d.google_spend || 0), 0),
      leads: arr.reduce((s, d) => s + Number(d.leads_total || 0), 0),
      leadsMeta: arr.reduce((s, d) => s + Number(d.leads_meta || 0), 0),
      leadsGoogle: arr.reduce((s, d) => s + Number(d.leads_google || 0), 0),
      leadsOrganic: arr.reduce((s, d) => s + Number(d.leads_organic || 0), 0),
      clicks: arr.reduce((s, d) => s + Number(d.meta_clicks || 0), 0),
      impressions: arr.reduce((s, d) => s + Number(d.meta_impressions || 0), 0),
    });
    const curr = sum(marketingData);
    const prev = sum(prevWeekMarketing);
    const totalSpend = curr.metaSpend + curr.googleSpend;
    const cpl = curr.leads > 0 ? totalSpend / curr.leads : 0;
    const ctr = curr.impressions > 0 ? (curr.clicks / curr.impressions) * 100 : 0;
    const roas = totalSpend > 0 ? thisWeekTotals.sales / totalSpend : 0;
    return { ...curr, totalSpend, cpl, ctr, roas, prev };
  }, [marketingData, prevWeekMarketing, thisWeekTotals]);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  // Insights
  const insights = useMemo(() => {
    const list: { type: "green" | "amber" | "red"; text: string }[] = [];
    const salesChange = pctChange(thisWeekTotals.sales, prevWeekTotals.sales);
    if (salesChange >= 10) list.push({ type: "green", text: `Faturamento cresceu ${salesChange.toFixed(0)}% vs semana anterior` });
    else if (salesChange <= -10) list.push({ type: "red", text: `Faturamento caiu ${Math.abs(salesChange).toFixed(0)}% vs semana anterior` });
    else list.push({ type: "amber", text: `Faturamento estável (${salesChange >= 0 ? "+" : ""}${salesChange.toFixed(0)}%) vs semana anterior` });

    if (mktTotals.cpl > 0 && mktTotals.cpl < 15) list.push({ type: "green", text: `CPL excelente: R$ ${mktTotals.cpl.toFixed(2)}` });
    else if (mktTotals.cpl >= 20) list.push({ type: "red", text: `CPL alto: R$ ${mktTotals.cpl.toFixed(2)} — revisar campanhas` });

    if (mktTotals.ctr > 2) list.push({ type: "green", text: `CTR saudável: ${mktTotals.ctr.toFixed(2)}%` });
    else if (mktTotals.ctr < 1 && mktTotals.ctr > 0) list.push({ type: "red", text: `CTR baixo: ${mktTotals.ctr.toFixed(2)}% — otimizar criativos` });

    if (thisWeekReps.length > 0) {
      const top = thisWeekReps[0];
      list.push({ type: "green", text: `${top.name} lidera com ${fmtCurrency(top.sales)} em ${top.deals} pedidos` });
    }

    const dealsChange = pctChange(thisWeekTotals.deals, prevWeekTotals.deals);
    if (dealsChange >= 15) list.push({ type: "green", text: `Volume de pedidos cresceu ${dealsChange.toFixed(0)}%` });
    else if (dealsChange <= -15) list.push({ type: "red", text: `Volume de pedidos caiu ${Math.abs(dealsChange).toFixed(0)}%` });

    if (mktTotals.roas > 5) list.push({ type: "green", text: `ROAS forte: ${mktTotals.roas.toFixed(1)}x` });
    else if (mktTotals.roas < 2 && mktTotals.roas > 0) list.push({ type: "amber", text: `ROAS baixo: ${mktTotals.roas.toFixed(1)}x — avaliar investimento` });

    return list.slice(0, 6);
  }, [thisWeekTotals, prevWeekTotals, mktTotals, thisWeekReps]);

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const pageStyle: React.CSSProperties = {
    width: 794,
    minHeight: 1123,
    margin: "0 auto",
    fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const headerBar = (title: string) => (
    <div style={{ background: COLORS.navy, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>{title}</span>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>OFP</span>
    </div>
  );

  const redLine = <div style={{ height: 3, background: COLORS.red, width: "100%" }} />;

  const pageNumber = (n: number) => (
    <div style={{ position: "absolute", bottom: 16, right: 32, fontSize: 10, color: "#999" }}>{n}/5</div>
  );

  const TrendBadge = ({ value }: { value: number }) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: value >= 0 ? COLORS.green : COLORS.red }}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );

  const KPICard = ({ label, value, trend, color }: { label: string; value: string; trend: number; color: string }) => (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "20px 24px", borderLeft: `4px solid ${color}`, flex: 1 }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.navy }}>{value}</div>
      <TrendBadge value={trend} />
    </div>
  );

  const ticketThis = thisWeekTotals.deals > 0 ? thisWeekTotals.sales / thisWeekTotals.deals : 0;
  const ticketPrev = prevWeekTotals.deals > 0 ? prevWeekTotals.sales / prevWeekTotals.deals : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 overflow-auto print:bg-white print:static" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Toolbar - hidden on print */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b p-3 flex items-center justify-between print:hidden">
        <h2 className="font-semibold text-sm sm:text-base">Relatório Semanal</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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

          {/* PAGE 1 — COVER */}
          <div className="report-page" style={{ ...pageStyle, background: `linear-gradient(180deg, ${COLORS.navy} 0%, #162544 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: COLORS.red }} />
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
            {pageNumber(1)}
          </div>

          {/* PAGE 2 — EXECUTIVE DASHBOARD */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            {headerBar("DASHBOARD EXECUTIVO")}
            {redLine}
            <div style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                <KPICard label="Faturamento" value={fmtCurrency(thisWeekTotals.sales)} trend={pctChange(thisWeekTotals.sales, prevWeekTotals.sales)} color={COLORS.blue} />
                <KPICard label="Pedidos" value={String(thisWeekTotals.deals)} trend={pctChange(thisWeekTotals.deals, prevWeekTotals.deals)} color={COLORS.green} />
                <KPICard label="Ticket Médio" value={fmtCurrency(ticketThis)} trend={pctChange(ticketThis, ticketPrev)} color={COLORS.amber} />
                <KPICard label="ROAS" value={`${mktTotals.roas.toFixed(1)}x`} trend={0} color={COLORS.purple} />
              </div>

              {/* Comparison table */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Esta Semana vs Anterior</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: COLORS.navy }}>
                      {["Métrica", "Semana Atual", "Semana Anterior", "Variação", ""].map((h, i) => (
                        <th key={i} style={{ color: "#fff", padding: "10px 14px", textAlign: i > 0 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Faturamento", curr: thisWeekTotals.sales, prev: prevWeekTotals.sales, fmt: fmtCurrency },
                      { label: "Pedidos", curr: thisWeekTotals.deals, prev: prevWeekTotals.deals, fmt: (v: number) => String(v) },
                      { label: "Ticket Médio", curr: ticketThis, prev: ticketPrev, fmt: fmtCurrency },
                      { label: "Comissão", curr: thisWeekTotals.commission, prev: prevWeekTotals.commission, fmt: fmtCurrency },
                    ].map((row, i) => {
                      const change = pctChange(row.curr, row.prev);
                      const barW = Math.min(Math.abs(change), 100);
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.label}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>{row.fmt(row.curr)}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b" }}>{row.fmt(row.prev)}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <TrendBadge value={change} />
                          </td>
                          <td style={{ padding: "10px 14px", width: 120 }}>
                            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${barW}%`, background: change >= 0 ? COLORS.green : COLORS.red, borderRadius: 3 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {pageNumber(2)}
          </div>

          {/* PAGE 3 — RANKING */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            {headerBar("RANKING DE VENDEDORES")}
            {redLine}
            <div style={{ padding: "28px 32px" }}>
              {/* Podium */}
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32, alignItems: "flex-end" }}>
                {[1, 0, 2].map((idx) => {
                  const rep = thisWeekReps[idx];
                  if (!rep) return <div key={idx} style={{ flex: 1 }} />;
                  const pos = idx + 1;
                  const borderColor = pos === 1 ? COLORS.gold : pos === 2 ? COLORS.silver : COLORS.bronze;
                  const isCenter = idx === 0;
                  return (
                    <div key={idx} style={{
                      flex: 1, textAlign: "center", padding: isCenter ? "24px 16px" : "16px",
                      border: `3px solid ${borderColor}`, borderRadius: 12,
                      background: isCenter ? "#fffbeb" : "#f8fafc",
                      transform: isCenter ? "scale(1.05)" : "none",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>{rep.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>{fmtCurrency(rep.sales)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{rep.deals} pedidos</div>
                    </div>
                  );
                })}
              </div>

              {/* Full table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: COLORS.navy }}>
                    {["#", "Vendedor", "Faturamento", "Pedidos", "Ticket", "Comissão"].map((h, i) => (
                      <th key={i} style={{ color: "#fff", padding: "8px 12px", textAlign: i > 1 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {thisWeekReps.map((rep, i) => {
                    const medalBg = i === 0 ? "#fffbeb" : i === 1 ? "#f5f5f5" : i === 2 ? "#fef3e2" : i % 2 === 0 ? "#f8fafc" : "#fff";
                    const ticket = rep.deals > 0 ? rep.sales / rep.deals : 0;
                    return (
                      <tr key={i} style={{ background: medalBg }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{rep.name}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{fmtCurrency(rep.sales)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{rep.deals}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtCurrency(ticket)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtCurrency(rep.commission)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: COLORS.navy }}>
                    <td colSpan={2} style={{ padding: "10px 12px", color: "#fff", fontWeight: 700 }}>TOTAL</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(thisWeekTotals.sales)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{thisWeekTotals.deals}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(ticketThis)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 700 }}>{fmtCurrency(thisWeekTotals.commission)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {pageNumber(3)}
          </div>

          {/* PAGE 4 — MARKETING */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            {headerBar("MARKETING & TRÁFEGO")}
            {redLine}
            <div style={{ padding: "28px 32px" }}>
              {/* Spend bars */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy, marginBottom: 12, textTransform: "uppercase" }}>Investimento por Canal</h3>
                {[
                  { label: "Meta Ads", value: mktTotals.metaSpend, color: COLORS.purple },
                  { label: "Google Ads", value: mktTotals.googleSpend, color: COLORS.blue },
                ].map((item, i) => {
                  const maxVal = Math.max(mktTotals.metaSpend, mktTotals.googleSpend, 1);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: "#334155" }}>{item.label}</span>
                      <div style={{ flex: 1, height: 24, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(item.value / maxVal) * 100}%`, background: item.color, borderRadius: 6 }} />
                      </div>
                      <span style={{ width: 90, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmtCurrency(item.value)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Lead circles */}
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 32 }}>
                {[
                  { label: "Total", value: mktTotals.leads, color: COLORS.navy },
                  { label: "Meta", value: mktTotals.leadsMeta, color: COLORS.purple },
                  { label: "Google", value: mktTotals.leadsGoogle, color: COLORS.blue },
                  { label: "Orgânico", value: mktTotals.leadsOrganic, color: COLORS.green },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%", background: item.color,
                      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px",
                    }}>
                      <span style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{item.value}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* KPI indicators */}
              <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "CPL", value: `R$ ${mktTotals.cpl.toFixed(2)}`, good: mktTotals.cpl < 15 },
                  { label: "CTR", value: `${mktTotals.ctr.toFixed(2)}%`, good: mktTotals.ctr > 2 },
                  { label: "ROAS", value: `${mktTotals.roas.toFixed(1)}x`, good: mktTotals.roas > 3 },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.navy }}>{item.value}</div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: "inline-block", width: 12, height: 12, borderRadius: "50%",
                        background: item.good ? COLORS.green : mktTotals.cpl === 0 && item.label === "CPL" ? "#94a3b8" : COLORS.red,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Traffic Light */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "16px 20px" }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>FAROL DE DESEMPENHO</h4>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { label: "CPL", ok: mktTotals.cpl > 0 && mktTotals.cpl < 15, warn: mktTotals.cpl >= 15 && mktTotals.cpl < 20 },
                    { label: "CTR", ok: mktTotals.ctr > 2, warn: mktTotals.ctr >= 1.5 && mktTotals.ctr <= 2 },
                    { label: "Leads/dia", ok: mktTotals.leads / 7 > 60, warn: mktTotals.leads / 7 >= 40 && mktTotals.leads / 7 <= 60 },
                    { label: "Eficiência", ok: mktTotals.totalSpend > 0 && (mktTotals.leads / (mktTotals.totalSpend / 100)) > 8, warn: mktTotals.totalSpend > 0 && (mktTotals.leads / (mktTotals.totalSpend / 100)) >= 5 },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%",
                        background: item.ok ? COLORS.green : item.warn ? COLORS.amber : COLORS.red,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {pageNumber(4)}
          </div>

          {/* PAGE 5 — INSIGHTS */}
          <div className="report-page" style={{ ...pageStyle, background: "#fff" }}>
            {headerBar("INSIGHTS & RECOMENDAÇÕES")}
            {redLine}
            <div style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                {insights.map((insight, i) => {
                  const borderColor = insight.type === "green" ? COLORS.green : insight.type === "amber" ? COLORS.amber : COLORS.red;
                  const icon = insight.type === "green" ? "✓" : insight.type === "amber" ? "!" : "✗";
                  return (
                    <div key={i} style={{ background: "#f8fafc", borderLeft: `4px solid ${borderColor}`, borderRadius: 6, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: borderColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{insight.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Next steps */}
              <div style={{ background: `linear-gradient(135deg, ${COLORS.navy}, #1e3a5f)`, borderRadius: 12, padding: "24px 28px" }}>
                <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 PRÓXIMOS PASSOS</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Revisar campanhas com CPL acima da meta e realocar budget",
                    "Acompanhar vendedores com queda de performance individual",
                    "Otimizar criativos com CTR abaixo de 2%",
                    "Avaliar ticket médio e estratégias de upsell",
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.red, flexShrink: 0 }} />
                      <span style={{ color: "#cbd5e1", fontSize: 12 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 40, textAlign: "center", color: "#94a3b8", fontSize: 10 }}>
                Orlando Fast Pass • Relatório gerado em {format(new Date(), "dd/MM/yyyy HH:mm")} • Confidencial
              </div>
            </div>
            {pageNumber(5)}
          </div>
        </div>
      )}
    </div>
  );
}
