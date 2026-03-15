import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentActivity } from "@/hooks/useAgentActivity";
import { AREA_LABELS, STATUS_CONFIG, formatDuration, formatTimeAgo, formatDateTime } from "./agentUtils";

export function AgentCard({ agent, onClick }: { agent: AgentActivity; onClick: () => void }) {
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
        {agent.persona && (
          <p className="text-xs text-muted-foreground mt-1">{agent.persona}</p>
        )}
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
