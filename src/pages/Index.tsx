import { useState } from "react";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { SalesRepTable } from "@/components/SalesRepTable";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-google-sheet', {
        body: { sheetUrl: url }
      });

      if (error) {
        console.error('Function error:', error);
        toast({
          title: "Erro ao importar",
          description: error.message || "Não foi possível processar a planilha.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (data.error) {
        toast({
          title: "Erro na planilha",
          description: data.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Transform data to match our SalesRep interface
      const transformedData: SalesRep[] = data.data.map((item: any, index: number) => ({
        id: String(index + 1),
        name: item.vendedor,
        sales: item.vendas,
        commission: item.comissao,
        deals: item.negocios,
        rate: item.taxa,
        orders: item.pedidos || []
      }));

      setSalesReps(transformedData);
      setTotals(data.totals);
      setHasData(true);
      
      toast({
        title: "Planilha importada!",
        description: data.message,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a planilha.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleGeneratePDF = (rep: SalesRep) => {
    toast({
      title: "Gerando PDF...",
      description: `Relatório de ${rep.name} será baixado em instantes.`,
    });

    generateSalesRepPDF(rep);
    
    toast({
      title: "PDF pronto!",
      description: `Relatório de ${rep.name} baixado com sucesso.`,
    });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'var(--gradient-glow)',
        }}
      />
      
      <Header />
      
      <main className="container mx-auto px-6 py-8 relative">
        {!hasData ? (
          <div className="max-w-xl mx-auto pt-20">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Relatórios de <span className="gradient-text">Comissão</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Importe sua planilha do Google Sheets e gere relatórios PDF individuais para cada vendedor.
              </p>
            </div>
            
            <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Total de Vendas"
                value={totals ? formatCurrency(totals.totalVendas) : "R$ 0"}
                icon={DollarSign}
                delay={0}
              />
              <MetricCard
                title="Total de Comissões"
                value={totals ? formatCurrency(totals.totalComissao) : "R$ 0"}
                icon={TrendingUp}
                delay={50}
              />
              <MetricCard
                title="Vendedores Ativos"
                value={totals ? String(totals.vendedoresAtivos) : "0"}
                icon={Users}
                delay={100}
              />
            </div>

            {/* Gráfico e Input */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesChart salesReps={salesReps} />
              </div>
              <div>
                <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} />
              </div>
            </div>

            {/* Tabela de Vendedores */}
            <SalesRepTable salesReps={salesReps} onGeneratePDF={handleGeneratePDF} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
