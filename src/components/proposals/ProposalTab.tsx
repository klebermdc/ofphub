import { useState } from "react";
import { FileText, Wand2, Loader2, Download, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProposalPreview } from "./ProposalPreview";
import { generateProposalPDF } from "@/utils/proposalPdfGenerator";

// Enhanced types for detailed cart data
export interface TicketItem {
  name: string;
  fullDescription?: string;
  parks?: string[];
  mainAttractions?: string[];
  benefits?: string[];
  validityDays?: string;
  entryType?: string;
  date: string;
  time?: string;
  guests: string;
  specialNotes?: string;
  images?: string[];
  mainImage?: string;
  // Legacy compatibility
  description?: string;
  duration?: string;
  park?: string;
  image?: string;
}

export interface HotelItem {
  name: string;
  category?: string;
  fullDescription?: string;
  roomType?: string;
  roomDescription?: string;
  amenities?: string[];
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkOutTime?: string;
  nights: string;
  rooms: string;
  guests: string;
  mealPlan?: string;
  specialRequests?: string;
  images?: string[];
  mainImage?: string;
  image?: string;
}

export interface CarItem {
  name: string;
  category?: string;
  fullDescription?: string;
  features?: string[];
  capacity?: string;
  pickupLocation: string;
  pickupDate: string;
  pickupTime?: string;
  returnLocation?: string;
  returnDate: string;
  returnTime?: string;
  rentalCompany?: string;
  extras?: string[];
  images?: string[];
  mainImage?: string;
  image?: string;
}

export interface InsuranceItem {
  name: string;
  fullDescription?: string;
  coverageAmount?: string;
  coverageDetails?: string[];
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelers: string;
  travelerDetails?: string;
  emergencyContact?: string;
  images?: string[];
  mainImage?: string;
  // Legacy
  coverage?: string;
  dates?: string;
  image?: string;
}

export interface CartSummary {
  tripTitle?: string;
  tripDescription?: string;
  tripStart: string;
  tripEnd: string;
  totalDays: string;
  totalNights?: string;
  totalParks?: string;
  totalExperiences?: string;
  highlights?: string[];
  travelGroup?: string;
}

export interface ParsedCart {
  tickets?: TicketItem[];
  hotels?: HotelItem[];
  cars?: CarItem[];
  insurance?: InsuranceItem[];
  summary?: CartSummary;
  clientName?: string;
  generatedAt?: string;
}

export const ProposalTab = () => {
  const [cartText, setCartText] = useState("");
  const [clientName, setClientName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedCart, setParsedCart] = useState<ParsedCart | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleProcessCart = async () => {
    if (!cartText.trim()) {
      toast.error("Cole o texto do carrinho para continuar");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-proposal-cart', {
        body: { 
          cartText: cartText.trim(),
          clientName: clientName.trim() || 'Cliente'
        }
      });

      if (error) {
        console.error('Error:', error);
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setParsedCart(data);
      setShowPreview(true);
      toast.success("Carrinho analisado com sucesso! ✨");
    } catch (error: any) {
      console.error('Error processing cart:', error);
      toast.error(error.message || "Erro ao processar carrinho");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!parsedCart) return;

    try {
      toast.loading("Gerando proposta mágica...", { id: "pdf" });
      await generateProposalPDF(parsedCart);
      toast.success("Proposta gerada com sucesso! 🎉", { id: "pdf" });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar PDF", { id: "pdf" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Gerador de Propostas</h2>
          <p className="text-muted-foreground">
            Cole o carrinho de compras e gere uma proposta mágica para seu cliente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dados do Carrinho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome do Cliente
              </label>
              <Input
                placeholder="Digite o nome do cliente..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Texto do Carrinho
              </label>
              <Textarea
                placeholder={`Cole aqui o texto COMPLETO do carrinho de compras...

A IA irá extrair TODAS as informações detalhadas: parques, atrações, 
tipos de quarto, comodidades, características do carro, coberturas do seguro, etc.

Quanto mais detalhes no texto, mais rica será a proposta!`}
                value={cartText}
                onChange={(e) => setCartText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleProcessCart} 
              disabled={isProcessing || !cartText.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando com IA...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Analisar Carrinho
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prévia da Proposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parsedCart ? (
              <div className="space-y-4">
                <ProposalPreview cart={parsedCart} />
                
                <Button 
                  onClick={handleGeneratePDF}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Proposta em PDF
                </Button>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cole o texto do carrinho e clique em "Analisar"</p>
                  <p className="text-sm">A prévia da proposta aparecerá aqui</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
