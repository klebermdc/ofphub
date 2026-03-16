import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals, OrderDetail } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSheetSettings } from "@/hooks/useSheetSettings";
import { resolveSalespersonName } from "@/config/salaries";

interface SheetDataContextType {
  salesReps: SalesRep[];
  totals: SalesTotals | null;
  isLoading: boolean;
  hasData: boolean;
  refreshData: (url?: string) => Promise<void>;
  sheetUrl: string;
}

const SheetDataContext = createContext<SheetDataContextType | undefined>(undefined);

/**
 * Fetch manual orders from the DB (orders without sheet_row_index).
 * These are orders added directly in the system, not imported from the sheet.
 */
async function fetchManualOrders(userId: string): Promise<{ vendedor: string; order: OrderDetail }[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .is('sheet_row_index', null);

  if (error) {
    console.error('Error fetching manual orders:', error);
    return [];
  }

  return (data || []).map((row) => ({
    vendedor: row.vendedor,
    order: {
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
    },
  }));
}

/**
 * Merge manual (DB-only) orders into salesReps that came from the sheet.
 * If a vendedor doesn't exist in sheet data, a new SalesRep entry is created.
 */
function mergeManualOrders(
  sheetReps: SalesRep[],
  manualOrders: { vendedor: string; order: OrderDetail }[]
): SalesRep[] {
  if (manualOrders.length === 0) return sheetReps;

  // Clone to avoid mutating original
  const repMap = new Map<string, SalesRep>();
  sheetReps.forEach((r) => repMap.set(r.name, { ...r, orders: [...r.orders] }));

  for (const { vendedor, order } of manualOrders) {
    const name = resolveSalespersonName(vendedor);
    const existing = repMap.get(name);

    if (existing) {
      // Avoid duplicates by pedido number (if present)
      const isDuplicate = order.pedido && existing.orders.some((o) => o.pedido === order.pedido);
      if (!isDuplicate) {
        existing.orders.push(order);
        existing.sales += order.venda;
        existing.commission += order.comissaoVendedor;
        existing.deals += 1;
      }
    } else {
      // New vendedor not in sheet
      repMap.set(name, {
        id: `rep-manual-${repMap.size}`,
        name,
        sales: order.venda,
        commission: order.comissaoVendedor,
        deals: 1,
        rate: order.porcentagemVendedor,
        orders: [order],
      });
    }
  }

  return Array.from(repMap.values());
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
  const { savedUrl, saveUrl } = useSheetSettings(user?.id);
  
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");

  const refreshData = async (url?: string) => {
    const targetUrl = url || savedUrl || sheetUrl;
    if (!targetUrl && !user) return;

    setIsLoading(true);
    try {
      let sheetReps: SalesRep[] = [];

      // 1) Load sheet data if URL available
      if (targetUrl) {
        const { data, error } = await supabase.functions.invoke('parse-google-sheet', {
          body: { sheetUrl: targetUrl }
        });

        if (error) throw error;

        if (data.success && data.data) {
          sheetReps = data.data.map((item: any, index: number) => ({
            id: `rep-${index}`,
            name: resolveSalespersonName(item.vendedor),
            sales: item.vendas,
            commission: item.comissao,
            deals: item.negocios,
            rate: item.taxa,
            orders: item.pedidos?.map((p: any) => ({
              cliente: p.cliente,
              data: p.data,
              pedido: p.pedido,
              venda: p.venda,
              fornecedor: p.fornecedor,
              produto: p.produto,
              comissao: p.comissao,
              comissaoTotal: p.comissaoTotal,
              porcentagemVendedor: p.porcentagemVendedor,
              comissaoVendedor: p.comissaoVendedor
            })) || []
          }));

          setSheetUrl(targetUrl);

          if (url && url !== savedUrl) {
            await saveUrl(url);
          }
        }
      }

      // 2) Fetch manual orders from DB and merge
      if (user) {
        const manualOrders = await fetchManualOrders(user.id);
        sheetReps = mergeManualOrders(sheetReps, manualOrders);
        if (manualOrders.length > 0) {
          console.log(`Merged ${manualOrders.length} manual orders from DB`);
        }
      }

      // 3) Recalculate totals with merged data
      const calculatedTotals = calculateTotals(sheetReps);

      setSalesReps(sheetReps);
      setTotals(calculatedTotals);
      setHasData(sheetReps.length > 0);

      const totalOrders = sheetReps.reduce((sum, r) => sum + r.deals, 0);
      toast({
        title: "Dados atualizados",
        description: `${totalOrders} pedidos carregados.`,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load saved sheet URL on mount
  useEffect(() => {
    if (savedUrl && !hasData && !isLoading) {
      refreshData(savedUrl);
    }
  }, [savedUrl]);

  return (
    <SheetDataContext.Provider value={{
      salesReps,
      totals,
      isLoading,
      hasData,
      refreshData,
      sheetUrl
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
