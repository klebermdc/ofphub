export const AREAS = ["all", "diretoria", "marketing", "atendimento", "comercial", "financeiro", "tech", "pricing"];
export const STATUSES = ["all", "idle", "running", "success", "error"];

export const AREA_LABELS: Record<string, string> = {
  diretoria: "Diretoria",
  marketing: "Marketing",
  atendimento: "Atendimento",
  comercial: "Comercial",
  financeiro: "Financeiro",
  tech: "Tech",
  pricing: "Pricing",
};

export const STATUS_CONFIG: Record<string, { color: string; label: string; dotClass: string }> = {
  success: { color: "text-emerald-500", label: "Saudável", dotClass: "bg-emerald-500" },
  running: { color: "text-blue-500", label: "Executando", dotClass: "bg-blue-500 animate-pulse" },
  idle: { color: "text-muted-foreground", label: "Ocioso", dotClass: "bg-muted-foreground" },
  error: { color: "text-destructive", label: "Erro", dotClass: "bg-destructive" },
};

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
