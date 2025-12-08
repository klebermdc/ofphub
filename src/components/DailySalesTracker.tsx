import { Target, TrendingUp, Zap } from "lucide-react";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

interface DailySalesTrackerProps {
  salesReps: { orders?: { data?: string; venda: number; comissao?: number; comissaoVendedor?: number }[] }[];
  monthlyGoal: number;
  currentMonth: string;
  totalComissao?: number;
  totalComissaoVendedor?: number;
  totalSalaries?: number;
  marketingCosts?: number;
  operationalCosts?: number;
  resultGoal?: number;
}

function getBusinessDaysInMonth(month: number, year: number): number {
  let businessDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  return businessDays;
}

function getBusinessDaysElapsed(month: number, year: number): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const today = now.getDate();
  
  let businessDays = 0;
  
  if (month === currentMonth && year === currentYear) {
    for (let day = 1; day <= today; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    return businessDays;
  }
  
  return getBusinessDaysInMonth(month, year);
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DailySalesTracker({ 
  salesReps, 
  monthlyGoal, 
  currentMonth,
}: DailySalesTrackerProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  
  const totalBusinessDays = getBusinessDaysInMonth(m, y);
  const businessDaysElapsed = getBusinessDaysElapsed(m, y);
  const remainingDays = totalBusinessDays - businessDaysElapsed;
  
  let monthSales = 0;
  
  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.data) return;
      const parts = order.data.split('/');
      if (parts.length >= 3) {
        const orderMonth = parts[1].padStart(2, '0');
        let orderYear = parts[2];
        if (orderYear.length === 2) orderYear = `20${orderYear}`;
        
        if (`${orderMonth}/${orderYear}` === currentMonth) {
          monthSales += order.venda;
        }
      }
    });
  });
  
  const dailyAverage = businessDaysElapsed > 0 ? monthSales / businessDaysElapsed : 0;
  const projectedMonthSales = dailyAverage * totalBusinessDays;
  const progressPercent = monthlyGoal > 0 ? (monthSales / monthlyGoal) * 100 : 0;
  const projectionPercent = monthlyGoal > 0 ? (projectedMonthSales / monthlyGoal) * 100 : 0;
  const isOnTrack = projectedMonthSales >= monthlyGoal;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Acompanhamento do Mês</h3>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium">
            {monthNames[m - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {businessDaysElapsed} de {totalBusinessDays} dias úteis • Faltam {remainingDays}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vendas do Mês */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Vendas do Mês</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(monthSales)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">de {formatCurrency(monthlyGoal)}</span>
              <span className={cn(
                progressPercent >= 100 ? "text-emerald-500" : progressPercent >= 80 ? "text-warning" : "text-muted-foreground"
              )}>{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(progressPercent, 100)} className="h-2" />
          </div>
        </div>

        {/* Média Diária */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <span className="text-sm text-muted-foreground">Média Diária</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(dailyAverage)}</p>
          <p className="text-xs text-muted-foreground">
            Necessário: {formatCurrency(remainingDays > 0 ? (monthlyGoal - monthSales) / remainingDays : 0)}/dia
          </p>
        </div>

        {/* Projeção */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className={cn("h-4 w-4", isOnTrack ? "text-emerald-500" : "text-red-500")} />
            <span className="text-sm text-muted-foreground">Projeção do Mês</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            isOnTrack ? "text-emerald-500" : "text-red-500"
          )}>{formatCurrency(projectedMonthSales)}</p>
          <p className="text-xs">
            <span className={cn(
              isOnTrack ? "text-emerald-500" : "text-red-500"
            )}>
              {isOnTrack ? "✓ Meta será atingida" : `Faltam ${formatCurrency(monthlyGoal - projectedMonthSales)}`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
