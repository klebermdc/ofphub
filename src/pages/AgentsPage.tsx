import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Activity, Bot, ArrowLeft, Search, SortAsc, LayoutGrid, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentActivity, useExecutionStats24h, AgentActivity } from "@/hooks/useAgentActivity";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCard } from "@/components/agents/AgentCard";
import { SummaryBar } from "@/components/agents/SummaryBar";
import { AgentDetailDrawer } from "@/components/agents/AgentDetailDrawer";
import { AgentOfficeView } from "@/components/agents/AgentOfficeView";
import {
  AREAS, STATUSES, EXPERIENCE_LEVELS, AREA_LABELS, STATUS_CONFIG,
  SORT_OPTIONS, SortOption, sortAgents,
} from "@/components/agents/agentUtils";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { agents, loading, refetch } = useAgentActivity();
  const { stats: stats24h, loading: statsLoading, refetch: refetchStats } = useExecutionStats24h();
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expFilter, setExpFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [selectedAgent, setSelectedAgent] = useState<AgentActivity | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "office">("office");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = agents.filter((a) => {
      if (areaFilter !== "all" && a.area !== areaFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (expFilter !== "all" && a.experience_level !== expFilter) return false;
      if (nameFilter !== "all" && a.agent_key !== nameFilter) return false;
      if (q && !a.agent_name.toLowerCase().includes(q)
        && !(a.last_action || "").toLowerCase().includes(q)
        && !(a.persona || "").toLowerCase().includes(q)
        && !(a.specialty || "").toLowerCase().includes(q)) return false;
      return true;
    });
    return sortAgents(result, sortBy);
  }, [agents, areaFilter, statusFilter, expFilter, nameFilter, search, sortBy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  };

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
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-sm sm:text-base leading-none">Central de Agentes</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                  Monitoramento em tempo real · {agents.length} agentes
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "office" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("office")}
              className="text-xs h-8 px-2"
            >
              <Building2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="text-xs h-8 px-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-xs h-8">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Executive Summary */}
            <SummaryBar agents={agents} stats24h={stats24h} statsLoading={statsLoading} />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-8 w-[160px] text-xs"
                />
              </div>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
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
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {STATUSES.filter(s => s !== "all").map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={expFilter} onValueChange={setExpFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos níveis</SelectItem>
                  {EXPERIENCE_LEVELS.filter(e => e !== "all").map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={nameFilter} onValueChange={setNameFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos agentes</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.agent_key} value={a.agent_key}>{a.agent_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-1">
                <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Agent Cards */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {agents.length === 0
                    ? "Nenhum agente registrado. Os dados aparecerão quando os agentes começarem a reportar."
                    : "Nenhum agente encontrado com os filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
