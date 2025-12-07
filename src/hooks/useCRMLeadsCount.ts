import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LeadsByMonth {
  month: number;
  year: number;
  total: number;
  bySource: { [key: string]: number };
  bySalesperson: { [key: string]: number };
}

interface CRMLeadsData {
  leads: Array<{
    id: string;
    name: string;
    salesperson_name: string | null;
    product: string | null;
    stage: string;
    estimated_value: number | null;
    notion_created_at: string | null;
    created_at: string;
  }>;
  monthBreakdown: LeadsByMonth[];
  totals: {
    total: number;
    bySalesperson: { [key: string]: number };
  };
}

export function useCRMLeadsCount() {
  const { user } = useAuth();
  const [leadsData, setLeadsData] = useState<CRMLeadsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all leads data
  const fetchLeadsData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('id, name, salesperson_name, product, stage, estimated_value, notion_created_at, created_at')
        .order('notion_created_at', { ascending: false });

      if (error) {
        console.error('Error fetching CRM leads:', error);
        return;
      }

      if (!leads) return;

      // Process leads into month breakdown
      const monthMap = new Map<string, LeadsByMonth>();
      const salespersonTotals: { [key: string]: number } = {};

      leads.forEach(lead => {
        const dateStr = lead.notion_created_at || lead.created_at;
        if (!dateStr) return;

        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${month}-${year}`;

        if (!monthMap.has(key)) {
          monthMap.set(key, {
            month,
            year,
            total: 0,
            bySource: {},
            bySalesperson: {},
          });
        }

        const monthData = monthMap.get(key)!;
        monthData.total++;

        // Count by salesperson
        const salesperson = lead.salesperson_name || 'Não atribuído';
        monthData.bySalesperson[salesperson] = (monthData.bySalesperson[salesperson] || 0) + 1;
        salespersonTotals[salesperson] = (salespersonTotals[salesperson] || 0) + 1;

        // Count by product/source
        const source = lead.product || 'Sem produto';
        monthData.bySource[source] = (monthData.bySource[source] || 0) + 1;
      });

      const monthBreakdown = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setLeadsData({
        leads,
        monthBreakdown,
        totals: {
          total: leads.length,
          bySalesperson: salespersonTotals,
        },
      });
    } catch (error) {
      console.error('Error fetching CRM leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user && !leadsData && !isLoading) {
      fetchLeadsData();
    }
  }, [user, leadsData, isLoading, fetchLeadsData]);

  const getLeadsCountForMonth = useCallback((month: number, year: number): number => {
    if (!leadsData) return 0;
    
    const monthData = leadsData.monthBreakdown.find(
      m => m.month === month && m.year === year
    );
    
    return monthData?.total || 0;
  }, [leadsData]);

  const getLeadsBySourceForMonth = useCallback((month: number, year: number): { [key: string]: number } => {
    if (!leadsData) return {};
    
    const monthData = leadsData.monthBreakdown.find(
      m => m.month === month && m.year === year
    );
    
    return monthData?.bySource || {};
  }, [leadsData]);

  const getLeadsBySalespersonForMonth = useCallback((month: number, year: number): { [key: string]: number } => {
    if (!leadsData) return {};
    
    const monthData = leadsData.monthBreakdown.find(
      m => m.month === month && m.year === year
    );
    
    return monthData?.bySalesperson || {};
  }, [leadsData]);

  return { 
    leadsData,
    isLoading, 
    fetchLeadsData,
    getLeadsCountForMonth, 
    getLeadsBySourceForMonth,
    getLeadsBySalespersonForMonth,
  };
}
