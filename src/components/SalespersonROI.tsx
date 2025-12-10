import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { PieChart, TrendingUp } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { cn } from "@/lib/utils";
import { isExcludedName } from "@/config/salaries";

interface SalespersonROIProps {
  salesReps: SalesRep[];
  getSalary: (name: string) => number;
}

interface ROIData {
  name: string;
  shortName: string;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SalespersonROI({ salesReps, getSalary }: SalespersonROIProps) {
  // Filter out company partners and calculate ROI for each salesperson
  const filteredReps = salesReps.filter(rep => !isExcludedName(rep.name));

  const roiData: ROIData[] = filteredReps.map(rep => {
    // Receita = soma da comissão total (o que a empresa ganha)
    const revenue = rep.orders?.reduce((sum, o) => sum + (o.comissaoTotal || 0), 0) || 0;
    const salary = getSalary(rep.name);
    // Custo = salário + soma da comissão do vendedor (o que a empresa paga)
    const salespersonCommission = rep.orders?.reduce((sum, o) => sum + (o.comissaoVendedor || 0), 0) || 0;
    const cost = salary + salespersonCommission;
    const profit = revenue - cost;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    return {
      name: rep.name,
      shortName: rep.name.split(' ')[0],
      revenue,
      cost,
      profit,
      roi
    };
  }).sort((a, b) => b.roi - a.roi);

  if (roiData.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">ROI por Vendedor</h3>
        </div>
        <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>
      </div>
    );
  }

  // Stats
  const avgROI = roiData.reduce((sum, d) => sum + d.roi, 0) / roiData.length;
  const bestPerformer = roiData[0];
  const totalProfit = roiData.reduce((sum, d) => sum + d.profit, 0);

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">ROI por Vendedor</h3>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">ROI Médio</p>
          <p className={cn("font-bold", avgROI >= 0 ? "text-emerald-500" : "text-red-500")}>
            {avgROI.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-muted-foreground mb-1">Melhor ROI</p>
          <p className="font-semibold text-emerald-500">{bestPerformer?.shortName}</p>
          <p className="text-xs text-emerald-500/80">{bestPerformer?.roi.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Lucro Total</p>
          <p className={cn("font-semibold", totalProfit >= 0 ? "text-primary" : "text-red-500")}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-muted-foreground mb-1">Vendedores</p>
          <p className="font-semibold text-blue-500">{roiData.length}</p>
          <p className="text-xs text-blue-500/80">{roiData.filter(d => d.roi > 0).length} lucrativos</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roiData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              type="category"
              dataKey="shortName"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{
                color: 'hsl(var(--popover-foreground))',
              }}
              itemStyle={{
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number, name: string, props: any) => {
                const data = props.payload as ROIData;
                return [
                  <div key="tooltip" className="space-y-1 text-popover-foreground">
                    <p><strong>ROI:</strong> {value.toFixed(1)}%</p>
                    <p><strong>Receita:</strong> {formatCurrency(data.revenue)}</p>
                    <p><strong>Custo:</strong> {formatCurrency(data.cost)}</p>
                    <p><strong>Lucro:</strong> {formatCurrency(data.profit)}</p>
                  </div>
                ];
              }}
              labelFormatter={(label) => `Vendedor: ${label}`}
            />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
            <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
              {roiData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.roi >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        ROI = (Receita Gerada - Custo) / Custo × 100
      </p>
    </div>
  );
}
