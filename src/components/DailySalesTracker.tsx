import { Calendar, Target, TrendingUp, Zap } from "lucide-react";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

interface DailySalesTrackerProps {
  salesReps: { orders?: { data?: string; venda: number }[] }[];
  monthlyGoal: number;
  currentMonth: string;
}

function getBusinessDaysInMonth(month: number, year: number): number {
  let businessDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
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
  
  // If it's the current month, count business days up to today
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
  
  // Otherwise return all business days in that month
  return getBusinessDaysInMonth(month, year);
}

function getTodayKey(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DailySalesTracker({ salesReps, monthlyGoal, currentMonth }: DailySalesTrackerProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const isCurrentMonth = m === (now.getMonth() + 1) && y === now.getFullYear();
  
  // Calculate business days
  const totalBusinessDays = getBusinessDaysInMonth(m, y);
  const businessDaysElapsed = getBusinessDaysElapsed(m, y);
  
  // Daily goal = monthly goal / business days
  const dailyGoal = totalBusinessDays > 0 ? monthlyGoal / totalBusinessDays : 0;
  
  // Calculate today's sales
  const todayKey = getTodayKey();
  let todaySales = 0;
  let todayOrders = 0;
  
  // Calculate total month sales
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
          
          // Check if it's today
          const orderDay = parts[0].padStart(2, '0');
          const orderDateKey = `${orderDay}/${orderMonth}/${orderYear}`;
          if (orderDateKey === todayKey) {
            todaySales += order.venda;
            todayOrders++;
          }
        }
      }
    });
  });
  
  // Calculate accumulated goal (what should have been sold by now)
  const accumulatedGoal = dailyGoal * businessDaysElapsed;
  
  // Progress for today
  const todayProgress = dailyGoal > 0 ? (todaySales / dailyGoal) * 100 : 0;
  
  // Progress for month accumulated
  const monthProgress = accumulatedGoal > 0 ? (monthSales / accumulatedGoal) * 100 : 0;
  
  // Daily average so far
  const dailyAverage = businessDaysElapsed > 0 ? monthSales / businessDaysElapsed : 0;
  
  // Projection for end of month
  const projectedMonthSales = dailyAverage * totalBusinessDays;
  const projectionVsGoal = monthlyGoal > 0 ? ((projectedMonthSales / monthlyGoal) * 100) : 0;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Acompanhamento Diário</h3>
        </div>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">
            {monthNames[m - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {businessDaysElapsed} de {totalBusinessDays} dias úteis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vendas Hoje */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Vendas Hoje</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(todaySales)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta do dia: {formatCurrency(dailyGoal)}</span>
              <span className={cn(
                todayProgress >= 100 ? "text-emerald-500" : "text-warning"
              )}>{todayProgress.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(todayProgress, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">{todayOrders} pedidos hoje</p>
        </div>

        {/* Meta Acumulada */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-warning" />
            <span className="text-sm text-muted-foreground">Meta Acumulada</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(monthSales)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Deveria ter: {formatCurrency(accumulatedGoal)}</span>
              <span className={cn(
                monthProgress >= 100 ? "text-emerald-500" : monthProgress >= 80 ? "text-warning" : "text-red-500"
              )}>{monthProgress.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(monthProgress, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            {monthProgress >= 100 ? "Acima da meta!" : `Faltam ${formatCurrency(accumulatedGoal - monthSales)}`}
          </p>
        </div>

        {/* Média Diária */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <span className="text-sm text-muted-foreground">Média Diária</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(dailyAverage)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta diária: {formatCurrency(dailyGoal)}</span>
              <span className={cn(
                dailyAverage >= dailyGoal ? "text-emerald-500" : "text-warning"
              )}>{dailyGoal > 0 ? ((dailyAverage / dailyGoal) * 100).toFixed(0) : 0}%</span>
            </div>
            <Progress value={Math.min(dailyGoal > 0 ? (dailyAverage / dailyGoal) * 100 : 0, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">Baseado em {businessDaysElapsed} dias úteis</p>
        </div>

        {/* Projeção do Mês */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Projeção do Mês</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(projectedMonthSales)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta: {formatCurrency(monthlyGoal)}</span>
              <span className={cn(
                projectionVsGoal >= 100 ? "text-emerald-500" : projectionVsGoal >= 80 ? "text-warning" : "text-red-500"
              )}>{projectionVsGoal.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(projectionVsGoal, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            {projectionVsGoal >= 100 ? "Meta será batida!" : `Faltam ${formatCurrency(monthlyGoal - projectedMonthSales)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
