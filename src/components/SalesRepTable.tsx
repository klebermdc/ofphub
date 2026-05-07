import { FileDown, User, Check, Circle, Image, Eye, Archive } from "lucide-react";
import { Button } from "./ui/button";
import { SalesRep } from "@/types/sales";
import { useCommissionPayments } from "@/hooks/useCommissionPayments";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { SALESPERSON_SALARIES, isExcludedName } from "@/config/salaries";
import { generateSalesRepPDF } from "@/utils/pdfGenerator";
import { getMonthName } from "@/utils/dateUtils";
import JSZip from "jszip";

interface SalesRepTableProps {
  salesReps: SalesRep[];
  onGeneratePDF: (rep: SalesRep) => void;
  selectedMonth: number;
  selectedYear: number;
  getSalary: (name: string) => number;
  getDiscount?: (name: string) => number;
  getDiscountDescription?: (name: string) => string;
  getDiscountItems?: (name: string) => Array<{ amount: number; description: string }>;
}

export function SalesRepTable({ salesReps, onGeneratePDF, selectedMonth, selectedYear, getSalary, getDiscount, getDiscountDescription, getDiscountItems }: SalesRepTableProps) {
  const { isPaid, togglePayment, uploadReceipt, getReceiptUrl, getSignedReceiptUrl, loading } = useCommissionPayments(selectedMonth, selectedYear);
  
  // Filter out excluded names (partners) but add salary-only people (like Henrique TI)
  const allPeopleForPayment = useMemo(() => {
    // Get salesReps without excluded names
    const filteredSalesReps = salesReps.filter(rep => !isExcludedName(rep.name));
    
    // Get names already in salesReps
    const existingNames = new Set(filteredSalesReps.map(rep => rep.name.toLowerCase()));
    
    // Add salary-only people who aren't in salesReps
    const salaryOnlyPeople: SalesRep[] = Object.keys(SALESPERSON_SALARIES)
      .filter(name => !existingNames.has(name.toLowerCase()) && !isExcludedName(name))
      .map(name => ({
        id: `salary-only-${name}`,
        name,
        sales: 0,
        commission: 0,
        deals: 0,
        rate: 0,
        orders: []
      }));
    
    return [...filteredSalesReps, ...salaryOnlyPeople];
  }, [salesReps]);
  const [previewRep, setPreviewRep] = useState<SalesRep | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
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

  const handleDownloadAllZip = async () => {
    const reps = allPeopleForPayment.filter(r => r.orders && r.orders.length > 0);
    if (reps.length === 0) {
      toast.error("Nenhum vendedor com pedidos para gerar relatórios.");
      return;
    }
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      const monthName = getMonthName(selectedMonth);
      const safeSalary = getSalary;
      const safeDiscount = getDiscount || (() => 0);
      const safeDiscountDesc = getDiscountDescription || (() => '');
      const safeDiscountItems = getDiscountItems || (() => []);

      for (const rep of reps) {
        const safeName = rep.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        const fileName = `${safeName}_${monthName}_${selectedYear}.pdf`;
        const blob = await generateSalesRepPDF(rep, safeSalary, safeDiscount, safeDiscountDesc, safeDiscountItems, { returnBlob: true }) as Blob;
        zip.file(fileName, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorios_comissao_${monthName}_${selectedYear}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${reps.length} relatórios baixados em ZIP.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o arquivo ZIP.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const openReceiptDialog = async (name: string) => {
    const signedUrl = await getSignedReceiptUrl(name);
    if (signedUrl) {
      setReceiptDialog({ open: true, url: signedUrl, name });
    } else {
      toast.error("Não foi possível carregar o comprovante.");
    }
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

  const previewSalary = previewRep ? getSalary(previewRep.name) : 0;
  const previewDiscount = previewRep && getDiscount ? getDiscount(previewRep.name) : 0;
  const previewDiscountDesc = previewRep && getDiscountDescription ? getDiscountDescription(previewRep.name) : '';
  const previewTotal = previewRep ? previewRep.commission + previewSalary - previewDiscount : 0;

  return (
    <>
      {/* Dialog para preview do relatório */}
      <Dialog open={!!previewRep} onOpenChange={(open) => !open && setPreviewRep(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Relatório - {previewRep?.name}</DialogTitle>
          </DialogHeader>
          {previewRep && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="font-mono font-semibold text-sm">R$ {previewRep.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="font-mono font-semibold text-sm text-success">R$ {previewRep.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Salário</p>
                  <p className="font-mono font-semibold text-sm">R$ {previewSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {previewDiscount > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-3 text-center border border-destructive/20">
                    <p className="text-xs text-muted-foreground">Desconto</p>
                    <p className="font-mono font-semibold text-sm text-destructive">- R$ {previewDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {previewDiscountDesc && <p className="text-[10px] text-muted-foreground mt-1 truncate">{previewDiscountDesc}</p>}
                  </div>
                )}
                <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                  <p className="text-xs text-muted-foreground">Total a Receber</p>
                  <p className="font-mono font-bold text-sm text-primary">R$ {previewTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">{previewRep.orders.length} pedido(s)</div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-secondary/30">
                      <th className="text-left p-2 font-medium">Cliente</th>
                      <th className="text-left p-2 font-medium">Data</th>
                      <th className="text-left p-2 font-medium">Pedido</th>
                      <th className="text-left p-2 font-medium">Fornecedor</th>
                      <th className="text-left p-2 font-medium">Produto</th>
                      <th className="text-right p-2 font-medium">Venda</th>
                      <th className="text-right p-2 font-medium">Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRep.orders.map((order, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-secondary/10">
                        <td className="p-2">{order.cliente}</td>
                        <td className="p-2">{order.data}</td>
                        <td className="p-2">{order.pedido}</td>
                        <td className="p-2">{order.fornecedor}</td>
                        <td className="p-2 max-w-[150px] truncate">{order.produto}</td>
                        <td className="p-2 text-right font-mono">R$ {order.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono text-success">R$ {order.comissaoVendedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => { onGeneratePDF(previewRep); setPreviewRep(null); }} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <div className="p-4 sm:p-6 border-b border-border flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Vendedores</h3>
            <p className="text-sm text-muted-foreground mt-1">Clique para gerar o relatório PDF individual</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isDownloadingAll || allPeopleForPayment.filter(r => r.orders && r.orders.length > 0).length === 0}
            onClick={handleDownloadAllZip}
          >
            <Archive className="h-4 w-4" />
            {isDownloadingAll ? 'Gerando ZIP...' : 'Baixar Todos (ZIP)'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Vendedor</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Vendas</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Total a Receber</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Comissão %</th>
                <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Negócios</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Pago</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Comprovante</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {allPeopleForPayment.map((rep, index) => {
                const salary = getSalary(rep.name);
                const discount = getDiscount ? getDiscount(rep.name) : 0;
                const totalToReceive = rep.commission + salary - discount;
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
                            {discount > 0 && <p className="text-destructive">Desconto: - R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm">
                      {rep.sales > 0 ? ((rep.orders.filter(o => !o.produto?.toLowerCase().includes('guiamento')).reduce((s, o) => s + (o.comissaoTotal || 0), 0) / rep.orders.filter(o => !o.produto?.toLowerCase().includes('guiamento')).reduce((s, o) => s + o.venda, 0) * 100) || 0).toFixed(1) : '0.0'}%
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
                                onClick={() => openReceiptDialog(rep.name)}
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
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setPreviewRep(rep)}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visualizar relatório</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => onGeneratePDF(rep)}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Baixar PDF</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/40 border-t-2 border-border font-semibold">
                <td className="p-3 sm:p-4 text-sm">Total</td>
                <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm">
                  R$ {allPeopleForPayment.reduce((sum, rep) => sum + rep.sales, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3 sm:p-4 text-right font-mono text-success text-xs sm:text-sm">
                  R$ {allPeopleForPayment.reduce((sum, rep) => sum + rep.commission + getSalary(rep.name) - (getDiscount ? getDiscount(rep.name) : 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm">
                  {(() => {
                    const totalSales = allPeopleForPayment.reduce((sum, rep) => sum + rep.orders.filter(o => !o.produto?.toLowerCase().includes('guiamento')).reduce((s, o) => s + o.venda, 0), 0);
                    const totalComissao = allPeopleForPayment.reduce((sum, rep) => sum + rep.orders.filter(o => !o.produto?.toLowerCase().includes('guiamento')).reduce((s, o) => s + (o.comissaoTotal || 0), 0), 0);
                    return totalSales > 0 ? (totalComissao / totalSales * 100).toFixed(1) : '0.0';
                  })()}%
                </td>
                <td className="p-3 sm:p-4 text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                  {allPeopleForPayment.reduce((sum, rep) => sum + rep.deals, 0)}
                </td>
                <td className="p-3 sm:p-4" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
