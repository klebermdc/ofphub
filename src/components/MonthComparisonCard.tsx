import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { cn } from "@/lib/utils";

interface MonthComparisonCardProps {
  salesReps: SalesRep[];
  availableMonths: string[];
  currentMonth: string;
}

interface ComparisonData {
  currentSales: number;
  previousSales: number;
  currentCommission: number;
  previousCommission: number;
  currentDeals: number;
  previousDeals: number;
}

function calculateMonthData(salesReps: SalesRep[], month: string): { sales: number; commission: number; deals: number } {
  let sales = 0;
  let commission = 0;
  let deals = 0;

  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.data) return;
      const parts = order.data.split('/');
      if (parts.length >= 2) {
        const m = parts[1].padStart(2, '0');
        let y = parts[2] || new Date().getFullYear().toString();
        if (y.length === 2) y = `20${y}`;
        if (`${m}/${y}` === month) {
          sales += order.venda;
          commission += order.comissaoVendedor;
          deals += 1;
        }
      }
    });
  });

  return { sales, commission, deals };
}

function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function MonthComparisonCard({ salesReps, availableMonths, currentMonth }: MonthComparisonCardProps) {
  // Find current and previous month
  const sortedMonths = [...availableMonths].sort((a, b) => {
    const [mA, yA] = a.split('/').map(Number);
    const [mB, yB] = b.split('/').map(Number);
    return yA - yB || mA - mB;
  });

  const currentIdx = currentMonth !== 'all' 
    ? sortedMonths.indexOf(currentMonth)
    : sortedMonths.length - 1;
  
  const activeMonth = currentMonth !== 'all' ? currentMonth : sortedMonths[sortedMonths.length - 1];
  const previousMonth = currentIdx > 0 ? sortedMonths[currentIdx - 1] : null;

  const currentData = activeMonth ? calculateMonthData(salesReps, activeMonth) : { sales: 0, commission: 0, deals: 0 };
  const previousData = previousMonth ? calculateMonthData(salesReps, previousMonth) : { sales: 0, commission: 0, deals: 0 };

  const salesChange = getPercentChange(currentData.sales, previousData.sales);
  const commissionChange = getPercentChange(currentData.commission, previousData.commission);
  const dealsChange = getPercentChange(currentData.deals, previousData.deals);

  const ComparisonItem = ({ label, current, previous, change }: { label: string; current: string; previous: string; change: number }) => (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">{current}</span>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
          change > 0 && "text-emerald-500 bg-emerald-500/10",
          change < 0 && "text-red-500 bg-red-500/10",
          change === 0 && "text-muted-foreground bg-muted"
        )}>
          {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Mês anterior: {previous}
      </p>
    </div>
  );

  if (!activeMonth) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comparação Mensal</h3>
        </div>
        <p className="text-muted-foreground text-sm">Dados insuficientes para comparação.</p>
      </div>
    );
  }

  const [m, y] = activeMonth.split('/');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comparação Mensal</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {monthNames[parseInt(m) - 1]} {y}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ComparisonItem
          label="Vendas"
          current={formatCurrency(currentData.sales)}
          previous={formatCurrency(previousData.sales)}
          change={salesChange}
        />
        <ComparisonItem
          label="Comissão"
          current={formatCurrency(currentData.commission)}
          previous={formatCurrency(previousData.commission)}
          change={commissionChange}
        />
        <ComparisonItem
          label="Pedidos"
          current={String(currentData.deals)}
          previous={String(previousData.deals)}
          change={dealsChange}
        />
      </div>
    </div>
  );
}
