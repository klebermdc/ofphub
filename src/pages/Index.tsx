import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Target, Package, Building2, FileSpreadsheet, Calendar, Wallet } from "lucide-react";
import { getSalary } from "@/config/salaries";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { ProductChart } from "@/components/ProductChart";
import { SupplierChart } from "@/components/SupplierChart";
import { SalesRepTable } from "@/components/SalesRepTable";
import { HistoryPanel } from "@/components/HistoryPanel";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { SalesGoalsPanel } from "@/components/SalesGoalsPanel";
import { SalesRanking } from "@/components/SalesRanking";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { useCommissionHistory, getMonthName } from "@/hooks/useCommissionHistory";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [dashboardMonth, setDashboardMonth] = useState<string>('all');

  const { reports, isLoading: historyLoading, saveReport, loadReport, deleteReport } = useCommissionHistory(user?.id);

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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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

  // Calculate total cost (commissions + fixed salaries)
  const totalSalaries = dashboardFilteredSalesReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
  const totalCost = (dashboardTotals?.totalComissao || 0) + totalSalaries;

  // Get current selected month/year for goals
  const currentGoalMonth = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[0]) 
    : new Date().getMonth() + 1;
  const currentGoalYear = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[1]) 
    : new Date().getFullYear();

  if (loading) {
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
      
      <DashboardHeader />
      
      <main className="container mx-auto px-6 py-6 relative">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
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
                <div>
                  <HistoryPanel
                    reports={reports}
                    isLoading={historyLoading}
                    onLoad={handleLoadReport}
                    onDelete={handleDeleteReport}
                    currentReportId={currentReportId}
                  />
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
                  <div className="flex items-center gap-2">
                    <SaveReportDialog onSave={handleSaveReport} disabled={!hasData} />
                  </div>
                </div>

                {/* KPIs Principais - Financeiros */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    title="Custo Total"
                    value={formatCurrency(totalCost)}
                    icon={Wallet}
                    delay={100}
                    variant="danger"
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value={formatCurrency(ticketMedio)}
                    icon={Target}
                    delay={125}
                    variant="info"
                  />
                </div>

                {/* KPIs Secundários - Operacionais */}
                <div className="grid grid-cols-3 gap-4">
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
                    title="Fornecedores"
                    value={String(topFornecedores)}
                    icon={Building2}
                    delay={250}
                  />
                </div>

                {/* Gráficos - Vendedor, Produto, Fornecedor */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SalesChart salesReps={dashboardFilteredSalesReps} />
                  <ProductChart salesReps={dashboardFilteredSalesReps} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SupplierChart salesReps={dashboardFilteredSalesReps} />
                  <SalesRanking salesReps={dashboardFilteredSalesReps} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SalesGoalsPanel
                    userId={user.id}
                    month={currentGoalMonth}
                    year={currentGoalYear}
                    salesReps={dashboardFilteredSalesReps}
                    totalSales={dashboardTotals?.totalVendas || 0}
                  />
                  <HistoryPanel
                    reports={reports}
                    isLoading={historyLoading}
                    onLoad={handleLoadReport}
                    onDelete={handleDeleteReport}
                    currentReportId={currentReportId}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="vendedores" className="space-y-6">
            {hasData ? (
              <>
                <div className="flex items-center gap-3">
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

        </Tabs>
      </main>
    </div>
  );
};

export default Index;
