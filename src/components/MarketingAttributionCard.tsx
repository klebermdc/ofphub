import { useMemo, useState, useEffect } from "react";
import { GitBranch, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { parseOrderDate } from "@/utils/dateUtils";
import { formatCurrency } from "@/utils/formatters";

interface DailyStat {
  date: string;
  meta_spend: number;
  google_spend: number;
  meta_campaigns: any[];
  google_campaigns: any[];
  leads_total: number;
  leads_by_campaign?: Record<string, number>;
  [key: string]: any;
}

interface MarketingAttributionCardProps {
  stats: DailyStat[];
  selectedMonth: string; // MM/YYYY
}

const COLORS = [
  "hsl(270, 70%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(25, 95%, 53%)",
  "hsl(340, 82%, 52%)",
  "hsl(48, 96%, 53%)",
  "hsl(192, 91%, 36%)",
  "hsl(280, 65%, 60%)",
];

const chartConfig = {
  vendas: { label: "Vendas Estimadas", color: "hsl(var(--primary))" },
};

export function MarketingAttributionCard({ stats, selectedMonth }: MarketingAttributionCardProps) {
  const [orders, setOrders] = useState<any[]>([]);

  // Fetch orders for the month
  useEffect(() => {
    const fetchOrders = async () => {
      const [monthStr, yearStr] = selectedMonth.split("/");
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);

      const { data } = await supabase.from("orders").select("data, venda, comissao_total");
      if (!data) return;

      const filtered = data.filter((o) => {
        const parsed = parseOrderDate(o.data);
        if (!parsed) return false;
        return parsed.month === month && parsed.year === year;
      });
      setOrders(filtered);
    };
    fetchOrders();
  }, [selectedMonth]);

  const attribution = useMemo(() => {
    // Aggregate leads by campaign
    const campaignLeads: Record<string, number> = {};
    const campaignSpend: Record<string, number> = {};

    for (const day of stats) {
      // leads_by_campaign
      if (day.leads_by_campaign && typeof day.leads_by_campaign === "object") {
        for (const [campaign, leads] of Object.entries(day.leads_by_campaign)) {
          if (typeof leads === "number") {
            campaignLeads[campaign] = (campaignLeads[campaign] || 0) + leads;
          }
        }
      }
      // meta_campaigns spend
      if (Array.isArray(day.meta_campaigns)) {
        for (const c of day.meta_campaigns) {
          const name = c.name || c.campaign_name || "Meta Outros";
          campaignSpend[name] = (campaignSpend[name] || 0) + (c.spend || 0);
        }
      }
      // google_campaigns spend
      if (Array.isArray(day.google_campaigns)) {
        for (const c of day.google_campaigns) {
          const name = c.name || c.campaign_name || "Google Outros";
          campaignSpend[name] = (campaignSpend[name] || 0) + (c.spend || c.cost || 0);
        }
      }
    }

    const totalLeads = Object.values(campaignLeads).reduce((s, v) => s + v, 0);
    const totalOrders = orders.length;
    const totalVendas = orders.reduce((s, o) => s + (o.venda || 0), 0);
    const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

    // Build campaign rows
    const allCampaigns = new Set([...Object.keys(campaignLeads), ...Object.keys(campaignSpend)]);
    const rows = Array.from(allCampaigns).map((name) => {
      const leads = campaignLeads[name] || 0;
      const spend = campaignSpend[name] || 0;
      const shareOfLeads = totalLeads > 0 ? leads / totalLeads : 0;
      const estimatedSales = shareOfLeads * totalVendas;
      const roi = spend > 0 ? estimatedSales / spend : 0;

      return { name, leads, spend, estimatedSales, roi, shareOfLeads };
    }).filter((r) => r.leads > 0 || r.spend > 0)
      .sort((a, b) => b.estimatedSales - a.estimatedSales);

    return { rows, totalLeads, totalOrders, totalVendas, conversionRate };
  }, [stats, orders]);

  if (attribution.rows.length === 0) {
    return null;
  }

  const donutData = attribution.rows
    .filter((r) => r.estimatedSales > 0)
    .map((r) => ({
      name: r.name.length > 25 ? r.name.slice(0, 25) + "…" : r.name,
      value: r.estimatedSales,
    }));

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Atribuição Marketing → Vendas</h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Leads Mês</p>
          <p className="text-lg font-bold">{attribution.totalLeads}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Pedidos Mês</p>
          <p className="text-lg font-bold">{attribution.totalOrders}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Vendas Totais</p>
          <p className="text-lg font-bold">{formatCurrency(attribution.totalVendas)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Conversão Geral</p>
          <p className="text-lg font-bold">{attribution.conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Vendas Est.</TableHead>
                <TableHead className="text-right">ROI Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attribution.rows.slice(0, 10).map((row, i) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[200px]">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{row.leads}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.spend)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.estimatedSales)}</TableCell>
                  <TableCell className="text-right font-bold">
                    <span className={row.roi >= 5 ? "text-emerald-400" : row.roi >= 2 ? "text-yellow-400" : "text-destructive"}>
                      {row.roi.toFixed(1)}x
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Donut */}
        <div className="flex items-center justify-center">
          {donutData.length > 0 && (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Estimativa proporcional — sem rastreamento individual lead→venda
      </p>
    </div>
  );
}
