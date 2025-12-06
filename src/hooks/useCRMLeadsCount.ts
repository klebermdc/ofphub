import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCRMLeadsCount() {
  const [isLoading, setIsLoading] = useState(false);

  const getLeadsCountForMonth = useCallback(async (month: number, year: number): Promise<number> => {
    setIsLoading(true);
    try {
      // Build date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12 
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const { count, error } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .gte('notion_created_at', startDate)
        .lt('notion_created_at', endDate);

      if (error) {
        console.error('Error fetching CRM leads count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching CRM leads count:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getLeadsCountForMonth, isLoading };
}
