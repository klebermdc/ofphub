import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Bot, Activity, AlertTriangle, CheckCircle2, Clock, Zap, Filter, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useAgentActivity, AgentActivity } from "@/hooks/useAgentActivity";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const AREAS = ["all", "diretoria", "marketing", "atendimento", "comercial", "financeiro", "tech", "pricing"];
const STATUSES = ["all", "idle", "running", "success", "error"];

const AREA_LABELS: Record<string, string> = {
  diretoria: "Diretoria",
  marketing: "Marketing",
  atendimento: "Atendimento",
  comercial: "Comercial",
  financeiro: "Financeiro",
  tech: "Tech",
  pricing: "Pricing",
};

const STATUS_CONFIG: Record<string, { color: string; label: string; dotClass: string }> = {
  success: { color: "text-emerald-500", label: "Saudável", dotClass: "bg-emerald-500" },
  running: { color: "text-blue-500", label: "Executando", dotClass: "bg-blue-500 animate-pulse" },
  idle: { color: "text-muted-foreground", label: "Ocioso", dotClass: "bg-muted-foreground" },
  error: { color: "text-destructive", label: "Erro", dotClass: "bg-destructive" },
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function AgentCard({ agent, onClick }: { agent: AgentActivity; onClick: () => void }) {
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
            <CardTitle className="text-base">{agent.agent_name}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {AREA_LABELS[agent.area] || agent.area}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
        {agent.last_action && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Última ação</span>
            <span className="text-right truncate max-w-[60%]">{agent.last_action}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Executou</span>
          <span>{formatTimeAgo(agent.last_run_at)}</span>
        </div>
        {agent.next_run_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Próxima</span>
            <span>{formatDateTime(agent.next_run_at)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Duração</span>
          <span>{formatDuration(agent.last_duration_ms)}</span>
        </div>
        {agent.last_summary && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-1 line-clamp-2">
            {agent.last_summary}
          </p>
        )}
        {agent.status === "error" && agent.last_error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2 mt-1 line-clamp-2">
            ⚠ {agent.last_error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryBar({ agents }: { agents: AgentActivity[] }) {
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
function AgentDetailDrawer({
  agent,
  open,
  onClose,
}: {
  agent: AgentActivity | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!agent) return null;
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${cfg.dotClass}`} />
            <DrawerTitle>{agent.agent_name}</DrawerTitle>
          </div>
          <DrawerDescription>
            {AREA_LABELS[agent.area] || agent.area} · {cfg.label}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Chave</p>
              <p className="font-mono text-xs">{agent.agent_key}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Canal</p>
              <p>{agent.last_channel || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Última execução</p>
              <p>{agent.last_run_at ? new Date(agent.last_run_at).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Próxima execução</p>
              <p>{agent.next_run_at ? new Date(agent.next_run_at).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Duração</p>
              <p>{formatDuration(agent.last_duration_ms)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Atualizado</p>
              <p>{new Date(agent.updated_at).toLocaleString("pt-BR")}</p>
            </div>
          </div>

          {agent.last_action && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Última Ação</p>
              <p className="text-sm bg-muted/50 rounded-lg p-3">{agent.last_action}</p>
            </div>
          )}

          {agent.last_summary && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Resumo do Último Output</p>
              <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{agent.last_summary}</p>
            </div>
          )}

          {agent.last_error && (
            <div className="space-y-1">
              <p className="text-sm text-destructive font-medium">Último Erro</p>
              <p className="text-sm bg-destructive/10 text-destructive rounded-lg p-3 whitespace-pre-wrap">
                {agent.last_error}
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { agents, loading, refetch } = useAgentActivity();
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<AgentActivity | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (areaFilter !== "all" && a.area !== areaFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (nameFilter !== "all" && a.agent_key !== nameFilter) return false;
      return true;
    });
  }, [agents, areaFilter, statusFilter, nameFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Auth redirect (after all hooks)
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-semibold text-base sm:text-lg">Central de Agentes</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Monitoramento em tempo real</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Summary */}
            <SummaryBar agents={agents} />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas áreas</SelectItem>
                  {AREAS.filter(a => a !== "all").map((a) => (
                    <SelectItem key={a} value={a}>{AREA_LABELS[a] || a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {STATUSES.filter(s => s !== "all").map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={nameFilter} onValueChange={setNameFilter}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos agentes</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.agent_key} value={a.agent_key}>{a.agent_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Cards */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  {agents.length === 0
                    ? "Nenhum agente registrado ainda. Os dados aparecerão quando os agentes começarem a reportar."
                    : "Nenhum agente encontrado com os filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => setSelectedAgent(agent)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <AgentDetailDrawer
        agent={selectedAgent}
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
