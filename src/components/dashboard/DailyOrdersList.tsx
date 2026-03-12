import { useMemo, useState } from "react";
import { Plus, Package, Trophy, CalendarIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { OrderFormDialog } from "@/components/OrderFormDialog";
import { formatCurrency } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DailyOrder {
  cliente: string;
  pedido: string;
  venda: number;
  produto: string;
  fornecedor: string;
  vendedor: string;
  comissaoTotal: number;
  comissaoVendedor: number;
  dia: string;
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

function parseOrderDate(dateStr: string): { day: number; month: number; year: number } | null {
  const parts = dateStr.split('/');
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  return { day, month, year };
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'range'>('single');

  const isFiltering = mode === 'single' ? !!singleDate : !!(dateRange?.from);

  // All orders for the current month
  const allMonthOrders: DailyOrder[] = useMemo(() => {
    const orders: DailyOrder[] = [];
    salesReps.forEach(rep => {
      rep.orders?.forEach((order: any) => {
        if (!order.data) return;
        const parsed = parseOrderDate(order.data);
        if (!parsed) return;
        if (parsed.month === m && parsed.year === y) {
          orders.push({
            cliente: order.cliente || '-',
            pedido: order.pedido || '-',
            venda: order.venda || 0,
            produto: order.produto || '-',
            fornecedor: order.fornecedor || '-',
            vendedor: rep.name,
            comissaoTotal: order.comissaoTotal || order.comissao || 0,
            comissaoVendedor: order.comissaoVendedor || 0,
            dia: `${parsed.day.toString().padStart(2, '0')}/${parsed.month.toString().padStart(2, '0')}`,
          });
        }
      });
    });
    return orders.sort((a, b) => {
      const dayA = parseInt(a.dia.split('/')[0], 10);
      const dayB = parseInt(b.dia.split('/')[0], 10);
      return dayB - dayA;
    });
  }, [salesReps, m, y]);

  // Filtered orders
  const displayOrders = useMemo(() => {
    if (!isFiltering) return allMonthOrders;

    if (mode === 'single' && singleDate) {
      const filterDay = singleDate.getDate();
      return allMonthOrders.filter(o => {
        const dayNum = parseInt(o.dia.split('/')[0], 10);
        return dayNum === filterDay;
      });
    }

    if (mode === 'range' && dateRange?.from) {
      const fromDay = dateRange.from.getDate();
      const toDay = dateRange.to ? dateRange.to.getDate() : fromDay;
      return allMonthOrders.filter(o => {
        const dayNum = parseInt(o.dia.split('/')[0], 10);
        return dayNum >= fromDay && dayNum <= toDay;
      });
    }

    return allMonthOrders;
  }, [allMonthOrders, isFiltering, mode, singleDate, dateRange]);

  // Chart data
  const salesByRep = useMemo(() => {
    const map: Record<string, number> = {};
    displayOrders.forEach(o => {
      map[o.vendedor] = (map[o.vendedor] || 0) + o.venda;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [displayOrders]);

  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--warning))",
    "hsl(var(--success))",
    "hsl(var(--secondary))",
  ];

  const handleSelectToday = () => {
    setMode('single');
    setSingleDate(new Date(y, m - 1, today));
    setDateRange(undefined);
  };

  const handleClearFilter = () => {
    setSingleDate(undefined);
    setDateRange(undefined);
  };

  const calendarMonth = new Date(y, m - 1, 1);

  const getLabel = () => {
    if (mode === 'single' && singleDate) {
      return `Pedidos de ${format(singleDate, "dd 'de' MMMM", { locale: ptBR })}`;
    }
    if (mode === 'range' && dateRange?.from) {
      if (dateRange.to) {
        return `Pedidos de ${format(dateRange.from, "dd/MM")} a ${format(dateRange.to, "dd/MM")}`;
      }
      return `Pedidos a partir de ${format(dateRange.from, "dd/MM")}`;
    }
    return `Pedidos do Mês`;
  };

  const getButtonLabel = () => {
    if (mode === 'single' && singleDate) return format(singleDate, "dd/MM");
    if (mode === 'range' && dateRange?.from) {
      if (dateRange.to) return `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`;
      return format(dateRange.from, "dd/MM");
    }
    return "Filtrar data";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">{getLabel()}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {displayOrders.length} {displayOrders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleSelectToday}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Hoje
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {isFilteringByDate ? format(selectedDate!, "dd/MM") : "Filtrar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                defaultMonth={calendarMonth}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {isFilteringByDate && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={handleClearFilter}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ver mês
            </Button>
          )}

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
      </div>

      {displayOrders.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isFilteringByDate ? "Nenhum pedido nesta data." : "Nenhum pedido registrado neste mês."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Data</TableHead>
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
                  {displayOrders.map((order, idx) => (
                    <TableRow key={idx} className="border-border/30">
                      <TableCell className="text-xs text-muted-foreground">{order.dia}</TableCell>
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
                <p className="text-[10px] text-muted-foreground">🏆 Líder {isFilteringByDate ? 'do dia' : 'do mês'}</p>
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
