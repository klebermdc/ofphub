import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Zap, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DailySalesTrackerProps {
  salesReps: { orders?: { data?: string; venda: number; comissao?: number; comissaoVendedor?: number }[] }[];
  currentMonth: string;
  totalSalaries?: number;
  marketingCosts?: number;
  operationalCosts?: number;
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
  currentMonth,
  totalSalaries = 0,
  marketingCosts = 0,
  operationalCosts = 0,
}: DailySalesTrackerProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const today = now.getDate();
  const todayFormatted = `${today.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
  
  // Fetch real daily ad spend from marketing_daily_stats
  const [todayAdSpend, setTodayAdSpend] = useState(0);
  useEffect(() => {
    const todayDate = `${y}-${String(m).padStart(2, '0')}-${String(today).padStart(2, '0')}`;
    supabase
      .from('marketing_daily_stats')
      .select('meta_spend, google_spend')
      .eq('date', todayDate)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTodayAdSpend(Number(data.meta_spend || 0) + Number(data.google_spend || 0));
        } else {
          setTodayAdSpend(0);
        }
      });
  }, [m, y, today]);

  const totalBusinessDays = getBusinessDaysInMonth(m, y);
  const businessDaysElapsed = getBusinessDaysElapsed(m, y);
  
  let todaySales = 0;
  let todayComissaoTotal = 0;
  let todayComissaoVendedor = 0;
  
  // Calculate today's metrics
  salesReps.forEach(rep => {
    rep.orders?.forEach((order: any) => {
      if (!order.data) return;
      const parts = order.data.split('/');
      if (parts.length >= 3) {
        const orderDay = parts[0].padStart(2, '0');
        const orderMonth = parts[1].padStart(2, '0');
        let orderYear = parts[2];
        if (orderYear.length === 2) orderYear = `20${orderYear}`;
        
        const orderDate = `${orderDay}/${orderMonth}/${orderYear}`;
        
        if (orderDate === todayFormatted) {
          todaySales += order.venda || 0;
          // Comissão Total = comissão da empresa (campo comissaoTotal da planilha)
          todayComissaoTotal += order.comissaoTotal || order.comissao || 0;
          // Comissão Vendedor = comissão paga ao vendedor
          todayComissaoVendedor += order.comissaoVendedor || 0;
        }
      }
    });
  });
  
  // Ganho do Dia = Comissão Total - Comissão Vendedores
  const ganhoDia = todayComissaoTotal - todayComissaoVendedor;
  
   // Custo diário: salários e operacional proporcionais + gasto real de ads do dia + imposto 12%
   const daysInMonth = new Date(y, m, 0).getDate();
   const impostoEstimadoDia = todayComissaoTotal * 0.12;
   const fixedMonthlyCosts = totalSalaries + operationalCosts;
   const dailyFixedCost = daysInMonth > 0 ? fixedMonthlyCosts / daysInMonth : 0;
   const dailyCostWithTax = dailyFixedCost + todayAdSpend + impostoEstimadoDia;
  
  // Resultado do Dia = Ganho do Dia - Custo diário proporcional
  const resultadoDia = ganhoDia - dailyCostWithTax;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento Diário</h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs sm:text-sm font-medium">
            Dia {today} • {monthNames[m - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {businessDaysElapsed} de {totalBusinessDays} dias úteis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {/* Venda Total do Dia */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Venda do Dia</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(todaySales)}</p>
        </div>

        {/* Comissão Total do Dia */}
        <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Comissão do Dia</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(todayComissaoTotal)}</p>
        </div>

        {/* Comissão Vendedores do Dia */}
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Comissão Vend.</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-warning">{formatCurrency(todayComissaoVendedor)}</p>
        </div>

        {/* Ganho do Dia */}
        <div className={cn(
          "bg-gradient-to-br rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 border",
          ganhoDia >= 0 
            ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" 
            : "from-red-500/10 to-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Ganho do Dia</span>
          </div>
          <p className={cn("text-lg sm:text-2xl font-bold", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(ganhoDia)}
          </p>
        </div>

        {/* Resultado do Dia */}
        <div className={cn(
          "bg-gradient-to-br rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 border col-span-2 sm:col-span-1",
          resultadoDia >= 0 
            ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" 
            : "from-red-500/10 to-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Resultado do Dia</span>
          </div>
          <p className={cn("text-lg sm:text-2xl font-bold", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(resultadoDia)}
          </p>
        </div>
      </div>
    </div>
  );
}
