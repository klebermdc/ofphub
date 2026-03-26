import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DollarSign, TrendingUp, Package, Calendar, LogOut, User, Kanban, BarChart3, Sparkles, ArrowLeft, Send, Sun, Moon } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { OrderDetail } from "@/types/sales";
import { resolveSalespersonName } from "@/config/salaries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { getMonthName } from "@/hooks/useCommissionHistory";
import { SalespersonGoalKPI } from "@/components/SalespersonGoalKPI";
import { SalespersonVelocityKPI } from "@/components/SalespersonVelocityKPI";
import { SalespersonConversionKPI } from "@/components/SalespersonConversionKPI";
import { SalespersonFollowUpAlerts } from "@/components/SalespersonFollowUpAlerts";
import { SalespersonTopItems } from "@/components/SalespersonTopItems";
import { CRMTab } from "@/components/crm/CRMTab";
import { ProposalTab } from "@/components/proposals/ProposalTab";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SalespersonDashboard = () => {
  const { salespersonName: urlSalespersonName } = useParams<{ salespersonName?: string }>();
  const { user, loading, signOut } = useAuth();
  const { role, salespersonName: userSalespersonName, isLoading: roleLoading } = useUserRole(user?.id);
  const { salesReps, isLoading: sheetLoading } = useSheetData();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
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
  const [enviadoStatus, setEnviadoStatus] = useState<Record<string, boolean>>({});

  // Fetch enviado status from database
  const fetchEnviadoStatus = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('orders')
      .select('pedido, enviado');
    
    if (!error && data) {
      const statusMap: Record<string, boolean> = {};
      data.forEach(order => {
        if (order.pedido) {
          statusMap[order.pedido] = order.enviado || false;
        }
      });
      setEnviadoStatus(statusMap);
    }
  }, [user]);

  useEffect(() => {
    fetchEnviadoStatus();
  }, [fetchEnviadoStatus]);

  // Toggle enviado status
  const toggleEnviado = async (pedido: string, currentValue: boolean) => {
    if (!user) return;
    
    const newValue = !currentValue;
    
    // Optimistic update
    setEnviadoStatus(prev => ({ ...prev, [pedido]: newValue }));
    
    // Check if order exists in DB
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('pedido', pedido)
      .maybeSingle();
    
    if (existing) {
      const { error } = await supabase
        .from('orders')
        .update({ enviado: newValue })
        .eq('pedido', pedido);
      
      if (error) {
        setEnviadoStatus(prev => ({ ...prev, [pedido]: currentValue }));
        toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
      }
    } else {
      toast({ title: "Aviso", description: "Pedido atualizado localmente", variant: "default" });
    }
  };

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
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {isManagerViewing && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/?tab=vendedores")} className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-5 w-5 sm:h-7 sm:w-7" />
              </Button>
            )}
            <img 
              src="/images/logo-branco.png" 
              alt="Orlando Fast Pass" 
              className={`h-8 sm:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity ${theme !== 'dark' ? 'invert' : ''}`}
              onClick={() => navigate("/")}
            />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-xl font-bold">
                {isManagerViewing ? 'Performance do Vendedor' : 'Minhas Vendas'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{displaySalespersonName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="sm:hidden text-right mr-2">
              <p className="text-sm font-medium truncate max-w-[100px]">{displaySalespersonName}</p>
            </div>
            {!isManagerViewing && (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 sm:gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
        <Tabs defaultValue="vendas" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 h-auto p-1">
            <TabsTrigger value="vendas" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Minhas Vendas</span>
              <span className="sm:hidden">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Kanban className="h-3 w-3 sm:h-4 sm:w-4" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="propostas" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              Propostas
            </TabsTrigger>
          </TabsList>

          {/* Vendas Tab */}
          <TabsContent value="vendas" className="space-y-4 sm:space-y-6">
            {/* Month Filter */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm h-9">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
            <div className="glass rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Detalhamento de Vendas</h3>
              
              {filteredOrders.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Nenhuma venda encontrada para o período selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[600px] px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm text-center w-16">
                            <Send className="h-3.5 w-3.5 mx-auto" />
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">Data</TableHead>
                          <TableHead className="text-xs sm:text-sm">Pedido</TableHead>
                          <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                          <TableHead className="text-xs sm:text-sm">Produto</TableHead>
                          <TableHead className="text-xs sm:text-sm">Fornecedor</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Venda</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={enviadoStatus[order.pedido] || false}
                                onCheckedChange={() => toggleEnviado(order.pedido, enviadoStatus[order.pedido] || false)}
                                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                              />
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.data || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.pedido || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.cliente || '-'}</TableCell>
                            <TableCell className="max-w-[150px] sm:max-w-[200px] truncate text-xs sm:text-sm">{order.produto || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.fornecedor || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm">
                              {formatCurrency(order.venda || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-success text-xs sm:text-sm">
                              {formatCurrency(order.comissaoVendedor || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
