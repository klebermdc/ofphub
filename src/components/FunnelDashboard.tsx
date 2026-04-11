import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowDown, MessageCircle, Users, Target, AlertTriangle, BarChart3 } from "lucide-react";

interface DailyStat {
  date: string;
  leads_total: number;
  leads_by_campaign?: Record<string, number>;
  leads_by_content?: Record<string, number>;
  [key: string]: any;
}

interface WhatsAppDay {
  date: string;
  total_chats: number;
  chats_sem_vendedor: number;
  chats_by_agent: Record<string, number>;
  chats_by_tag: Record<string, number>;
  chats_by_stage: Record<string, number>;
  updated_at: string;
}

interface FunnelDashboardProps {
  stats: DailyStat[];
}

const STAGE_CONFIG: { key: string; label: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { key: "COLETANDO INFO", label: "COLETANDO INFO", bgClass: "bg-blue-500/15", textClass: "text-blue-600 dark:text-blue-400", borderClass: "border-blue-500" },
  { key: "PROPOSTA", label: "PROPOSTA", bgClass: "bg-amber-500/15", textClass: "text-amber-600 dark:text-amber-400", borderClass: "border-amber-500" },
  { key: "CLIENTE", label: "CLIENTE", bgClass: "bg-emerald-500/15", textClass: "text-emerald-600 dark:text-emerald-400", borderClass: "border-emerald-500" },
  { key: "URGENTE", label: "URGENTE", bgClass: "bg-red-500/15", textClass: "text-red-600 dark:text-red-400", borderClass: "border-red-500" },
  { key: "SEM CLASSIFICAÇÃO", label: "SEM CLASSIFICAÇÃO", bgClass: "bg-muted", textClass: "text-muted-foreground", borderClass: "border-muted-foreground" },
];

const STAGE_BAR_COLORS: Record<string, string> = {
  "COLETANDO INFO": "hsl(217, 91%, 60%)",
  "PROPOSTA": "hsl(45, 93%, 47%)",
  "CLIENTE": "hsl(160, 84%, 39%)",
  "URGENTE": "hsl(0, 84%, 60%)",
  "SEM CLASSIFICAÇÃO": "hsl(215, 16%, 47%)",
};

