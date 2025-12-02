import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { toast } from "@/hooks/use-toast";

export interface CommissionReport {
  id: string;
  period_month: number;
  period_year: number;
  total_vendas: number;
  total_comissao: number;
  total_negocios: number;
  vendedores_ativos: number;
  created_at: string;
}

export function useCommissionHistory() {
  const [reports, setReports] = useState<CommissionReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('commission_reports')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
    setIsLoading(false);
  };

  const saveReport = async (
    month: number,
    year: number,
    salesReps: SalesRep[],
    totals: SalesTotals
  ) => {
    try {
      // Check if report already exists
      const { data: existing } = await supabase
        .from('commission_reports')
        .select('id')
        .eq('period_month', month)
        .eq('period_year', year)
        .single();

      if (existing) {
        // Delete existing report (cascade will delete related data)
        await supabase
          .from('commission_reports')
          .delete()
          .eq('id', existing.id);
      }

      // Insert new report
      const { data: report, error: reportError } = await supabase
        .from('commission_reports')
        .insert({
          period_month: month,
          period_year: year,
          total_vendas: totals.totalVendas,
          total_comissao: totals.totalComissao,
          total_negocios: totals.totalNegocios,
          vendedores_ativos: totals.vendedoresAtivos
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Insert salespeople
      for (const rep of salesReps) {
        const { data: salesperson, error: spError } = await supabase
          .from('commission_salespeople')
          .insert({
            report_id: report.id,
            name: rep.name,
            total_vendas: rep.sales,
            total_comissao: rep.commission,
            total_negocios: rep.deals
          })
          .select()
          .single();

        if (spError) throw spError;

        // Insert orders for this salesperson
        if (rep.orders && rep.orders.length > 0) {
          const orders = rep.orders.map(order => ({
            salesperson_id: salesperson.id,
            cliente: order.cliente,
            data: order.data,
            pedido: order.pedido,
            venda: order.venda,
            fornecedor: order.fornecedor,
            produto: order.produto,
            comissao: order.comissao,
            comissao_total: order.comissaoTotal,
            porcentagem_vendedor: order.porcentagemVendedor,
            comissao_vendedor: order.comissaoVendedor
          }));

          const { error: ordersError } = await supabase
            .from('commission_orders')
            .insert(orders);

          if (ordersError) throw ordersError;
        }
      }

      toast({
        title: "Relatório salvo!",
        description: `Dados de ${getMonthName(month)}/${year} salvos com sucesso.`,
      });

      fetchReports();
      return true;
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o relatório.",
        variant: "destructive",
      });
      return false;
    }
  };

  const loadReport = async (reportId: string): Promise<{ salesReps: SalesRep[], totals: SalesTotals } | null> => {
    try {
      // Get report
      const { data: report, error: reportError } = await supabase
        .from('commission_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Get salespeople
      const { data: salespeople, error: spError } = await supabase
        .from('commission_salespeople')
        .select('*')
        .eq('report_id', reportId);

      if (spError) throw spError;

      // Get orders for all salespeople
      const salesReps: SalesRep[] = [];
      
      for (const sp of salespeople || []) {
        const { data: orders, error: ordersError } = await supabase
          .from('commission_orders')
          .select('*')
          .eq('salesperson_id', sp.id);

        if (ordersError) throw ordersError;

        salesReps.push({
          id: sp.id,
          name: sp.name,
          sales: Number(sp.total_vendas),
          commission: Number(sp.total_comissao),
          deals: sp.total_negocios,
          rate: 0,
          orders: (orders || []).map(o => ({
            cliente: o.cliente || '',
            data: o.data || '',
            pedido: o.pedido || '',
            venda: Number(o.venda),
            fornecedor: o.fornecedor || '',
            produto: o.produto || '',
            comissao: Number(o.comissao),
            comissaoTotal: Number(o.comissao_total),
            porcentagemVendedor: Number(o.porcentagem_vendedor),
            comissaoVendedor: Number(o.comissao_vendedor)
          }))
        });
      }

      const totals: SalesTotals = {
        totalVendas: Number(report.total_vendas),
        totalComissao: Number(report.total_comissao),
        totalNegocios: report.total_negocios,
        taxaMedia: 0,
        vendedoresAtivos: report.vendedores_ativos
      };

      return { salesReps, totals };
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar o relatório.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('commission_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido do histórico.",
      });

      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o relatório.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    isLoading,
    saveReport,
    loadReport,
    deleteReport,
    refreshReports: fetchReports
  };
}

export function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || '';
}
