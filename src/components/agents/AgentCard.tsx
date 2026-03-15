import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentActivity } from "@/hooks/useAgentActivity";
import { AREA_LABELS, STATUS_CONFIG, formatDuration, formatTimeAgo } from "./agentUtils";
import { Clock, Timer, Sparkles, Shield } from "lucide-react";

export function AgentCard({ agent, onClick }: { agent: AgentActivity; onClick: () => void }) {
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Status stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${cfg.dotClass.replace("animate-pulse", "")}`} />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
              <h3 className="font-semibold text-sm truncate">{agent.agent_name}</h3>
            </div>
            {agent.persona && (
              <p className="text-[11px] text-muted-foreground truncate pl-[18px]">{agent.persona}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
              {AREA_LABELS[agent.area] || agent.area}
            </Badge>
            {agent.experience_level && (
              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                {agent.experience_level === "Alta senioridade" ? "Sênior" : agent.experience_level}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 text-xs pb-4">
        {/* Status + Specialty */}
        <div className="flex items-center justify-between">
          <span className={`font-medium ${cfg.color} flex items-center gap-1`}>
            <div className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
            {cfg.label}
          </span>
          {agent.specialty && (
            <span className="text-muted-foreground truncate max-w-[55%] text-right flex items-center gap-1">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">{agent.specialty.split(",")[0]}</span>
            </span>
          )}
        </div>

        {/* Last action */}
        {agent.last_action && (
          <div className="bg-muted/40 rounded-md p-2 space-y-0.5">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Última ação</span>
            <p className="line-clamp-1">{agent.last_action}</p>
          </div>
        )}

        {/* Last summary */}
        {agent.last_summary && (
          <p className="text-muted-foreground bg-muted/30 rounded-md p-2 line-clamp-2 text-[11px]">
            {agent.last_summary}
          </p>
        )}

        {/* Timestamps row */}
        <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(agent.last_run_at)}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {formatDuration(agent.last_duration_ms)}
          </span>
        </div>

        {/* Error indicator */}
        {agent.status === "error" && agent.last_error && (
          <p className="text-destructive bg-destructive/10 rounded-md p-2 line-clamp-1 text-[11px] font-medium">
            ⚠ {agent.last_error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
