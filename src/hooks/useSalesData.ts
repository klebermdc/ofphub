import { useMemo } from 'react';
import { SalesRep, OrderDetail } from '@/types/sales';
import { getMonthKeyFromDate, isFirstFortnight, isSecondFortnight } from '@/utils/dateUtils';

interface FilteredSalesData {
  filteredSalesReps: SalesRep[];
  availableMonths: string[];
}

/**
 * Hook to filter sales representatives by selected month
 */
// Helper to check if an order is a "guiamento" product (excluded from reports)
const isGuiamento = (produto?: string) =>
  !!produto && produto.toLowerCase().includes('guiamento');

export function useFilteredSalesReps(
  salesReps: SalesRep[],
  selectedMonth: string,
  dateRange?: { from?: Date; to?: Date }
): FilteredSalesData {
  // Extract available months from orders data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    salesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (order.data) {
          const monthKey = getMonthKeyFromDate(order.data);
          if (monthKey) {
            months.add(monthKey);
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

  // Filter sales reps by selected month (guiamento stays in base data, excluded only for commission % calc)
  const filteredSalesReps = useMemo(() => {
    const baseReps = selectedMonth === 'all'
      ? salesReps.map(rep => ({ ...rep, orders: rep.orders || [] }))
      : salesReps.map(rep => {
          const filtered = (rep.orders || []).filter(order => {
            if (!order.data) return false;
            return getMonthKeyFromDate(order.data) === selectedMonth;
          });
          return { ...rep, orders: filtered };
        });

    return baseReps.map(rep => {
      const orders = rep.orders;
      const sales = orders.reduce((sum, o) => sum + o.venda, 0);
      const commission = orders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
      return {
        ...rep,
        orders,
        sales,
        commission,
        deals: orders.length,
        rate: orders.length > 0
          ? orders.reduce((sum, o) => sum + o.porcentagemVendedor, 0) / orders.length
          : 0,
      };
    }).filter(rep => rep.orders.length > 0);
  }, [salesReps, selectedMonth]);

  return { filteredSalesReps, availableMonths };
}

interface DashboardMetrics {
  totalVendas: number;
  totalComissao: number;
  totalNegocios: number;
  taxaMedia: number;
  vendedoresAtivos: number;
  totalComissaoTotal: number;
  ganhoBruto: number;
  ticketMedio: number;
  topFornecedores: number;
  topProdutos: number;
  primeiraQuinzena: {
    comissaoTotal: number;
    comissaoVendedor: number;
    ganhoBruto: number;
  };
  segundaQuinzena: {
    comissaoTotal: number;
    comissaoVendedor: number;
    ganhoBruto: number;
  };
}

/**
 * Hook to calculate dashboard metrics from filtered sales data
 */
export function useDashboardMetrics(filteredSalesReps: SalesRep[]): DashboardMetrics {
  return useMemo(() => {
    const totalVendas = filteredSalesReps.reduce((sum, r) => sum + r.sales, 0);
    const totalComissao = filteredSalesReps.reduce((sum, r) => sum + r.commission, 0);
    const totalNegocios = filteredSalesReps.reduce((sum, r) => sum + r.deals, 0);
    const vendedoresAtivos = filteredSalesReps.length;

    const ticketMedio = totalNegocios > 0 ? totalVendas / totalNegocios : 0;

    // Calculate Comissão Total (from comissaoTotal column)
    const totalComissaoTotal = filteredSalesReps.reduce(
      (sum, rep) => sum + (rep.orders?.reduce((s, o) => s + (o.comissaoTotal || 0), 0) || 0), 
      0
    );

    // Taxa média: exclude guiamento products for accurate commission rate
    const nonGuiamentoOrders = filteredSalesReps.flatMap(r => 
      (r.orders || []).filter(o => !isGuiamento(o.produto))
    );
    const vendasSemGuiamento = nonGuiamentoOrders.reduce((s, o) => s + o.venda, 0);
    const comissaoTotalSemGuiamento = nonGuiamentoOrders.reduce((s, o) => s + (o.comissaoTotal || 0), 0);
    const taxaMedia = vendasSemGuiamento > 0 
      ? (comissaoTotalSemGuiamento / vendasSemGuiamento) * 100
      : 0;

    const ganhoBruto = totalComissaoTotal - totalComissao;

    const topFornecedores = [...new Set(
      filteredSalesReps.flatMap(r => r.orders?.map(o => o.fornecedor) || [])
    )].filter(Boolean).length;

    const topProdutos = [...new Set(
      filteredSalesReps.flatMap(r => r.orders?.map(o => o.produto) || [])
    )].filter(Boolean).length;

    // Calculate results by fortnight
    let primeira = { comissaoTotal: 0, comissaoVendedor: 0 };
    let segunda = { comissaoTotal: 0, comissaoVendedor: 0 };
    
    filteredSalesReps.forEach(rep => {
      rep.orders?.forEach(order => {
        if (order.data) {
          if (isFirstFortnight(order.data)) {
            primeira.comissaoTotal += order.comissaoTotal || 0;
            primeira.comissaoVendedor += order.comissaoVendedor || 0;
          } else if (isSecondFortnight(order.data)) {
            segunda.comissaoTotal += order.comissaoTotal || 0;
            segunda.comissaoVendedor += order.comissaoVendedor || 0;
          }
        }
      });
    });

    return {
      totalVendas,
      totalComissao,
      totalNegocios,
      taxaMedia,
      vendedoresAtivos,
      totalComissaoTotal,
      ganhoBruto,
      ticketMedio,
      topFornecedores,
      topProdutos,
      primeiraQuinzena: {
        comissaoTotal: primeira.comissaoTotal,
        comissaoVendedor: primeira.comissaoVendedor,
        ganhoBruto: primeira.comissaoTotal - primeira.comissaoVendedor,
      },
      segundaQuinzena: {
        comissaoTotal: segunda.comissaoTotal,
        comissaoVendedor: segunda.comissaoVendedor,
        ganhoBruto: segunda.comissaoTotal - segunda.comissaoVendedor,
      },
    };
  }, [filteredSalesReps]);
}
