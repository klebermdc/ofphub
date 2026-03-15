import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentActivity, AgentExecution, useAgentExecutionHistory } from "@/hooks/useAgentActivity";
import { AREA_LABELS, STATUS_CONFIG, formatDuration } from "./agentUtils";
import { User, Target, Sparkles, History } from "lucide-react";

function ExecutionRow({ exec }: { exec: AgentExecution }) {
  const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.idle;
  const time = exec.created_at
    ? new Date(exec.created_at).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div className="border rounded-lg p-3 space-y-1.5 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
          <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      {exec.action && (
        <p className="text-muted-foreground">{exec.action}</p>
      )}
      {exec.summary && (
        <p className="text-xs bg-muted/50 rounded p-2 whitespace-pre-wrap">{exec.summary}</p>
      )}
      {exec.error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded p-2 whitespace-pre-wrap">⚠ {exec.error}</p>
      )}
      <div className="flex gap-3 text-xs text-muted-foreground">
        {exec.duration_ms != null && <span>⏱ {formatDuration(exec.duration_ms)}</span>}
        {exec.channel && <span>📡 {exec.channel}</span>}
      </div>
    </div>
  );
}

export function AgentDetailDrawer({
  agent,
  open,
  onClose,
}: {
  agent: AgentActivity | null;
  open: boolean;
  onClose: () => void;
}) {
  const { executions, loading: historyLoading } = useAgentExecutionHistory(agent?.agent_key ?? null);

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
            {agent.experience_level && ` · ${agent.experience_level}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="profile" className="flex-1 gap-1">
                <User className="h-3.5 w-3.5" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="status" className="flex-1 gap-1">
                <Target className="h-3.5 w-3.5" /> Status
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1">
                <History className="h-3.5 w-3.5" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              {agent.persona && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Persona
                  </p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{agent.persona}</p>
                </div>
              )}
              {agent.specialty && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">Especialidade</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{agent.specialty}</p>
                </div>
              )}
              {agent.mission && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">Missão</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{agent.mission}</p>
                </div>
              )}
              {agent.style && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">Estilo</p>
                  <Badge variant="secondary" className="text-xs">{agent.style}</Badge>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Chave</p>
                  <p className="font-mono text-xs">{agent.agent_key}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Canal</p>
                  <p>{agent.last_channel || "—"}</p>
                </div>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <p className="text-sm text-muted-foreground font-medium">Resumo</p>
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
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-3">
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : executions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma execução registrada ainda.
                </p>
              ) : (
                executions.map((exec) => (
                  <ExecutionRow key={exec.id} exec={exec} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
