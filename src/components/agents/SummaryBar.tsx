import { Bot, Zap, CheckCircle2, AlertTriangle, Clock, Activity } from "lucide-react";
import { AgentActivity } from "@/hooks/useAgentActivity";

export function SummaryBar({ agents }: { agents: AgentActivity[] }) {
  const total = agents.length;
  const running = agents.filter(a => a.status === "running").length;
  const errors = agents.filter(a => a.status === "error").length;
  const healthy = agents.filter(a => a.status === "success").length;
  const lastAgent = agents.length
    ? [...agents].sort((a, b) =>
        (b.updated_at || "").localeCompare(a.updated_at || "")
      )[0]
    : null;
  const lastGlobalUpdate = lastAgent
    ? new Date(lastAgent.updated_at).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : "—";

  const items = [
    { icon: Bot, label: "Agentes", value: String(total), color: "text-foreground" },
    { icon: Zap, label: "Rodando", value: String(running), color: "text-blue-500" },
    { icon: CheckCircle2, label: "Saudáveis", value: String(healthy), color: "text-emerald-500" },
    { icon: AlertTriangle, label: "Com Erro", value: String(errors), color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-card p-3 sm:p-4 flex items-center gap-3">
          <item.icon className={`h-5 w-5 ${item.color}`} />
          <div>
            <p className="text-lg sm:text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
      <div className="rounded-xl border bg-card p-3 sm:p-4 flex items-center gap-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{lastAgent?.agent_name || "—"}</p>
          <p className="text-xs text-muted-foreground">Último atualizado</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-3 sm:p-4 flex items-center gap-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{lastGlobalUpdate}</p>
          <p className="text-xs text-muted-foreground">Última atualização</p>
        </div>
      </div>
    </div>
  );
}
