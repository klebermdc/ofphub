import { FileDown, User, Check, Circle, Image, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { SalesRep } from "@/types/sales";
import { useCommissionPayments } from "@/hooks/useCommissionPayments";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

interface SalesRepTableProps {
  salesReps: SalesRep[];
  onGeneratePDF: (rep: SalesRep) => void;
  selectedMonth: number;
  selectedYear: number;
  getSalary: (name: string) => number;
}

export function SalesRepTable({ salesReps, onGeneratePDF, selectedMonth, selectedYear, getSalary }: SalesRepTableProps) {
  const { isPaid, togglePayment, uploadReceipt, getReceiptUrl, loading } = useCommissionPayments(selectedMonth, selectedYear);
  const [receiptDialog, setReceiptDialog] = useState<{ open: boolean; url: string; name: string }>({
    open: false,
    url: '',
    name: ''
  });
  const [pasteDialog, setPasteDialog] = useState<{ open: boolean; name: string }>({
    open: false,
    name: ''
  });
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const openReceiptDialog = (url: string, name: string) => {
    setReceiptDialog({ open: true, url, name });
  };

  const openPasteDialog = (name: string) => {
    setPastedImage(null);
    setPasteDialog({ open: true, name });
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImage(e.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  const handleSaveReceipt = async () => {
    if (!pastedImage || !pasteDialog.name) return;

    // Convert base64 to blob
    const response = await fetch(pastedImage);
    const blob = await response.blob();
    const file = new File([blob], `comprovante-${pasteDialog.name}-${Date.now()}.png`, { type: 'image/png' });

    await uploadReceipt(pasteDialog.name, file);
    setPasteDialog({ open: false, name: '' });
    setPastedImage(null);
    toast.success('Comprovante salvo com sucesso!');
  };

  return (
    <>
      {/* Dialog para visualizar comprovante */}
      <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comprovante - {receiptDialog.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {receiptDialog.url && (
              <img 
                src={receiptDialog.url} 
                alt="Comprovante de pagamento"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para colar comprovante */}
      <Dialog open={pasteDialog.open} onOpenChange={(open) => setPasteDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprovante - {pasteDialog.name}</DialogTitle>
          </DialogHeader>
          <div 
            className="min-h-[300px] border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer focus:outline-none focus:border-primary"
            tabIndex={0}
            onPaste={handlePaste}
          >
            {pastedImage ? (
              <img 
                src={pastedImage} 
                alt="Comprovante colado"
                className="max-w-full max-h-[400px] object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Clique aqui e cole a imagem (Ctrl+V)</p>
                <p className="text-sm mt-2">Faça print do comprovante e cole aqui</p>
              </div>
            )}
          </div>
          {pastedImage && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setPastedImage(null)}>
                Limpar
              </Button>
              <Button onClick={handleSaveReceipt}>
                Salvar Comprovante
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="glass rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Vendedores</h3>
          <p className="text-sm text-muted-foreground mt-1">Clique para gerar o relatório PDF individual</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Vendedor</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Vendas</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Total a Receber</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Negócios</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Pago</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Comprovante</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {salesReps.map((rep, index) => {
                const salary = getSalary(rep.name);
                const totalToReceive = rep.commission + salary;
                const receiptUrl = getReceiptUrl(rep.name);

                return (
                  <tr 
                    key={rep.id} 
                    className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                  >
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <span className="font-medium text-sm sm:text-base">{rep.name}</span>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm">
                      R$ {rep.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono text-success text-xs sm:text-sm cursor-help">
                            R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p>Comissão: R$ {rep.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p>Salário: R$ {salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {rep.deals}
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors ${
                              isPaid(rep.name) 
                                ? 'bg-success/20 text-success hover:bg-success/30' 
                                : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                            }`}
                            onClick={() => togglePayment(rep.name)}
                            disabled={loading}
                          >
                            {isPaid(rep.name) ? (
                              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isPaid(rep.name) ? 'Comissão paga - clique para desmarcar' : 'Marcar como pago'}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 sm:h-8 sm:w-8 ${receiptUrl ? 'text-primary' : 'text-muted-foreground'}`}
                              onClick={() => openPasteDialog(rep.name)}
                            >
                              <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {receiptUrl ? 'Substituir comprovante' : 'Colar comprovante'}
                          </TooltipContent>
                        </Tooltip>
                        {receiptUrl && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-success"
                                onClick={() => openReceiptDialog(receiptUrl, rep.name)}
                              >
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver comprovante</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onGeneratePDF(rep)}
                        className="gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Baixar PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
