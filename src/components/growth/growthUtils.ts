export const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const YEAR_COLORS: Record<number, string> = {
  2023: "#94A3B8",
  2024: "#3B82F6",
  2025: "#8B5CF6",
  2026: "#22C55E",
};

export const SELLER_COLORS = [
  "#3B82F6", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#94A3B8"
];

export const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const formatCompact = (v: number) => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`;
  return formatBRL(v);
};

export interface ParsedOrder {
  data: string;
  venda: number;
  comissao_total: number;
  vendedor: string;
  produto: string;
  fornecedor: string;
  month: number;
  year: number;
}

export interface GrowthRow {
  month: number;
  year: number;
  revenue: number;
}

export function parseOrderDate(dateStr: string): { month: number; year: number } | null {
  if (!dateStr) return null;
  // ISO format
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(dateStr)) {
    const [y, m] = dateStr.split('-').map(Number);
    return { month: m, year: y };
  }
  // DD/MM/YYYY or DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
    const [, m, y] = dateStr.split('/').map(Number);
    const year = y < 100 ? 2000 + y : y;
    return { month: m, year };
  }
  return null;
}

export interface MonthlyAgg {
  month: number;
  year: number;
  revenue: number;
  orders: number;
  ticketMedio: number;
}

export function aggregateOrdersByMonth(orders: ParsedOrder[]): MonthlyAgg[] {
  const map = new Map<string, { revenue: number; count: number; month: number; year: number }>();
  for (const o of orders) {
    const key = `${o.year}-${o.month}`;
    const cur = map.get(key) || { revenue: 0, count: 0, month: o.month, year: o.year };
    cur.revenue += o.venda;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).map(v => ({
    month: v.month,
    year: v.year,
    revenue: v.revenue,
    orders: v.count,
    ticketMedio: v.count > 0 ? v.revenue / v.count : 0,
  }));
}
