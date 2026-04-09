import { useMemo } from "react";
import { Activity } from "lucide-react";

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

type TrafficLight = "green" | "yellow" | "red";

interface Indicator {
  label: string;
  value: string;
  reference: string;
  color: TrafficLight;
}

const colorMap: Record<TrafficLight, { border: string; dot: string }> = {
  green: { border: "border-l-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  yellow: { border: "border-l-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  red: { border: "border-l-[hsl(var(--destructive))]", dot: "bg-[hsl(var(--destructive))]" },
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getIndicators(stats: DailyStat[]): Indicator[] {
  if (stats.length === 0) return [];

  const sumMetaSpend = stats.reduce((s, d) => s + (d.meta_spend || 0), 0);
  const sumLeadsMeta = stats.reduce((s, d) => s + (d.leads_meta || 0), 0);
  const sumGoogleSpend = stats.reduce((s, d) => s + (d.google_spend || 0), 0);
  const sumGoogleConversions = stats.reduce((s, d) => s + (d.google_conversions || 0), 0);
  const sumLeadsTotal = stats.reduce((s, d) => s + (d.leads_total || 0), 0);
  const sumMetaClicks = stats.reduce((s, d) => s + (d.meta_clicks || 0), 0);
  const avgCtr = stats.reduce((s, d) => s + (d.meta_ctr || 0), 0) / stats.length;
  const avgLeadsDay = sumLeadsTotal / stats.length;

  const cplMeta = sumLeadsMeta > 0 ? sumMetaSpend / sumLeadsMeta : 0;
  const cplGoogle = sumGoogleConversions > 0 ? sumGoogleSpend / sumGoogleConversions : 0;
  const convRate = sumMetaClicks > 0 ? (sumLeadsTotal / sumMetaClicks) * 100 : 0;

  const avgDailySpend = (sumMetaSpend + sumGoogleSpend) / stats.length;
  const lastDay = stats[stats.length - 1];
  const lastDaySpend = (lastDay?.meta_spend || 0) + (lastDay?.google_spend || 0);
  const deviation = avgDailySpend > 0 ? Math.abs((lastDaySpend - avgDailySpend) / avgDailySpend) * 100 : 0;

  const indicators: Indicator[] = [
    {
      label: "CPL Real Meta",
      value: formatBRL(cplMeta),
      reference: "Meta: < R$12",
      color: cplMeta < 12 ? "green" : cplMeta <= 18 ? "yellow" : "red",
    },
    {
      label: "CTR Meta Ads",
      value: `${avgCtr.toFixed(2)}%`,
      reference: "Meta: > 2,0%",
      color: avgCtr > 2 ? "green" : avgCtr >= 1.5 ? "yellow" : "red",
    },
    {
      label: "Leads/dia",
      value: avgLeadsDay.toFixed(1),
      reference: "Meta: > 60",
      color: avgLeadsDay > 60 ? "green" : avgLeadsDay >= 40 ? "yellow" : "red",
    },
    {
      label: "CPL Google Ads",
      value: formatBRL(cplGoogle),
      reference: "Meta: < R$10",
      color: cplGoogle < 10 ? "green" : cplGoogle <= 15 ? "yellow" : "red",
    },
    {
      label: "Taxa de Conversão",
      value: `${convRate.toFixed(2)}%`,
      reference: "Meta: > 10%",
      color: convRate > 10 ? "green" : convRate >= 5 ? "yellow" : "red",
    },
    {
      label: "Gasto Diário",
      value: `${deviation.toFixed(1)}% desvio`,
      reference: "Meta: desvio < 20%",
      color: deviation < 20 ? "green" : deviation <= 40 ? "yellow" : "red",
    },
  ];

  // Comparativo CPL (Meta vs Google)
  if (cplMeta > 0 && cplGoogle > 0) {
    const cplDiff = (Math.abs(cplMeta - cplGoogle) / Math.min(cplMeta, cplGoogle)) * 100;
    indicators.push({
      label: "Comparativo CPL",
      value: `Meta ${formatBRL(cplMeta)} vs Google ${formatBRL(cplGoogle)}`,
      reference: "Diferença < 30%",
      color: cplDiff < 30 ? "green" : cplDiff <= 50 ? "yellow" : "red",
    });
  } else {
    indicators.push({
      label: "Comparativo CPL",
      value: "Sem dados",
      reference: "Diferença < 30%",
      color: "red",
    });
  }

  // Leads Orgânicos %
  const organicPct = sumLeadsTotal > 0 ? (stats.reduce((s, d) => s + (d.leads_organic || 0), 0) / sumLeadsTotal) * 100 : 0;
  indicators.push({
    label: "Leads Orgânicos %",
    value: `${organicPct.toFixed(1)}%`,
    reference: "Meta: > 15%",
    color: organicPct > 15 ? "green" : organicPct >= 10 ? "yellow" : "red",
  });

  // Eficiência de Gasto (Leads por R$100)
  const totalSpend = sumMetaSpend + sumGoogleSpend;
  const efficiency = totalSpend > 0 ? (sumLeadsTotal / totalSpend) * 100 : 0;
  indicators.push({
    label: "Eficiência de Gasto",
    value: `${efficiency.toFixed(1)} leads/R$100`,
    reference: "Meta: > 8 leads/R$100",
    color: efficiency > 8 ? "green" : efficiency >= 5 ? "yellow" : "red",
  });

  return indicators;
}

interface Props {
  stats: DailyStat[];
}

export function MarketingHealthIndicators({ stats }: Props) {
  const indicators = useMemo(() => getIndicators(stats), [stats]);

  if (indicators.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Farol de Marketing</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {indicators.map((ind) => {
          const colors = colorMap[ind.color];
          return (
            <div
              key={ind.label}
              className={`bg-background/50 rounded-lg p-3 border-l-4 ${colors.border}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0`} />
                <span className="text-xs font-medium text-foreground truncate">{ind.label}</span>
              </div>
              <p className="text-lg font-bold leading-tight">{ind.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{ind.reference}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
