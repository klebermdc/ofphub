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
      )}
    </div>
  );
}
