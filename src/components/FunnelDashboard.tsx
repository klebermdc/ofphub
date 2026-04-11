import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MessageCircle, Users, Target } from "lucide-react";

interface FunnelDashboardProps {
  selectedMonth: string; // "MM/YYYY"
}

interface WhatsAppDay {
  date: string;
  total_chats: number;
  chats_sem_vendedor: number;
  chats_by_agent: Record<string, number>;
  chats_by_tag: Record<string, number>;
  chats_by_stage: Record<string, number>;
}

interface MarketingDay {
  date: string;
  leads_total: number;
  leads_by_campaign: Record<string, number> | null;
  leads_by_content: Record<string, number> | null;
}

export function FunnelDashboard({ selectedMonth }: FunnelDashboardProps) {
  const [waData, setWaData] = useState<WhatsAppDay[]>([]);
  const [mktData, setMktData] = useState<MarketingDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [mStr, yStr] = selectedMonth.split("/");
      const month = parseInt(mStr);
      const year = parseInt(yStr);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

      const [waRes, mktRes] = await Promise.all([
        supabase
          .from("whatsapp_status")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("marketing_daily_stats")
          .select("date, leads_total, leads_by_campaign, leads_by_content")
          .gte("date", startDate)
          .lte("date", endDate),
      ]);

      setWaData((waRes.data as any[]) || []);
      setMktData((mktRes.data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, [selectedMonth]);

  const { totalLeads, topCampaigns, topCreatives, totalChats, semVendedor, agentBreakdown, stageBreakdown } = useMemo(() => {
    const totalLeads = mktData.reduce((s, d) => s + (d.leads_total || 0), 0);

    // Aggregate campaigns
    const campMap: Record<string, number> = {};
    mktData.forEach(d => {
      if (d.leads_by_campaign) {
        Object.entries(d.leads_by_campaign).forEach(([k, v]) => {
          campMap[k] = (campMap[k] || 0) + (v as number);
        });
      }
    });
    const topCampaigns = Object.entries(campMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Aggregate creatives
    const creativeMap: Record<string, number> = {};
    mktData.forEach(d => {
      if (d.leads_by_content) {
        Object.entries(d.leads_by_content).forEach(([k, v]) => {
          creativeMap[k] = (creativeMap[k] || 0) + (v as number);
        });
      }
    });
    const topCreatives = Object.entries(creativeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // WA aggregation — use last day's data (most recent snapshot)
    const lastWa = waData.length > 0 ? waData[waData.length - 1] : null;
    const totalChats = lastWa?.total_chats || 0;
    const semVendedor = lastWa?.chats_sem_vendedor || 0;
    const agentBreakdown = Object.entries(lastWa?.chats_by_agent || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const stageBreakdown = Object.entries(lastWa?.chats_by_stage || {});

    return { totalLeads, topCampaigns, topCreatives, totalChats, semVendedor, agentBreakdown, stageBreakdown };
  }, [mktData, waData]);

  const stageColors: Record<string, string> = {
    "COLETANDO INFO": "hsl(var(--info))",
    "PROPOSTA": "hsl(var(--warning))",
    "CLIENTE": "hsl(var(--success))",
    "URGENTE": "hsl(var(--destructive))",
  };

  const stageColorClasses: Record<string, string> = {
    "COLETANDO INFO": "text-blue-500",
    "PROPOSTA": "text-amber-500",
    "CLIENTE": "text-emerald-500",
    "URGENTE": "text-red-500",
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center text-muted-foreground">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
        Carregando funil...
      </div>
    );
  }

  const maxBar = Math.max(
    ...topCampaigns.map(c => c[1]),
    ...topCreatives.map(c => c[1]),
    1
  );

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Funil: Lead → Atendimento
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-start">
        {/* Column 1: Leads */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            Leads (Entrada)
          </div>
          <p className="text-3xl font-bold text-foreground">{totalLeads}</p>

          {topCampaigns.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Por Campanha</p>
              {topCampaigns.map(([name, val]) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[120px]">{name}</span>
                    <span className="font-semibold">{val}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${(val / maxBar) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {topCreatives.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Por Criativo</p>
              {topCreatives.map(([name, val]) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[120px]">{name}</span>
                    <span className="font-semibold">{val}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(val / maxBar) * 100}%`, background: "hsl(270, 70%, 60%)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arrow 1 */}
        <div className="hidden md:flex items-center justify-center h-full">
          <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
        </div>

        {/* Column 2: WhatsApp */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp (Atendimento)
          </div>
          <p className="text-3xl font-bold text-foreground">{totalChats}</p>
          {semVendedor > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
              {semVendedor} sem vendedor
            </span>
          )}
          {agentBreakdown.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Por Vendedor</p>
              {agentBreakdown.map(([name, val]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="truncate max-w-[120px]">{name}</span>
                  <span className="font-semibold">{val as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arrow 2 */}
        <div className="hidden md:flex items-center justify-center h-full">
          <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
        </div>

        {/* Column 3: Stages */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Target className="h-3.5 w-3.5" />
            Estágio
          </div>
          {stageBreakdown.length > 0 ? (
            <div className="space-y-2">
              {stageBreakdown.map(([stage, val]) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${stageColorClasses[stage] || "text-foreground"}`}>
                    {stage}
                  </span>
                  <span className="font-bold">{val as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem dados de estágio</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        Dados atualizados a cada 30min
      </div>
    </div>
  );
}