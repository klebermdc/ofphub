import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MarketingCost {
  id: string;
  period_month: number;
  period_year: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  software: number;
  telefonia: number;
  imposto: number;
  leads: number;
  description: string | null;
  user_id?: string;
}

export function useMarketingCosts(userId: string | undefined, isMarketingRole: boolean = false) {
  const [costs, setCosts] = useState<MarketingCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    fetchCosts();
  }, [userId, isMarketingRole]);

  const fetchCosts = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    // Marketing role users can see all marketing costs
    let query = supabase
      .from("marketing_costs")
      .select("*")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    
    // Only filter by user_id for non-marketing users
    if (!isMarketingRole) {
      query = query.eq("user_id", userId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching marketing costs:", error);
    } else {
      setCosts(data || []);
    }
    setIsLoading(false);
  };

  const saveCost = async (
    month: number,
    year: number,
    googleAds: number,
    metaAds: number,
    otherMarketing: number,
    leads: number,
    description?: string
  ) => {
    if (!userId) return false;

    const existing = costs.find(
      (c) => c.period_month === month && c.period_year === year
    );

    if (existing) {
      const { error } = await supabase
        .from("marketing_costs")
        .update({
          google_ads: googleAds,
          meta_ads: metaAds,
          other_marketing: otherMarketing,
          leads: leads,
          description: description || null,
        })
        .eq("id", existing.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar os custos.",
          variant: "destructive",
        });
        return false;
      }
    } else {
      const { error } = await supabase.from("marketing_costs").insert({
        user_id: userId,
        period_month: month,
        period_year: year,
        google_ads: googleAds,
        meta_ads: metaAds,
        other_marketing: otherMarketing,
        leads: leads,
        description: description || null,
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar os custos.",
          variant: "destructive",
        });
        return false;
      }
    }

    await fetchCosts();
    toast({
      title: "Custos salvos",
      description: "Custos de marketing atualizados com sucesso.",
    });
    return true;
  };

  const getCostForMonth = (month: number, year: number) => {
    return costs.find(
      (c) => c.period_month === month && c.period_year === year
    );
  };

  const getTotalForMonth = (month: number, year: number) => {
    const cost = getCostForMonth(month, year);
    if (!cost) return 0;
    return cost.google_ads + cost.meta_ads + cost.other_marketing;
  };

  const getLeadsForMonth = (month: number, year: number) => {
    const cost = getCostForMonth(month, year);
    return cost?.leads || 0;
  };

  const getOperationalCostsForMonth = (month: number, year: number) => {
    const cost = getCostForMonth(month, year);
    if (!cost) return 0;
    return (cost.software || 0) + (cost.telefonia || 0) + (cost.imposto || 0);
  };

  const saveOperationalCosts = async (
    month: number,
    year: number,
    software: number,
    telefonia: number,
    imposto: number
  ) => {
    if (!userId) return false;

    const existing = costs.find(
      (c) => c.period_month === month && c.period_year === year
    );

    if (existing) {
      const { error } = await supabase
        .from("marketing_costs")
        .update({
          software,
          telefonia,
          imposto,
        })
        .eq("id", existing.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar os custos operacionais.",
          variant: "destructive",
        });
        return false;
      }
    } else {
      const { error } = await supabase.from("marketing_costs").insert({
        user_id: userId,
        period_month: month,
        period_year: year,
        software,
        telefonia,
        imposto,
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar os custos operacionais.",
          variant: "destructive",
        });
        return false;
      }
    }

    await fetchCosts();
    toast({
      title: "Custos salvos",
      description: "Custos operacionais atualizados com sucesso.",
    });
    return true;
  };

  return {
    costs,
    isLoading,
    saveCost,
    saveOperationalCosts,
    getCostForMonth,
    getTotalForMonth,
    getLeadsForMonth,
    getOperationalCostsForMonth,
  };
}
