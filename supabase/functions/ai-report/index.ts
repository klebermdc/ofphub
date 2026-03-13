import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mapOrder(o: any) {
  return {
    pedido: o.pedido, cliente: o.cliente, vendedor: o.vendedor,
    venda: Number(o.venda), comissao: Number(o.comissao),
    comissao_total: Number(o.comissao_total), comissao_vendedor: Number(o.comissao_vendedor),
    fornecedor: o.fornecedor, produto: o.produto, data: o.data,
    status: o.status, enviado: o.enviado,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH ===
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('REPORT_API_KEY');
    if (!expectedToken) return jsonResponse({ error: 'REPORT_API_KEY not configured' }, 500);
    if (!authHeader?.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== expectedToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // === PARSE PARAMS ===
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');
    const vendedorParam = url.searchParams.get('vendedor');
    const statusParam = url.searchParams.get('status');
    const limitParam = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '1000') || 1000, 1), 1000);

    const hasDateFilters = dateParam || (startDateParam && endDateParam);
    const hasMonthFilter = monthParam || yearParam;
    const hasSpecificFilters = hasDateFilters || hasMonthFilter || vendedorParam || statusParam;

    // === FILTERED MODE ===
    if (hasSpecificFilters) {
      let query = supabase.from('orders').select('*');

      // Date range or single date
      let rangeStart: string | null = null;
      let rangeEnd: string | null = null;

      if (dateParam) {
        rangeStart = dateParam;
        rangeEnd = dateParam;
        query = query.eq('data', dateParam);
      } else if (startDateParam && endDateParam) {
        rangeStart = startDateParam;
        rangeEnd = endDateParam;
        query = query.gte('data', startDateParam).lte('data', endDateParam);
      } else if (hasMonthFilter) {
        // Month/year filter — compute ISO date range for the month
        const now = new Date();
        const m = parseInt(monthParam || String(now.getMonth() + 1));
        const y = parseInt(yearParam || String(now.getFullYear()));
        const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0); // last day of month
        const lastDayStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        rangeStart = firstDay;
        rangeEnd = lastDayStr;
        query = query.gte('data', firstDay).lte('data', lastDayStr);
      }

      // Vendedor filter
      if (vendedorParam) {
        query = query.ilike('vendedor', `%${vendedorParam}%`);
      }

      // Status filter
      if (statusParam) {
        query = query.ilike('status', `%${statusParam}%`);
      }

      const { data: orders, error } = await query.order('data', { ascending: false }).limit(limitParam);
      if (error) throw error;

      const ordersList = orders || [];
      const totalRevenue = ordersList.reduce((sum, o) => sum + Number(o.venda || 0), 0);
      const totalCommission = ordersList.reduce((sum, o) => sum + Number(o.comissao_total || 0), 0);

      // Build month_summary if month filter is active
      let monthSummary = null;
      if (hasMonthFilter || (rangeStart && rangeEnd)) {
        const dateMap: Record<string, { orders: number; revenue: number }> = {};
        ordersList.forEach(o => {
          const d = o.data;
          if (!dateMap[d]) dateMap[d] = { orders: 0, revenue: 0 };
          dateMap[d].orders += 1;
          dateMap[d].revenue += Number(o.venda || 0);
        });

        const ordersByDate = Object.entries(dateMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const daysWithData = ordersByDate.length;

        monthSummary = {
          total_revenue: totalRevenue,
          total_commission: totalCommission,
          total_orders: ordersList.length,
          days_with_data: daysWithData,
          daily_average: daysWithData > 0 ? Math.round((totalRevenue / daysWithData) * 100) / 100 : 0,
          orders_by_date: ordersByDate,
        };
      }

      // Build seller breakdown
      const sellerMap: Record<string, { vendas: number; pedidos: number; comissao: number }> = {};
      ordersList.forEach(o => {
        const name = o.vendedor;
        if (!sellerMap[name]) sellerMap[name] = { vendas: 0, pedidos: 0, comissao: 0 };
        sellerMap[name].vendas += Number(o.venda || 0);
        sellerMap[name].pedidos += 1;
        sellerMap[name].comissao += Number(o.comissao_vendedor || 0);
      });
      const sellers = Object.entries(sellerMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.vendas - a.vendas);

      const response: any = {
        filters_applied: {
          ...(dateParam && { date: dateParam }),
          ...(startDateParam && endDateParam && { start_date: startDateParam, end_date: endDateParam }),
          ...(hasMonthFilter && { month: parseInt(monthParam || '0'), year: parseInt(yearParam || '0') }),
          ...(vendedorParam && { vendedor: vendedorParam }),
          ...(statusParam && { status: statusParam }),
        },
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        total_orders: ordersList.length,
        ...(rangeStart && rangeEnd && { date_range: { start: rangeStart, end: rangeEnd } }),
        ...(monthSummary && { month_summary: monthSummary }),
        sellers_breakdown: sellers,
        orders: ordersList.map(mapOrder),
      };

      return jsonResponse(response);
    }

    // === DEFAULT MODE: full KPI report ===
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      ordersResult, recentOrders24hResult, recentOrders7dResult,
      accountingResult, recentAccountingResult, salesGoalsResult,
      marketingResult, crmLeadsResult, salespeopleResult, commissionsResult,
    ] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('orders').select('*').gte('created_at', oneDayAgo).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
      supabase.from('accounting_entries').select('*'),
      supabase.from('accounting_entries').select('*').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
      supabase.from('sales_goals').select('*').eq('period_month', currentMonth).eq('period_year', currentYear),
      supabase.from('marketing_costs').select('*').eq('period_month', currentMonth).eq('period_year', currentYear),
      supabase.from('crm_leads').select('*'),
      supabase.from('commission_reports').select('*, commission_salespeople(*)').order('created_at', { ascending: false }).limit(1),
      supabase.from('commission_payments').select('*').eq('period_month', currentMonth).eq('period_year', currentYear),
    ]);

    const orders = ordersResult.data || [];
    const recentOrders24h = recentOrders24hResult.data || [];
    const recentOrders7d = recentOrders7dResult.data || [];
    const accounting = accountingResult.data || [];
    const recentAccounting = recentAccountingResult.data || [];
    const salesGoals = salesGoalsResult.data || [];
    const marketing = marketingResult.data || [];
    const crmLeads = crmLeadsResult.data || [];
    const latestReport = salespeopleResult.data?.[0] || null;
    const commissionPayments = commissionsResult.data || [];

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.venda || 0), 0);
    const totalCommission = orders.reduce((sum, o) => sum + Number(o.comissao_total || 0), 0);
    const totalOrders = orders.length;
    const uniqueClients = new Set(orders.map(o => o.cliente?.toLowerCase()).filter(Boolean)).size;
    const revenue24h = recentOrders24h.reduce((sum, o) => sum + Number(o.venda || 0), 0);
    const revenue7d = recentOrders7d.reduce((sum, o) => sum + Number(o.venda || 0), 0);
    const totalReceived = accounting.reduce((sum, e) => sum + Number(e.valor_recebido || 0), 0);
    const totalSent = accounting.reduce((sum, e) => sum + Number(e.valor_enviado || 0), 0);

    const leadsByStage: Record<string, number> = {};
    const totalLeadValue = crmLeads.reduce((sum, l) => {
      leadsByStage[l.stage] = (leadsByStage[l.stage] || 0) + 1;
      return sum + Number(l.estimated_value || 0);
    }, 0);

    const marketingTotal = marketing.reduce((sum, m) => {
      return sum + Number(m.google_ads || 0) + Number(m.meta_ads || 0) + Number(m.other_marketing || 0) + Number(m.software || 0) + Number(m.telefonia || 0) + Number(m.imposto || 0);
    }, 0);
    const totalLeads = marketing.reduce((sum, m) => sum + Number(m.leads || 0), 0);

    const sellerMap: Record<string, { vendas: number; pedidos: number; comissao: number }> = {};
    orders.forEach(o => {
      const name = o.vendedor;
      if (!sellerMap[name]) sellerMap[name] = { vendas: 0, pedidos: 0, comissao: 0 };
      sellerMap[name].vendas += Number(o.venda || 0);
      sellerMap[name].pedidos += 1;
      sellerMap[name].comissao += Number(o.comissao_vendedor || 0);
    });
    const topSellers = Object.entries(sellerMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.vendas - a.vendas).slice(0, 10);

    const clientMap: Record<string, { total: number; pedidos: number }> = {};
    orders.forEach(o => {
      const name = o.cliente || 'Desconhecido';
      if (!clientMap[name]) clientMap[name] = { total: 0, pedidos: 0 };
      clientMap[name].total += Number(o.venda || 0);
      clientMap[name].pedidos += 1;
    });
    const topClients = Object.entries(clientMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 10);

    const supplierMap: Record<string, { total: number; pedidos: number }> = {};
    orders.forEach(o => {
      const name = o.fornecedor || 'Desconhecido';
      if (!supplierMap[name]) supplierMap[name] = { total: 0, pedidos: 0 };
      supplierMap[name].total += Number(o.venda || 0);
      supplierMap[name].pedidos += 1;
    });
    const topSuppliers = Object.entries(supplierMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 10);

    return jsonResponse({
      generated_at: now.toISOString(),
      period: { month: currentMonth, year: currentYear },
      financial_summary: {
        total_revenue: totalRevenue, total_commission: totalCommission,
        total_orders: totalOrders, unique_clients: uniqueClients,
        accounting_received: totalReceived, accounting_sent: totalSent,
        accounting_balance: totalReceived - totalSent,
      },
      recent_activity: {
        last_24h: {
          orders_count: recentOrders24h.length, revenue: revenue24h,
          orders: recentOrders24h.slice(0, 20).map(mapOrder),
        },
        last_7d: { orders_count: recentOrders7d.length, revenue: revenue7d },
        recent_accounting: recentAccounting.slice(0, 20).map(e => ({
          data: e.data, movimentacao: e.movimentacao, cliente: e.cliente,
          valor_recebido: Number(e.valor_recebido), valor_enviado: Number(e.valor_enviado),
          banco: e.banco, plano_de_contas: e.plano_de_contas,
        })),
      },
      sales_goals: salesGoals.map(g => ({
        goal_vendas: Number(g.goal_vendas), goal_comissao: Number(g.goal_comissao),
        goal_negocios: g.goal_negocios, goal_resultado: Number(g.goal_resultado),
      })),
      crm_pipeline: { total_leads: crmLeads.length, total_estimated_value: totalLeadValue, leads_by_stage: leadsByStage },
      marketing: {
        total_cost: marketingTotal, total_leads_generated: totalLeads,
        cost_per_lead: totalLeads > 0 ? marketingTotal / totalLeads : 0,
        details: marketing.map(m => ({
          google_ads: Number(m.google_ads), meta_ads: Number(m.meta_ads),
          other: Number(m.other_marketing), software: Number(m.software),
          telefonia: Number(m.telefonia), imposto: Number(m.imposto), leads: m.leads,
        })),
      },
      commission_payments: commissionPayments.map(p => ({ salesperson: p.salesperson_name, paid: p.paid, paid_at: p.paid_at })),
      rankings: { top_sellers: topSellers, top_clients: topClients, top_suppliers: topSuppliers },
      latest_commission_report: latestReport ? {
        period: `${latestReport.period_month}/${latestReport.period_year}`,
        total_vendas: Number(latestReport.total_vendas), total_comissao: Number(latestReport.total_comissao),
        total_negocios: latestReport.total_negocios, vendedores_ativos: latestReport.vendedores_ativos,
        salespeople: (latestReport.commission_salespeople || []).map((s: any) => ({
          name: s.name, total_vendas: Number(s.total_vendas),
          total_comissao: Number(s.total_comissao), total_negocios: s.total_negocios,
        })),
      } : null,
    });
  } catch (error) {
    console.error('Error in ai-report:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
