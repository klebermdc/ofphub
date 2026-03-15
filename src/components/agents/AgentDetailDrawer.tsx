import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AgentActivity, AgentExecution, useAgentExecutionHistory } from "@/hooks/useAgentActivity";
import { AREA_LABELS, STATUS_CONFIG, HEALTH_CONFIG, formatDuration, formatFullDateTime } from "./agentUtils";
import { AGENT_AVATARS } from "./agentAvatars";
import { User, Target, Sparkles, History, Shield, Zap, MessageSquare, Clock, Timer, AlertTriangle, HeartPulse } from "lucide-react";

function ExecutionRow({ exec }: { exec: AgentExecution }) {
  const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.idle;
  const startTime = formatFullDateTime(exec.started_at || exec.created_at);
  const endTime = formatFullDateTime(exec.finished_at);

  return (
    <div className={`border rounded-lg p-3 space-y-2 text-sm ${cfg.bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
          <span className={`font-medium text-xs ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {exec.duration_ms != null && (
            <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />{formatDuration(exec.duration_ms)}</span>
          )}
          {exec.channel && (
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{exec.channel}</span>
          )}
        </div>
      </div>

      {exec.action && (
        <p className="font-medium text-xs">{exec.action}</p>
      )}
      {exec.summary && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{exec.summary}</p>
      )}
      {exec.error && (
        <p className="text-xs text-destructive font-medium whitespace-pre-wrap flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          {exec.error}
        </p>
      )}

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />Início: {startTime}</span>
        {exec.finished_at && <span>Fim: {endTime}</span>}
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
  const healthCfg = HEALTH_CONFIG[agent.health_level || "healthy"] || HEALTH_CONFIG.healthy;
  const showHealth = agent.health_level && agent.health_level !== "healthy";

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2" style={{ borderColor: cfg.dotClass.includes("emerald") ? "rgb(16 185 129)" : cfg.dotClass.includes("blue") ? "rgb(59 130 246)" : cfg.dotClass.includes("destructive") ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
              <AvatarImage src={AGENT_AVATARS[agent.agent_key]} alt={agent.agent_name} />
              <AvatarFallback className="text-sm font-bold">{agent.agent_name[0]}</AvatarFallback>
            </Avatar>
            <DrawerTitle className="text-lg">{agent.agent_name}</DrawerTitle>
          </div>
          <DrawerDescription className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{AREA_LABELS[agent.area] || agent.area}</Badge>
            <Badge className={`text-[10px] ${cfg.bgClass} ${cfg.color} border-0`}>{cfg.label}</Badge>
            {agent.experience_level && (
              <Badge variant="secondary" className="text-[10px]">
                <Shield className="h-2.5 w-2.5 mr-0.5" />{agent.experience_level}
              </Badge>
            )}
            {showHealth && (
              <Badge className={`text-[10px] ${healthCfg.bgClass} ${healthCfg.color} border-0`}>
                <HeartPulse className="h-2.5 w-2.5 mr-0.5" />{healthCfg.label}
              </Badge>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="profile" className="flex-1 gap-1 text-xs">
                <User className="h-3 w-3" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="status" className="flex-1 gap-1 text-xs">
                <Target className="h-3 w-3" /> Status
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1 text-xs">
                <History className="h-3 w-3" /> Histórico
                {executions.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{executions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-3">
              {agent.persona && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Persona
                  </p>
                  <p className="text-sm font-medium">{agent.persona}</p>
                </div>
              )}
              {agent.specialty && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Especialidade
                  </p>
                  <p className="text-sm">{agent.specialty}</p>
                </div>
              )}
              {agent.mission && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1">
                  <p className="text-[10px] text-primary uppercase tracking-wider font-medium flex items-center gap-1">
                    <Target className="h-3 w-3" /> Missão
                  </p>
                  <p className="text-sm">{agent.mission}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {agent.style && (
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Estilo</p>
                    <p className="text-xs">{agent.style}</p>
                  </div>
                )}
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Canal</p>
                  <p className="text-xs flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {agent.last_channel || "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Chave técnica</p>
                <p className="font-mono text-xs text-muted-foreground">{agent.agent_key}</p>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-3">
              {/* Health Level */}
              <div className={`rounded-lg p-3 space-y-1 border ${showHealth ? `${healthCfg.bgClass} border-current/20` : "bg-emerald-500/10 border-emerald-500/20"}`}>
                <p className={`text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 ${showHealth ? healthCfg.color : "text-emerald-500"}`}>
                  <HeartPulse className="h-3 w-3" /> Saúde Operacional
                </p>
                <p className={`text-sm font-semibold ${showHealth ? healthCfg.color : "text-emerald-500"}`}>{healthCfg.label}</p>
                {agent.health_reason && (
                  <p className="text-xs text-muted-foreground">{agent.health_reason}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Última execução</p>
                  <p className="text-xs">{agent.last_run_at ? new Date(agent.last_run_at).toLocaleString("pt-BR") : "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Próxima</p>
                  <p className="text-xs">{agent.next_run_at ? new Date(agent.next_run_at).toLocaleString("pt-BR") : "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Duração</p>
                  <p className="text-xs font-mono">{formatDuration(agent.last_duration_ms)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Atualizado</p>
                  <p className="text-xs">{new Date(agent.updated_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {agent.last_action && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Última Ação</p>
                  <p className="text-sm">{agent.last_action}</p>
                </div>
              )}

              {agent.last_summary && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Resumo</p>
                  <p className="text-sm whitespace-pre-wrap">{agent.last_summary}</p>
                </div>
              )}

              {agent.last_error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                  <p className="text-[10px] text-destructive uppercase tracking-wider font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Último Erro
                  </p>
                  <p className="text-sm text-destructive whitespace-pre-wrap">{agent.last_error}</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-2">
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <History className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma execução registrada ainda.
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    O histórico aparecerá quando o agente começar a reportar.
                  </p>
                </div>
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
