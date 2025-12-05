import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Target, Package, Building2, FileSpreadsheet, Calendar, Wallet, CircleDollarSign, FileText, Megaphone, UserPlus, Percent, Receipt, ClipboardList, Settings2, Briefcase } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { ProductChart } from "@/components/ProductChart";
import { SupplierChart } from "@/components/SupplierChart";
import { SalesRepTable } from "@/components/SalesRepTable";

import { SaveReportDialog } from "@/components/SaveReportDialog";
import { GoalsManagementDialog } from "@/components/GoalsManagementDialog";
import { GoalsKPICard } from "@/components/GoalsKPICard";
import { SalesVelocityKPI } from "@/components/SalesVelocityKPI";
import { SalesRanking } from "@/components/SalesRanking";
import { SalaryManagementDialog } from "@/components/SalaryManagementDialog";
import { MonthComparisonCard } from "@/components/MonthComparisonCard";
import { RevenueForecastChart } from "@/components/RevenueForecastChart";
import { SalespersonROI } from "@/components/SalespersonROI";
import { DailySalesTracker } from "@/components/DailySalesTracker";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { generateConsolidatedPDF } from "@/utils/consolidatedPdfGenerator";
import { useCommissionHistory, getMonthName } from "@/hooks/useCommissionHistory";
import { useAuth } from "@/hooks/useAuth";
import { useSheetSettings } from "@/hooks/useSheetSettings";
import { useSalespersonSalaries } from "@/hooks/useSalespersonSalaries";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { useUserRole } from "@/hooks/useUserRole";
import { OperationalCostsDialog } from "@/components/OperationalCostsDialog";
import { AccountingTab } from "@/components/AccountingTab";
import { MarketingTab } from "@/components/MarketingTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | undefined>();
  const [currentPeriod, setCurrentPeriod] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<'sheet' | 'history'>('sheet');
  
  // Get current month in format MM/YYYY
  const getCurrentMonthKey = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [dashboardMonth, setDashboardMonth] = useState<string>(getCurrentMonthKey());

  const { reports, isLoading: historyLoading, saveReport, loadReport, deleteReport } = useCommissionHistory(user?.id);
  const { savedUrl, isLoading: settingsLoading, saveUrl } = useSheetSettings(user?.id);
  const { salaries, saveSalaries, getSalary } = useSalespersonSalaries(user?.id);
  const { role, isLoading: roleLoading, assignManagerRole } = useUserRole(user?.id);
  const { costs: marketingCosts, saveCost: saveMarketingCost, saveOperationalCosts, getCostForMonth, getTotalForMonth, getLeadsForMonth, getOperationalCostsForMonth } = useMarketingCosts(user?.id, role === 'marketing' || role === 'manager');

  // Auto-load saved sheet URL on mount
  useEffect(() => {
    if (!settingsLoading && savedUrl && !hasData && !isLoading) {
      handleAnalyze(savedUrl);
    }
  }, [settingsLoading, savedUrl]);

  // Extract available months from orders data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (order.data) {
          // Parse date in format DD/MM/YYYY or DD/MM/YY
          const parts = order.data.split('/');
          if (parts.length >= 2) {
            const month = parts[1].padStart(2, '0');
            let year = parts[2] || new Date().getFullYear().toString();
            // Convert 2-digit year to 4-digit
            if (year.length === 2) {
              year = `20${year}`;
            }
            months.add(`${month}/${year}`);
          }
        }
      });
    });
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yB - yA || mB - mA;
    });
  }, [salesReps]);

  // Filter sales reps by selected month
  const filteredSalesReps = useMemo(() => {
    if (selectedMonth === 'all') return salesReps;
    
    return salesReps.map(rep => {
      const filteredOrders = rep.orders?.filter(order => {
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
      }) || [];
      
      const sales = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
      const commission = filteredOrders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
      
      return {
        ...rep,
        orders: filteredOrders,
        sales,
        commission,
        deals: filteredOrders.length,
        rate: filteredOrders.length > 0 
          ? filteredOrders.reduce((sum, o) => sum + o.porcentagemVendedor, 0) / filteredOrders.length 
          : 0
      };
    }).filter(rep => rep.orders.length > 0);
  }, [salesReps, selectedMonth]);

  // Filter sales reps for dashboard by selected month
  const dashboardFilteredSalesReps = useMemo(() => {
    if (dashboardMonth === 'all') return salesReps;
    
    return salesReps.map(rep => {
      const filteredOrders = rep.orders?.filter(order => {
        if (!order.data) return false;
        const parts = order.data.split('/');
        if (parts.length >= 2) {
          const month = parts[1].padStart(2, '0');
          let year = parts[2] || new Date().getFullYear().toString();
          if (year.length === 2) {
            year = `20${year}`;
          }
          return `${month}/${year}` === dashboardMonth;
        }
        return false;
      }) || [];
      
      const sales = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
      const commission = filteredOrders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
      
      return {
        ...rep,
        orders: filteredOrders,
        sales,
        commission,
        deals: filteredOrders.length,
        rate: filteredOrders.length > 0 
          ? filteredOrders.reduce((sum, o) => sum + o.porcentagemVendedor, 0) / filteredOrders.length 
          : 0
      };
    }).filter(rep => rep.orders.length > 0);
  }, [salesReps, dashboardMonth]);

  // Calculate filtered totals for dashboard
  const dashboardTotals = useMemo(() => {
    if (dashboardMonth === 'all') return totals;
    
    const totalVendas = dashboardFilteredSalesReps.reduce((sum, r) => sum + r.sales, 0);
    const totalComissao = dashboardFilteredSalesReps.reduce((sum, r) => sum + r.commission, 0);
    const totalNegocios = dashboardFilteredSalesReps.reduce((sum, r) => sum + r.deals, 0);
    
    return {
      totalVendas,
      totalComissao,
      totalNegocios,
      taxaMedia: totalNegocios > 0 ? dashboardFilteredSalesReps.reduce((sum, r) => sum + r.rate, 0) / dashboardFilteredSalesReps.length : 0,
      vendedoresAtivos: dashboardFilteredSalesReps.length
    };
  }, [dashboardMonth, dashboardFilteredSalesReps, totals]);

  // Handle authentication and role-based routing
  useEffect(() => {
    const handleRoleCheck = async () => {
      if (!loading && !roleLoading) {
        if (!user) {
          navigate("/auth");
        } else if (role === 'salesperson') {
          navigate("/vendedor");
        } else if (role === 'marketing') {
          navigate("/marketing");
        } else if (!role) {
          // No role assigned - assign manager role (first user or existing managers)
          await assignManagerRole();
        }
      }
    };
    handleRoleCheck();
  }, [user, loading, role, roleLoading, navigate, assignManagerRole]);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setCurrentReportId(undefined);
    setCurrentPeriod("Importação atual");
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-google-sheet', {
        body: { sheetUrl: url }
      });

      if (error) {
        console.error('Function error:', error);
        toast({
          title: "Erro ao importar",
          description: error.message || "Não foi possível processar a planilha.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (data.error) {
        toast({
          title: "Erro na planilha",
          description: data.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const transformedData: SalesRep[] = data.data.map((item: any, index: number) => ({
        id: String(index + 1),
        name: item.vendedor,
        sales: item.vendas,
        commission: item.comissao,
        deals: item.negocios,
        rate: item.taxa,
        orders: item.pedidos || []
      }));

      setSalesReps(transformedData);
      setTotals(data.totals);
      setHasData(true);
      setDataSource('sheet');
      
      // Save URL for auto-load next time
      await saveUrl(url);
      
      toast({
        title: "Planilha importada!",
        description: data.message,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a planilha.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleSaveReport = async (month: number, year: number) => {
    if (!totals) return false;
    return await saveReport(month, year, salesReps, totals);
  };

  const handleLoadReport = async (reportId: string) => {
    const result = await loadReport(reportId);
    if (result) {
      setSalesReps(result.salesReps);
      setTotals(result.totals);
      setHasData(true);
      setCurrentReportId(reportId);
      setDataSource('history');
      
      const report = reports.find(r => r.id === reportId);
      if (report) {
        setCurrentPeriod(`${getMonthName(report.period_month)} ${report.period_year}`);
      }
      
      toast({
        title: "Relatório carregado",
        description: "Dados do histórico carregados com sucesso.",
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    await deleteReport(reportId);
    if (currentReportId === reportId) {
      setCurrentReportId(undefined);
      setCurrentPeriod(undefined);
    }
  };

  const handleGeneratePDF = async (rep: SalesRep) => {
    toast({
      title: "Gerando PDF...",
      description: `Relatório de ${rep.name} será baixado em instantes.`,
    });

    try {
      await generateSalesRepPDF(rep);
      
      toast({
        title: "PDF pronto!",
        description: `Relatório de ${rep.name} baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Calculate additional KPIs based on filtered data
  const ticketMedio = dashboardTotals && dashboardTotals.totalNegocios > 0 
    ? dashboardTotals.totalVendas / dashboardTotals.totalNegocios 
    : 0;
  
  const topFornecedores = dashboardFilteredSalesReps.length > 0 
    ? [...new Set(dashboardFilteredSalesReps.flatMap(r => r.orders?.map(o => o.fornecedor) || []))].filter(f => f).length
    : 0;

  const topProdutos = dashboardFilteredSalesReps.length > 0
    ? [...new Set(dashboardFilteredSalesReps.flatMap(r => r.orders?.map(o => o.produto) || []))].filter(p => p).length
    : 0;

  // Calculate Comissão Total (from comissaoTotal column)
  const totalComissaoTotal = dashboardFilteredSalesReps.reduce(
    (sum, rep) => sum + (rep.orders?.reduce((s, o) => s + (o.comissaoTotal || 0), 0) || 0), 
    0
  );

  // Get current selected month/year for goals
  const currentGoalMonth = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[0]) 
    : new Date().getMonth() + 1;
  const currentGoalYear = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[1]) 
    : new Date().getFullYear();

  // Fetch monthly goal for daily tracker
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  
  useEffect(() => {
    const fetchMonthlyGoal = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('sales_goals')
          .select('goal_vendas')
          .eq('user_id', user.id)
          .eq('period_month', currentGoalMonth)
          .eq('period_year', currentGoalYear)
          .single();
        
        setMonthlyGoal(data?.goal_vendas || 0);
      } catch {
        setMonthlyGoal(0);
      }
    };
    fetchMonthlyGoal();
  }, [user?.id, currentGoalMonth, currentGoalYear]);

  // Calculate total cost (commissions + fixed salaries + marketing + operational)
  const totalSalaries = dashboardFilteredSalesReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
  const marketingCost = getTotalForMonth(currentGoalMonth, currentGoalYear);
  const operationalCost = getOperationalCostsForMonth(currentGoalMonth, currentGoalYear);

  // Calculate leads and conversion rate
  const totalLeads = getLeadsForMonth(currentGoalMonth, currentGoalYear);
  const totalOrders = dashboardTotals?.totalNegocios || 0;
  const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

  // Calculate estimated tax (12% of Comissão Total)
  const impostoEstimado = totalComissaoTotal * 0.12;

  // Calculate total cost (commissions + salaries + marketing + operational + estimated tax)
  const totalCost = (dashboardTotals?.totalComissao || 0) + totalSalaries + marketingCost + operationalCost + impostoEstimado;

  // Calculate profit (Comissão Total - Custo Total)
  const resultado = totalComissaoTotal - totalCost;

  // Calculate results by fortnight (quinzena)
  const { primeiraQuinzena, segundaQuinzena } = useMemo(() => {
    let primeira = { comissaoTotal: 0, comissaoVendedor: 0 };
    let segunda = { comissaoTotal: 0, comissaoVendedor: 0 };
    
    dashboardFilteredSalesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (order.data) {
          const parts = order.data.split('/');
          const day = parseInt(parts[0]);
          
          if (day >= 1 && day <= 15) {
            primeira.comissaoTotal += order.comissaoTotal || 0;
            primeira.comissaoVendedor += order.comissaoVendedor || 0;
          } else if (day >= 16 && day <= 31) {
            segunda.comissaoTotal += order.comissaoTotal || 0;
            segunda.comissaoVendedor += order.comissaoVendedor || 0;
          }
        }
      });
    });
    
    return {
      primeiraQuinzena: primeira.comissaoTotal - primeira.comissaoVendedor,
      segundaQuinzena: segunda.comissaoTotal - segunda.comissaoVendedor
    };
  }, [dashboardFilteredSalesReps]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'var(--gradient-glow)',
        }}
      />
      
      <DashboardHeader availableSalespeople={salesReps.map(r => r.name)} />
      
      <main className="container mx-auto px-6 py-6 relative">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-1">
              <Megaphone className="h-4 w-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="contabilidade" className="gap-1">
              <Receipt className="h-4 w-4" />
              Contabilidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {!hasData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="glass rounded-xl p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h2 className="text-2xl font-bold mb-4">Bem-vindo ao Hub de Gestão</h2>
                    <p className="text-muted-foreground mb-6">
                      Importe sua planilha do Google Sheets para começar a análise de comissões.
                    </p>
                    <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header com período e fonte */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Fonte:</span>
                    <Badge variant={dataSource === 'sheet' ? 'default' : 'secondary'} className="gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      {dataSource === 'sheet' ? 'Planilha' : 'Histórico'}
                    </Badge>
                    
                    {/* Filtro de Mês */}
                    <div className="flex items-center gap-2 ml-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                        <SelectTrigger className="w-[160px] h-8">
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
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <OperationalCostsDialog onSave={saveOperationalCosts} getCostForMonth={getCostForMonth} />
                    <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} compact />
                    <SaveReportDialog onSave={handleSaveReport} disabled={!hasData} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        toast({ title: "Gerando PDF...", description: "Relatório consolidado será baixado em instantes." });
                        const [m, y] = dashboardMonth !== 'all' ? dashboardMonth.split('/') : ['', ''];
                        await generateConsolidatedPDF({
                          salesReps: dashboardFilteredSalesReps,
                          totals: dashboardTotals,
                          getSalary,
                          month: m ? getMonthName(parseInt(m)) : undefined,
                          year: y || undefined
                        });
                        toast({ title: "PDF pronto!", description: "Relatório consolidado baixado com sucesso." });
                      }}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      PDF Consolidado
                    </Button>
                  </div>
                </div>

                {/* Acompanhamento Diário */}
                <DailySalesTracker
                  salesReps={salesReps}
                  monthlyGoal={monthlyGoal}
                  currentMonth={dashboardMonth !== 'all' ? dashboardMonth : `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}
                  totalComissao={totalComissaoTotal}
                  totalComissaoVendedor={dashboardTotals?.totalComissao || 0}
                  totalSalaries={totalSalaries}
                  marketingCosts={marketingCost}
                  operationalCosts={operationalCost}
                />

                {/* KPIs Principais - Receitas */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Faturamento"
                    value={dashboardTotals ? formatCurrency(dashboardTotals.totalVendas) : "R$ 0"}
                    icon={DollarSign}
                    delay={0}
                    variant="success"
                  />
                  <MetricCard
                    title="Comissão Total"
                    value={formatCurrency(totalComissaoTotal)}
                    icon={TrendingUp}
                    delay={50}
                    variant="warning"
                  />
                  <MetricCard
                    title="Comissão Vendedor"
                    value={dashboardTotals ? formatCurrency(dashboardTotals.totalComissao) : "R$ 0"}
                    icon={TrendingUp}
                    delay={75}
                  />
                </div>

                {/* KPIs Secundários - Custos e Resultado */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <MetricCard
                    title="Marketing"
                    value={formatCurrency(marketingCost)}
                    icon={Megaphone}
                    delay={75}
                    variant="warning"
                  />
                  <MetricCard
                    title="Custos Operacionais"
                    value={formatCurrency(operationalCost)}
                    icon={Briefcase}
                    delay={85}
                    variant="warning"
                  />
                  <MetricCard
                    title="Imposto Estimado (12%)"
                    value={formatCurrency(impostoEstimado)}
                    icon={Receipt}
                    delay={90}
                    variant="warning"
                  />
                  <MetricCard
                    title="Custo Total"
                    value={formatCurrency(totalCost)}
                    icon={Wallet}
                    delay={100}
                    variant="danger"
                  />
                  <MetricCard
                    title="Resultado"
                    value={formatCurrency(resultado)}
                    icon={CircleDollarSign}
                    delay={125}
                    variant={resultado >= 0 ? "success" : "danger"}
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value={formatCurrency(ticketMedio)}
                    icon={Target}
                    delay={150}
                    variant="info"
                  />
                </div>

                {/* KPIs por Quinzena */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    title="1ª Quinzena (1-15)"
                    value={formatCurrency(primeiraQuinzena)}
                    icon={Calendar}
                    delay={175}
                    variant={primeiraQuinzena >= 0 ? "success" : "danger"}
                  />
                  <MetricCard
                    title="2ª Quinzena (16-31)"
                    value={formatCurrency(segundaQuinzena)}
                    icon={Calendar}
                    delay={200}
                    variant={segundaQuinzena >= 0 ? "success" : "danger"}
                  />
                </div>

                {/* KPIs Terciários - Operacionais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Vendedores"
                    value={dashboardTotals ? String(dashboardTotals.vendedoresAtivos) : "0"}
                    icon={Users}
                    delay={150}
                  />
                  <MetricCard
                    title="Pedidos"
                    value={dashboardTotals ? String(dashboardTotals.totalNegocios) : "0"}
                    icon={Package}
                    delay={200}
                  />
                  <MetricCard
                    title="Leads"
                    value={String(totalLeads)}
                    icon={UserPlus}
                    delay={225}
                  />
                  <MetricCard
                    title="Taxa de Conversão"
                    value={`${conversionRate.toFixed(1)}%`}
                    icon={Percent}
                    delay={250}
                    variant={conversionRate >= 10 ? "success" : conversionRate >= 5 ? "warning" : "danger"}
                  />
                </div>

                {/* Comparação Mensal */}
                <MonthComparisonCard 
                  salesReps={salesReps}
                  availableMonths={availableMonths}
                  currentMonth={dashboardMonth}
                />

                {/* Gráficos - Vendedor, Produto, Fornecedor */}
                <SalesChart salesReps={dashboardFilteredSalesReps} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProductChart salesReps={dashboardFilteredSalesReps} />
                  <SupplierChart salesReps={dashboardFilteredSalesReps} />
                </div>

                {/* Projeção */}
                <div className="grid grid-cols-1 gap-6">
                  <RevenueForecastChart salesReps={salesReps} availableMonths={availableMonths} />
                </div>

                {/* Metas */}
                <GoalsKPICard
                  userId={user.id}
                  month={currentGoalMonth}
                  year={currentGoalYear}
                  totalSales={dashboardTotals?.totalVendas || 0}
                />

                {/* Velocidade e Projeção */}
                <SalesVelocityKPI
                  userId={user.id}
                  month={currentGoalMonth}
                  year={currentGoalYear}
                  totalSales={dashboardTotals?.totalVendas || 0}
                  currentComissaoTotal={totalComissaoTotal}
                  currentComissaoVendedor={dashboardTotals?.totalComissao || 0}
                  fixedCosts={totalSalaries + marketingCost + operationalCost}
                />

              </>
            )}
          </TabsContent>

          <TabsContent value="vendedores" className="space-y-6">
            {hasData ? (
              <>
                {/* Ações e Filtros */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtrar por mês:</span>
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
                    {selectedMonth !== 'all' && (
                      <Badge variant="secondary">
                        {filteredSalesReps.length} vendedor(es)
                      </Badge>
                    )}
                  </div>
                  
                  {/* Ações Comerciais */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <SalaryManagementDialog salaries={salaries} onSave={saveSalaries} />
                    <GoalsManagementDialog
                      userId={user.id}
                      month={currentGoalMonth}
                      year={currentGoalYear}
                      salesReps={filteredSalesReps}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/pedidos')}
                      className="gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Todos os Pedidos
                    </Button>
                  </div>
                </div>

                {/* Ranking e ROI */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SalesRanking salesReps={filteredSalesReps} />
                  <SalespersonROI salesReps={filteredSalesReps} getSalary={getSalary} />
                </div>

                {/* Tabela de Vendedores */}
                <SalesRepTable salesReps={filteredSalesReps} onGeneratePDF={handleGeneratePDF} />
              </>
            ) : (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-muted-foreground">
                  Importe uma planilha ou carregue um relatório do histórico para ver os vendedores.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            <MarketingTab 
              costs={marketingCosts}
              onSave={saveMarketingCost}
              getCostForMonth={getCostForMonth}
              salesReps={salesReps}
            />
          </TabsContent>

          <TabsContent value="contabilidade" className="space-y-6">
            <AccountingTab userId={user?.id} />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Index;
