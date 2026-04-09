import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { parseOrderDate } from "@/utils/dateUtils";

type TrafficLight = "green" | "yellow" | "red";

interface Indicator {
  label: string;
  value: string;
  reference: string;
  color: TrafficLight;
}

const colorMap: Record<TrafficLight, { border: string; dot: string }> = {
  green: { border: "border-l-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  yellow: { border: "border-l-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  red: { border: "border-l-[hsl(var(--destructive))]", dot: "bg-[hsl(var(--destructive))]" },
};

function getBusinessDaysElapsed(month: number, year: number): number {
  const today = new Date();
  const lastDay = today.getFullYear() === year && today.getMonth() + 1 === month
    ? today.getDate()
    : new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count || 1;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getTotalBusinessDays(month: number, year: number): number {
  const total = getDaysInMonth(month, year);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count || 1;
}

interface Props {
  salesReps: SalesRep[];
  currentMonth: string;
  monthlyGoal: number;
}

export function SalesHealthIndicators({ salesReps, currentMonth, monthlyGoal }: Props) {
  const indicators = useMemo(() => {
    const parts = currentMonth.split("/");
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);

    // Filter orders for the month
    const allOrders = salesReps.flatMap(r =>
      (r.orders || []).filter(o => {
        const d = parseOrderDate(o.data);
        return d && d.month === month && d.year === year;
      })
    );

    const faturamento = allOrders.reduce((s, o) => s + (o.venda || 0), 0);
    const totalPedidos = allOrders.length;
    const bdElapsed = getBusinessDaysElapsed(month, year);
    const totalBD = getTotalBusinessDays(month, year);

    const result: Indicator[] = [];

    // 1. Ticket Médio
    const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0;
    result.push({
      label: "Ticket Médio",
      value: `R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
      reference: "Meta: > R$8.000",
      color: ticketMedio > 8000 ? "green" : ticketMedio >= 5000 ? "yellow" : "red",
    });

    // 2. Meta do Mês
    const pctMeta = monthlyGoal > 0 ? (faturamento / monthlyGoal) * 100 : 0;
    const dailyRate = bdElapsed > 0 ? faturamento / bdElapsed : 0;
    const projected = dailyRate * totalBD;
    const projPct = monthlyGoal > 0 ? (projected / monthlyGoal) * 100 : 0;
    result.push({
      label: "Meta do Mês",
      value: `${pctMeta.toFixed(0)}% (proj. ${projPct.toFixed(0)}%)`,
      reference: "Meta: atingir 100%",
      color: projPct > 100 ? "green" : projPct >= 80 ? "yellow" : "red",
    });

    // 3. Vendas/dia útil
    const vendasDia = totalPedidos / bdElapsed;
    result.push({
      label: "Vendas/dia útil",
      value: `${vendasDia.toFixed(1)} vendas/dia`,
      reference: "Meta: > 3/dia",
      color: vendasDia > 3 ? "green" : vendasDia >= 2 ? "yellow" : "red",
    });

    // 4. Vendedores Ativos
    const totalVendedores = salesReps.length;
    const activeVendedores = salesReps.filter(r =>
      (r.orders || []).some(o => {
        const d = parseOrderDate(o.data);
        return d && d.month === month && d.year === year;
      })
    ).length;
    const pctAtivos = totalVendedores > 0 ? (activeVendedores / totalVendedores) * 100 : 0;
    result.push({
      label: "Vendedores Ativos",
      value: `${activeVendedores}/${totalVendedores} (${pctAtivos.toFixed(0)}%)`,
      reference: "Meta: 100%",
      color: pctAtivos >= 100 ? "green" : pctAtivos >= 70 ? "yellow" : "red",
    });

    // 5. Maior Venda
    const maiorVenda = allOrders.reduce((max, o) => Math.max(max, o.venda || 0), 0);
    result.push({
      label: "Maior Venda",
      value: `R$ ${maiorVenda.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
      reference: "Informativo",
      color: maiorVenda > 15000 ? "green" : maiorVenda >= 8000 ? "yellow" : "red",
    });

    // 6. Concentração
    const salesByRep = salesReps.map(r => ({
      name: r.name,
      total: (r.orders || [])
        .filter(o => {
          const d = parseOrderDate(o.data);
          return d && d.month === month && d.year === year;
        })
        .reduce((s, o) => s + (o.venda || 0), 0),
    }));
    const topRepSales = Math.max(...salesByRep.map(r => r.total), 0);
    const pctConcentracao = faturamento > 0 ? (topRepSales / faturamento) * 100 : 0;
    result.push({
      label: "Concentração",
      value: `${pctConcentracao.toFixed(0)}% no top`,
      reference: "Saudável: < 35%",
      color: pctConcentracao < 35 ? "green" : pctConcentracao <= 50 ? "yellow" : "red",
    });

    return result;
  }, [salesReps, currentMonth, monthlyGoal]);

  if (indicators.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Farol Comercial</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {indicators.map((ind) => {
          const colors = colorMap[ind.color];
          return (
            <div
              key={ind.label}
              className={`bg-background/50 rounded-lg p-3 border-l-4 ${colors.border}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0`} />
                <span className="text-xs font-medium text-foreground truncate">{ind.label}</span>
              </div>
              <p className="text-lg font-bold leading-tight">{ind.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{ind.reference}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
