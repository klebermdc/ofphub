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
  order_date?: string;
  order_number?: string;
  commission_amount?: number;
  commission_percentage?: number;
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
      
      setDiscounts((data || []).map((d: any) => ({
        id: d.id,
        salesperson_name: d.salesperson_name,
        amount: Number(d.amount),
        description: d.description || '',
        order_date: d.order_date || '',
        order_number: d.order_number || '',
        commission_amount: Number(d.commission_amount || 0),
        commission_percentage: Number(d.commission_percentage || 0),
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
              description: e.description || null,
              order_date: e.order_date || null,
              order_number: e.order_number || null,
              commission_amount: e.commission_amount || 0,
              commission_percentage: e.commission_percentage || 0,
            })) as any
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

  const commissionImpactOf = (d: Discount) =>
    (Number(d.amount) || 0) * ((Number(d.commission_percentage) || 0) / 100);

  const getDiscount = useCallback((salespersonName: string): number => {
    return findDiscounts(salespersonName).reduce((s, d) => s + commissionImpactOf(d), 0);
  }, [findDiscounts]);

  const getDiscountDescription = useCallback((salespersonName: string): string => {
    return findDiscounts(salespersonName).map(d => d.description).filter(Boolean).join(' | ');
  }, [findDiscounts]);

  const getDiscountItems = useCallback((salespersonName: string): Array<{ amount: number; description: string; order_date?: string; order_number?: string; commission_amount?: number; commission_percentage?: number }> => {
    return findDiscounts(salespersonName).map(d => ({
      amount: commissionImpactOf(d),
      description: d.description || '',
      order_date: d.order_date || '',
      order_number: d.order_number || '',
      commission_amount: d.amount || 0,
      commission_percentage: d.commission_percentage || 0,
    }));
  }, [findDiscounts]);

  const getTotalDiscounts = useCallback((): number => {
    return discounts.reduce((sum, d) => sum + commissionImpactOf(d), 0);
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
    getDiscountItems,
    getTotalDiscounts,
    refetch: fetchDiscounts
  };
}
