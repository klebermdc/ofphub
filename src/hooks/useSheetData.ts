import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SalesRep, SalesTotals } from '@/types/sales';

interface SheetData {
  salesReps: SalesRep[];
  totals: SalesTotals;
  message: string;
}

/**
 * Hook to fetch and parse Google Sheet data using React Query
 */
export function useSheetData(userId: string | undefined) {
  const queryClient = useQueryClient();

  const parseSheetMutation = useMutation({
    mutationFn: async (url: string): Promise<SheetData> => {
      const { data, error } = await supabase.functions.invoke('parse-google-sheet', {
        body: { sheetUrl: url }
      });

      if (error) {
        throw new Error(error.message || 'Não foi possível processar a planilha.');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const transformedData: SalesRep[] = data.data.map((item: any, index: number) => ({
        id: String(index + 1),
        name: item.vendedor,
        sales: item.vendas,
        commission: item.comissao,
        deals: item.negocios,
        rate: item.taxa,
        orders: item.pedidos || []
      }));

      return {
        salesReps: transformedData,
        totals: data.totals,
        message: data.message
      };
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Planilha importada!',
        description: data.message,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['salesGoals'] });
    },
  });

  return {
    parseSheet: parseSheetMutation.mutateAsync,
    isParsing: parseSheetMutation.isPending,
    sheetData: parseSheetMutation.data,
  };
}

interface SalesGoal {
  goal_vendas: number;
  goal_comissao: number;
  goal_negocios: number;
  goal_resultado: number;
}

/**
 * Hook to fetch sales goals using React Query
 */
export function useSalesGoals(userId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['salesGoals', userId, month, year],
    queryFn: async (): Promise<SalesGoal | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('sales_goals')
        .select('goal_vendas, goal_comissao, goal_negocios, goal_resultado')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching goals:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
