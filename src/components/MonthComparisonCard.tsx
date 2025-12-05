import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { cn } from "@/lib/utils";

interface MonthComparisonCardProps {
  salesReps: SalesRep[];
  availableMonths: string[];
  currentMonth: string;
}

function calculateMonthData(salesReps: SalesRep[], month: string): { sales: number; commission: number; deals: number; daysWithData: Set<number> } {
  let sales = 0;
  let commission = 0;
  let deals = 0;
  const daysWithData = new Set<number>();

  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.data) return;
      const parts = order.data.split('/');
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const m = parts[1].padStart(2, '0');
        let y = parts[2] || new Date().getFullYear().toString();
        if (y.length === 2) y = `20${y}`;
        if (`${m}/${y}` === month) {
          sales += order.venda;
          commission += order.comissaoVendedor;
          deals += 1;
          if (!isNaN(day)) daysWithData.add(day);
        }
      }
    });
  });

  return { sales, commission, deals, daysWithData };
}

function getDaysInMonth(month: string): number {
  const [m, y] = month.split('/').map(Number);
  return new Date(y, m, 0).getDate();
}

function getDaysElapsed(month: string): number {
  const [m, y] = month.split('/').map(Number);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // If it's the current month, return today's day number
  if (m === currentMonth && y === currentYear) {
    return now.getDate();
  }
  
  // Otherwise, return total days in that month (complete month)
  return getDaysInMonth(month);
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

  const currentData = activeMonth ? calculateMonthData(salesReps, activeMonth) : { sales: 0, commission: 0, deals: 0, daysWithData: new Set<number>() };
  const previousData = previousMonth ? calculateMonthData(salesReps, previousMonth) : { sales: 0, commission: 0, deals: 0, daysWithData: new Set<number>() };

  // Calculate days elapsed for fair comparison
  const currentDays = activeMonth ? getDaysElapsed(activeMonth) : 1;
  const previousDays = previousMonth ? getDaysInMonth(previousMonth) : 1;

  // Calculate daily averages
  const currentDailySales = currentDays > 0 ? currentData.sales / currentDays : 0;
  const previousDailySales = previousDays > 0 ? previousData.sales / previousDays : 0;
  
  const currentDailyCommission = currentDays > 0 ? currentData.commission / currentDays : 0;
  const previousDailyCommission = previousDays > 0 ? previousData.commission / previousDays : 0;
  
  const currentDailyDeals = currentDays > 0 ? currentData.deals / currentDays : 0;
  const previousDailyDeals = previousDays > 0 ? previousData.deals / previousDays : 0;

  // Compare daily averages
  const salesChange = getPercentChange(currentDailySales, previousDailySales);
  const commissionChange = getPercentChange(currentDailyCommission, previousDailyCommission);
  const dealsChange = getPercentChange(currentDailyDeals, previousDailyDeals);

  const ComparisonItem = ({ label, currentDaily, previousDaily, change, isCurrency = true }: { label: string; currentDaily: number; previousDaily: number; change: number; isCurrency?: boolean }) => (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label} <span className="text-xs">(média/dia)</span></p>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">
          {isCurrency ? formatCurrency(Math.round(currentDaily)) : currentDaily.toFixed(1)}
        </span>
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
        Mês anterior: {isCurrency ? formatCurrency(Math.round(previousDaily)) : previousDaily.toFixed(1)}/dia
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
        <div className="text-right">
          <span className="text-sm text-muted-foreground">
            {monthNames[parseInt(m) - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {currentDays} dias
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ComparisonItem
          label="Vendas"
          currentDaily={currentDailySales}
          previousDaily={previousDailySales}
          change={salesChange}
        />
        <ComparisonItem
          label="Comissão"
          currentDaily={currentDailyCommission}
          previousDaily={previousDailyCommission}
          change={commissionChange}
        />
        <ComparisonItem
          label="Pedidos"
          currentDaily={currentDailyDeals}
          previousDaily={previousDailyDeals}
          change={dealsChange}
          isCurrency={false}
        />
      </div>
    </div>
  );
}
