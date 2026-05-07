import { useMemo, useState, useCallback } from "react";
import { Plus, Package, Trophy, CalendarIcon, RotateCcw, DollarSign, TrendingUp, Wallet, Pencil, Trash2, AlertTriangle, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { OrderFormDialog } from "@/components/OrderFormDialog";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";
import { getOFPCommission } from "@/utils/orderCommission";

interface DailyOrder {
  id?: string;
  data?: string;
  cliente: string;
  emailCliente: string;
  pedido: string;
  venda: number;
  produto: string;
  fornecedor: string;
  vendedor: string;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
  guia?: string;
  comissaoGuia?: number;
  status?: string;
  dia: string;
  createdAt?: string;
  isGuideEntry?: boolean;
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
  selectedFornecedor?: string;
  onOrderSuccess?: () => void;
}

function parseOrderDate(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      day: parseInt(isoMatch[3], 10),
      month: parseInt(isoMatch[2], 10),
      year: parseInt(isoMatch[1], 10),
    };
  }

  // BR format: DD/MM/YYYY or DD/MM/YY
  const parts = trimmed.split('/');
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  if (year < 100) year += 2000;

  return { day, month, year };
}

export function DailyOrdersList({
  salesReps,
  currentMonth,
  availableVendedores = [],
  availableProdutos = [],
  availableFornecedores = [],
  selectedFornecedor = 'all',
  onOrderSuccess,
}: DailyOrdersListProps) {
  const showAllAvailableOrders = currentMonth === 'all';
  const [parsedMonth, parsedYear] = currentMonth.split('/').map(Number);
  const fallbackDate = new Date();
  const m = Number.isFinite(parsedMonth) ? parsedMonth : fallbackDate.getMonth() + 1;
  const y = Number.isFinite(parsedYear) ? parsedYear : fallbackDate.getFullYear();
  const now = new Date();
  const today = now.getDate();

  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'range'>('single');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DailyOrder[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults(null);
      return;
    }
    if (term.trim().length < 2) return;

    setIsSearching(true);
    try {
      const searchLower = term.trim().toLowerCase();
      let query = supabase
        .from('orders')
        .select('*')
        .or(`pedido.ilike.%${searchLower}%,cliente.ilike.%${searchLower}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedFornecedor !== 'all') {
        query = query.eq('fornecedor', selectedFornecedor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const results: DailyOrder[] = (data || []).map((row: any) => {
        const parsed = parseOrderDate(row.data);
        const dia = parsed ? `${parsed.day.toString().padStart(2, '0')}/${parsed.month.toString().padStart(2, '0')}` : row.data;
        return {
          id: row.id,
          data: row.data || '',
          cliente: row.cliente || '-',
          emailCliente: row.email_cliente || '',
          pedido: row.pedido || '-',
          venda: Number(row.venda) || 0,
          produto: row.produto || '-',
          fornecedor: row.fornecedor || '-',
          vendedor: row.vendedor || '-',
          comissao: Number(row.comissao) || 0,
          comissaoTotal: Number(row.comissao_total) || 0,
          porcentagemVendedor: Number(row.porcentagem_vendedor) || 0,
          comissaoVendedor: Number(row.comissao_vendedor) || 0,
          guia: row.guia || '',
          comissaoGuia: Number(row.comissao_guia) || 0,
          status: row.status || 'Pendente',
          dia,
          createdAt: row.created_at || '',
          isGuideEntry: false,
        };
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedFornecedor]);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

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
            id: order.id || undefined,
            cliente: order.cliente || '-',
            emailCliente: order.emailCliente || '',
            pedido: order.pedido || '-',
            venda: order.venda || 0,
            produto: order.produto || '-',
            fornecedor: order.fornecedor || '-',
            vendedor: rep.name,
            comissao: order.comissao || 0,
            comissaoTotal: order.comissaoTotal || 0,
            porcentagemVendedor: order.porcentagemVendedor || 0,
            comissaoVendedor: order.comissaoVendedor || 0,
            guia: order.guia || '',
            comissaoGuia: order.comissaoGuia || 0,
            status: order.status || 'Pendente',
            dia: `${parsed.day.toString().padStart(2, '0')}/${parsed.month.toString().padStart(2, '0')}`,
            createdAt: order.createdAt || order.created_at || '',
            isGuideEntry: order.isGuideEntry || false,
          });
        }
      });
    });
    return orders.sort((a, b) => {
      const dayA = parseInt(a.dia.split('/')[0], 10);
      const dayB = parseInt(b.dia.split('/')[0], 10);
      if (dayB !== dayA) return dayB - dayA;
      // Within same day, sort by insertion order (most recent first)
      if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
      return 0;
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

  // Period KPI metrics
  const periodMetrics = useMemo(() => {
    const totalVenda = displayOrders.reduce((sum, o) => sum + o.venda, 0);
    const totalComissao = displayOrders.reduce((sum, o) => sum + getOFPCommission(o), 0);
    const totalComissaoVendedor = displayOrders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
    const ganho = totalComissao;
    const resultado = ganho - totalComissaoVendedor;
    return { totalVenda, totalComissao, totalComissaoVendedor, ganho, resultado };
  }, [displayOrders]);

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

  // Profit chart data
  const profitByRep = useMemo(() => {
    const map: Record<string, number> = {};
    displayOrders.forEach(o => {
      const ganho = getOFPCommission(o);
      map[o.vendedor] = (map[o.vendedor] || 0) + ganho;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [displayOrders]);

  // Pie chart: % of total profit (ganho) each rep represents
  const rentabilityPie = useMemo(() => {
    const ganhoMap: Record<string, number> = {};
    const vendaMap: Record<string, number> = {};
    displayOrders.forEach(o => {
      const ganho = getOFPCommission(o);
      ganhoMap[o.vendedor] = (ganhoMap[o.vendedor] || 0) + ganho;
      vendaMap[o.vendedor] = (vendaMap[o.vendedor] || 0) + o.venda;
    });
    const totalGanho = Object.values(ganhoMap).reduce((s, v) => s + v, 0);
    if (totalGanho === 0) return [];
    return Object.entries(ganhoMap)
      .map(([name, value]) => ({ name, value, vendas: vendaMap[name] || 0, percent: ((value / totalGanho) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [displayOrders]);

  // Commission alert: flag sellers with avg commission <= 3% (always uses full month data)
  const commissionAlerts = useMemo(() => {
    const vendaMap: Record<string, number> = {};
    const comissaoMap: Record<string, number> = {};
    allMonthOrders.forEach(o => {
      vendaMap[o.vendedor] = (vendaMap[o.vendedor] || 0) + o.venda;
      comissaoMap[o.vendedor] = (comissaoMap[o.vendedor] || 0) + o.comissaoTotal;
    });
    return Object.entries(vendaMap)
      .filter(([, venda]) => venda > 0)
      .map(([name, venda]) => ({
        name,
        avgPercent: (comissaoMap[name] / venda) * 100,
        totalVenda: venda,
        totalComissao: comissaoMap[name],
      }))
      .filter(item => item.avgPercent <= 3)
      .sort((a, b) => a.avgPercent - b.avgPercent);
  }, [allMonthOrders]);

  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--warning))",
    "hsl(var(--success))",
    "hsl(var(--secondary))",
  ];

  const handleDeleteOrder = async (order: DailyOrder) => {
    if (!order.id) {
      toast({ title: "Erro", description: "Pedido sem ID, não é possível excluir.", variant: "destructive" });
      return;
    }
    const confirmed = window.confirm(`Excluir pedido ${order.pedido} de ${order.cliente}?`);
    if (!confirmed) return;
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pedido excluído" });
      onOrderSuccess?.();
    }
  };

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

  const periodLabel = (() => {
    if (mode === 'single' && singleDate) return 'do Dia';
    if (mode === 'range' && dateRange?.from) return 'do Período';
    return 'do Mês';
  })();

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
            {(searchResults !== null ? searchResults : displayOrders).length} {(searchResults !== null ? searchResults : displayOrders).length === 1 ? 'pedido' : 'pedidos'}
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
                {getButtonLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex gap-1 p-2 border-b border-border">
                <Button
                  size="sm"
                  variant={mode === 'single' ? 'default' : 'ghost'}
                  className="text-xs h-7 flex-1"
                  onClick={() => { setMode('single'); setDateRange(undefined); }}
                >
                  Dia
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'range' ? 'default' : 'ghost'}
                  className="text-xs h-7 flex-1"
                  onClick={() => { setMode('range'); setSingleDate(undefined); }}
                >
                  Período
                </Button>
              </div>
              {mode === 'single' ? (
                <Calendar
                  mode="single"
                  selected={singleDate}
                  onSelect={(date) => {
                    setSingleDate(date);
                    setCalendarOpen(false);
                  }}
                  defaultMonth={calendarMonth}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              ) : (
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.to) setCalendarOpen(false);
                  }}
                  defaultMonth={calendarMonth}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              )}
            </PopoverContent>
          </Popover>

          {isFiltering && (
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

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nº pedido ou nome do cliente (busca geral)..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9 h-9 text-sm"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {searchResults !== null && (
        <div className="text-xs text-muted-foreground">
          {isSearching ? 'Buscando...' : `${searchResults.length} resultado(s) encontrado(s) em todos os pedidos`}
        </div>
      )}

      {(searchResults !== null ? searchResults : displayOrders).length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchResults !== null ? "Nenhum pedido encontrado." : isFiltering ? "Nenhum pedido neste período." : "Nenhum pedido registrado neste mês."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs w-8"></TableHead>
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
                    {(searchResults !== null ? searchResults : displayOrders).map((order, idx) => (
                      <TableRow key={idx} className="border-border/30">
                        <TableCell className="p-1">
                          <div className="flex items-center gap-0.5">
                            {order.isGuideEntry ? null : (
                              <OrderFormDialog
                                mode="edit"
                                order={{
                                  id: order.id,
                                  cliente: order.cliente,
                                  emailCliente: order.emailCliente,
                                  data: `${order.dia}/${y}`,
                                  pedido: order.pedido,
                                  venda: order.venda,
                                  fornecedor: order.fornecedor,
                                  produto: order.produto,
                                  comissao: order.comissao,
                                  comissaoTotal: order.comissaoTotal,
                                  porcentagemVendedor: order.porcentagemVendedor,
                                  comissaoVendedor: order.comissaoVendedor,
                                  vendedor: order.vendedor,
                                  status: order.status || 'Pendente',
                                  guia: order.guia || '',
                                  comissaoGuia: order.comissaoGuia || 0,
                                }}
                                availableVendedores={availableVendedores}
                                availableProdutos={availableProdutos}
                                availableFornecedores={availableFornecedores}
                                onSuccess={onOrderSuccess}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                  </Button>
                                }
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteOrder(order)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
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
                          {formatCurrency(getOFPCommission(order))}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Commission Alerts */}
          {commissionAlerts.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                <span className="text-sm font-bold text-destructive">⚠️ Alerta de Comissão Baixa (≤ 3%)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {commissionAlerts.map(alert => (
                  <div key={alert.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-destructive/20">
                    <div className={cn(
                      "h-3 w-3 rounded-full shrink-0 animate-pulse",
                      alert.avgPercent <= 1 ? "bg-destructive" : alert.avgPercent <= 2 ? "bg-warning" : "bg-accent"
                    )} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{alert.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Comissão média: <span className="font-bold text-destructive">{alert.avgPercent.toFixed(1)}%</span> · Vendas: {formatCurrency(alert.totalVenda)} · Comissão: {formatCurrency(alert.totalComissao)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales Chart */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-foreground">Vendas por Vendedor</span>
              </div>
              <div style={{ height: Math.max(200, salesByRep.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByRep} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                      {salesByRep.map((_, i) => {
                        const ratio = salesByRep.length > 1 ? i / (salesByRep.length - 1) : 0;
                        const color = ratio <= 0.33 ? 'hsl(142, 76%, 45%)' : ratio <= 0.66 ? 'hsl(38, 92%, 55%)' : 'hsl(var(--primary))';
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {salesByRep.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30 text-center">
                  <p className="text-[10px] text-muted-foreground">🏆 Líder {isFiltering ? 'do período' : 'do mês'}</p>
                  <p className="text-sm font-bold text-foreground">{salesByRep[0].name}</p>
                  <p className="text-xs text-primary font-medium">{formatCurrency(salesByRep[0].total)}</p>
                </div>
              )}
            </div>

            {/* Profit Chart */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-foreground">Ganho por Vendedor</span>
              </div>
              <div style={{ height: Math.max(200, profitByRep.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitByRep} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                      {profitByRep.map((_, i) => {
                        const ratio = profitByRep.length > 1 ? i / (profitByRep.length - 1) : 0;
                        const color = ratio <= 0.33 ? 'hsl(142, 76%, 45%)' : ratio <= 0.66 ? 'hsl(38, 92%, 55%)' : 'hsl(var(--primary))';
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {profitByRep.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30 text-center">
                  <p className="text-[10px] text-muted-foreground">💰 Mais rentável {isFiltering ? 'do período' : 'do mês'}</p>
                  <p className="text-sm font-bold text-foreground">{profitByRep[0].name}</p>
                  <p className="text-xs text-success font-medium">{formatCurrency(profitByRep[0].total)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rentability Pie Chart - separate row */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Participação no Ganho por Vendedor</span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rentabilityPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} - ${percent.toFixed(1)}%`}
                    labelLine={true}
                  >
                    {rentabilityPie.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {rentabilityPie.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {rentabilityPie.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Vendeu {formatCurrency(item.vendas)} → Ganho {formatCurrency(item.value)} ({item.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Period KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard
              title={`Venda ${periodLabel}`}
              value={formatCurrency(periodMetrics.totalVenda)}
              icon={DollarSign}
              delay={50}
              formula="Soma de todas as vendas no período filtrado"
            />
            <MetricCard
              title={`Comissão ${periodLabel}`}
              value={formatCurrency(periodMetrics.totalComissao)}
              icon={TrendingUp}
              delay={100}
              formula="Soma de todas as comissões totais no período filtrado"
            />
            <MetricCard
              title="Comissão Vend."
              value={formatCurrency(periodMetrics.totalComissaoVendedor)}
              icon={Wallet}
              variant="warning"
              delay={150}
              formula="Soma das comissões pagas aos vendedores no período"
            />
            <MetricCard
              title={`Ganho ${periodLabel}`}
              value={formatCurrency(periodMetrics.ganho)}
              icon={TrendingUp}
              variant="success"
              delay={200}
              formula="Comissão Total - Comissão Vendedor"
            />
            <MetricCard
              title={`Resultado ${periodLabel}`}
              value={formatCurrency(periodMetrics.resultado)}
              icon={TrendingUp}
              variant={periodMetrics.resultado >= 0 ? "success" : "danger"}
              delay={250}
              formula="Ganho - Comissão Vendedor"
            />
          </div>
        </div>
      )}
    </div>
  );
}
