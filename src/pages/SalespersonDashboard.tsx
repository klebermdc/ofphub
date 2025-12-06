import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DollarSign, TrendingUp, Package, Calendar, LogOut, User, Kanban, BarChart3, Sparkles, ArrowLeft } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSheetData } from "@/contexts/SheetDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMonthName } from "@/hooks/useCommissionHistory";
import { SalespersonGoalKPI } from "@/components/SalespersonGoalKPI";
import { SalespersonVelocityKPI } from "@/components/SalespersonVelocityKPI";
import { SalespersonConversionKPI } from "@/components/SalespersonConversionKPI";
import { SalespersonFollowUpAlerts } from "@/components/SalespersonFollowUpAlerts";
import { SalespersonTopItems } from "@/components/SalespersonTopItems";
import { CRMTab } from "@/components/crm/CRMTab";
import { ProposalTab } from "@/components/proposals/ProposalTab";

const SalespersonDashboard = () => {
  const { salespersonName: urlSalespersonName } = useParams<{ salespersonName?: string }>();
  const { user, loading, signOut } = useAuth();
  const { role, salespersonName: userSalespersonName, isLoading: roleLoading } = useUserRole(user?.id);
  const { salesReps, isLoading: sheetLoading } = useSheetData();
  const navigate = useNavigate();
  
  // If manager is viewing a specific salesperson, use URL param; otherwise use user's own name
  const isManagerViewing = role === 'manager' && urlSalespersonName;
  const displaySalespersonName = isManagerViewing 
    ? decodeURIComponent(urlSalespersonName) 
    : userSalespersonName;
  
  // Get current month in format MM/YYYY
  const getCurrentMonthKey = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());

  // Redirect logic - only for salespeople accessing their own dashboard
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'manager' && !urlSalespersonName) {
        // Manager accessing /vendedor without a specific salesperson - redirect to main dashboard
        navigate("/");
      }
      // Don't redirect if manager is viewing a specific salesperson's dashboard
    }
  }, [user, loading, role, roleLoading, navigate, urlSalespersonName]);

  // Get orders for this salesperson from salesReps
  const salespersonOrders = useMemo(() => {
    if (!displaySalespersonName || !salesReps.length) {
      console.log('No salesperson name or no salesReps:', { displaySalespersonName, salesRepsLength: salesReps.length });
      return [];
    }
    
    // Find the salesperson in salesReps
    const salesRep = salesReps.find(rep => 
      rep.name.toLowerCase().includes(displaySalespersonName.toLowerCase()) ||
      displaySalespersonName.toLowerCase().includes(rep.name.toLowerCase())
    );
    
    console.log('Matching salesperson:', { 
      displaySalespersonName, 
      foundRep: salesRep?.name, 
      ordersCount: salesRep?.orders?.length,
      allReps: salesReps.map(r => r.name)
    });
    
    return salesRep?.orders || [];
  }, [salesReps, displaySalespersonName]);

  // Extract available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    salespersonOrders.forEach(order => {
      const data = order.data || '';
      if (data) {
        const parts = data.split('/');
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
  }, [salespersonOrders]);

  // Filter orders by month and sort by date (most recent first)
  const filteredOrders = useMemo(() => {
    const parseDate = (dateStr: string) => {
      if (!dateStr) return new Date(0);
      const parts = dateStr.split('/');
      if (parts.length >= 3) {
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return new Date(parseInt(year), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(0);
    };

    let orders = salespersonOrders;
    
    if (selectedMonth !== 'all') {
      orders = salespersonOrders.filter(order => {
        const data = order.data || '';
        if (!data) return false;
        const parts = data.split('/');
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
    }
    
    // Sort by date descending (most recent first)
    return [...orders].sort((a, b) => {
      return parseDate(b.data || '').getTime() - parseDate(a.data || '').getTime();
    });
  }, [salespersonOrders, selectedMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalVendas = filteredOrders.reduce((sum, order) => sum + (order.venda || 0), 0);
    const totalComissao = filteredOrders.reduce((sum, order) => sum + (order.comissaoVendedor || 0), 0);
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

  if (loading || roleLoading || sheetLoading) {
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
            {isManagerViewing && (
              <Button variant="outline" size="sm" onClick={() => navigate("/?tab=vendedores")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Comercial
              </Button>
            )}
            <img 
              src="/images/logo-branco.png" 
              alt="Orlando Fast Pass" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold">
                {isManagerViewing ? 'Performance do Vendedor' : 'Minhas Vendas'}
              </h1>
              <p className="text-sm text-muted-foreground">{displaySalespersonName}</p>
            </div>
          </div>
          {!isManagerViewing && (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-6 relative">
        <Tabs defaultValue="vendas" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="vendas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Minhas Vendas
            </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="propostas" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Propostas
            </TabsTrigger>
          </TabsList>

          {/* Vendas Tab */}
          <TabsContent value="vendas" className="space-y-6">
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

            {/* Follow-up Alerts - sempre visível */}
            {displaySalespersonName && (
              <SalespersonFollowUpAlerts salespersonName={displaySalespersonName} />
            )}

            {/* Goal KPI */}
            {selectedMonth !== 'all' && displaySalespersonName && (
              <SalespersonGoalKPI
                salespersonName={displaySalespersonName}
                month={parseInt(selectedMonth.split('/')[0])}
                year={parseInt(selectedMonth.split('/')[1])}
                currentSales={totals.totalVendas}
              />
            )}

            {/* Velocidade e Projeção */}
            {selectedMonth !== 'all' && displaySalespersonName && (
              <SalespersonVelocityKPI
                salespersonName={displaySalespersonName}
                month={parseInt(selectedMonth.split('/')[0])}
                year={parseInt(selectedMonth.split('/')[1])}
                currentSales={totals.totalVendas}
              />
            )}

            {/* Taxa de Conversão CRM */}
            {selectedMonth !== 'all' && displaySalespersonName && (
              <SalespersonConversionKPI
                salespersonName={displaySalespersonName}
                month={parseInt(selectedMonth.split('/')[0])}
                year={parseInt(selectedMonth.split('/')[1])}
              />
            )}

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

            {/* Top Products and Suppliers */}
            <SalespersonTopItems orders={filteredOrders} />

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
                      {filteredOrders.map((order, index) => (
                        <TableRow key={index}>
                          <TableCell>{order.data || '-'}</TableCell>
                          <TableCell>{order.pedido || '-'}</TableCell>
                          <TableCell>{order.cliente || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{order.produto || '-'}</TableCell>
                          <TableCell>{order.fornecedor || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(order.venda || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatCurrency(order.comissaoVendedor || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* CRM Tab */}
          <TabsContent value="crm">
            <CRMTab 
              salespersonFilter={displaySalespersonName || undefined}
              isReadOnly={!!isManagerViewing}
            />
          </TabsContent>

          {/* Propostas Tab */}
          <TabsContent value="propostas">
            <ProposalTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SalespersonDashboard;
