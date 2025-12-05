import { Calendar, Target, TrendingUp, Zap, DollarSign } from "lucide-react";
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

export function DailySalesTracker({ 
  salesReps, 
  monthlyGoal, 
  currentMonth,
  totalComissao = 0,
  totalComissaoVendedor = 0,
  totalSalaries = 0,
  marketingCosts = 0,
  operationalCosts = 0,
  resultGoal = 0
}: DailySalesTrackerProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  
  const totalBusinessDays = getBusinessDaysInMonth(m, y);
  const businessDaysElapsed = getBusinessDaysElapsed(m, y);
  
  const dailyGoal = totalBusinessDays > 0 ? monthlyGoal / totalBusinessDays : 0;
  
  const todayKey = getTodayKey();
  let todaySales = 0;
  let todayOrders = 0;
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
  
  const accumulatedGoal = dailyGoal * businessDaysElapsed;
  const todayProgress = dailyGoal > 0 ? (todaySales / dailyGoal) * 100 : 0;
  const monthProgress = accumulatedGoal > 0 ? (monthSales / accumulatedGoal) * 100 : 0;
  const dailyAverage = businessDaysElapsed > 0 ? monthSales / businessDaysElapsed : 0;
  const projectedMonthSales = dailyAverage * totalBusinessDays;
  const projectionVsGoal = monthlyGoal > 0 ? ((projectedMonthSales / monthlyGoal) * 100) : 0;
  
  // Calculate Result (Resultado) - Profit calculation
  const impostoEstimado = totalComissao * 0.12;
  const custoTotal = totalComissaoVendedor + totalSalaries + marketingCosts + operationalCosts + impostoEstimado;
  const resultadoAtual = totalComissao - custoTotal;
  
  // Daily result metrics
  const dailyResultado = businessDaysElapsed > 0 ? resultadoAtual / businessDaysElapsed : 0;
  
  // Project monthly result based on daily average (consistent approach)
  const projectedResultado = dailyResultado * totalBusinessDays;
  
  // Daily result goal: use manual goal if provided, otherwise calculate from sales goal
  const dailyResultGoal = resultGoal > 0 
    ? resultGoal / totalBusinessDays 
    : 0;
  
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Vendas Hoje */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Vendas Hoje</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(todaySales)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta: {formatCurrency(dailyGoal)}</span>
              <span className={cn(
                todayProgress >= 100 ? "text-emerald-500" : "text-warning"
              )}>{todayProgress.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(todayProgress, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">{todayOrders} pedidos</p>
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
              <span className="text-muted-foreground">Deveria: {formatCurrency(accumulatedGoal)}</span>
              <span className={cn(
                monthProgress >= 100 ? "text-emerald-500" : monthProgress >= 80 ? "text-warning" : "text-red-500"
              )}>{monthProgress.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(monthProgress, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            {monthProgress >= 100 ? "Acima!" : `Faltam ${formatCurrency(Math.max(0, accumulatedGoal - monthSales))}`}
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
              <span className="text-muted-foreground">Meta: {formatCurrency(dailyGoal)}</span>
              <span className={cn(
                dailyAverage >= dailyGoal ? "text-emerald-500" : "text-warning"
              )}>{dailyGoal > 0 ? ((dailyAverage / dailyGoal) * 100).toFixed(0) : 0}%</span>
            </div>
            <Progress value={Math.min(dailyGoal > 0 ? (dailyAverage / dailyGoal) * 100 : 0, 100)} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">{businessDaysElapsed} dias úteis</p>
        </div>

        {/* Projeção do Mês */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Projeção Vendas</span>
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
            {projectionVsGoal >= 100 ? "Meta OK!" : `Faltam ${formatCurrency(Math.max(0, monthlyGoal - projectedMonthSales))}`}
          </p>
        </div>

        {/* Resultado Diário */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className={cn("h-4 w-4", dailyResultado >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-sm text-muted-foreground">
              {dailyResultado >= 0 ? "Lucro Diário" : "Prejuízo Diário"}
            </span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            dailyResultado >= 0 ? "text-emerald-500" : "text-red-500"
          )}>{formatCurrency(Math.abs(dailyResultado))}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta lucro/dia</span>
              <span className="text-muted-foreground">{formatCurrency(dailyResultGoal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Diferença</span>
              <span className={cn(
                dailyResultado >= dailyResultGoal ? "text-emerald-500" : "text-red-500"
              )}>
                {dailyResultado >= dailyResultGoal ? "+" : ""}{formatCurrency(dailyResultado - dailyResultGoal)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Projeção mês: <span className={projectedResultado >= 0 ? "text-emerald-500" : "text-red-500"}>{formatCurrency(projectedResultado)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
