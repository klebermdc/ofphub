import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, DollarSign, TrendingUp, Calendar, LogOut, UserPlus, Target, User, Settings, Upload, FileText, Download, Trash2, File, Banknote, Percent, Users } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { useMarketingFiles } from "@/hooks/useMarketingFiles";
import { useLeadsData } from "@/hooks/useLeadsData";
import { MarketingCostsDialog } from "@/components/MarketingCostsDialog";
import { LeadsSheetDialog } from "@/components/LeadsSheetDialog";
import { LeadsBySourceChart } from "@/components/LeadsBySourceChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getMonthName } from "@/hooks/useCommissionHistory";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";
import { useSheetData } from "@/contexts/SheetDataContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const chartConfig = {
  investment: {
    label: "Investimento",
    color: "hsl(var(--warning))",
  },
  leads: {
    label: "Leads",
    color: "hsl(var(--info))",
  },
  google_ads: {
    label: "Google Ads",
    color: "hsl(217, 91%, 60%)",
  },
  meta_ads: {
    label: "Meta Ads",
    color: "hsl(270, 70%, 60%)",
  },
  other: {
    label: "Outros",
    color: "hsl(25, 95%, 53%)",
  },
  cpl: {
    label: "Custo por Lead",
    color: "hsl(var(--destructive))",
  },
  revenue: {
    label: "Faturamento",
    color: "hsl(var(--success))",
  },
};

const MarketingDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  
  const { salesReps, isLoading: sheetLoading } = useSheetData();
  const { costs, isLoading: costsLoading, saveCost, getCostForMonth } = useMarketingCosts(user?.id, true);
  const { files, isLoading: filesLoading, uploadFile, deleteFile, downloadFile } = useMarketingFiles(user?.id);
  const { leadsData, isLoading: leadsLoading, sheetUrl: leadsSheetUrl, fetchLeadsData, clearUrl: clearLeadsUrl } = useLeadsData();
  
  // Get current month in format MM/YYYY
  const getCurrentMonthKey = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };
  
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("NF Fornecedor");
  const [isUploading, setIsUploading] = useState(false);
  
  const fileCategories = [
    "NF Fornecedor",
    "NF Google",
    "NF Meta",
    "Comprovante",
    "Contrato",
    "Outro",
  ];

  // Redirect if not marketing
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'manager') {
        navigate("/");
      } else if (role === 'salesperson') {
        navigate("/vendedor");
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  // Extract available months from sales data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
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
    });
    costs.forEach(cost => {
      months.add(`${cost.period_month.toString().padStart(2, '0')}/${cost.period_year}`);
    });
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yB - yA || mB - mA;
    });
  }, [salesReps, costs]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear.toString());
    costs.forEach(cost => {
      years.add(cost.period_year.toString());
    });
    availableMonths.forEach(m => {
      const year = m.split('/')[1];
      years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [costs, availableMonths]);

  // Filter costs by year and month
  const filteredCosts = useMemo(() => {
    let filtered = costs.filter(cost => cost.period_year.toString() === selectedYear);
    if (selectedMonth !== 'all') {
      const [month] = selectedMonth.split('/');
      filtered = filtered.filter(cost => cost.period_month === parseInt(month));
    }
    return filtered.sort((a, b) => b.period_month - a.period_month);
  }, [costs, selectedYear, selectedMonth]);

  // Calculate revenue from sales
  const revenue = useMemo(() => {
    if (selectedMonth === 'all') {
      return salesReps.reduce((total, rep) => {
        const yearSales = rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return year === selectedYear;
        }).reduce((sum, o) => sum + o.venda, 0) || 0;
        return total + yearSales;
      }, 0);
    } else {
      return salesReps.reduce((total, rep) => {
        const monthSales = rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          const month = parts[1]?.padStart(2, '0');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return `${month}/${year}` === selectedMonth;
        }).reduce((sum, o) => sum + o.venda, 0) || 0;
        return total + monthSales;
      }, 0);
    }
  }, [salesReps, selectedYear, selectedMonth]);

  // Calculate orders count
  const ordersCount = useMemo(() => {
    if (selectedMonth === 'all') {
      return salesReps.reduce((total, rep) => {
        const count = rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return year === selectedYear;
        }).length || 0;
        return total + count;
      }, 0);
    } else {
      return salesReps.reduce((total, rep) => {
        const count = rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          const month = parts[1]?.padStart(2, '0');
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return `${month}/${year}` === selectedMonth;
        }).length || 0;
        return total + count;
      }, 0);
    }
  }, [salesReps, selectedYear, selectedMonth]);

  // Chart data
  const chartData = useMemo(() => {
    const yearCosts = costs.filter(cost => cost.period_year.toString() === selectedYear)
      .sort((a, b) => a.period_month - b.period_month);
    
    return yearCosts.map(cost => {
      const total = cost.google_ads + cost.meta_ads + cost.other_marketing;
      
      const monthRevenue = salesReps.reduce((sum, rep) => {
        const sales = rep.orders?.filter(order => {
          if (!order.data) return false;
          const parts = order.data.split('/');
          const month = parseInt(parts[1]);
          let year = parts[2] || '';
          if (year.length === 2) year = `20${year}`;
          return month === cost.period_month && year === cost.period_year.toString();
        }).reduce((s, o) => s + o.venda, 0) || 0;
        return sum + sales;
      }, 0);
      
      return {
        month: getMonthName(cost.period_month).substring(0, 3),
        fullMonth: getMonthName(cost.period_month),
        investment: total,
        leads: cost.leads,
        google_ads: cost.google_ads,
        meta_ads: cost.meta_ads,
        other: cost.other_marketing,
        cpl: cost.leads > 0 ? total / cost.leads : 0,
        revenue: monthRevenue,
      };
    });
  }, [costs, salesReps, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalGoogleAds = filteredCosts.reduce((sum, c) => sum + c.google_ads, 0);
    const totalMetaAds = filteredCosts.reduce((sum, c) => sum + c.meta_ads, 0);
    const totalOther = filteredCosts.reduce((sum, c) => sum + c.other_marketing, 0);
    const totalLeads = filteredCosts.reduce((sum, c) => sum + c.leads, 0);
    const totalInvestment = totalGoogleAds + totalMetaAds + totalOther;
    const costPerLead = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const conversionRate = totalLeads > 0 ? (ordersCount / totalLeads) * 100 : 0;
    const roi = totalInvestment > 0 ? ((revenue - totalInvestment) / totalInvestment) * 100 : 0;
    
    return { totalGoogleAds, totalMetaAds, totalOther, totalLeads, totalInvestment, costPerLead, conversionRate, roi };
  }, [filteredCosts, ordersCount, revenue]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    await uploadFile(file, uploadCategory);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const monthsForYear = availableMonths.filter(m => m.endsWith(`/${selectedYear}`));

  if (loading || roleLoading || costsLoading || filesLoading || sheetLoading || leadsLoading) {
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
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo-branco.png" 
              alt="Orlando Fast Pass" 
              className="h-10 w-auto"
            />
            <div className="hidden md:block">
              <h1 className="font-semibold text-lg">Hub de Gestão</h1>
              <p className="text-xs text-muted-foreground">Orlando Fast Pass</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden md:inline text-sm">
                    {user?.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.user_metadata?.full_name || 'Marketing'}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-6 relative space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth('all'); }}>
              <SelectTrigger className="w-[100px]">
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
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {monthsForYear.map(month => {
                  const [m] = month.split('/');
                  return (
                    <SelectItem key={month} value={month}>
                      {getMonthName(parseInt(m))}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <LeadsSheetDialog
              onConnect={fetchLeadsData}
              currentUrl={leadsSheetUrl}
              onDisconnect={clearLeadsUrl}
              isLoading={leadsLoading}
            />
            <MarketingCostsDialog 
              onSave={saveCost}
              getCostForMonth={getCostForMonth}
            />
          </div>
        </div>

        {/* Metrics - igual ao MarketingTab do gestor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Faturamento"
            value={formatCurrency(revenue)}
            icon={Banknote}
            variant="success"
          />
          <MetricCard
            title="Investimento"
            value={formatCurrency(totals.totalInvestment)}
            icon={DollarSign}
            variant="warning"
          />
          <MetricCard
            title="Leads"
            value={totals.totalLeads.toString()}
            icon={UserPlus}
            variant="info"
          />
          <MetricCard
            title="Taxa de Conversão"
            value={`${totals.conversionRate.toFixed(1)}%`}
            icon={Percent}
            variant={totals.conversionRate >= 10 ? "success" : "warning"}
          />
          <MetricCard
            title="Custo por Lead"
            value={formatCurrency(totals.costPerLead)}
            icon={Target}
            variant="default"
          />
          <MetricCard
            title="ROI Marketing"
            value={`${totals.roi.toFixed(1)}%`}
            icon={TrendingUp}
            variant={totals.roi >= 0 ? "success" : "danger"}
          />
        </div>

        {/* Charts Section */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investment Evolution Chart */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução do Investimento</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Area
                    type="monotone"
                    dataKey="investment"
                    stroke="hsl(var(--warning))"
                    fill="url(#investmentGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Leads Evolution Chart */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução de Leads</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="hsl(var(--info))"
                    fill="url(#leadsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Channel Breakdown Chart */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Investimento por Canal</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Bar dataKey="google_ads" stackId="a" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="meta_ads" stackId="a" fill="hsl(270, 70%, 60%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="other" stackId="a" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "hsl(217, 91%, 60%)" }}></div>
                  <span>Google Ads</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "hsl(270, 70%, 60%)" }}></div>
                  <span>Meta Ads</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "hsl(25, 95%, 53%)" }}></div>
                  <span>Outros</span>
                </div>
              </div>
            </div>

            {/* CPL Evolution Chart */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Custo por Lead (CPL)</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Line
                    type="monotone"
                    dataKey="cpl"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Channel Breakdown Cards */}
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

        {/* Leads by Source Section */}
        {leadsData && leadsData.sourceBreakdown.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-6">
              <Users className="h-5 w-5 text-info" />
              <h2 className="text-xl font-semibold">Leads por Canal</h2>
              <span className="text-sm text-muted-foreground">({leadsData.totals.total} total)</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Fonte</h3>
                <LeadsBySourceChart data={leadsData.sourceBreakdown} />
              </div>

              {/* Leads Breakdown Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: "hsl(217, 91%, 60%)" }}></div>
                    <span className="text-sm font-medium">Google Ads</span>
                  </div>
                  <p className="text-2xl font-bold">{leadsData.totals.googleAds}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leadsData.totals.total > 0 ? ((leadsData.totals.googleAds / leadsData.totals.total) * 100).toFixed(1) : 0}% dos leads
                  </p>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: "hsl(270, 70%, 60%)" }}></div>
                    <span className="text-sm font-medium">Meta Ads</span>
                  </div>
                  <p className="text-2xl font-bold">{leadsData.totals.metaAds}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leadsData.totals.total > 0 ? ((leadsData.totals.metaAds / leadsData.totals.total) * 100).toFixed(1) : 0}% dos leads
                  </p>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }}></div>
                    <span className="text-sm font-medium">Orgânico</span>
                  </div>
                  <p className="text-2xl font-bold">{leadsData.totals.organic}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leadsData.totals.total > 0 ? ((leadsData.totals.organic / leadsData.totals.total) * 100).toFixed(1) : 0}% dos leads
                  </p>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: "hsl(45, 93%, 47%)" }}></div>
                    <span className="text-sm font-medium">Direto</span>
                  </div>
                  <p className="text-2xl font-bold">{leadsData.totals.direct}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leadsData.totals.total > 0 ? ((leadsData.totals.direct / leadsData.totals.total) * 100).toFixed(1) : 0}% dos leads
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

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

        {/* File Upload Section */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Notas Fiscais de Fornecedores</h3>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {fileCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Enviando..." : "Upload de Arquivo"}
            </Button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum arquivo enviado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{file.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{file.category || '-'}</TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell>
                        {new Date(file.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadFile(file.file_path, file.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFile(file.id, file.file_path)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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

export default MarketingDashboard;
