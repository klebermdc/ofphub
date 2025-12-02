import { AlertTriangle, TrendingDown } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PerformanceAlertsProps {
  salesReps: SalesRep[];
  availableMonths: string[];
  currentMonth: string;
}

interface PerformanceAlert {
  name: string;
  currentSales: number;
  previousSales: number;
  dropPercentage: number;
}

function calculateSalesForMonth(rep: SalesRep, month: string): number {
  let sales = 0;
  rep.orders?.forEach(order => {
    if (!order.data) return;
    const parts = order.data.split('/');
    if (parts.length >= 2) {
      const m = parts[1].padStart(2, '0');
      let y = parts[2] || new Date().getFullYear().toString();
      if (y.length === 2) y = `20${y}`;
      if (`${m}/${y}` === month) {
        sales += order.venda;
      }
    }
  });
  return sales;
}

export function PerformanceAlerts({ salesReps, availableMonths, currentMonth }: PerformanceAlertsProps) {
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

  if (!previousMonth || !activeMonth) return null;

  const alerts: PerformanceAlert[] = [];

  salesReps.forEach(rep => {
    const currentSales = calculateSalesForMonth(rep, activeMonth);
    const previousSales = calculateSalesForMonth(rep, previousMonth);

    if (previousSales > 0) {
      const dropPercentage = ((previousSales - currentSales) / previousSales) * 100;
      if (dropPercentage > 20) {
        alerts.push({
          name: rep.name,
          currentSales,
          previousSales,
          dropPercentage
        });
      }
    }
  });

  if (alerts.length === 0) return null;

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Alertas de Performance</h3>
      </div>
      
      {alerts.map((alert, idx) => (
        <Alert key={idx} variant="destructive" className="border-destructive/50 bg-destructive/10">
          <TrendingDown className="h-4 w-4" />
          <AlertTitle className="font-medium">{alert.name}</AlertTitle>
          <AlertDescription className="text-sm">
            Queda de <span className="font-bold">{alert.dropPercentage.toFixed(1)}%</span> nas vendas.
            De {formatCurrency(alert.previousSales)} para {formatCurrency(alert.currentSales)}.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
