import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('REPORT_API_KEY');

    if (!expectedToken) {
      return new Response(JSON.stringify({ error: 'REPORT_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authHeader?.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse query params
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const limitParam = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500') || 500, 1), 1000);

    const hasDateFilters = dateParam || (startDateParam && endDateParam);

    // === FILTERED MODE: return focused order data ===
    if (hasDateFilters) {
      let query = supabase.from('orders').select('*');

      let rangeStart: string;
      let rangeEnd: string;

      if (dateParam) {
        // Single date filter — match orders by "data" field (text, format varies)
        rangeStart = dateParam;
        rangeEnd = dateParam;
        query = query.eq('data', dateParam);
      } else {
        rangeStart = startDateParam!;
        rangeEnd = endDateParam!;
        query = query.gte('data', startDateParam!).lte('data', endDateParam!);
      }

      const { data: orders, error } = await query.order('data', { ascending: false }).limit(limitParam);

      if (error) throw error;

      const ordersList = orders || [];
      const totalRevenue = ordersList.reduce((sum, o) => sum + Number(o.venda || 0), 0);

      return new Response(JSON.stringify({
        orders: ordersList.map(o => ({
          pedido: o.pedido,
          cliente: o.cliente,
          vendedor: o.vendedor,
          venda: Number(o.venda),
          comissao: Number(o.comissao),
          comissao_total: Number(o.comissao_total),
          comissao_vendedor: Number(o.comissao_vendedor),
          fornecedor: o.fornecedor,
          produto: o.produto,
          data: o.data,
          status: o.status,
          enviado: o.enviado,
        })),
        total_revenue: totalRevenue,
        total_orders: ordersList.length,
        date_range: { start: rangeStart, end: rangeEnd },
      }, null, 2), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === DEFAULT MODE: full KPI report (existing behavior) ===
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      ordersResult,
      recentOrders24hResult,
      recentOrders7dResult,
      accountingResult,
      recentAccountingResult,
      salesGoalsResult,
      marketingResult,
      crmLeadsResult,
      salespeopleResult,
      commissionsResult,
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
    const topSellers = Object.entries(sellerMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);

    const clientMap: Record<string, { total: number; pedidos: number }> = {};
    orders.forEach(o => {
      const name = o.cliente || 'Desconhecido';
      if (!clientMap[name]) clientMap[name] = { total: 0, pedidos: 0 };
      clientMap[name].total += Number(o.venda || 0);
      clientMap[name].pedidos += 1;
    });
    const topClients = Object.entries(clientMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const supplierMap: Record<string, { total: number; pedidos: number }> = {};
    orders.forEach(o => {
      const name = o.fornecedor || 'Desconhecido';
      if (!supplierMap[name]) supplierMap[name] = { total: 0, pedidos: 0 };
      supplierMap[name].total += Number(o.venda || 0);
      supplierMap[name].pedidos += 1;
    });
    const topSuppliers = Object.entries(supplierMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const report = {
      generated_at: now.toISOString(),
      period: { month: currentMonth, year: currentYear },
      financial_summary: {
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        total_orders: totalOrders,
        unique_clients: uniqueClients,
        accounting_received: totalReceived,
        accounting_sent: totalSent,
        accounting_balance: totalReceived - totalSent,
      },
      recent_activity: {
        last_24h: {
          orders_count: recentOrders24h.length,
          revenue: revenue24h,
          orders: recentOrders24h.slice(0, 20).map(o => ({
            pedido: o.pedido, cliente: o.cliente, vendedor: o.vendedor,
            venda: Number(o.venda), fornecedor: o.fornecedor, produto: o.produto,
            data: o.data, status: o.status,
          })),
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
      crm_pipeline: {
        total_leads: crmLeads.length, total_estimated_value: totalLeadValue, leads_by_stage: leadsByStage,
      },
      marketing: {
        total_cost: marketingTotal, total_leads_generated: totalLeads,
        cost_per_lead: totalLeads > 0 ? marketingTotal / totalLeads : 0,
        details: marketing.map(m => ({
          google_ads: Number(m.google_ads), meta_ads: Number(m.meta_ads),
          other: Number(m.other_marketing), software: Number(m.software),
          telefonia: Number(m.telefonia), imposto: Number(m.imposto), leads: m.leads,
        })),
      },
      commission_payments: commissionPayments.map(p => ({
        salesperson: p.salesperson_name, paid: p.paid, paid_at: p.paid_at,
      })),
      rankings: { top_sellers: topSellers, top_clients: topClients, top_suppliers: topSuppliers },
      latest_commission_report: latestReport ? {
        period: `${latestReport.period_month}/${latestReport.period_year}`,
        total_vendas: Number(latestReport.total_vendas),
        total_comissao: Number(latestReport.total_comissao),
        total_negocios: latestReport.total_negocios,
        vendedores_ativos: latestReport.vendedores_ativos,
        salespeople: (latestReport.commission_salespeople || []).map((s: any) => ({
          name: s.name, total_vendas: Number(s.total_vendas),
          total_comissao: Number(s.total_comissao), total_negocios: s.total_negocios,
        })),
      } : null,
    };

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-report:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
