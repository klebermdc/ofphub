import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Target, Package, Building2, FileSpreadsheet, Calendar, Wallet, CircleDollarSign, FileText, Megaphone, UserPlus, Percent, Receipt, ClipboardList, Settings2, Briefcase, Kanban, FileCheck } from "lucide-react";
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

import { RevenueForecastChart } from "@/components/RevenueForecastChart";
import { SalespersonROI } from "@/components/SalespersonROI";
import { DailySalesTracker } from "@/components/DailySalesTracker";
import { EBITDACard } from "@/components/EBITDACard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { generateConsolidatedPDF } from "@/utils/consolidatedPdfGenerator";
import { useCommissionHistory, getMonthName } from "@/hooks/useCommissionHistory";
import { isExcludedName } from "@/config/salaries";
import { useAuth } from "@/hooks/useAuth";
import { useSheetSettings } from "@/hooks/useSheetSettings";
import { useSalespersonSalaries } from "@/hooks/useSalespersonSalaries";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { useUserRole } from "@/hooks/useUserRole";
import { useCRMLeadsCount } from "@/hooks/useCRMLeadsCount";
import { OperationalCostsDialog } from "@/components/OperationalCostsDialog";
import { AccountingTab } from "@/components/AccountingTab";
import { MarketingTab } from "@/components/MarketingTab";
import { CRMTab } from "@/components/crm/CRMTab";
import { NFSeTab } from "@/components/nfse/NFSeTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | undefined>();
  const [currentPeriod, setCurrentPeriod] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<'sheet' | 'history'>('sheet');
  const [comercialView, setComercialView] = useState<'equipe' | 'crm'>('equipe');
  
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
          const orderMonth = `${month}/${year}`;
          return orderMonth === selectedMonth;
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
      
      // Reload goals for current month
      await fetchMonthlyGoal();
      
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
  const [resultGoal, setResultGoal] = useState<number>(0);
  
  const fetchMonthlyGoal = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('sales_goals')
        .select('goal_vendas, goal_resultado')
        .eq('user_id', user.id)
        .eq('period_month', currentGoalMonth)
        .eq('period_year', currentGoalYear)
        .maybeSingle();
      
      setMonthlyGoal(data?.goal_vendas || 0);
      setResultGoal((data as any)?.goal_resultado || 0);
    } catch {
      setMonthlyGoal(0);
      setResultGoal(0);
    }
  };
  
  useEffect(() => {
    fetchMonthlyGoal();
  }, [user?.id, currentGoalMonth, currentGoalYear]);

  // Calculate total cost (commissions + fixed salaries + marketing + operational)
  const totalSalaries = dashboardFilteredSalesReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
  const marketingCost = getTotalForMonth(currentGoalMonth, currentGoalYear);
  const operationalCost = getOperationalCostsForMonth(currentGoalMonth, currentGoalYear);
  
  // Calculate Custo Equipe Comercial (Comissão Vendedores + Salários) - excluding partners
  const nonPartnerReps = dashboardFilteredSalesReps.filter(rep => !isExcludedName(rep.name));
  const nonPartnerCommissions = nonPartnerReps.reduce((sum, rep) => sum + rep.commission, 0);
  const nonPartnerSalaries = nonPartnerReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
  const custoEquipeComercial = nonPartnerCommissions + nonPartnerSalaries;

  // Calculate leads from CRM (Notion sync) and conversion rate
  const { getLeadsCountForMonth } = useCRMLeadsCount();
  const [totalLeads, setTotalLeads] = useState<number>(0);
  
  const fetchCRMLeadsCount = useCallback(async () => {
    const count = await getLeadsCountForMonth(currentGoalMonth, currentGoalYear);
    setTotalLeads(count);
  }, [currentGoalMonth, currentGoalYear, getLeadsCountForMonth]);
  
  useEffect(() => {
    fetchCRMLeadsCount();
  }, [fetchCRMLeadsCount]);
  
  const totalOrders = dashboardTotals?.totalNegocios || 0;
  const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

  // Calculate estimated tax (12% of Comissão Total)
  const impostoEstimado = totalComissaoTotal * 0.12;

  // Calculate total cost (commissions + salaries + marketing + operational + estimated tax)
  const totalCost = (dashboardTotals?.totalComissao || 0) + totalSalaries + marketingCost + operationalCost + impostoEstimado;

  // Calculate profit (Comissão Total - Custo Total)
  const resultado = totalComissaoTotal - totalCost;

  // Calculate Ganho Bruto (Comissão Total - Comissão Vendedor)
  const ganhoBruto = totalComissaoTotal - (dashboardTotals?.totalComissao || 0);

  // Calculate proportional costs based on elapsed days
  const calcularCustoProporcional = () => {
    const now = new Date();
    const [m, y] = dashboardMonth !== 'all' ? dashboardMonth.split('/') : [String(now.getMonth() + 1), String(now.getFullYear())];
    const month = parseInt(m) - 1;
    const year = parseInt(y);
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getMonth() === month && now.getFullYear() === year ? now.getDate() : daysInMonth;
    const proporcao = currentDay / daysInMonth;
    
    // Custos fixos mensais proporcionais aos dias decorridos
    const custosProporcional = (totalSalaries + marketingCost + operationalCost) * proporcao;
    // Imposto estimado proporcional
    const impostoProporcional = impostoEstimado * proporcao;
    
    return custosProporcional + impostoProporcional;
  };

  const custoProporcional = calcularCustoProporcional();
  const resultadoParcial = ganhoBruto - custoProporcional;

  // Calculate results by fortnight (quinzena)
  const { primeiraQuinzena, segundaQuinzena, primeiraQuinzenaComissaoTotal, segundaQuinzenaComissaoTotal } = useMemo(() => {
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
      segundaQuinzena: segunda.comissaoTotal - segunda.comissaoVendedor,
      primeiraQuinzenaComissaoTotal: primeira.comissaoTotal,
      segundaQuinzenaComissaoTotal: segunda.comissaoTotal
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
      
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
        <Tabs defaultValue={initialTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2">Dashboard</TabsTrigger>
            <TabsTrigger value="vendedores" className="gap-1 text-xs sm:text-sm py-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
              Comercial
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-1 text-xs sm:text-sm py-2">
              <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="contabilidade" className="gap-1 text-xs sm:text-sm py-2 hidden sm:flex">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
              Contabilidade
            </TabsTrigger>
            <TabsTrigger value="nfse" className="gap-1 text-xs sm:text-sm py-2 hidden sm:flex">
              <FileCheck className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
              NFS-e
            </TabsTrigger>
          </TabsList>

          {/* Mobile additional tabs */}
          <div className="flex sm:hidden gap-2">
            <TabsList className="grid grid-cols-2 gap-1 w-full h-auto p-1">
              <TabsTrigger value="contabilidade" className="gap-1 text-xs py-2">
                <Receipt className="h-3 w-3" />
                Contabilidade
              </TabsTrigger>
              <TabsTrigger value="nfse" className="gap-1 text-xs py-2">
                <FileCheck className="h-3 w-3" />
                NFS-e
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {!hasData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2">
                  <div className="glass rounded-xl p-4 sm:p-8 text-center">
                    <FileSpreadsheet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Bem-vindo ao Hub de Gestão</h2>
                    <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                      Importe sua planilha do Google Sheets para começar a análise de comissões.
                    </p>
                    <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header com período e fonte */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground">Fonte:</span>
                    <Badge variant={dataSource === 'sheet' ? 'default' : 'secondary'} className="gap-1 text-xs">
                      <FileSpreadsheet className="h-3 w-3" />
                      {dataSource === 'sheet' ? 'Planilha' : 'Histórico'}
                    </Badge>
                    
                    {/* Filtro de Mês */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                        <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm">
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
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <OperationalCostsDialog onSave={saveOperationalCosts} getCostForMonth={getCostForMonth} />
                    <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} compact savedUrl={savedUrl} />
                    <SaveReportDialog onSave={handleSaveReport} disabled={!hasData} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/pedidos')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Todos os Pedidos</span>
                      <span className="sm:hidden">Pedidos</span>
                    </Button>
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
                      className="gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">PDF Consolidado</span>
                      <span className="sm:hidden">PDF</span>
                    </Button>
                  </div>
                </div>

                {/* Acompanhamento Diário */}
                <DailySalesTracker
                  salesReps={salesReps}
                  currentMonth={dashboardMonth !== 'all' ? dashboardMonth : `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}
                  totalSalaries={totalSalaries}
                  marketingCosts={marketingCost}
                  operationalCosts={operationalCost}
                />

                {/* ACOMPANHAMENTO MENSAL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento Mensal</h2>
                  </div>

                  {/* Receitas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
                    <MetricCard
                      title="Ganho Bruto"
                      value={formatCurrency(ganhoBruto)}
                      icon={TrendingUp}
                      delay={85}
                      variant="success"
                    />
                  </div>

                  {/* Custos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                      title="Custo Equipe Comercial"
                      value={formatCurrency(custoEquipeComercial)}
                      icon={Users}
                      delay={75}
                      variant="warning"
                    />
                    <MetricCard
                      title="Marketing"
                      value={formatCurrency(marketingCost)}
                      icon={Megaphone}
                      delay={85}
                      variant="warning"
                    />
                    <MetricCard
                      title="Custos Operacionais"
                      value={formatCurrency(operationalCost)}
                      icon={Briefcase}
                      delay={95}
                      variant="warning"
                    />
                    <MetricCard
                      title="Imposto Estimado (12%)"
                      value={formatCurrency(impostoEstimado)}
                      icon={Receipt}
                      delay={105}
                      variant="warning"
                    />
                  </div>

                  {/* Totais e Métricas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                      title="Custo Total"
                      value={formatCurrency(totalCost)}
                      icon={Wallet}
                      delay={115}
                      variant="danger"
                    />
                    <MetricCard
                      title="Ticket Médio"
                      value={formatCurrency(ticketMedio)}
                      icon={Target}
                      delay={120}
                      variant="info"
                    />
                    <MetricCard
                      title="Resultado Parcial"
                      value={formatCurrency(resultadoParcial)}
                      icon={TrendingUp}
                      delay={125}
                      variant={resultadoParcial >= 0 ? "success" : "danger"}
                    />
                    <MetricCard
                      title="Resultado Final"
                      value={formatCurrency(resultado)}
                      icon={CircleDollarSign}
                      delay={130}
                      variant={resultado >= 0 ? "success" : "danger"}
                    />
                  </div>

                  {/* EBITDA */}
                  <EBITDACard
                    receita={totalComissaoTotal}
                    custoOperacional={(dashboardTotals?.totalComissao || 0) + totalSalaries + marketingCost + operationalCost}
                  />
                </div>

                {/* ACOMPANHAMENTO POR QUINZENA */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento por Quinzena</h2>
                  </div>
                  
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                      title="1ª Quinzena - Comissão Total"
                      value={formatCurrency(primeiraQuinzenaComissaoTotal)}
                      icon={Calendar}
                      delay={175}
                      variant="warning"
                    />
                    <MetricCard
                      title="1ª Quinzena - Ganho Bruto"
                      value={formatCurrency(primeiraQuinzena)}
                      icon={Calendar}
                      delay={185}
                      variant={primeiraQuinzena >= 0 ? "success" : "danger"}
                    />
                    <MetricCard
                      title="2ª Quinzena - Comissão Total"
                      value={formatCurrency(segundaQuinzenaComissaoTotal)}
                      icon={Calendar}
                      delay={195}
                      variant="warning"
                    />
                    <MetricCard
                      title="2ª Quinzena - Ganho Bruto"
                      value={formatCurrency(segundaQuinzena)}
                      icon={Calendar}
                      delay={200}
                      variant={segundaQuinzena >= 0 ? "success" : "danger"}
                    />
                  </div>
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


                {/* Gráficos - Vendedor, Produto, Fornecedor */}
                <SalesChart salesReps={dashboardFilteredSalesReps} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProductChart salesReps={dashboardFilteredSalesReps} />
                  <SupplierChart salesReps={dashboardFilteredSalesReps} />
                </div>

                {/* Tendência do Mês */}
                <div className="grid grid-cols-1 gap-6">
                  <RevenueForecastChart salesReps={dashboardFilteredSalesReps} currentMonth={dashboardMonth} monthlyGoal={monthlyGoal} />
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
            {/* Sub-navigation Comercial */}
            <div className="flex items-center gap-2">
              <Button
                variant={comercialView === 'equipe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComercialView('equipe')}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Equipe
              </Button>
              <Button
                variant={comercialView === 'crm' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComercialView('crm')}
                className="gap-2"
              >
                <Kanban className="h-4 w-4" />
                CRM
              </Button>
            </div>

            {comercialView === 'crm' ? (
              <CRMTab salespeople={salesReps.map(r => r.name)} />
            ) : hasData ? (
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
                      onGoalsSaved={fetchMonthlyGoal}
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
                <SalesRepTable 
                  salesReps={filteredSalesReps} 
                  onGeneratePDF={handleGeneratePDF}
                  selectedMonth={parseInt(selectedMonth.split('/')[0])}
                  selectedYear={parseInt(selectedMonth.split('/')[1])}
                  getSalary={getSalary}
                />
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

          <TabsContent value="nfse" className="space-y-6">
            <NFSeTab />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Index;
