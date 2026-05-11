import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileSpreadsheet, Users, Megaphone, Receipt, Kanban, Calendar, ClipboardList, TrendingUp, DollarSign } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { resolveSalespersonName, isExcludedName } from "@/config/salaries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";

import { useSalespersonSalaries } from "@/hooks/useSalespersonSalaries";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { useUserRole } from "@/hooks/useUserRole";

import { useFilteredSalesReps, useDashboardMetrics } from "@/hooks/useSalesData";
import { useSalesGoals } from "@/hooks/useSheetData";

import { useCostCalculation } from "@/hooks/useCostCalculation";
import { useDiscounts } from "@/hooks/useDiscounts";
import { useApiIntegrations } from "@/hooks/useApiIntegrations";
import { getCurrentMonthKey, getMonthName } from "@/utils/dateUtils";
import { 
  DashboardSkeleton, 
  TableSkeleton, 
  KanbanSkeleton,
  ChartSkeleton 
} from "@/components/ui/skeletons";

// Lazy loaded components
const SalesChart = lazy(() => import("@/components/SalesChart").then(m => ({ default: m.SalesChart })));
const ProductChart = lazy(() => import("@/components/ProductChart").then(m => ({ default: m.ProductChart })));
const SupplierChart = lazy(() => import("@/components/SupplierChart").then(m => ({ default: m.SupplierChart })));
const SupplierSalesBreakdown = lazy(() => import("@/components/SupplierSalesBreakdown").then(m => ({ default: m.SupplierSalesBreakdown })));
const SalesRepTable = lazy(() => import("@/components/SalesRepTable").then(m => ({ default: m.SalesRepTable })));
const GoalsManagementDialog = lazy(() => import("@/components/GoalsManagementDialog").then(m => ({ default: m.GoalsManagementDialog })));
const GoalsKPICard = lazy(() => import("@/components/GoalsKPICard").then(m => ({ default: m.GoalsKPICard })));
const SalesVelocityKPI = lazy(() => import("@/components/SalesVelocityKPI").then(m => ({ default: m.SalesVelocityKPI })));
const SalesRanking = lazy(() => import("@/components/SalesRanking").then(m => ({ default: m.SalesRanking })));
const SalaryManagementDialog = lazy(() => import("@/components/SalaryManagementDialog").then(m => ({ default: m.SalaryManagementDialog })));
const DiscountManagementDialog = lazy(() => import("@/components/DiscountManagementDialog").then(m => ({ default: m.DiscountManagementDialog })));
const RevenueForecastChart = lazy(() => import("@/components/RevenueForecastChart").then(m => ({ default: m.RevenueForecastChart })));
const RevenueWaterfallChart = lazy(() => import("@/components/RevenueWaterfallChart").then(m => ({ default: m.RevenueWaterfallChart })));
const SalespersonROI = lazy(() => import("@/components/SalespersonROI").then(m => ({ default: m.SalespersonROI })));
const SalespersonGoalChart = lazy(() => import("@/components/SalespersonGoalChart").then(m => ({ default: m.SalespersonGoalChart })));
const JustTravelAuditCard = lazy(() => import("@/components/JustTravelAuditCard").then(m => ({ default: m.JustTravelAuditCard })));
const SalespersonVelocityChart = lazy(() => import("@/components/SalespersonVelocityChart").then(m => ({ default: m.SalespersonVelocityChart })));
const DailySalesTracker = lazy(() => import("@/components/DailySalesTracker").then(m => ({ default: m.DailySalesTracker })));
const EBITDACard = lazy(() => import("@/components/EBITDACard").then(m => ({ default: m.EBITDACard })));
const ROASCard = lazy(() => import("@/components/ROASCard").then(m => ({ default: m.ROASCard })));
const SalesHealthIndicators = lazy(() => import("@/components/SalesHealthIndicators").then(m => ({ default: m.SalesHealthIndicators })));
const AccountingTab = lazy(() => import("@/components/AccountingTab").then(m => ({ default: m.AccountingTab })));
const MarketingTab = lazy(() => import("@/components/MarketingTab").then(m => ({ default: m.MarketingTab })));
const CRMTab = lazy(() => import("@/components/crm/CRMTab").then(m => ({ default: m.CRMTab })));

