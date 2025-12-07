import { useState, useEffect } from "react";
import { RefreshCw, Landmark, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SaldoData {
  disponivel: number;
  bloqueadoCheque: number;
  bloqueadoJudicial: number;
  bloqueadoAdministrativo: number;
  bloqueadoPix: number;
  limite: number;
}

export function InterBankBalance() {
  const [saldo, setSaldo] = useState<SaldoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSaldo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('banco-inter', {
        body: { action: 'saldo' },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSaldo(data);
      setLastUpdate(new Date());
      toast({
        title: "Saldo atualizado",
        description: "Saldo do Banco Inter atualizado com sucesso.",
      });
    } catch (err: any) {
      console.error('Erro ao buscar saldo:', err);
      setError(err.message || 'Erro ao consultar saldo');
      toast({
        title: "Erro ao buscar saldo",
        description: err.message || 'Erro ao consultar saldo do Banco Inter',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Banco Inter</h3>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Atualizado às {formatTime(lastUpdate)}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSaldo}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {saldo ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-success/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Saldo Disponível</span>
            </div>
            <p className="text-2xl font-bold text-success mt-1">
              {formatCurrency(saldo.disponivel)}
            </p>
          </div>

          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Limite</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatCurrency(saldo.limite)}
            </p>
          </div>

          {(saldo.bloqueadoCheque > 0 || saldo.bloqueadoJudicial > 0 || 
            saldo.bloqueadoAdministrativo > 0 || saldo.bloqueadoPix > 0) && (
            <div className="col-span-2 bg-warning/10 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Valores Bloqueados</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                {saldo.bloqueadoCheque > 0 && (
                  <p>Cheque: {formatCurrency(saldo.bloqueadoCheque)}</p>
                )}
                {saldo.bloqueadoJudicial > 0 && (
                  <p>Judicial: {formatCurrency(saldo.bloqueadoJudicial)}</p>
                )}
                {saldo.bloqueadoAdministrativo > 0 && (
                  <p>Administrativo: {formatCurrency(saldo.bloqueadoAdministrativo)}</p>
                )}
                {saldo.bloqueadoPix > 0 && (
                  <p>Pix: {formatCurrency(saldo.bloqueadoPix)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : !isLoading && !error && (
        <div className="text-center py-6 text-muted-foreground">
          <Landmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Clique em "Atualizar" para consultar o saldo</p>
        </div>
      )}
    </div>
  );
}
