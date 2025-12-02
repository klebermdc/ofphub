import { useState } from "react";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { jsPDF } from "jspdf";
import { Header } from "@/components/Header";
import { SheetInput } from "@/components/SheetInput";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { SalesRepTable } from "@/components/SalesRepTable";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SalesRep, SalesTotals } from "@/types/sales";

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
        rate: item.taxa
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

  const formatCurrencyPDF = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleGeneratePDF = (rep: SalesRep) => {
    toast({
      title: "Gerando PDF...",
      description: `Relatório de ${rep.name} será baixado em instantes.`,
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Comissão", pageWidth / 2, 25, { align: "center" });
    
    // Salesperson name
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(rep.name, pageWidth / 2, 55, { align: "center" });
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 65, { align: "center" });
    
    // Metrics boxes
    const boxY = 80;
    const boxWidth = 85;
    const boxHeight = 35;
    const margin = 15;
    
    // Total Vendas box
    doc.setFillColor(240, 240, 255);
    doc.roundedRect(margin, boxY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Total de Vendas", margin + 5, boxY + 12);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPDF(rep.sales), margin + 5, boxY + 26);
    
    // Comissão box
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(pageWidth - margin - boxWidth, boxY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Comissão Total", pageWidth - margin - boxWidth + 5, boxY + 12);
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPDF(rep.commission), pageWidth - margin - boxWidth + 5, boxY + 26);
    
    // Second row boxes
    const boxY2 = boxY + boxHeight + 10;
    
    // Negócios box
    doc.setFillColor(255, 248, 240);
    doc.roundedRect(margin, boxY2, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Número de Negócios", margin + 5, boxY2 + 12);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(String(rep.deals), margin + 5, boxY2 + 26);
    
    // Taxa box
    doc.setFillColor(248, 240, 255);
    doc.roundedRect(pageWidth - margin - boxWidth, boxY2, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Taxa de Comissão", pageWidth - margin - boxWidth + 5, boxY2 + 12);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`${rep.rate.toFixed(1)}%`, pageWidth - margin - boxWidth + 5, boxY2 + 26);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("Documento gerado automaticamente pelo Sistema de Comissões", pageWidth / 2, 280, { align: "center" });
    
    // Download
    doc.save(`relatorio-${rep.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    
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
