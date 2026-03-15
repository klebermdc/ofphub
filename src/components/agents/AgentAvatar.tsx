import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAgentVisual } from "./agentVisualConfig";
import type { AgentActivity } from "@/hooks/useAgentActivity";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  agent: Pick<AgentActivity, "agent_key" | "agent_name" | "area">;
  size?: "sm" | "md" | "lg";
  borderColor?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-14 w-14 sm:h-16 sm:h-16 text-lg",
  lg: "h-12 w-12 text-sm",
};

export function AgentAvatar({ agent, size = "sm", borderColor, className }: AgentAvatarProps) {
  const visual = getAgentVisual(agent);

  return (
    <Avatar
      className={cn("border-2", SIZE_MAP[size], className)}
      style={{ borderColor: borderColor || (visual.isCustom ? undefined : visual.bgColor) }}
    >
      {visual.avatar ? (
        <AvatarImage src={visual.avatar} alt={agent.agent_name} />
      ) : null}
      <AvatarFallback
        className="font-bold"
        style={{
          backgroundColor: visual.bgColor,
          color: "white",
        }}
      >
        {visual.initials}
      </AvatarFallback>
    </Avatar>
  );
}
