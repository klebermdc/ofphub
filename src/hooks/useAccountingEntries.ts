import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AccountingEntry {
  id: string;
  data: string;
  valor_recebido: number;
  valor_enviado: number;
  movimentacao: string | null;
  cliente: string | null;
  nf: string | null;
  plano_de_contas: string | null;
  justificativa: string | null;
  forma_de_pagamento: string | null;
  banco: string | null;
  created_at: string;
}

export function useAccountingEntries(userId: string | undefined) {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchEntries();
    }
  }, [userId]);

  const fetchEntries = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("accounting_entries")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      console.error("Error fetching accounting entries:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lançamentos.",
        variant: "destructive",
      });
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  const addEntry = async (entry: Omit<AccountingEntry, "id" | "created_at">) => {
    if (!userId) return false;

    const { error } = await supabase.from("accounting_entries").insert({
      user_id: userId,
      data: entry.data,
      valor_recebido: entry.valor_recebido,
      valor_enviado: entry.valor_enviado,
      movimentacao: entry.movimentacao,
      cliente: entry.cliente,
      nf: entry.nf,
      plano_de_contas: entry.plano_de_contas,
      justificativa: entry.justificativa,
      forma_de_pagamento: entry.forma_de_pagamento,
      banco: entry.banco,
    });

    if (error) {
      console.error("Error adding entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o lançamento.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Sucesso",
      description: "Lançamento adicionado com sucesso.",
    });
    await fetchEntries();
    return true;
  };

  const updateEntry = async (id: string, entry: Partial<AccountingEntry>) => {
    if (!userId) return false;

    const { error } = await supabase
      .from("accounting_entries")
      .update(entry)
      .eq("id", id);

    if (error) {
      console.error("Error updating entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lançamento.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Sucesso",
      description: "Lançamento atualizado com sucesso.",
    });
    await fetchEntries();
    return true;
  };

  const deleteEntry = async (id: string) => {
    if (!userId) return false;

    const { error } = await supabase
      .from("accounting_entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lançamento.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Sucesso",
      description: "Lançamento excluído com sucesso.",
    });
    await fetchEntries();
    return true;
  };

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchEntries,
  };
}