const DashboardMonthlyMetrics = lazy(() => import("@/components/dashboard/DashboardMonthlyMetrics").then(m => ({ default: m.DashboardMonthlyMetrics })));
const DashboardFortnightMetrics = lazy(() => import("@/components/dashboard/DashboardFortnightMetrics").then(m => ({ default: m.DashboardFortnightMetrics })));
const DailyOrdersList = lazy(() => import("@/components/dashboard/DailyOrdersList").then(m => ({ default: m.DailyOrdersList })));
const DashboardOperationalMetrics = lazy(() => import("@/components/dashboard/DashboardOperationalMetrics").then(m => ({ default: m.DashboardOperationalMetrics })));
const DashboardHeaderControls = lazy(() => import("@/components/dashboard/DashboardHeaderControls").then(m => ({ default: m.DashboardHeaderControls })));
const CostProjectionCard = lazy(() => import("@/components/dashboard/CostProjectionCard").then(m => ({ default: m.CostProjectionCard })));
const SalespersonROITable = lazy(() => import("@/components/SalespersonROITable").then(m => ({ default: m.SalespersonROITable })));
const WhatsAppStatusCard = lazy(() => import("@/components/WhatsAppStatusCard").then(m => ({ default: m.WhatsAppStatusCard })));
const WeeklyReportModal = lazy(() => import("@/components/WeeklyReportModal").then(m => ({ default: m.WeeklyReportModal })));
const GrowthDashboard = lazy(() => import("@/components/GrowthDashboard").then(m => ({ default: m.GrowthDashboard })));
const CostsTab = lazy(() => import("@/components/CostsTab").then(m => ({ default: m.CostsTab })));

