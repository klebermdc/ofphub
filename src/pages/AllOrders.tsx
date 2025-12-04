import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Package, Calendar, Filter, ArrowLeft, Users, ShoppingBag, Building } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthName } from "@/hooks/useCommissionHistory";

interface Order {
  id: string;
  cliente: string | null;
  data: string | null;
  pedido: string | null;
  venda: number;
  fornecedor: string | null;
  produto: string | null;
  comissao: number;
  comissao_total: number;
  porcentagem_vendedor: number;
  comissao_vendedor: number;
  salesperson_id: string;
  salesperson_name?: string;
}

const AllOrders = () => {
  const { user, loading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Load all orders with salesperson names
  useEffect(() => {
    const loadOrders = async () => {
      if (!user || role !== 'manager') {
        setIsLoading(false);
        return;
      }

      try {
        // First get all salespeople
        const { data: salespeople, error: spError } = await supabase
          .from('commission_salespeople')
          .select('id, name');

        if (spError) throw spError;

        // Create a map of salesperson_id to name
        const salespersonMap = new Map<string, string>();
        salespeople?.forEach(sp => {
          salespersonMap.set(sp.id, sp.name);
        });

        // Get all orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('commission_orders')
          .select('*');

        if (ordersError) throw ordersError;

        // Add salesperson names to orders
        const ordersWithNames = (ordersData || []).map(order => ({
          ...order,
          salesperson_name: salespersonMap.get(order.salesperson_id) || 'Desconhecido'
        }));

        setOrders(ordersWithNames as Order[]);
      } catch (error) {
        console.error('Error loading orders:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os pedidos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && role === 'manager') {
      loadOrders();
    }
  }, [user, role]);

  // Extract available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    orders.forEach(order => {
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
  }, [orders]);

  // Extract unique vendedores
  const availableVendedores = useMemo(() => {
    const vendedores = new Set<string>();
    orders.forEach(order => {
      if (order.salesperson_name) {
        vendedores.add(order.salesperson_name);
      }
    });
    return Array.from(vendedores).sort();
  }, [orders]);

  // Extract unique produtos
  const availableProdutos = useMemo(() => {
    const produtos = new Set<string>();
    orders.forEach(order => {
      if (order.produto) {
        produtos.add(order.produto);
      }
    });
    return Array.from(produtos).sort();
  }, [orders]);

  // Extract unique fornecedores
  const availableFornecedores = useMemo(() => {
    const fornecedores = new Set<string>();
    orders.forEach(order => {
      if (order.fornecedor) {
        fornecedores.add(order.fornecedor);
      }
    });
    return Array.from(fornecedores).sort();
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
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
  }, [orders, selectedMonth, selectedVendedor, selectedProduto, selectedFornecedor]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalVendas = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
    const totalComissao = filteredOrders.reduce((sum, o) => sum + o.comissao_vendedor, 0);
    const totalComissaoTotal = filteredOrders.reduce((sum, o) => sum + o.comissao_total, 0);
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

  if (loading || roleLoading || isLoading) {
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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo-branco.png" 
                alt="Orlando Fast Pass" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold">Todos os Pedidos</h1>
                <p className="text-sm text-muted-foreground">Visualização completa</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-6 relative space-y-6">
        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-xs">
                Limpar filtros
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Month Filter */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Mês
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Vendedor
              </label>
              <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {availableVendedores.map(vendedor => (
                    <SelectItem key={vendedor} value={vendedor}>
                      {vendedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto Filter */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                Produto
              </label>
              <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {availableProdutos.map(produto => (
                    <SelectItem key={produto} value={produto}>
                      {produto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fornecedor Filter */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                Fornecedor
              </label>
              <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">
            Detalhamento de Pedidos
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'})
            </span>
          </h3>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.data || '-'}</TableCell>
                      <TableCell>{order.pedido || '-'}</TableCell>
                      <TableCell className="font-medium">{order.salesperson_name || '-'}</TableCell>
                      <TableCell>{order.cliente || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.produto || '-'}</TableCell>
                      <TableCell>{order.fornecedor || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(order.venda)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {formatCurrency(order.comissao_vendedor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AllOrders;
