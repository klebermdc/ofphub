import { AGENT_AVATARS } from "./agentAvatars";
import type { AgentActivity } from "@/hooks/useAgentActivity";
import {
  Crown, Megaphone, Headset, Target, Wallet, Terminal, Tags,
  PenTool, Settings, Bot, type LucideIcon,
} from "lucide-react";

// ── Deterministic color from agent_key ──────────────────────────
const PALETTE = [
  "hsl(210, 70%, 55%)",  // blue
  "hsl(260, 60%, 55%)",  // violet
  "hsl(330, 65%, 55%)",  // pink
  "hsl(160, 60%, 45%)",  // teal
  "hsl(30, 80%, 55%)",   // orange
  "hsl(190, 70%, 45%)",  // cyan
  "hsl(350, 70%, 50%)",  // red
  "hsl(50, 75%, 50%)",   // gold
  "hsl(140, 55%, 45%)",  // green
  "hsl(280, 55%, 55%)",  // purple
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAgentColor(agentKey: string): string {
  return PALETTE[hashString(agentKey) % PALETTE.length];
}

// ── Initials from name ──────────────────────────────────────────
export function getAgentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Area icons ──────────────────────────────────────────────────
const AREA_ICONS: Record<string, LucideIcon> = {
  diretoria: Crown,
  marketing: Megaphone,
  atendimento: Headset,
  comercial: Target,
  financeiro: Wallet,
  tech: Terminal,
  pricing: Tags,
  conteudo: PenTool,
  operacoes: Settings,
};

export function getAreaIcon(area: string): LucideIcon {
  return AREA_ICONS[area] || Bot;
}

// ── Unified visual resolver ─────────────────────────────────────
export interface AgentVisual {
  avatar: string | null;       // null = use fallback
  initials: string;
  bgColor: string;             // deterministic bg for fallback avatar
  AreaIcon: LucideIcon;
  isCustom: boolean;           // true if has custom art
}

export function getAgentVisual(agent: Pick<AgentActivity, "agent_key" | "agent_name" | "area">): AgentVisual {
  const avatar = AGENT_AVATARS[agent.agent_key] ?? null;
  return {
    avatar,
    initials: getAgentInitials(agent.agent_name),
    bgColor: getAgentColor(agent.agent_key),
    AreaIcon: getAreaIcon(agent.area),
    isCustom: !!avatar,
  };
}
