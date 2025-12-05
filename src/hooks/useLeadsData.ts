import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LeadData {
  telefone: string;
  nome: string;
  sobrenome: string;
  email: string;
  medium: string;
  source: string;
  campaign: string;
  content: string;
  term: string;
  pageReferrer: string;
}

export interface LeadsBySource {
  source: string;
  count: number;
  leads: LeadData[];
}

export interface LeadsByMonth {
  month: string;
  year: string;
  total: number;
  bySource: { [key: string]: number };
  leads: LeadData[];
}

export interface LeadsTotals {
  total: number;
  googleAds: number;
  metaAds: number;
  organic: number;
  direct: number;
  referral: number;
  email: number;
  other: number;
}

interface LeadsResponse {
  leads: LeadData[];
  sourceBreakdown: LeadsBySource[];
  monthBreakdown: LeadsByMonth[];
  totals: LeadsTotals;
}

const LEADS_SHEET_URL_KEY = 'marketing_leads_sheet_url';

export function useLeadsData() {
  const [leadsData, setLeadsData] = useState<LeadsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem(LEADS_SHEET_URL_KEY) || '';
  });

  const fetchLeadsData = useCallback(async (url?: string) => {
    const targetUrl = url || sheetUrl;
    if (!targetUrl) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-leads-sheet', {
        body: { sheetUrl: targetUrl }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setLeadsData(data.data);
        
        // Save URL
        if (url) {
          localStorage.setItem(LEADS_SHEET_URL_KEY, url);
          setSheetUrl(url);
        }
        
        toast({
          title: "Dados carregados",
          description: `${data.data.totals.total} leads encontrados`,
        });
      }
    } catch (error) {
      console.error('Error fetching leads data:', error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível carregar os dados da planilha de leads.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sheetUrl]);

  // Auto-load on mount if URL exists
  useEffect(() => {
    if (sheetUrl && !leadsData && !isLoading) {
      fetchLeadsData(sheetUrl);
    }
  }, [sheetUrl, leadsData, isLoading, fetchLeadsData]);

  const getLeadsForMonth = useCallback((month: number, year: number): number => {
    if (!leadsData) return 0;
    
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString();
    
    const monthData = leadsData.monthBreakdown.find(
      m => m.month === monthStr && m.year === yearStr
    );
    
    return monthData?.total || 0;
  }, [leadsData]);

  const getLeadsBySourceForMonth = useCallback((month: number, year: number): { [key: string]: number } => {
    if (!leadsData) return {};
    
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString();
    
    const monthData = leadsData.monthBreakdown.find(
      m => m.month === monthStr && m.year === yearStr
    );
    
    return monthData?.bySource || {};
  }, [leadsData]);

  const clearUrl = useCallback(() => {
    localStorage.removeItem(LEADS_SHEET_URL_KEY);
    setSheetUrl('');
    setLeadsData(null);
  }, []);

  return {
    leadsData,
    isLoading,
    sheetUrl,
    fetchLeadsData,
    getLeadsForMonth,
    getLeadsBySourceForMonth,
    clearUrl,
  };
}
