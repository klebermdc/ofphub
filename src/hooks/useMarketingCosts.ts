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

interface DailyStatsAgg {
  month: number;
  year: number;
  meta_spend: number;
  google_spend: number;
  leads_total: number;
}

export function useMarketingCosts(userId: string | undefined, isMarketingRole: boolean = false) {
  const [costs, setCosts] = useState<MarketingCost[]>([]);
  const [dailyAgg, setDailyAgg] = useState<DailyStatsAgg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    fetchAll();
  }, [userId, isMarketingRole]);

  const fetchAll = async () => {
    if (!userId) return;
    setIsLoading(true);

    // Fetch both in parallel
    const [costsRes, dailyRes] = await Promise.all([
      fetchCostsQuery(),
      supabase
        .from("marketing_daily_stats" as any)
        .select("date, meta_spend, google_spend, leads_total"),
    ]);

    if (costsRes) setCosts(costsRes);

    if (dailyRes.data && !dailyRes.error) {
      const grouped: Record<string, DailyStatsAgg> = {};
      (dailyRes.data as any[]).forEach((row: any) => {
        const d = new Date(row.date);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const key = `${year}-${month}`;
        if (!grouped[key]) grouped[key] = { month, year, meta_spend: 0, google_spend: 0, leads_total: 0 };
        grouped[key].meta_spend += Number(row.meta_spend) || 0;
        grouped[key].google_spend += Number(row.google_spend) || 0;
        grouped[key].leads_total += Number(row.leads_total) || 0;
      });
      setDailyAgg(Object.values(grouped));
    }

    setIsLoading(false);
  };

  const fetchCostsQuery = async (): Promise<MarketingCost[] | null> => {
    if (!userId) return null;
    let query = supabase
      .from("marketing_costs")
      .select("*")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    if (!isMarketingRole) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching marketing costs:", error);
      return null;
    }
    return data || [];
  };

  const getDailyAggForMonth = (month: number, year: number) =>
    dailyAgg.find(d => d.month === month && d.year === year);

  const saveCost = async (
    month: number, year: number, googleAds: number, metaAds: number,
    otherMarketing: number, leads: number, description?: string
  ) => {
    if (!userId) return false;
    const existing = costs.find(c => c.period_month === month && c.period_year === year);

    if (existing) {
      const { error } = await supabase
        .from("marketing_costs")
        .update({ google_ads: googleAds, meta_ads: metaAds, other_marketing: otherMarketing, leads, description: description || null })
        .eq("id", existing.id);
      if (error) { toast({ title: "Erro", description: "Não foi possível atualizar os custos.", variant: "destructive" }); return false; }
    } else {
      const { error } = await supabase.from("marketing_costs").insert({
        user_id: userId, period_month: month, period_year: year,
        google_ads: googleAds, meta_ads: metaAds, other_marketing: otherMarketing, leads, description: description || null,
      });
      if (error) { toast({ title: "Erro", description: "Não foi possível salvar os custos.", variant: "destructive" }); return false; }
    }

    await fetchAll();
    toast({ title: "Custos salvos", description: "Custos de marketing atualizados com sucesso." });
    return true;
  };

  const getCostForMonth = (month: number, year: number) =>
    costs.find(c => c.period_month === month && c.period_year === year);

  // Returns total marketing investment: daily_stats (Meta+Google) when available + other_marketing from marketing_costs
  const getTotalForMonth = (month: number, year: number) => {
    const ds = getDailyAggForMonth(month, year);
    const mc = getCostForMonth(month, year);
    const metaGoogle = ds
      ? ds.meta_spend + ds.google_spend
      : (mc ? mc.google_ads + mc.meta_ads : 0);
    const other = mc?.other_marketing || 0;
    return metaGoogle + other;
  };

  // Returns leads: daily_stats when available, fallback to marketing_costs
  const getLeadsForMonth = (month: number, year: number) => {
    const ds = getDailyAggForMonth(month, year);
    if (ds && ds.leads_total > 0) return ds.leads_total;
    const mc = getCostForMonth(month, year);
    return mc?.leads || 0;
  };

  const getOperationalCostsForMonth = (month: number, year: number) => {
    const cost = getCostForMonth(month, year);
    if (!cost) return 0;
    return (cost.software || 0) + (cost.telefonia || 0);
  };

  const saveOperationalCosts = async (
    month: number, year: number, software: number, telefonia: number,
    googleAds?: number, metaAds?: number, otherMarketing?: number,
    leads?: number, description?: string
  ) => {
    if (!userId) return false;
    const existing = costs.find(c => c.period_month === month && c.period_year === year);

    const updateData: Record<string, any> = { software, telefonia };
    if (googleAds !== undefined) updateData.google_ads = googleAds;
    if (metaAds !== undefined) updateData.meta_ads = metaAds;
    if (otherMarketing !== undefined) updateData.other_marketing = otherMarketing;
    if (leads !== undefined) updateData.leads = leads;
    if (description !== undefined) updateData.description = description || null;

    if (existing) {
      const { error } = await supabase.from("marketing_costs").update(updateData).eq("id", existing.id);
      if (error) { toast({ title: "Erro", description: "Não foi possível atualizar os custos.", variant: "destructive" }); return false; }
    } else {
      const { error } = await supabase.from("marketing_costs").insert({ user_id: userId, period_month: month, period_year: year, ...updateData });
      if (error) { toast({ title: "Erro", description: "Não foi possível salvar os custos.", variant: "destructive" }); return false; }
    }

    await fetchAll();
    toast({ title: "Custos salvos", description: "Custos atualizados com sucesso." });
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
