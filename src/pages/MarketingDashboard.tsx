import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, DollarSign, TrendingUp, Calendar, LogOut, UserPlus, Percent, Target } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { MarketingCostsDialog } from "@/components/MarketingCostsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthName } from "@/hooks/useCommissionHistory";

interface MarketingCostData {
  id: string;
  period_month: number;
  period_year: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  leads: number;
  description: string | null;
}

const MarketingDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  
  const { costs, isLoading: costsLoading, saveCost, getCostForMonth, getTotalForMonth, getLeadsForMonth } = useMarketingCosts(user?.id, true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Redirect if not marketing
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'manager') {
        navigate("/");
      } else if (role === 'salesperson') {
        navigate("/vendedor");
      } else if (!role) {
        // No role assigned - show pending message
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  // Available years from costs data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear.toString());
    costs.forEach(cost => {
      years.add(cost.period_year.toString());
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [costs]);

  // Filter costs by year
  const filteredCosts = useMemo(() => {
    return costs.filter(cost => cost.period_year.toString() === selectedYear)
      .sort((a, b) => b.period_month - a.period_month);
  }, [costs, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalGoogleAds = filteredCosts.reduce((sum, c) => sum + c.google_ads, 0);
    const totalMetaAds = filteredCosts.reduce((sum, c) => sum + c.meta_ads, 0);
    const totalOther = filteredCosts.reduce((sum, c) => sum + c.other_marketing, 0);
    const totalLeads = filteredCosts.reduce((sum, c) => sum + c.leads, 0);
    const totalInvestment = totalGoogleAds + totalMetaAds + totalOther;
    const costPerLead = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    
    return { totalGoogleAds, totalMetaAds, totalOther, totalLeads, totalInvestment, costPerLead };
  }, [filteredCosts]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading || roleLoading || costsLoading) {
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
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
              <h1 className="text-xl font-bold">Marketing Dashboard</h1>
              <p className="text-sm text-muted-foreground">Custos e Leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MarketingCostsDialog 
              onSave={saveCost}
              getCostForMonth={getCostForMonth}
            />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-6 relative space-y-6">
        {/* Year Filter */}
        <div className="flex items-center gap-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Investimento Total"
            value={formatCurrency(totals.totalInvestment)}
            icon={DollarSign}
            variant="warning"
          />
          <MetricCard
            title="Total de Leads"
            value={totals.totalLeads.toString()}
            icon={UserPlus}
            variant="info"
          />
          <MetricCard
            title="Custo por Lead"
            value={formatCurrency(totals.costPerLead)}
            icon={Target}
            variant="default"
          />
          <MetricCard
            title="Google Ads"
            value={formatCurrency(totals.totalGoogleAds)}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* Channel Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Google Ads</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.totalGoogleAds)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalInvestment > 0 ? ((totals.totalGoogleAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium">Meta Ads</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.totalMetaAds)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalInvestment > 0 ? ((totals.totalMetaAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium">Outros</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.totalOther)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalInvestment > 0 ? ((totals.totalOther / totals.totalInvestment) * 100).toFixed(1) : 0}% do total
            </p>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Detalhamento Mensal - {selectedYear}</h3>
          
          {filteredCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum custo de marketing registrado para {selectedYear}.</p>
              <p className="text-sm mt-2">Clique em "Custos de Marketing" para adicionar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Google Ads</TableHead>
                    <TableHead className="text-right">Meta Ads</TableHead>
                    <TableHead className="text-right">Outros</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCosts.map((cost) => {
                    const monthTotal = cost.google_ads + cost.meta_ads + cost.other_marketing;
                    const cpl = cost.leads > 0 ? monthTotal / cost.leads : 0;
                    return (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">
                          {getMonthName(cost.period_month)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cost.google_ads)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cost.meta_ads)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cost.other_marketing)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(monthTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-info">
                          {cost.leads}
                        </TableCell>
                        <TableCell className="text-right font-mono text-warning">
                          {formatCurrency(cpl)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {cost.description || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totals.totalGoogleAds)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totals.totalMetaAds)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totals.totalOther)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totals.totalInvestment)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-info">
                      {totals.totalLeads}
                    </TableCell>
                    <TableCell className="text-right font-mono text-warning">
                      {formatCurrency(totals.costPerLead)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MarketingDashboard;
