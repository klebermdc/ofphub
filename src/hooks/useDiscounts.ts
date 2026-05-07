import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { resolveSalespersonName } from '@/config/salaries';

export interface Discount {
  id?: string;
  salesperson_name: string;
  amount: number;
  description?: string;
}

export function useDiscounts(month: number, year: number) {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salesperson_discounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_month', month)
        .eq('period_year', year);

      if (error) throw error;
      
      setDiscounts((data || []).map(d => ({
        id: d.id,
        salesperson_name: d.salesperson_name,
        amount: Number(d.amount),
        description: d.description || ''
      })));
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, month, year]);

  const saveDiscounts = async (entries: Discount[], targetMonth?: number, targetYear?: number): Promise<boolean> => {
    if (!user) return false;
    const m = targetMonth ?? month;
    const y = targetYear ?? year;

    try {
      // Delete existing discounts for this month/year
      await supabase
        .from('salesperson_discounts')
        .delete()
        .eq('user_id', user.id)
        .eq('period_month', m)
        .eq('period_year', y);

      // Insert new discounts
      if (entries.length > 0) {
        const { error } = await supabase
          .from('salesperson_discounts')
          .insert(
            entries.map(e => ({
              user_id: user.id,
              salesperson_name: e.salesperson_name,
              period_month: m,
              period_year: y,
              amount: e.amount,
              description: e.description || null
            }))
          );

        if (error) throw error;
      }

      toast({
        title: "Descontos salvos",
        description: `Descontos de ${m}/${y} atualizados com sucesso.`,
      });

      fetchDiscounts();
      return true;
    } catch (error) {
      console.error('Error saving discounts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os descontos.",
        variant: "destructive",
      });
      return false;
    }
  };

  const findDiscounts = useCallback((salespersonName: string): Discount[] => {
    const resolved = resolveSalespersonName(salespersonName).trim().toLowerCase();
    return discounts.filter(d => {
      const dResolved = resolveSalespersonName(d.salesperson_name).trim().toLowerCase();
      return dResolved === resolved ||
             dResolved.includes(resolved) ||
             resolved.includes(dResolved);
    });
  }, [discounts]);

  const getDiscount = useCallback((salespersonName: string): number => {
    return findDiscounts(salespersonName).reduce((s, d) => s + (d.amount || 0), 0);
  }, [findDiscounts]);

  const getDiscountDescription = useCallback((salespersonName: string): string => {
    return findDiscounts(salespersonName).map(d => d.description).filter(Boolean).join(' | ');
  }, [findDiscounts]);

  const getDiscountItems = useCallback((salespersonName: string): Array<{ amount: number; description: string }> => {
    return findDiscounts(salespersonName).map(d => ({ amount: d.amount || 0, description: d.description || '' }));
  }, [findDiscounts]);

  const getTotalDiscounts = useCallback((): number => {
    return discounts.reduce((sum, d) => sum + d.amount, 0);
  }, [discounts]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  return {
    discounts,
    loading,
    saveDiscounts,
    getDiscount,
    getDiscountDescription,
    getTotalDiscounts,
    refetch: fetchDiscounts
  };
}