export function FunnelDashboard({ stats }: FunnelDashboardProps) {
  const [waSnapshot, setWaSnapshot] = useState<WhatsAppDay | null>(null);
  const [waLoading, setWaLoading] = useState(true);

  useEffect(() => {
    const fetchWa = async () => {
      setWaLoading(true);
      try {
        const { data } = await supabase
          .from("whatsapp_status")
          .select("*")
          .order("date", { ascending: false })
          .limit(1);
        setWaSnapshot((data as any[])?.[0] || null);
      } catch {
        setWaSnapshot(null);
      } finally {
        setWaLoading(false);
      }
    };
    fetchWa();
  }, []);

  // Leads aggregation from stats prop
  const { totalLeads, todayLeads, topCampaigns, topCreatives } = useMemo(() => {
    const totalLeads = stats.reduce((s, d) => s + (d.leads_total || 0), 0);
    const lastDay = stats[stats.length - 1];
    const todayLeads = lastDay?.leads_total || 0;

    const campMap: Record<string, number> = {};
    stats.forEach(d => {
      if (d.leads_by_campaign) {
        Object.entries(d.leads_by_campaign).forEach(([k, v]) => {
          campMap[k] = (campMap[k] || 0) + Number(v);
        });
      }
    });
    const topCampaigns = Object.entries(campMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const creativeMap: Record<string, number> = {};
    stats.forEach(d => {
      if (d.leads_by_content) {
        Object.entries(d.leads_by_content).forEach(([k, v]) => {
          creativeMap[k] = (creativeMap[k] || 0) + Number(v);
        });
      }
    });
    const topCreatives = Object.entries(creativeMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { totalLeads, todayLeads, topCampaigns, topCreatives };
  }, [stats]);

  // WA data
  const totalChats = waSnapshot?.total_chats || 0;
  const semVendedor = waSnapshot?.chats_sem_vendedor || 0;
  const agentBreakdown = useMemo(() =>
    Object.entries(waSnapshot?.chats_by_agent || {}).sort((a, b) => Number(b[1]) - Number(a[1])),
    [waSnapshot]
  );
  const stageBreakdown = useMemo(() => {
    const raw = waSnapshot?.chats_by_stage || {};
    return STAGE_CONFIG.map(sc => ({ ...sc, count: Number(raw[sc.key] || 0) }));
  }, [waSnapshot]);
  const totalStageChats = stageBreakdown.reduce((s, st) => s + st.count, 0);

  const lastUpdateTime = waSnapshot?.updated_at
    ? new Date(waSnapshot.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const maxCampBar = Math.max(...topCampaigns.map(c => c[1]), ...topCreatives.map(c => c[1]), 1);
  const maxAgentBar = Math.max(...agentBreakdown.map(a => Number(a[1])), 1);

  if (waLoading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center text-muted-foreground">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
        Carregando funil...
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Funil: Lead → Atendimento WhatsApp
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
        {/* ── Column 1: Leads ── */}
        <div className="bg-background/50 dark:bg-muted/20 rounded-lg p-4 space-y-3 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            Leads Entrando
          </div>
          <p className="text-3xl font-bold text-foreground">{totalLeads}</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            hoje: {todayLeads}
          </span>

          {topCampaigns.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Top Campanhas</p>
              {topCampaigns.map(([name, val]) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[130px]" title={name}>{name}</span>
                    <span className="font-semibold tabular-nums">{val}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(val / maxCampBar) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {topCreatives.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Top Criativos</p>
              {topCreatives.map(([name, val]) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[130px]" title={name}>{name}</span>
                    <span className="font-semibold tabular-nums">{val}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${(val / maxCampBar) * 100}%`, background: "hsl(270, 70%, 60%)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arrow 1 */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div className="flex md:hidden items-center justify-center py-1">
          <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
        </div>

        {/* ── Column 2: WhatsApp ── */}
        <div className="bg-background/50 dark:bg-muted/20 rounded-lg p-4 space-y-3 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </div>
          <p className="text-3xl font-bold text-foreground">{totalChats}</p>

          {semVendedor > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {semVendedor} sem vendedor!
            </span>
          )}

          {agentBreakdown.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Por Vendedor</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {agentBreakdown.map(([name, val], idx) => (
                  <div key={name} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="truncate max-w-[80px]" title={name}>{name}</span>
                      <span className="font-semibold tabular-nums">{Number(val)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(Number(val) / maxAgentBar) * 100}%`,
                          background: idx === 0 ? "hsl(270, 70%, 60%)" : "hsl(217, 91%, 60%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Arrow 2 */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div className="flex md:hidden items-center justify-center py-1">
          <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
        </div>

        {/* ── Column 3: Estágio ── */}
        <div className="bg-background/50 dark:bg-muted/20 rounded-lg p-4 space-y-3 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Target className="h-3.5 w-3.5" />
            Estágio
          </div>

          <div className="space-y-2">
            {stageBreakdown.map(st => {
              if (st.key === "URGENTE" && st.count === 0) return null;
              return (
                <div key={st.key} className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${st.bgClass} ${st.textClass}`}>
                    {st.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{st.count}</span>
                </div>
              );
            })}
          </div>

          {/* Stacked bar */}
          {totalStageChats > 0 && (
            <div className="pt-2">
              <div className="w-full h-3 rounded-full overflow-hidden flex">
                {stageBreakdown.filter(st => st.count > 0).map(st => (
                  <div
                    key={st.key}
                    className="h-full transition-all"
                    style={{
                      width: `${(st.count / totalStageChats) * 100}%`,
                      background: STAGE_BAR_COLORS[st.key] || "hsl(215, 16%, 47%)",
                    }}
                    title={`${st.label}: ${st.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                {stageBreakdown.filter(st => st.count > 0).map(st => (
                  <span key={st.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: STAGE_BAR_COLORS[st.key] }} />
                    {st.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Dados WhatsApp atualizados a cada 30min
        </div>
        {lastUpdateTime && (
          <span className="text-[10px] text-muted-foreground">
            Última atualização: {lastUpdateTime}
          </span>
        )}
      </div>
    </div>
  );
}