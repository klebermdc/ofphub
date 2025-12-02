import { useState } from "react";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { SalesRepTable, SalesRep } from "@/components/SalesRepTable";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    
    // Simula análise da planilha
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setHasData(true);
    
    toast({
      title: "Planilha importada!",
      description: "Dados de 5 vendedores encontrados.",
    });
  };

  const handleGeneratePDF = (rep: SalesRep) => {
    toast({
      title: "Gerando PDF...",
      description: `Relatório de ${rep.name} será baixado em instantes.`,
    });
    
    // Simula geração do PDF
    setTimeout(() => {
      toast({
        title: "PDF pronto!",
        description: `Relatório de ${rep.name} disponível para download.`,
      });
    }, 1500);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total de Vendas"
                value="R$ 211.000"
                change="+12% comparado ao mês anterior"
                changeType="positive"
                icon={DollarSign}
                delay={0}
              />
              <MetricCard
                title="Total de Comissões"
                value="R$ 22.140"
                change="+8% comparado ao mês anterior"
                changeType="positive"
                icon={TrendingUp}
                delay={50}
              />
              <MetricCard
                title="Vendedores Ativos"
                value="5"
                change="Mesmo do mês anterior"
                changeType="neutral"
                icon={Users}
                delay={100}
              />
              <MetricCard
                title="Taxa Média"
                value="10,5%"
                change="+0,5% de ajuste"
                changeType="positive"
                icon={Target}
                delay={150}
              />
            </div>

            {/* Gráfico e Input */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesChart />
              </div>
              <div>
                <SheetInput onAnalyze={handleAnalyze} isLoading={isLoading} />
              </div>
            </div>

            {/* Tabela de Vendedores */}
            <SalesRepTable onGeneratePDF={handleGeneratePDF} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
