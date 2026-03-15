export const AREAS = ["all", "diretoria", "marketing", "atendimento", "comercial", "financeiro", "tech", "pricing"];
export const STATUSES = ["all", "idle", "running", "success", "error"];
export const EXPERIENCE_LEVELS = ["all", "Alta senioridade", "Especialista"];

export const AREA_LABELS: Record<string, string> = {
  diretoria: "Diretoria",
  marketing: "Marketing",
  atendimento: "Atendimento",
  comercial: "Comercial",
  financeiro: "Financeiro",
  tech: "Tech",
  pricing: "Pricing",
};

export const HEALTH_LEVELS = ["all", "healthy", "warning", "critical"];

export const HEALTH_CONFIG: Record<string, { color: string; label: string; dotClass: string; bgClass: string; emoji: string }> = {
  healthy: { color: "text-emerald-500", label: "Saudável", dotClass: "bg-emerald-500", bgClass: "bg-emerald-500/10", emoji: "💚" },
  warning: { color: "text-yellow-500", label: "Atenção", dotClass: "bg-yellow-500", bgClass: "bg-yellow-500/10", emoji: "⚠️" },
  critical: { color: "text-red-500", label: "Crítico", dotClass: "bg-red-500", bgClass: "bg-red-500/10", emoji: "🔴" },
};

export const STATUS_CONFIG: Record<string, { color: string; label: string; dotClass: string; bgClass: string }> = {
  success: { color: "text-emerald-500", label: "Saudável", dotClass: "bg-emerald-500", bgClass: "bg-emerald-500/10" },
  running: { color: "text-blue-500", label: "Executando", dotClass: "bg-blue-500 animate-pulse", bgClass: "bg-blue-500/10" },
  idle: { color: "text-muted-foreground", label: "Ocioso", dotClass: "bg-muted-foreground", bgClass: "bg-muted/50" },
  error: { color: "text-destructive", label: "Erro", dotClass: "bg-destructive", bgClass: "bg-destructive/10" },
};

export type SortOption = "updated" | "status" | "area" | "name" | "health";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated", label: "Atualização" },
  { value: "status", label: "Status" },
  { value: "health", label: "Saúde" },
  { value: "area", label: "Área" },
  { value: "name", label: "Nome" },
];

const STATUS_ORDER: Record<string, number> = { error: 0, running: 1, success: 2, idle: 3 };
const HEALTH_ORDER: Record<string, number> = { critical: 0, warning: 1, healthy: 2 };

export function sortAgents(agents: any[], sort: SortOption) {
  return [...agents].sort((a, b) => {
    switch (sort) {
      case "updated":
        return (b.updated_at || "").localeCompare(a.updated_at || "");
      case "status":
        return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      case "health":
        return (HEALTH_ORDER[a.health_level || "healthy"] ?? 9) - (HEALTH_ORDER[b.health_level || "healthy"] ?? 9);
      case "area":
        return (a.area || "").localeCompare(b.area || "");
      case "name":
        return (a.agent_name || "").localeCompare(b.agent_name || "");
      default:
        return 0;
    }
  });
}

export function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

export function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function formatFullDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
