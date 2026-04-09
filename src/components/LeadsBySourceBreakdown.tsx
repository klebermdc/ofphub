import { useMemo } from "react";
import { Users } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DailyStat {
  leads_total?: number;
  leads_meta?: number;
  leads_google?: number;
  leads_organic?: number;
  leads_by_campaign?: Record<string, number>;
  leads_by_medium?: Record<string, number>;
  forms_data?: Record<string, number>;
  [key: string]: any;
}

interface Props {
  stats: DailyStat[];
}

const SOURCE_COLORS: Record<string, string> = {
  ig: "hsl(270, 70%, 60%)",
  instagram: "hsl(270, 70%, 60%)",
  google: "hsl(217, 91%, 60%)",
  organic: "hsl(142, 71%, 45%)",
};

const MEDIUM_COLORS: Record<string, string> = {
  paid_social: "hsl(270, 70%, 60%)",
  cpc: "hsl(217, 91%, 60%)",
  organic: "hsl(142, 71%, 45%)",
};

const DEFAULT_COLORS = [
  "hsl(270, 70%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 50%)",
];

function mergeJsonbMaps(stats: DailyStat[], field: keyof DailyStat): Record<string, number> {
  const result: Record<string, number> = {};
  for (const day of stats) {
    const obj = day[field];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj as Record<string, number>)) {
        result[k] = (result[k] || 0) + (Number(v) || 0);
      }
    }
  }
  return result;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function LeadsBySourceBreakdown({ stats }: Props) {
  const sourceData = useMemo(() => {
    const totalMeta = stats.reduce((s, d) => s + (d.leads_meta || 0), 0);
    const totalGoogle = stats.reduce((s, d) => s + (d.leads_google || 0), 0);
    const totalOrganic = stats.reduce((s, d) => s + (d.leads_organic || 0), 0);
    return [
      { name: "Instagram", value: totalMeta, fill: SOURCE_COLORS.ig },
      { name: "Google", value: totalGoogle, fill: SOURCE_COLORS.google },
      { name: "Orgânico", value: totalOrganic, fill: SOURCE_COLORS.organic },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const campaignData = useMemo(() => {
    const merged = mergeJsonbMaps(stats, "leads_by_campaign");
    return Object.entries(merged)
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 22) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stats]);

  const mediumData = useMemo(() => {
    const merged = mergeJsonbMaps(stats, "leads_by_medium");
    return Object.entries(merged)
      .map(([name, value]) => ({
        name,
        value,
        fill: MEDIUM_COLORS[name.toLowerCase()] || DEFAULT_COLORS[Object.keys(merged).indexOf(name) % DEFAULT_COLORS.length],
      }))
      .filter((d) => d.value > 0);
  }, [stats]);

  const formsData = useMemo(() => mergeJsonbMaps(stats, "forms_data"), [stats]);
  const topForm = useMemo(() => {
    const entries = Object.entries(formsData);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [formsData]);

  const totalLeads = stats.reduce((s, d) => s + (d.leads_total || 0), 0);

  const hasData = sourceData.length > 0 || campaignData.length > 0 || mediumData.length > 0;
  if (!hasData) return null;

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">📋 Origem dos Leads</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Por Fonte */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">Por Fonte</p>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={65} labelLine={false} label={CustomLabel}>
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => v} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                {sourceData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded" style={{ background: d.fill }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-10">Sem dados</p>
          )}
        </div>

        {/* Por Campanha */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">Por Campanha</p>
          {campaignData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={campaignData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground py-10">Sem dados</p>
          )}
        </div>

        {/* Por Mídia */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">Por Mídia</p>
          {mediumData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={mediumData} dataKey="value" cx="50%" cy="50%" outerRadius={65} labelLine={false} label={CustomLabel}>
                    {mediumData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => v} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                {mediumData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded" style={{ background: d.fill }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-10">Sem dados</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total de leads no período: <strong className="text-foreground">{totalLeads}</strong></span>
        {topForm && (
          <span>Formulário mais usado: <strong className="text-foreground">{topForm[0]}</strong> ({topForm[1]} leads)</span>
        )}
      </div>
    </div>
  );
}