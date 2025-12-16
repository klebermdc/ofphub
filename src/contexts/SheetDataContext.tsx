import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSheetSettings } from "@/hooks/useSheetSettings";

interface SheetDataContextType {
  salesReps: SalesRep[];
  totals: SalesTotals | null;
  isLoading: boolean;
  hasData: boolean;
  refreshData: (url?: string) => Promise<void>;
  sheetUrl: string;
}

const SheetDataContext = createContext<SheetDataContextType | undefined>(undefined);

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
    if (!targetUrl) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-google-sheet', {
        body: { sheetUrl: targetUrl }
      });

      if (error) throw error;

      if (data.success && data.data) {
        const reps: SalesRep[] = data.data.map((item: any, index: number) => ({
          id: `rep-${index}`,
          name: item.vendedor,
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

        const calculatedTotals: SalesTotals = {
          totalVendas: reps.reduce((sum, r) => sum + r.sales, 0),
          totalComissao: reps.reduce((sum, r) => sum + r.commission, 0),
          totalNegocios: reps.reduce((sum, r) => sum + r.deals, 0),
          taxaMedia: reps.length > 0 ? reps.reduce((sum, r) => sum + r.rate, 0) / reps.length : 0,
          vendedoresAtivos: reps.length
        };

        setSalesReps(reps);
        setTotals(calculatedTotals);
        setHasData(true);
        setSheetUrl(targetUrl);

        // Save URL if it's new
        if (url && url !== savedUrl) {
          await saveUrl(url);
        }

        // Show success toast
        const totalOrders = reps.reduce((sum, r) => sum + r.deals, 0);
        toast({
          title: "Dados atualizados",
          description: `${totalOrders} pedidos carregados e sincronizados ao banco.`,
        });
      }
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      toast({
        title: "Erro ao carregar planilha",
        description: "Não foi possível carregar os dados da planilha.",
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
