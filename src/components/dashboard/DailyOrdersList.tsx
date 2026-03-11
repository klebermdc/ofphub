import { useMemo } from "react";
import { Plus, Package, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderFormDialog } from "@/components/OrderFormDialog";
import { formatCurrency } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DailyOrder {
  cliente: string;
  pedido: string;
  venda: number;
  produto: string;
  fornecedor: string;
  vendedor: string;
  comissaoTotal: number;
  comissaoVendedor: number;
}

interface DailyOrdersListProps {
  salesReps: {
    name: string;
    orders?: {
      data?: string;
      cliente?: string;
      pedido?: string;
      venda: number;
      produto?: string;
      fornecedor?: string;
      comissaoTotal?: number;
      comissaoVendedor?: number;
    }[];
  }[];
  currentMonth: string;
  availableVendedores?: string[];
  availableProdutos?: string[];
  availableFornecedores?: string[];
  onOrderSuccess?: () => void;
}

export function DailyOrdersList({
  salesReps,
  currentMonth,
  availableVendedores = [],
  availableProdutos = [],
  availableFornecedores = [],
  onOrderSuccess,
}: DailyOrdersListProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const today = now.getDate();
  const todayFormatted = `${today.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;

  const todayOrders: DailyOrder[] = [];

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
          todayOrders.push({
            cliente: order.cliente || '-',
            pedido: order.pedido || '-',
            venda: order.venda || 0,
            produto: order.produto || '-',
            fornecedor: order.fornecedor || '-',
            vendedor: rep.name,
            comissaoTotal: order.comissaoTotal || order.comissao || 0,
            comissaoVendedor: order.comissaoVendedor || 0,
          });
        }
      }
    });
  });

  // Aggregate sales by salesperson for today's chart
  const salesByRep = useMemo(() => {
    const map: Record<string, number> = {};
    todayOrders.forEach(o => {
      map[o.vendedor] = (map[o.vendedor] || 0) + o.venda;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [todayOrders]);

  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--warning))",
    "hsl(var(--success))",
    "hsl(var(--secondary))",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">Pedidos do Dia</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {todayOrders.length} {todayOrders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        <OrderFormDialog
          mode="add"
          availableVendedores={availableVendedores}
          availableProdutos={availableProdutos}
          availableFornecedores={availableFornecedores}
          onSuccess={onOrderSuccess}
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Pedido</span>
            </Button>
          }
        />
      </div>

      {todayOrders.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum pedido registrado hoje.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Orders Table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Pedido</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">Venda</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                    <TableHead className="text-xs text-right">Ganho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayOrders.map((order, idx) => (
                    <TableRow key={idx} className="border-border/30">
                      <TableCell className="text-xs font-medium">{order.pedido}</TableCell>
                      <TableCell className="text-xs">{order.cliente}</TableCell>
                      <TableCell className="text-xs">{order.vendedor}</TableCell>
                      <TableCell className="text-xs">{order.produto}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCurrency(order.venda)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-warning">
                        {formatCurrency(order.comissaoTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-success">
                        {formatCurrency(order.comissaoTotal - order.comissaoVendedor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Top Seller Chart */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">Vendas por Vendedor</span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByRep} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                    {salesByRep.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {salesByRep.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30 text-center">
                <p className="text-[10px] text-muted-foreground">🏆 Líder do dia</p>
                <p className="text-sm font-bold text-foreground">{salesByRep[0].name}</p>
                <p className="text-xs text-primary font-medium">{formatCurrency(salesByRep[0].total)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
