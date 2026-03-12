import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SalesRep } from '@/types/sales';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Users, TrendingUp } from 'lucide-react';

interface SupplierSalesBreakdownProps {
  salesReps: SalesRep[];
}

interface SupplierData {
  name: string;
  vendas: number;
  pedidos: number;
}

interface SalespersonBreakdown {
  name: string;
  vendas: number;
  pedidos: number;
}

export function SupplierSalesBreakdown({ salesReps }: SupplierSalesBreakdownProps) {
  const [hoveredSupplier, setHoveredSupplier] = useState<string | null>(null);
  const [lockedSupplier, setLockedSupplier] = useState<string | null>(null);
  const activeSupplier = lockedSupplier || hoveredSupplier;

  const { chartData, supplierByRep } = useMemo(() => {
    const supplierSales: Record<string, { vendas: number; pedidos: number }> = {};
    const byRep: Record<string, SalespersonBreakdown[]> = {};

    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        const supplier = order.fornecedor || 'Outros';
        if (!supplierSales[supplier]) supplierSales[supplier] = { vendas: 0, pedidos: 0 };
        supplierSales[supplier].vendas += order.venda;
        supplierSales[supplier].pedidos += 1;

        if (!byRep[supplier]) byRep[supplier] = [];
        const existing = byRep[supplier].find(s => s.name === rep.name);
        if (existing) {
          existing.vendas += order.venda;
          existing.pedidos += 1;
        } else {
          byRep[supplier].push({ name: rep.name, vendas: order.venda, pedidos: 1 });
        }
      });
    });

    // Sort each supplier's salesperson breakdown
    Object.keys(byRep).forEach(key => {
      byRep[key].sort((a, b) => b.vendas - a.vendas);
    });

    const data = Object.entries(supplierSales)
      .map(([name, vals]) => ({ name, vendas: vals.vendas, pedidos: vals.pedidos }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 12);

    return { chartData: data, supplierByRep: byRep };
  }, [salesReps]);

  const breakdownData = useMemo(() => {
    if (!activeSupplier || !supplierByRep[activeSupplier]) return [];
    return supplierByRep[activeSupplier];
  }, [activeSupplier, supplierByRep]);

  // Removed unused handlers

  if (chartData.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Vendas por Fornecedor</h3>
        </div>
        <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  const activeData = activeSupplier ? chartData.find(d => d.name === activeSupplier) : null;

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Vendas por Fornecedor</h3>
        </div>
        <span className="text-xs text-muted-foreground">Passe o mouse para ver por vendedor</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main supplier chart */}
        <div className="lg:col-span-2">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                onMouseMove={(state) => {
                  if (!lockedSupplier && state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                    setHoveredSupplier(chartData[state.activeTooltipIndex]?.name || null);
                  }
                }}
                onMouseLeave={() => !lockedSupplier && setHoveredSupplier(null)}
                onClick={(state) => {
                  if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                    const clicked = chartData[state.activeTooltipIndex]?.name || null;
                    setLockedSupplier(prev => prev === clicked ? null : clicked);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Vendas'
                  ]}
                />
                <Bar
                  dataKey="vendas"
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === activeSupplier ? 'hsl(var(--primary))' : 'hsl(142, 70%, 45%)'}
                      className="transition-colors duration-200 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salesperson breakdown panel */}
        <div className="lg:col-span-1">
          {activeSupplier && breakdownData.length > 0 ? (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold truncate">{activeSupplier}</h4>
              </div>
              {activeData && (
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-xs font-bold">R$ {activeData.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Pedidos</p>
                    <p className="text-xs font-bold">{activeData.pedidos}</p>
                  </div>
                </div>
              )}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      type="number"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                        fontSize: '11px'
                      }}
                      formatter={(value: number) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Vendas'
                      ]}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Passe o mouse em um fornecedor</p>
              <p className="text-xs text-muted-foreground/60 mt-1">para ver a distribuição por vendedor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
