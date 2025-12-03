import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Package, Calendar, LogOut, User } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthName } from "@/hooks/useCommissionHistory";

interface SalespersonOrder {
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
}

const SalespersonDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { role, salespersonName, isLoading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<SalespersonOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Redirect if not salesperson
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'manager') {
        navigate("/");
      } else if (!role) {
        // No role assigned - show message
        setIsLoading(false);
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  // Load salesperson's orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!salespersonName) {
        setIsLoading(false);
        return;
      }

      try {
        // Get all salespeople IDs that match this name across all reports
        const { data: salespeople, error: spError } = await supabase
          .from('commission_salespeople')
          .select('id, name')
          .ilike('name', `%${salespersonName}%`);

        if (spError) throw spError;

        if (!salespeople || salespeople.length === 0) {
          setIsLoading(false);
          return;
        }

        const salespeopleIds = salespeople.map(sp => sp.id);

        // Get all orders for these salespeople
        const { data: ordersData, error: ordersError } = await supabase
          .from('commission_orders')
          .select('*')
          .in('salesperson_id', salespeopleIds);

        if (ordersError) throw ordersError;

        setOrders((ordersData || []) as SalespersonOrder[]);
      } catch (error) {
        console.error('Error loading orders:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar suas vendas.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (salespersonName) {
      loadOrders();
    }
  }, [salespersonName]);

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

  // Filter orders by month
  const filteredOrders = useMemo(() => {
    if (selectedMonth === 'all') return orders;
    
    return orders.filter(order => {
      if (!order.data) return false;
      const parts = order.data.split('/');
      if (parts.length >= 2) {
        const month = parts[1].padStart(2, '0');
        let year = parts[2] || new Date().getFullYear().toString();
        if (year.length === 2) {
          year = `20${year}`;
        }
        return `${month}/${year}` === selectedMonth;
      }
      return false;
    });
  }, [orders, selectedMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalVendas = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
    const totalComissao = filteredOrders.reduce((sum, o) => sum + o.comissao_vendedor, 0);
    const totalPedidos = filteredOrders.length;
    return { totalVendas, totalComissao, totalPedidos };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading || roleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 glass rounded-xl max-w-md">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Conta Pendente</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta ainda não foi vinculada pelo gestor. Entre em contato com seu gerente para ativar o acesso.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
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
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo-ofp.png" 
              alt="Orlando Fast Pass" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold">Minhas Vendas</h1>
              <p className="text-sm text-muted-foreground">{salespersonName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-6 relative space-y-6">
        {/* Month Filter */}
        <div className="flex items-center gap-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
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

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total em Vendas"
            value={formatCurrency(totals.totalVendas)}
            icon={DollarSign}
            variant="success"
          />
          <MetricCard
            title="Comissão a Receber"
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
          <h3 className="text-lg font-semibold mb-4">Detalhamento de Vendas</h3>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma venda encontrada para o período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
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

export default SalespersonDashboard;
