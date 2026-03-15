import { AgentActivity } from "@/hooks/useAgentActivity";
import { AGENT_AVATARS } from "./agentAvatars";
import { STATUS_CONFIG, AREA_LABELS, HEALTH_CONFIG, formatTimeAgo } from "./agentUtils";
import { Monitor, Coffee, AlertTriangle, Zap, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Office desk positions in a grid layout
const DESK_POSITIONS = [
  // Row 1 - CEO desk (centered)
  { row: 0, col: 1, colSpan: true },
  // Row 2 - 3 desks
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  // Row 3 - 3 desks
  { row: 2, col: 0 },
  { row: 2, col: 1 },
  { row: 2, col: 2 },
];

function AgentDesk({ agent, onClick }: { agent: AgentActivity; onClick: () => void }) {
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  const avatar = AGENT_AVATARS[agent.agent_key];
  const isRunning = agent.status === "running";
  const isError = agent.status === "error";
  const isIdle = agent.status === "idle";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="group relative flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-105 focus:outline-none"
          >
            {/* Desk surface */}
            <div className="relative">
              {/* Status glow ring */}
              <div
                className={`absolute -inset-1 rounded-full blur-sm transition-opacity duration-500 ${
                  isRunning ? "bg-blue-500/40 animate-pulse" :
                  isError ? "bg-destructive/40 animate-pulse" :
                  agent.status === "success" ? "bg-emerald-500/20" :
                  "bg-muted/20"
                }`}
              />

              {/* Avatar container */}
              <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${
                isRunning ? "border-blue-500 shadow-lg shadow-blue-500/30" :
                isError ? "border-destructive shadow-lg shadow-destructive/30" :
                agent.status === "success" ? "border-emerald-500" :
                "border-muted-foreground/30 grayscale-[50%]"
              }`}>
                {avatar ? (
                  <img
                    src={avatar}
                    alt={agent.agent_name}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isIdle ? "opacity-60 grayscale-[30%]" : "opacity-100"
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {agent.agent_name[0]}
                  </div>
                )}
              </div>

              {/* Status activity icon */}
              <div className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border border-background ${
                isRunning ? "bg-blue-500" :
                isError ? "bg-destructive" :
                agent.status === "success" ? "bg-emerald-500" :
                "bg-muted-foreground/50"
              }`}>
                {isRunning ? (
                  <Monitor className="h-2.5 w-2.5 text-white animate-pulse" />
                ) : isError ? (
                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                ) : isIdle ? (
                  <Coffee className="h-2.5 w-2.5 text-white" />
                ) : (
                  <Zap className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            </div>

            {/* Desk base */}
            <div className={`w-20 sm:w-24 h-6 sm:h-7 rounded-md border flex items-center justify-center transition-colors ${
              isRunning ? "bg-blue-500/10 border-blue-500/30" :
              isError ? "bg-destructive/10 border-destructive/30" :
              agent.status === "success" ? "bg-emerald-500/5 border-emerald-500/20" :
              "bg-muted/30 border-border"
            }`}>
              {isRunning && (
                <div className="flex gap-0.5">
                  <div className="w-1 h-2 bg-blue-500 rounded-sm animate-[pulse_0.6s_ease-in-out_infinite]" />
                  <div className="w-1 h-3 bg-blue-500 rounded-sm animate-[pulse_0.6s_ease-in-out_0.2s_infinite]" />
                  <div className="w-1 h-2 bg-blue-500 rounded-sm animate-[pulse_0.6s_ease-in-out_0.4s_infinite]" />
                </div>
              )}
              {isIdle && <span className="text-[8px] text-muted-foreground">💤</span>}
              {isError && <span className="text-[8px]">⚠️</span>}
              {agent.status === "success" && <span className="text-[8px]">✅</span>}
            </div>

            {/* Name plate */}
            <div className="text-center">
              <p className="text-[10px] sm:text-xs font-semibold leading-none truncate max-w-[80px] sm:max-w-[100px]">
                {agent.agent_name}
              </p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                {AREA_LABELS[agent.area] || agent.area}
              </p>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-semibold text-xs">{agent.agent_name}</p>
            <p className={`text-[10px] ${cfg.color} font-medium`}>{cfg.label}</p>
            {agent.last_action && (
              <p className="text-[10px] text-muted-foreground line-clamp-2">{agent.last_action}</p>
            )}
            <p className="text-[10px] text-muted-foreground">{formatTimeAgo(agent.last_run_at)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AgentOfficeView({
  agents,
  onSelectAgent,
}: {
  agents: AgentActivity[];
  onSelectAgent: (agent: AgentActivity) => void;
}) {
  // Sort: niva first (CEO), then rest alphabetically
  const sorted = [...agents].sort((a, b) => {
    if (a.agent_key === "niva") return -1;
    if (b.agent_key === "niva") return 1;
    return a.agent_name.localeCompare(b.agent_name);
  });

  const ceo = sorted.find(a => a.agent_key === "niva");
  const team = sorted.filter(a => a.agent_key !== "niva");

  return (
    <div className="rounded-2xl border bg-card/50 p-4 sm:p-6 space-y-6">
      {/* Office header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Escritório OFP — ao vivo
          </span>
        </div>
        <div className="flex items-center gap-1">
          {agents.filter(a => a.status === "running").length > 0 && (
            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-medium animate-pulse">
              {agents.filter(a => a.status === "running").length} trabalhando
            </span>
          )}
        </div>
      </div>

      {/* Office floor plan */}
      <div className="space-y-8">
        {/* CEO desk - top center */}
        {ceo && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Diretoria
            </span>
            <div className="relative">
              <div className="absolute inset-0 -m-3 rounded-xl border border-dashed border-primary/20 bg-primary/[0.02]" />
              <AgentDesk agent={ceo} onClick={() => onSelectAgent(ceo)} />
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-medium">
            Time operacional
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Team desks - grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
          {team.map((agent) => (
            <AgentDesk
              key={agent.id}
              agent={agent}
              onClick={() => onSelectAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Monitor className="h-3 w-3 text-blue-500" />
          <span className="text-[9px] text-muted-foreground">Trabalhando</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-emerald-500" />
          <span className="text-[9px] text-muted-foreground">Saudável</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coffee className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Ocioso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-[9px] text-muted-foreground">Erro</span>
        </div>
      </div>
    </div>
  );
}
