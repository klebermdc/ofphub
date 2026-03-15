import { Bot, Zap, CheckCircle2, AlertTriangle, Activity, TrendingUp, Flame, ShieldAlert, HeartPulse, AlertCircle, XCircle } from "lucide-react";
import { AgentActivity, ExecutionStats24h } from "@/hooks/useAgentActivity";

interface SummaryBarProps {
  agents: AgentActivity[];
  stats24h: ExecutionStats24h;
  statsLoading: boolean;
}

export function SummaryBar({ agents, stats24h, statsLoading }: SummaryBarProps) {
  const total = agents.length;
  const running = agents.filter(a => a.status === "running").length;
  const errors = agents.filter(a => a.status === "error").length;
  const healthy = agents.filter(a => a.status === "success").length;

  const healthHealthy = agents.filter(a => !a.health_level || a.health_level === "healthy").length;
  const healthWarning = agents.filter(a => a.health_level === "warning").length;
  const healthCritical = agents.filter(a => a.health_level === "critical").length;

  const items = [
    { icon: Bot, label: "Agentes", value: String(total), color: "text-foreground", sub: null },
    { icon: Zap, label: "Rodando", value: String(running), color: "text-blue-500", sub: null },
    { icon: CheckCircle2, label: "Saudáveis", value: String(healthy), color: "text-emerald-500", sub: null },
    { icon: AlertTriangle, label: "Com Erro", value: String(errors), color: "text-destructive", sub: null },
  ];

  const healthItems = [
    { icon: HeartPulse, label: "Saúde OK", value: String(healthHealthy), color: "text-emerald-500" },
    { icon: AlertCircle, label: "Atenção", value: String(healthWarning), color: "text-yellow-500" },
    { icon: XCircle, label: "Crítico", value: String(healthCritical), color: "text-red-500" },
  ];

  const statsItems = [
    {
      icon: Activity,
      label: "Execuções 24h",
      value: statsLoading ? "..." : String(stats24h.totalExecutions),
      color: "text-primary",
      sub: null,
    },
    {
      icon: ShieldAlert,
      label: "Erros 24h",
      value: statsLoading ? "..." : String(stats24h.totalErrors),
      color: stats24h.totalErrors > 0 ? "text-destructive" : "text-muted-foreground",
      sub: null,
    },
    {
      icon: Flame,
      label: "Mais ativo 24h",
      value: statsLoading ? "..." : (stats24h.topAgentByExecs?.agent_name || "—"),
      color: "text-primary",
      sub: stats24h.topAgentByExecs ? `${stats24h.topAgentByExecs.count} exec` : null,
      isText: true,
    },
    {
      icon: TrendingUp,
      label: "Mais erros 24h",
      value: statsLoading ? "..." : (stats24h.topAgentByErrors?.agent_name || "—"),
      color: stats24h.topAgentByErrors ? "text-destructive" : "text-muted-foreground",
      sub: stats24h.topAgentByErrors ? `${stats24h.topAgentByErrors.count} erros` : null,
      isText: true,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Agent status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.color === "text-destructive" ? "bg-destructive/10" : item.color === "text-emerald-500" ? "bg-emerald-500/10" : item.color === "text-blue-500" ? "bg-blue-500/10" : "bg-muted"}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 24h stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {statsItems.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card/80 p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-bold leading-none truncate ${'isText' in item && item.isText ? 'text-sm' : 'text-xl'}`}>
                {item.value}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                {item.sub && <span className="text-[10px] text-muted-foreground">· {item.sub}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
