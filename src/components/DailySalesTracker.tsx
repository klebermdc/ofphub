import { DollarSign, TrendingUp, Zap, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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
  
  // Custo diário proporcional (custos mensais / dias úteis)
  const totalMonthlyCosts = totalSalaries + marketingCosts + operationalCosts;
  const dailyCost = totalBusinessDays > 0 ? totalMonthlyCosts / totalBusinessDays : 0;
  
  // Resultado do Dia = Ganho do Dia - Custo diário proporcional
  const resultadoDia = ganhoDia - dailyCost;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Acompanhamento Diário</h3>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium">
            Dia {today} • {monthNames[m - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {businessDaysElapsed} de {totalBusinessDays} dias úteis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Venda Total do Dia */}
        <div className="bg-card/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Venda do Dia</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(todaySales)}</p>
        </div>

        {/* Comissão Total do Dia */}
        <div className="bg-card/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <span className="text-xs text-muted-foreground">Comissão do Dia</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(todayComissaoTotal)}</p>
        </div>

        {/* Ganho do Dia */}
        <div className="bg-card/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className={cn("h-4 w-4", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-xs text-muted-foreground">Ganho do Dia</span>
          </div>
          <p className={cn("text-xl font-bold", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(ganhoDia)}
          </p>
          <p className="text-[10px] text-muted-foreground">Comissão - Vendedores</p>
        </div>

        {/* Resultado do Dia */}
        <div className="bg-card/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("h-4 w-4", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-xs text-muted-foreground">Resultado do Dia</span>
          </div>
          <p className={cn("text-xl font-bold", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(resultadoDia)}
          </p>
          <p className="text-[10px] text-muted-foreground">Ganho - {formatCurrency(dailyCost)}/dia</p>
        </div>
      </div>
    </div>
  );
}
