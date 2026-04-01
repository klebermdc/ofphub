import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals, OrderDetail } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { resolveSalespersonName } from "@/config/salaries";

interface SheetDataContextType {
  salesReps: SalesRep[];
  totals: SalesTotals | null;
  isLoading: boolean;
  hasData: boolean;
  refreshData: () => Promise<void>;
}

const SheetDataContext = createContext<SheetDataContextType | undefined>(undefined);

function groupOrdersIntoReps(rows: any[]): SalesRep[] {
  const repMap = new Map<string, SalesRep>();

  rows.forEach((row) => {
    const name = resolveSalespersonName(row.vendedor);
    const order: OrderDetail = {
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
  });

  const reps = Array.from(repMap.values());
  reps.forEach((r) => {
    r.rate = r.orders.length > 0
      ? r.orders.reduce((s, o) => s + o.porcentagemVendedor, 0) / r.orders.length
      : 0;
  });

  return reps;
}

function calculateTotals(reps: SalesRep[]): SalesTotals {
  return {
    totalVendas: reps.reduce((sum, r) => sum + r.sales, 0),
    totalComissao: reps.reduce((sum, r) => sum + r.commission, 0),
    totalNegocios: reps.reduce((sum, r) => sum + r.deals, 0),
    taxaMedia: reps.length > 0 ? reps.reduce((sum, r) => sum + r.rate, 0) / reps.length : 0,
    vendedoresAtivos: reps.length,
  };
}

export function SheetDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const refreshData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const pageSize = 1000;
      const allRows: any[] = [];

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
      }

      const reps = groupOrdersIntoReps(allRows);
      const calculatedTotals = calculateTotals(reps);

      setSalesReps(reps);
      setTotals(calculatedTotals);
      setHasData(reps.length > 0);
    } catch (error) {
      console.error('Error fetching orders from DB:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-load on mount
  useEffect(() => {
    if (user && !hasData && !isLoading) {
      refreshData();
    }
  }, [user, hasData, isLoading, refreshData]);

  return (
    <SheetDataContext.Provider value={{
      salesReps,
      totals,
      isLoading,
      hasData,
      refreshData,
    }}>
      {children}
    </SheetDataContext.Provider>
  );
}

export function useSheetData() {
  const context = useContext(SheetDataContext);
  if (context === undefined) {
    throw new Error('useSheetData must be used within a SheetDataProvider');
  }
  return context;
}
