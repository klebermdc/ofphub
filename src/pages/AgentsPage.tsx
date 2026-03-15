import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Activity, Bot, Filter, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentActivity, AgentActivity } from "@/hooks/useAgentActivity";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCard } from "@/components/agents/AgentCard";
import { SummaryBar } from "@/components/agents/SummaryBar";
import { AgentDetailDrawer } from "@/components/agents/AgentDetailDrawer";
import { AREAS, STATUSES, AREA_LABELS, STATUS_CONFIG } from "@/components/agents/agentUtils";

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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter((a) => {
      if (areaFilter !== "all" && a.area !== areaFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (nameFilter !== "all" && a.agent_key !== nameFilter) return false;
      if (q && !a.agent_name.toLowerCase().includes(q) && !(a.last_action || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [agents, areaFilter, statusFilter, nameFilter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
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
            <SummaryBar agents={agents} />

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar agente ou ação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-[200px] text-sm"
                />
              </div>
              <Filter className="h-4 w-4 text-muted-foreground ml-1" />
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
