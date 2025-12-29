import { useState, useRef } from "react";
import { FileUp, Sparkles, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SuggestedEntry {
  data: string;
  movimentacao: string;
  cliente: string;
  valor_recebido: number;
  valor_enviado: number;
  plano_de_contas: string;
  banco: string;
  forma_de_pagamento: string;
  justificativa: string;
  selected: boolean;
}

interface BankStatementImportDialogProps {
  onImport: (entries: Omit<SuggestedEntry, 'selected'>[]) => Promise<void>;
}

const bancos = [
  "Banco do Brasil",
  "Bradesco",
  "Caixa",
  "Itaú",
  "Nubank",
  "Santander",
  "Inter",
  "C6 Bank",
  "Outro",
];

const planosDeContas = [
  "Receita de Vendas",
  "Despesas Operacionais",
  "Despesas Administrativas",
  "Despesas com Pessoal",
  "Marketing",
  "Comissões",
  "Impostos",
  "Fornecedores",
  "Transferências",
  "Outros",
];

export function BankStatementImportDialog({ onImport }: BankStatementImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBank, setSelectedBank] = useState("Inter");
  const [suggestedEntries, setSuggestedEntries] = useState<SuggestedEntry[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setSuggestedEntries([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankName', selectedBank);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-bank-statement`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar extrato');
      }

      if (result.entries && result.entries.length > 0) {
        const entriesWithSelection = result.entries.map((entry: any) => ({
          ...entry,
          selected: true,
        }));
        setSuggestedEntries(entriesWithSelection);
        toast({
          title: "Extrato processado!",
          description: result.message,
        });
      } else {
        toast({
          title: "Nenhum lançamento encontrado",
          description: "Não foi possível extrair lançamentos do PDF.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing bank statement:", error);
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleEntry = (index: number) => {
    setSuggestedEntries(prev => 
      prev.map((entry, i) => 
        i === index ? { ...entry, selected: !entry.selected } : entry
      )
    );
  };

  const toggleAll = (selected: boolean) => {
    setSuggestedEntries(prev => prev.map(entry => ({ ...entry, selected })));
  };

  const updateEntry = (index: number, field: keyof SuggestedEntry, value: any) => {
    setSuggestedEntries(prev =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeEntry = (index: number) => {
    setSuggestedEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const selectedEntries = suggestedEntries
      .filter(entry => entry.selected)
      .map(({ selected, ...entry }) => entry);

    if (selectedEntries.length === 0) {
      toast({
        title: "Nenhum lançamento selecionado",
        description: "Selecione ao menos um lançamento para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onImport(selectedEntries);
      toast({
        title: "Lançamentos importados!",
        description: `${selectedEntries.length} lançamentos foram adicionados.`,
      });
      setOpen(false);
      setSuggestedEntries([]);
      setFileName("");
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: "Não foi possível salvar os lançamentos.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const selectedCount = suggestedEntries.filter(e => e.selected).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Importar Extrato com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Extrato Bancário com IA
          </DialogTitle>
          <DialogDescription>
            Faça upload de um extrato bancário em PDF. A IA irá extrair os lançamentos para você revisar e editar antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload Section */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {bancos.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Selecionar PDF
                </>
              )}
            </Button>

            {fileName && (
              <Badge variant="secondary" className="gap-2">
                {fileName}
              </Badge>
            )}
          </div>

          {/* Results Section */}
          {suggestedEntries.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} de {suggestedEntries.length} lançamentos selecionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAll(true)}
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAll(false)}
                  >
                    Desmarcar todos
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead>Movimentação</TableHead>
                      <TableHead className="w-28">Recebido</TableHead>
                      <TableHead className="w-28">Enviado</TableHead>
                      <TableHead className="w-36">Plano de Contas</TableHead>
                      <TableHead className="w-32">Forma Pgto</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestedEntries.map((entry, index) => (
                      <TableRow 
                        key={index} 
                        className={!entry.selected ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleEntry(index)}
                          >
                            {entry.selected ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={entry.data}
                            onChange={(e) => updateEntry(index, 'data', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={entry.movimentacao}
                            onChange={(e) => updateEntry(index, 'movimentacao', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.valor_recebido || ""}
                            onChange={(e) => updateEntry(index, 'valor_recebido', parseFloat(e.target.value) || 0)}
                            className="w-full text-success"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.valor_enviado || ""}
                            onChange={(e) => updateEntry(index, 'valor_enviado', parseFloat(e.target.value) || 0)}
                            className="w-full text-danger"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.plano_de_contas}
                            onValueChange={(v) => updateEntry(index, 'plano_de_contas', v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {planosDeContas.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={entry.forma_de_pagamento}
                            onChange={(e) => updateEntry(index, 'forma_de_pagamento', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEntry(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Analisando extrato com inteligência artificial...
              </p>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {!isProcessing && suggestedEntries.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12 text-center">
              <FileUp className="h-16 w-16 text-muted-foreground/50" />
              <div>
                <p className="font-medium">Nenhum extrato carregado</p>
                <p className="text-sm text-muted-foreground">
                  Selecione o banco e faça upload de um arquivo PDF
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedCount === 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Importar {selectedCount} Lançamentos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
