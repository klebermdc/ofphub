import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Package, Calendar, Filter, ArrowLeft, Users, ShoppingBag, Building, RefreshCw, Edit2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { OrderFormDialog } from "@/components/OrderFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSheetData } from "@/contexts/SheetDataContext";
import { useSheetSettings } from "@/hooks/useSheetSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthName } from "@/hooks/useCommissionHistory";

interface Order {
  cliente: string;
  data: string;
  pedido: string;
  venda: number;
  fornecedor: string;
  produto: string;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
  salesperson_name: string;
  rowIndex?: number;
}

const AllOrders = () => {
  const { user, loading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole(user?.id);
  const { salesReps, isLoading: dataLoading, hasData, refreshData } = useSheetData();
  const { savedUrl } = useSheetSettings(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (user && !hasData && !dataLoading) {
      refreshData();
    }
  }, [user, hasData, dataLoading, refreshData]);
  const navigate = useNavigate();
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [selectedProduto, setSelectedProduto] = useState<string>('all');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('all');

  // Redirect if not manager
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'salesperson') {
        navigate("/vendedor");
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  // Flatten all orders from all salespeople
  const allOrders = useMemo(() => {
    const orders: Order[] = [];
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        orders.push({
          ...order,
          salesperson_name: rep.name
        });
      });
    });
    return orders;
  }, [salesReps]);

  // Extract available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allOrders.forEach(order => {
      if (order.data) {
        const parts = order.data.split('/');
        if (parts.length >= 2) {
          const month = parts[1].padStart(2, '0');
          let year = parts[2] || new Date().getFullYear().toString();
          if (year.length === 2) {
            year = `20${year}`;
          }
          months.add(`${month}/${year}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yB - yA || mB - mA;
    });
  }, [allOrders]);

  // Extract unique vendedores
  const availableVendedores = useMemo(() => {
    const vendedores = new Set<string>();
    allOrders.forEach(order => {
      if (order.salesperson_name) {
        vendedores.add(order.salesperson_name);
      }
    });
    return Array.from(vendedores).sort();
  }, [allOrders]);

  // Extract unique produtos
  const availableProdutos = useMemo(() => {
    const produtos = new Set<string>();
    allOrders.forEach(order => {
      if (order.produto) {
        produtos.add(order.produto);
      }
    });
    return Array.from(produtos).sort();
  }, [allOrders]);

  // Extract unique fornecedores
  const availableFornecedores = useMemo(() => {
    const fornecedores = new Set<string>();
    allOrders.forEach(order => {
      if (order.fornecedor) {
        fornecedores.add(order.fornecedor);
      }
    });
    return Array.from(fornecedores).sort();
  }, [allOrders]);

  // Parse date string DD/MM/YY or DD/MM/YYYY to Date object
  const parseOrderDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
    return new Date(0);
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    const filtered = allOrders.filter(order => {
      // Month filter
      if (selectedMonth !== 'all') {
        if (!order.data) return false;
        const parts = order.data.split('/');
        if (parts.length >= 2) {
          const month = parts[1].padStart(2, '0');
          let year = parts[2] || new Date().getFullYear().toString();
          if (year.length === 2) {
            year = `20${year}`;
          }
          if (`${month}/${year}` !== selectedMonth) return false;
        }
      }
      
      // Vendedor filter
      if (selectedVendedor !== 'all' && order.salesperson_name !== selectedVendedor) {
        return false;
      }
      
      // Produto filter
      if (selectedProduto !== 'all' && order.produto !== selectedProduto) {
        return false;
      }
      
      // Fornecedor filter
      if (selectedFornecedor !== 'all' && order.fornecedor !== selectedFornecedor) {
        return false;
      }
      
      return true;
    });

    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = parseOrderDate(a.data);
      const dateB = parseOrderDate(b.data);
      return dateB.getTime() - dateA.getTime();
    });
  }, [allOrders, selectedMonth, selectedVendedor, selectedProduto, selectedFornecedor]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalVendas = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
    const totalComissao = filteredOrders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
    const totalComissaoTotal = filteredOrders.reduce((sum, o) => sum + o.comissaoTotal, 0);
    const totalPedidos = filteredOrders.length;
    return { totalVendas, totalComissao, totalComissaoTotal, totalPedidos };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedVendedor('all');
    setSelectedProduto('all');
    setSelectedFornecedor('all');
  };

  const hasActiveFilters = selectedMonth !== 'all' || selectedVendedor !== 'all' || selectedProduto !== 'all' || selectedFornecedor !== 'all';

  if (loading || roleLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'var(--gradient-glow)',
        }}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/images/logo-branco.png" 
                alt="Orlando Fast Pass" 
                className="h-8 sm:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity hidden sm:block"
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-base sm:text-xl font-bold">Todos os Pedidos</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Dados da planilha em tempo real</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setRefreshing(true);
                await refreshData();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <OrderFormDialog
              mode="add"
              sheetUrl={savedUrl}
              availableVendedores={availableVendedores}
              availableProdutos={availableProdutos}
              availableFornecedores={availableFornecedores}
              onSuccess={refreshData}
            />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 relative space-y-4 sm:space-y-6">
        {!hasData ? (
          <div className="text-center py-12 sm:py-16">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <p className="text-base sm:text-lg text-muted-foreground">Nenhum dado carregado.</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Carregue uma planilha no Dashboard primeiro.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Ir para Dashboard
            </Button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="glass rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="font-medium text-sm sm:text-base">Filtros</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-xs">
                    Limpar filtros
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Month Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Mês
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos os meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {availableMonths.map(month => {
                        const [m, y] = month.split('/');
                        return (
                          <SelectItem key={month} value={month}>
                            {getMonthName(parseInt(m))} {y}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendedor Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Vendedor
                  </label>
                  <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableVendedores.map(vendedor => (
                        <SelectItem key={vendedor} value={vendedor}>
                          {vendedor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Produto Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3" />
                    Produto
                  </label>
                  <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableProdutos.map(produto => (
                        <SelectItem key={produto} value={produto}>
                          {produto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fornecedor Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building className="h-3 w-3" />
                    Fornecedor
                  </label>
                  <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableFornecedores.map(fornecedor => (
                        <SelectItem key={fornecedor} value={fornecedor}>
                          {fornecedor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                title="Total em Vendas"
                value={formatCurrency(totals.totalVendas)}
                icon={DollarSign}
                variant="success"
              />
              <MetricCard
                title="Comissão Total"
                value={formatCurrency(totals.totalComissaoTotal)}
                icon={TrendingUp}
                variant="warning"
              />
              <MetricCard
                title="Comissão Vendedor"
                value={formatCurrency(totals.totalComissao)}
                icon={TrendingUp}
                variant="info"
              />
              <MetricCard
                title="Pedidos"
                value={totals.totalPedidos.toString()}
                icon={Package}
                variant="default"
              />
            </div>

            {/* Orders Table */}
            <div className="glass rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                Detalhamento de Pedidos
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  ({filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'})
                </span>
              </h3>
              
              {filteredOrders.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Nenhum pedido encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[700px] px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm w-10"></TableHead>
                          <TableHead className="text-xs sm:text-sm">Data</TableHead>
                          <TableHead className="text-xs sm:text-sm">Pedido</TableHead>
                          <TableHead className="text-xs sm:text-sm">Vendedor</TableHead>
                          <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                          <TableHead className="text-xs sm:text-sm">Produto</TableHead>
                          <TableHead className="text-xs sm:text-sm">Fornecedor</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Venda</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order, index) => (
                          <TableRow key={`${order.pedido}-${index}`}>
                            <TableCell className="text-xs sm:text-sm p-1">
                              <OrderFormDialog
                                mode="edit"
                                order={{
                                  cliente: order.cliente,
                                  data: order.data,
                                  pedido: order.pedido,
                                  venda: order.venda,
                                  fornecedor: order.fornecedor,
                                  produto: order.produto,
                                  comissao: order.comissao,
                                  comissaoTotal: order.comissaoTotal,
                                  porcentagemVendedor: order.porcentagemVendedor,
                                  comissaoVendedor: order.comissaoVendedor,
                                  vendedor: order.salesperson_name,
                                  rowIndex: order.rowIndex
                                }}
                                sheetUrl={savedUrl}
                                availableVendedores={availableVendedores}
                                availableProdutos={availableProdutos}
                                availableFornecedores={availableFornecedores}
                                onSuccess={refreshData}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.data || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.pedido || '-'}</TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">{order.salesperson_name || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.cliente || '-'}</TableCell>
                            <TableCell className="max-w-[150px] sm:max-w-[200px] truncate text-xs sm:text-sm">{order.produto || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.fornecedor || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm">
                              {formatCurrency(order.venda)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-success text-xs sm:text-sm">
                              {formatCurrency(order.comissaoVendedor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AllOrders;