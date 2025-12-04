import { useState, useMemo } from "react";
import { Megaphone, DollarSign, TrendingUp, Calendar, UserPlus, Target } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { MarketingCostsDialog } from "@/components/MarketingCostsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getMonthName } from "@/hooks/useCommissionHistory";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from "recharts";

interface MarketingCost {
  id: string;
  period_month: number;
  period_year: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  leads: number;
  description: string | null;
}

interface MarketingTabProps {
  costs: MarketingCost[];
  onSave: (month: number, year: number, googleAds: number, metaAds: number, otherMarketing: number, leads: number, description?: string) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => MarketingCost | undefined;
}

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
};

export function MarketingTab({ costs, onSave, getCostForMonth }: MarketingTabProps) {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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

  // Prepare chart data (sorted by month ascending for charts)
  const chartData = useMemo(() => {
    return filteredCosts
      .slice()
      .sort((a, b) => a.period_month - b.period_month)
      .map(cost => {
        const total = cost.google_ads + cost.meta_ads + cost.other_marketing;
        return {
          month: getMonthName(cost.period_month).substring(0, 3),
          fullMonth: getMonthName(cost.period_month),
          investment: total,
          leads: cost.leads,
          google_ads: cost.google_ads,
          meta_ads: cost.meta_ads,
          other: cost.other_marketing,
          cpl: cost.leads > 0 ? total / cost.leads : 0,
        };
      });
  }, [filteredCosts]);

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

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with filter and add button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
        <MarketingCostsDialog 
          onSave={onSave}
          getCostForMonth={getCostForMonth}
        />
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
                  activeDot={{ r: 6 }}
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
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(217, 91%, 60%)" }}></div>
            <span className="text-sm font-medium">Google Ads</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totals.totalGoogleAds)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.totalInvestment > 0 ? ((totals.totalGoogleAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(270, 70%, 60%)" }}></div>
            <span className="text-sm font-medium">Meta Ads</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totals.totalMetaAds)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.totalInvestment > 0 ? ((totals.totalMetaAds / totals.totalInvestment) * 100).toFixed(1) : 0}% do total
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(25, 95%, 53%)" }}></div>
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
    </div>
  );
}
