import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParsedOrder, parseOrderDate } from "./growthUtils";

export function useGrowthOrders() {
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const allRows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("orders")
          .select("data, venda, comissao_total, vendedor, produto, fornecedor")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) { console.error("useGrowthOrders error:", error); break; }
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const parsed: ParsedOrder[] = [];
      for (const r of allRows) {
        const dt = parseOrderDate(r.data);
        if (!dt) continue;
        parsed.push({
          data: r.data,
          venda: Number(r.venda) || 0,
          comissao_total: Number(r.comissao_total) || 0,
          vendedor: r.vendedor || "Desconhecido",
          produto: r.produto || "Outros",
          fornecedor: r.fornecedor || "Outros",
          month: dt.month,
          year: dt.year,
        });
      }
      setOrders(parsed);
      setLoading(false);
    }
    fetchAll();
  }, []);

  return { orders, loading };
}
