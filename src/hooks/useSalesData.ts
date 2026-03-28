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
export function useFilteredSalesReps(
  salesReps: SalesRep[],
  selectedMonth: string
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

  // Filter sales reps by selected month
  const filteredSalesReps = useMemo(() => {
    if (selectedMonth === 'all') return salesReps;
    
    return salesReps.map(rep => {
      const filteredOrders = rep.orders?.filter(order => {
        if (!order.data) return false;
        const orderMonthKey = getMonthKeyFromDate(order.data);
        return orderMonthKey === selectedMonth;
      }) || [];
      
      const sales = filteredOrders.reduce((sum, o) => sum + o.venda, 0);
      const commission = filteredOrders.reduce((sum, o) => sum + o.comissaoVendedor, 0);
      
      return {
        ...rep,
        orders: filteredOrders,
        sales,
        commission,
        deals: filteredOrders.length,
        rate: filteredOrders.length > 0 
          ? filteredOrders.reduce((sum, o) => sum + o.porcentagemVendedor, 0) / filteredOrders.length 
          : 0
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

    // Taxa média: comissão total / faturamento total * 100
    const taxaMedia = totalVendas > 0 
      ? (totalComissaoTotal / totalVendas) * 100
      : 0;

    const ganhoBruto = totalComissaoTotal - totalComissao;

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