// Data source: database-only (no Google Sheets dependency)
type OrderRow = Database['public']['Tables']['orders']['Row'];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'dashboard';
  
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [hasLoadedOnEntry, setHasLoadedOnEntry] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [dataSource] = useState<'sheet' | 'history'>('sheet');
  const [comercialView, setComercialView] = useState<'equipe' | 'crm'>('equipe');
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  
  // Month filters
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [dashboardMonth, setDashboardMonth] = useState<string>(getCurrentMonthKey());
  const [dashboardDateRange, setDashboardDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [dashboardFornecedor, setDashboardFornecedor] = useState<string>('all');

  // Hooks for data fetching
  const { salaries, saveSalaries, getSalary } = useSalespersonSalaries(user?.id);
  const { role, isLoading: roleLoading, assignManagerRole } = useUserRole(user?.id);
  const { 
    costs: marketingCosts, 
    saveCost: saveMarketingCost, 
    saveOperationalCosts, 
    getCostForMonth, 
    getTotalForMonth, 
    getOperationalCostsForMonth 
  } = useMarketingCosts(user?.id, role === 'marketing' || role === 'manager');

  // Filtered sales data
  const { filteredSalesReps: dashboardFilteredSalesReps, availableMonths } = useFilteredSalesReps(salesReps, dashboardMonth, dashboardDateRange, dashboardFornecedor);
  const { filteredSalesReps } = useFilteredSalesReps(salesReps, selectedMonth);
  const availableFornecedores = [...new Set(salesReps.flatMap(r => r.orders?.map(o => o.fornecedor).filter(Boolean) || []))].sort();
  const availableProdutos = [...new Set(salesReps.flatMap(r => r.orders?.map(o => o.produto).filter(Boolean) || []))].sort();
  const availableSalespeople = useMemo(
    () => {
      const map = new Map<string, string>();
      salesReps.forEach(r => {
        const name = resolveSalespersonName(r.name || '').trim();
        if (!name) return;
        if (isExcludedName(name)) return;
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, name);
      });
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [salesReps]
  );
  const hasDashboardDateRange = !!(dashboardDateRange.from || dashboardDateRange.to);

  // Dashboard metrics
  const metrics = useDashboardMetrics(dashboardFilteredSalesReps);

  // Goals
  const currentGoalMonth = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[0]) 
    : new Date().getMonth() + 1;
  const currentGoalYear = dashboardMonth !== 'all' 
    ? parseInt(dashboardMonth.split('/')[1]) 
    : new Date().getFullYear();

  const { data: goalsData, refetch: refetchGoals } = useSalesGoals(user?.id, currentGoalMonth, currentGoalYear);
  const monthlyGoal = goalsData?.goal_vendas || 0;

  // Discounts
  const { discounts, saveDiscounts, getDiscount, getDiscountDescription, getDiscountItems, getTotalDiscounts } = useDiscounts(currentGoalMonth, currentGoalYear);
  const { getAccountingIntegration } = useApiIntegrations(user?.id);

  // Costs
  const marketingCost = getTotalForMonth(currentGoalMonth, currentGoalYear);
  const operationalCost = getOperationalCostsForMonth(currentGoalMonth, currentGoalYear);

  // Real ad spend accumulated for the selected period (Meta + Google) from marketing_daily_stats
  const [realAdSpendToDate, setRealAdSpendToDate] = useState<number>(0);

  useEffect(() => {
    const fetchAdSpend = async () => {
      const startDate = `${currentGoalYear}-${String(currentGoalMonth).padStart(2, '0')}-01`;
      const now = new Date();
      const isCurrentMonth = currentGoalMonth === now.getMonth() + 1 && currentGoalYear === now.getFullYear();
      const endDay = isCurrentMonth ? now.getDate() : new Date(currentGoalYear, currentGoalMonth, 0).getDate();
      const endDate = `${currentGoalYear}-${String(currentGoalMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const { data } = await supabase
        .from('marketing_daily_stats')
        .select('meta_spend, google_spend')
        .gte('date', startDate)
        .lte('date', endDate);
      if (data) {
        setRealAdSpendToDate(data.reduce((sum, d) => sum + Number(d.meta_spend || 0) + Number(d.google_spend || 0), 0));
      } else {
        setRealAdSpendToDate(0);
      }
    };
    fetchAdSpend();
  }, [currentGoalMonth, currentGoalYear]);

  const costCalc = useCostCalculation({
    filteredSalesReps: dashboardFilteredSalesReps,
    totalComissao: metrics.totalComissao,
    totalComissaoTotal: metrics.totalComissaoTotal,
    ganhoBruto: metrics.ganhoBruto,
    marketingCost,
    operationalCost,
    getSalary,
    selectedMonth: dashboardMonth,
    totalDiscounts: getTotalDiscounts(),
    realAdSpendToDate,
  });

  // Leads from marketing_daily_stats (single source of truth)
  const [totalLeads, setTotalLeads] = useState<number>(0);

  useEffect(() => {
    const fetchLeads = async () => {
      const startDate = `${currentGoalYear}-${String(currentGoalMonth).padStart(2, '0')}-01`;
      const endDay = new Date(currentGoalYear, currentGoalMonth, 0).getDate();
      const endDate = `${currentGoalYear}-${String(currentGoalMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const { data } = await supabase
        .from('marketing_daily_stats')
        .select('leads_total')
        .gte('date', startDate)
        .lte('date', endDate);
      if (data) {
        setTotalLeads(data.reduce((sum, d) => sum + (Number(d.leads_total) || 0), 0));
      }
    };
    fetchLeads();
  }, [currentGoalMonth, currentGoalYear]);

  const conversionRate = totalLeads > 0 ? (metrics.totalNegocios / totalLeads) * 100 : 0;

  // Load orders from database on mount
  const loadOrdersFromDB = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const pageSize = 1000;
      const allRows: OrderRow[] = [];

      for (let offset = 0; ; offset += pageSize) {
        // Manager loads global data without user_id filter (per data visibility rule)
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (role !== 'manager') {
          query = query.eq('user_id', user.id);
        }
        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows.push(...data);

        if (data.length < pageSize) break;
      }

      // Group orders by vendedor
      const repMap = new Map<string, SalesRep>();
      allRows.forEach((row) => {
        const name = resolveSalespersonName(row.vendedor);
        const order = {
          id: row.id,
          cliente: row.cliente || '',
          emailCliente: row.email_cliente || undefined,
          data: row.data || '',
          pedido: row.pedido || '',
          venda: Number(row.venda) || 0,
          fornecedor: row.fornecedor || '',
          produto: row.produto || '',
          comissao: Number(row.comissao) || 0,
          comissaoTotal: Number(row.comissao_total) || 0,
          porcentagemVendedor: Number(row.porcentagem_vendedor) || 0,
          comissaoVendedor: Number(row.comissao_vendedor) || 0,
          status: row.status || undefined,
          created_at: row.created_at || '',
          guia: row.guia || '',
          comissaoGuia: Number(row.comissao_guia) || 0,
          isGuideEntry: false,
        };

        const existing = repMap.get(name);
        if (existing) {
          existing.orders.push(order);
          existing.sales += order.venda;
          existing.commission += order.comissaoVendedor;
          existing.deals += 1;
        } else {
          repMap.set(name, {
            id: `rep-${repMap.size}`,
            name,
            sales: order.venda,
            commission: order.comissaoVendedor,
            deals: 1,
            rate: order.porcentagemVendedor,
            orders: [order],
          });
        }

        // Add guia commission entry to guia's rep when guia != vendedor
        const guiaName = row.guia ? resolveSalespersonName(row.guia) : null;
        const comissaoGuia = Number(row.comissao_guia) || 0;
        if (guiaName && guiaName !== name && comissaoGuia > 0) {
          const guiaOrder = {
            id: `${row.id}-guia`,
            cliente: row.cliente || '',
            emailCliente: row.email_cliente || undefined,
            data: row.data || '',
            pedido: row.pedido ? `${row.pedido} (Guia)` : '(Guia)',
            venda: Number(row.venda) || 0,
            fornecedor: row.fornecedor || '',
            produto: `🧭 ${row.produto || 'Guiamento'}`,
            comissao: Number(row.comissao) || 0,
            comissaoTotal: comissaoGuia,
            porcentagemVendedor: 0,
            comissaoVendedor: comissaoGuia,
            status: row.status || undefined,
            created_at: row.created_at || '',
            guia: row.guia || '',
            comissaoGuia,
            isGuideEntry: true,
          };

          const existingGuia = repMap.get(guiaName);
          if (existingGuia) {
            existingGuia.orders.push(guiaOrder);
            existingGuia.commission += comissaoGuia;
            existingGuia.deals += 1;
          } else {
            repMap.set(guiaName, {
              id: `rep-${repMap.size}`,
              name: guiaName,
              sales: 0,
              commission: comissaoGuia,
              deals: 1,
              rate: 0,
              orders: [guiaOrder],
            });
          }
        }
      });

      const reps = Array.from(repMap.values());
      reps.forEach((r) => {
        r.rate = r.orders.length > 0
          ? r.orders.reduce((s, o) => s + o.porcentagemVendedor, 0) / r.orders.length
          : 0;
      });

      setSalesReps(reps);
      setTotals({
        totalVendas: reps.reduce((s, r) => s + r.sales, 0),
        totalComissao: reps.reduce((s, r) => s + r.commission, 0),
        totalNegocios: reps.reduce((s, r) => s + r.deals, 0),
        taxaMedia: reps.length > 0 ? reps.reduce((s, r) => s + r.rate, 0) / reps.length : 0,
        vendedoresAtivos: reps.length,
      });
      setHasData(reps.length > 0);
      // data loaded from DB
      refetchGoals();
    } catch (err) {
      console.error('Error loading orders from DB:', err);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar os pedidos do banco de dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, refetchGoals, role]);

  useEffect(() => {
    setHasLoadedOnEntry(false);
  }, [user?.id]);

  useEffect(() => {
    const runInitialLoad = async () => {
      if (!user || loading || roleLoading || role !== 'manager' || hasLoadedOnEntry) {
        return;
      }

      setHasLoadedOnEntry(true);
      await loadOrdersFromDB();
    };

    runInitialLoad();
  }, [
    user,
    loading,
    roleLoading,
    role,
    hasLoadedOnEntry,
    loadOrdersFromDB,
  ]);

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
          await assignManagerRole();
        }
      }
    };
    handleRoleCheck();
  }, [user, loading, role, roleLoading, navigate, assignManagerRole]);

  const refreshOrders = () => loadOrdersFromDB();

  const handleGeneratePDF = async (rep: SalesRep) => {
    toast({
      title: "Gerando PDF...",
      description: `Relatório de ${rep.name} será baixado em instantes.`,
    });

    try {
      await generateSalesRepPDF(rep, getSalary, getDiscount, getDiscountDescription, getDiscountItems);
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
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'var(--gradient-glow)' }}
        />
        
        <DashboardHeader availableSalespeople={availableSalespeople} />
        
        <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
          <Tabs defaultValue={initialTab} className="space-y-4 sm:space-y-6">
            <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2">Dashboard</TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-1 text-xs sm:text-sm py-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                Comercial
              </TabsTrigger>
              <TabsTrigger value="marketing" className="gap-1 text-xs sm:text-sm py-2">
                <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="custos" className="gap-1 text-xs sm:text-sm py-2 hidden sm:flex">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                Custos
              </TabsTrigger>
              <TabsTrigger value="crescimento" className="gap-1 text-xs sm:text-sm py-2 hidden sm:flex">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                Crescimento
              </TabsTrigger>
              <TabsTrigger value="contabilidade" className="gap-1 text-xs sm:text-sm py-2 hidden sm:flex">
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                Contabilidade
              </TabsTrigger>
            </TabsList>

            {/* Mobile additional tabs */}
            <div className="flex sm:hidden gap-2">
              <TabsList className="grid grid-cols-3 gap-1 w-full h-auto p-1">
                <TabsTrigger value="custos" className="gap-1 text-xs py-2">
                  <DollarSign className="h-3 w-3" />
                  Custos
                </TabsTrigger>
                <TabsTrigger value="crescimento" className="gap-1 text-xs py-2">
                  <TrendingUp className="h-3 w-3" />
                  Crescimento
                </TabsTrigger>
                <TabsTrigger value="contabilidade" className="gap-1 text-xs py-2">
                  <Receipt className="h-3 w-3" />
                  Contabilidade
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
              <ErrorBoundary>
                {!hasData && !isLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="lg:col-span-2">
                      <div className="glass rounded-xl p-4 sm:p-8 text-center">
                        <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
                        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Bem-vindo ao Hub de Gestão</h2>
                        <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                          Nenhum pedido encontrado. Adicione pedidos pelo botão "Todos os Pedidos".
                        </p>
                        <Button onClick={() => navigate('/pedidos')} className="gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Ir para Pedidos
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardHeaderControls
                      dataSource={dataSource}
                      dashboardMonth={dashboardMonth}
                      setDashboardMonth={setDashboardMonth}
                      availableMonths={availableMonths}
                      onRefresh={refreshOrders}
                      isLoading={isLoading}
                      onSaveOperationalCosts={saveOperationalCosts}
                      getCostForMonth={getCostForMonth}
                      userId={user?.id}
                      hasApiIntegration={!!getAccountingIntegration()}
                      onOpenWeeklyReport={() => setWeeklyReportOpen(true)}
                      dateRange={dashboardDateRange}
                      setDateRange={setDashboardDateRange}
                      selectedFornecedor={dashboardFornecedor}
                      setSelectedFornecedor={setDashboardFornecedor}
                      availableFornecedores={availableFornecedores}
                    />

                    <DailySalesTracker
                      salesReps={salesReps}
                      currentMonth={dashboardMonth !== 'all' ? dashboardMonth : getCurrentMonthKey()}
                      totalSalaries={costCalc.totalSalaries}
                      marketingCosts={marketingCost}
                      operationalCosts={operationalCost}
                    />

                    <DailyOrdersList
                      salesReps={hasDashboardDateRange || dashboardFornecedor !== 'all' ? dashboardFilteredSalesReps : salesReps}
                      currentMonth={hasDashboardDateRange || dashboardMonth === 'all' ? 'all' : dashboardMonth}
                      availableVendedores={availableSalespeople}
                      availableProdutos={availableProdutos}
                      availableFornecedores={availableFornecedores}
                      selectedFornecedor={dashboardFornecedor}
                      onOrderSuccess={refreshOrders}
                    />

                    <DashboardMonthlyMetrics
                      totalVendas={metrics.totalVendas}
                      totalComissaoTotal={metrics.totalComissaoTotal}
                      totalComissao={metrics.totalComissao}
                      ganhoBruto={metrics.ganhoBruto}
                      custoEquipeComercial={costCalc.custoEquipeComercial}
                      marketingCost={marketingCost}
                      operationalCost={operationalCost}
                      impostoEstimado={costCalc.impostoEstimado}
                      totalCost={costCalc.totalCost}
                      ticketMedio={metrics.ticketMedio}
                      resultadoParcial={costCalc.resultadoParcial}
                      resultado={costCalc.resultado}
                      taxaMedia={metrics.taxaMedia}
                    />

                    {dashboardMonth !== 'all' && (() => {
                      const [m, y] = dashboardMonth.split('/').map(Number);
                      const now = new Date();
                      const isCurrentMonth = now.getMonth() + 1 === m && now.getFullYear() === y;
                      const daysInMonth = new Date(y, m, 0).getDate();
                      const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
                      const totalCostSoFar = costCalc.totalCost;
                      const dailyAvg = daysElapsed > 0 ? totalCostSoFar / daysElapsed : 0;
                      const projected = dailyAvg * daysInMonth;
                      return (
                        <CostProjectionCard
                          totalCostSoFar={totalCostSoFar}
                          projectedTotalCost={projected}
                          dailyAvgCost={dailyAvg}
                          daysElapsed={daysElapsed}
                          daysInMonth={daysInMonth}
                        />
                      );
                    })()}

                    <EBITDACard
                      receita={metrics.totalComissaoTotal}
                      custoOperacional={metrics.totalComissao + costCalc.totalSalaries + marketingCost + operationalCost}
                    />

                    <ROASCard
                      salesReps={salesReps}
                      currentMonth={dashboardMonth !== 'all' ? dashboardMonth : getCurrentMonthKey()}
                    />

                    <SalesHealthIndicators
                      salesReps={salesReps}
                      currentMonth={dashboardMonth !== 'all' ? dashboardMonth : getCurrentMonthKey()}
                      monthlyGoal={monthlyGoal}
                    />

                    <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-xl" />}>
                      <SalespersonROITable salesReps={dashboardFilteredSalesReps} getSalary={getSalary} />
                    </Suspense>

                    <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-xl" />}>
                      <WhatsAppStatusCard />
                    </Suspense>

                    <DashboardFortnightMetrics
                      primeiraQuinzena={metrics.primeiraQuinzena}
                      segundaQuinzena={metrics.segundaQuinzena}
                    />

                    <DashboardOperationalMetrics
                      vendedoresAtivos={metrics.vendedoresAtivos}
                      totalNegocios={metrics.totalNegocios}
                      totalLeads={totalLeads}
                      conversionRate={conversionRate}
                    />

                    <Suspense fallback={<ChartSkeleton />}>
                      <SalesChart salesReps={dashboardFilteredSalesReps} />
                    </Suspense>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Suspense fallback={<ChartSkeleton />}>
                        <ProductChart salesReps={dashboardFilteredSalesReps} />
                      </Suspense>
                      <Suspense fallback={<ChartSkeleton />}>
                        <SupplierChart salesReps={dashboardFilteredSalesReps} />
                      </Suspense>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <Suspense fallback={<ChartSkeleton />}>
                        <RevenueForecastChart 
                          salesReps={dashboardFilteredSalesReps} 
                          currentMonth={dashboardMonth} 
                          monthlyGoal={monthlyGoal} 
                        />
                      </Suspense>
                      <Suspense fallback={<ChartSkeleton />}>
                        <RevenueWaterfallChart
                          salesReps={dashboardFilteredSalesReps}
                          currentMonth={dashboardMonth}
                        />
                      </Suspense>
                    </div>

                    <GoalsKPICard
                      userId={user.id}
                      month={currentGoalMonth}
                      year={currentGoalYear}
                      totalSales={metrics.totalVendas}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Suspense fallback={<ChartSkeleton />}>
                        <SalespersonGoalChart
                          userId={user.id}
                          month={currentGoalMonth}
                          year={currentGoalYear}
                          salesReps={dashboardFilteredSalesReps}
                        />
                      </Suspense>
                      <Suspense fallback={<ChartSkeleton />}>
                        <SalespersonVelocityChart
                          userId={user.id}
                          month={currentGoalMonth}
                          year={currentGoalYear}
                          salesReps={dashboardFilteredSalesReps}
                        />
                      </Suspense>
                    </div>

                    <SalesVelocityKPI
                      userId={user.id}
                      month={currentGoalMonth}
                      year={currentGoalYear}
                      totalSales={metrics.totalVendas}
                      currentComissaoTotal={metrics.totalComissaoTotal}
                      currentComissaoVendedor={metrics.totalComissao}
                      fixedCosts={costCalc.totalSalaries + marketingCost + operationalCost}
                    />
                  </Suspense>
                )}
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="vendedores" className="space-y-6">
              <ErrorBoundary>
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
                  <Suspense fallback={<KanbanSkeleton />}>
                    <CRMTab salespeople={availableSalespeople} />
                  </Suspense>
                ) : hasData ? (
                  <>
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
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Suspense fallback={null}>
                          <SalaryManagementDialog salaries={salaries} onSave={saveSalaries} />
                          <DiscountManagementDialog
                            salespeople={availableSalespeople}
                            month={currentGoalMonth}
                            year={currentGoalYear}
                          />
                          <GoalsManagementDialog
                            userId={user.id}
                            month={currentGoalMonth}
                            year={currentGoalYear}
                            salesReps={filteredSalesReps}
                            onGoalsSaved={() => refetchGoals()}
                          />
                        </Suspense>
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Suspense fallback={<ChartSkeleton />}>
                        <SalesRanking salesReps={filteredSalesReps} />
                      </Suspense>
                      <Suspense fallback={<ChartSkeleton />}>
                        <SalespersonROI salesReps={filteredSalesReps} getSalary={getSalary} />
                      </Suspense>
                    </div>

                    <Suspense fallback={<ChartSkeleton />}>
                      <SupplierSalesBreakdown salesReps={filteredSalesReps} />
                    </Suspense>

                    <Suspense fallback={<ChartSkeleton />}>
                      <JustTravelAuditCard />
                    </Suspense>

                    <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
                      <SalesRepTable 
                        salesReps={filteredSalesReps} 
                        onGeneratePDF={handleGeneratePDF}
                        selectedMonth={parseInt(selectedMonth.split('/')[0])}
                        selectedYear={parseInt(selectedMonth.split('/')[1])}
                        getSalary={getSalary}
                        getDiscount={getDiscount}
                        getDiscountDescription={getDiscountDescription}
                        getDiscountItems={getDiscountItems}
                      />
                    </Suspense>
                  </>
                ) : (
                  <div className="glass rounded-xl p-8 text-center">
                    <p className="text-muted-foreground">
                      Nenhum pedido encontrado. Adicione pedidos na página "Todos os Pedidos".
                    </p>
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<DashboardSkeleton />}>
                  <MarketingTab 
                    costs={marketingCosts}
                    onSave={saveMarketingCost}
                    getCostForMonth={getCostForMonth}
                    salesReps={salesReps}
                  />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="crescimento" className="space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<ChartSkeleton />}>
                  <GrowthDashboard />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="custos" className="space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<DashboardSkeleton />}>
                  <CostsTab userId={user?.id} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="contabilidade" className="space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
                  <AccountingTab userId={user?.id} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

          </Tabs>
        </main>

        <Suspense fallback={null}>
          <WeeklyReportModal
            salesReps={salesReps}
            currentMonth={dashboardMonth}
            open={weeklyReportOpen}
            onClose={() => setWeeklyReportOpen(false)}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
