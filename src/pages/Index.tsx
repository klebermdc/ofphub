import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Target, Package, Building2, FileSpreadsheet } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { SalesRepTable } from "@/components/SalesRepTable";
import { HistoryPanel } from "@/components/HistoryPanel";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { useCommissionHistory, getMonthName } from "@/hooks/useCommissionHistory";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

  const { reports, isLoading: historyLoading, saveReport, loadReport, deleteReport } = useCommissionHistory(user?.id);

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

  // Calculate additional KPIs
  const ticketMedio = totals && totals.totalNegocios > 0 
    ? totals.totalVendas / totals.totalNegocios 
    : 0;
  
  const topFornecedores = salesReps.length > 0 
    ? [...new Set(salesReps.flatMap(r => r.orders?.map(o => o.fornecedor) || []))].filter(f => f).length
    : 0;

  const topProdutos = salesReps.length > 0
    ? [...new Set(salesReps.flatMap(r => r.orders?.map(o => o.produto) || []))].filter(p => p).length
    : 0;

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
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveReportDialog onSave={handleSaveReport} disabled={!hasData} />
                  </div>
                </div>

                {/* KPIs Principais */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <MetricCard
                    title="Faturamento"
                    value={totals ? formatCurrency(totals.totalVendas) : "R$ 0"}
                    icon={DollarSign}
                    delay={0}
                  />
                  <MetricCard
                    title="Comissões"
                    value={totals ? formatCurrency(totals.totalComissao) : "R$ 0"}
                    icon={TrendingUp}
                    delay={50}
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value={formatCurrency(ticketMedio)}
                    icon={Target}
                    delay={100}
                  />
                  <MetricCard
                    title="Vendedores"
                    value={totals ? String(totals.vendedoresAtivos) : "0"}
                    icon={Users}
                    delay={150}
                  />
                  <MetricCard
                    title="Pedidos"
                    value={totals ? String(totals.totalNegocios) : "0"}
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

                {/* Gráfico e Histórico */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <SalesChart salesReps={salesReps} />
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
              </>
            )}
          </TabsContent>

          <TabsContent value="vendedores" className="space-y-6">
            {hasData ? (
              <SalesRepTable salesReps={salesReps} onGeneratePDF={handleGeneratePDF} />
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
