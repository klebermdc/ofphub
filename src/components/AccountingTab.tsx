import { useState, useMemo, useRef } from "react";
import { Plus, Trash2, Edit2, Save, X, Download, Upload, FileText, File } from "lucide-react";
import { InterBankBalance } from "@/components/InterBankBalance";
import { BankStatementImportDialog } from "@/components/BankStatementImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountingEntry, useAccountingEntries } from "@/hooks/useAccountingEntries";
import { useAccountingFiles } from "@/hooks/useAccountingFiles";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface AccountingTabProps {
  userId: string | undefined;
}

const formasPagamento = [
  "Dinheiro",
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Transferência",
  "Cheque",
];

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
  "Outros",
];

const categoriesFiles = [
  "NF Fornecedor",
  "Extrato Bancário",
  "Comprovante",
  "Contrato",
  "Outro",
];

interface NewEntry {
  data: string;
  valor_recebido: string;
  valor_enviado: string;
  movimentacao: string;
  cliente: string;
  nf: string;
  plano_de_contas: string;
  justificativa: string;
  forma_de_pagamento: string;
  banco: string;
}

const emptyEntry: NewEntry = {
  data: new Date().toISOString().split("T")[0],
  valor_recebido: "",
  valor_enviado: "",
  movimentacao: "",
  cliente: "",
  nf: "",
  plano_de_contas: "",
  justificativa: "",
  forma_de_pagamento: "",
  banco: "",
};

const months = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function AccountingTab({ userId }: AccountingTabProps) {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useAccountingEntries(userId);
  const { files, isLoading: filesLoading, uploadFile, deleteFile, downloadFile } = useAccountingFiles(userId);
  const [newEntry, setNewEntry] = useState<NewEntry>(emptyEntry);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<NewEntry>(emptyEntry);
  const [isAdding, setIsAdding] = useState(false);
  
  // Filters
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("NF Fornecedor");
  const [isUploading, setIsUploading] = useState(false);

  // Get available years from entries
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    entries.forEach(entry => {
      const year = entry.data.split("-")[0];
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const [year, month] = entry.data.split("-");
      
      if (filterMonth !== "all" && month !== filterMonth) return false;
      if (filterYear !== "all" && year !== filterYear) return false;
      if (filterPayment !== "all" && entry.forma_de_pagamento !== filterPayment) return false;
      
      return true;
    });
  }, [entries, filterMonth, filterYear, filterPayment]);

  const handleAdd = async () => {
    if (!newEntry.data) return;
    
    const success = await addEntry({
      data: newEntry.data,
      valor_recebido: parseFloat(newEntry.valor_recebido) || 0,
      valor_enviado: parseFloat(newEntry.valor_enviado) || 0,
      movimentacao: newEntry.movimentacao || null,
      cliente: newEntry.cliente || null,
      nf: newEntry.nf || null,
      plano_de_contas: newEntry.plano_de_contas || null,
      justificativa: newEntry.justificativa || null,
      forma_de_pagamento: newEntry.forma_de_pagamento || null,
      banco: newEntry.banco || null,
    });

    if (success) {
      setNewEntry(emptyEntry);
      setIsAdding(false);
    }
  };

  const handleEdit = (entry: AccountingEntry) => {
    setEditingId(entry.id);
    setEditEntry({
      data: entry.data,
      valor_recebido: String(entry.valor_recebido),
      valor_enviado: String(entry.valor_enviado),
      movimentacao: entry.movimentacao || "",
      cliente: entry.cliente || "",
      nf: entry.nf || "",
      plano_de_contas: entry.plano_de_contas || "",
      justificativa: entry.justificativa || "",
      forma_de_pagamento: entry.forma_de_pagamento || "",
      banco: entry.banco || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const success = await updateEntry(editingId, {
      data: editEntry.data,
      valor_recebido: parseFloat(editEntry.valor_recebido) || 0,
      valor_enviado: parseFloat(editEntry.valor_enviado) || 0,
      movimentacao: editEntry.movimentacao || null,
      cliente: editEntry.cliente || null,
      nf: editEntry.nf || null,
      plano_de_contas: editEntry.plano_de_contas || null,
      justificativa: editEntry.justificativa || null,
      forma_de_pagamento: editEntry.forma_de_pagamento || null,
      banco: editEntry.banco || null,
    });

    if (success) {
      setEditingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  // Calculate totals from filtered entries
  const totalRecebido = filteredEntries.reduce((sum, e) => sum + e.valor_recebido, 0);
  const totalEnviado = filteredEntries.reduce((sum, e) => sum + e.valor_enviado, 0);
  const saldo = totalRecebido - totalEnviado;

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    const headers = ["Data", "Valor Recebido", "Valor Enviado", "Movimentação", "Cliente", "NF", "Plano de Contas", "Justificativa", "Forma de Pagamento", "Banco"];
    
    const csvContent = [
      headers.join(";"),
      ...filteredEntries.map(entry => [
        formatDate(entry.data),
        entry.valor_recebido,
        entry.valor_enviado,
        entry.movimentacao || "",
        entry.cliente || "",
        entry.nf || "",
        entry.plano_de_contas || "",
        entry.justificativa || "",
        entry.forma_de_pagamento || "",
        entry.banco || "",
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contabilidade_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Exportado!", description: "Arquivo CSV baixado com sucesso." });
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(18);
    doc.text("Relatório Contábil", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total Recebido: ${formatCurrency(totalRecebido)}`, 14, 40);
    doc.text(`Total Enviado: ${formatCurrency(totalEnviado)}`, 14, 48);
    doc.text(`Saldo: ${formatCurrency(saldo)}`, 14, 56);
    
    // Table headers
    const headers = ["Data", "Recebido", "Enviado", "Movimentação", "Cliente", "NF", "Plano", "Forma Pgto", "Banco"];
    let y = 70;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    headers.forEach((header, i) => {
      doc.text(header, 14 + i * 30, y);
    });
    
    doc.setFont("helvetica", "normal");
    y += 8;
    
    filteredEntries.slice(0, 30).forEach((entry) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatDate(entry.data), 14, y);
      doc.text(entry.valor_recebido > 0 ? formatCurrency(entry.valor_recebido) : "-", 44, y);
      doc.text(entry.valor_enviado > 0 ? formatCurrency(entry.valor_enviado) : "-", 74, y);
      doc.text((entry.movimentacao || "-").substring(0, 12), 104, y);
      doc.text((entry.cliente || "-").substring(0, 12), 134, y);
      doc.text((entry.nf || "-").substring(0, 8), 164, y);
      doc.text((entry.plano_de_contas || "-").substring(0, 10), 194, y);
      doc.text((entry.forma_de_pagamento || "-").substring(0, 10), 224, y);
      doc.text((entry.banco || "-").substring(0, 10), 254, y);
      y += 6;
    });
    
    doc.save(`contabilidade_${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "PDF exportado!", description: "Arquivo baixado com sucesso." });
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    await uploadFile(file, uploadCategory);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banco Inter Balance */}
      <InterBankBalance />

      {/* Filters and Actions */}
      <div className="glass rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pagamento:</span>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {formasPagamento.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Recebido</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRecebido)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Enviado</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalEnviado)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(saldo)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        )}
        <BankStatementImportDialog
          onImport={async (entries) => {
            for (const entry of entries) {
              await addEntry({
                data: entry.data,
                valor_recebido: entry.valor_recebido,
                valor_enviado: entry.valor_enviado,
                movimentacao: entry.movimentacao || null,
                cliente: entry.cliente || null,
                nf: null,
                plano_de_contas: entry.plano_de_contas || null,
                justificativa: entry.justificativa || null,
                forma_de_pagamento: entry.forma_de_pagamento || null,
                banco: entry.banco || null,
              });
            }
          }}
        />
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="glass rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Novo Lançamento</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              type="date"
              value={newEntry.data}
              onChange={(e) => setNewEntry({ ...newEntry, data: e.target.value })}
              placeholder="Data"
            />
            <Input
              type="number"
              step="0.01"
              value={newEntry.valor_recebido}
              onChange={(e) => setNewEntry({ ...newEntry, valor_recebido: e.target.value })}
              placeholder="Valor Recebido"
            />
            <Input
              type="number"
              step="0.01"
              value={newEntry.valor_enviado}
              onChange={(e) => setNewEntry({ ...newEntry, valor_enviado: e.target.value })}
              placeholder="Valor Enviado"
            />
            <Input
              value={newEntry.movimentacao}
              onChange={(e) => setNewEntry({ ...newEntry, movimentacao: e.target.value })}
              placeholder="Movimentação"
            />
            <Input
              value={newEntry.cliente}
              onChange={(e) => setNewEntry({ ...newEntry, cliente: e.target.value })}
              placeholder="Cliente"
            />
            <Input
              value={newEntry.nf}
              onChange={(e) => setNewEntry({ ...newEntry, nf: e.target.value })}
              placeholder="NF"
            />
            <Select
              value={newEntry.plano_de_contas}
              onValueChange={(v) => setNewEntry({ ...newEntry, plano_de_contas: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Plano de Contas" />
              </SelectTrigger>
              <SelectContent>
                {planosDeContas.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newEntry.justificativa}
              onChange={(e) => setNewEntry({ ...newEntry, justificativa: e.target.value })}
              placeholder="Justificativa"
            />
            <Select
              value={newEntry.forma_de_pagamento}
              onValueChange={(v) => setNewEntry({ ...newEntry, forma_de_pagamento: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Forma de Pagamento" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newEntry.banco}
              onValueChange={(v) => setNewEntry({ ...newEntry, banco: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                {bancos.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm">
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsAdding(false); setNewEntry(emptyEntry); }}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor Recebido</TableHead>
                <TableHead>Valor Enviado</TableHead>
                <TableHead>Movimentação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Plano de Contas</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    {editingId === entry.id ? (
                      <>
                        <TableCell>
                          <Input
                            type="date"
                            value={editEntry.data}
                            onChange={(e) => setEditEntry({ ...editEntry, data: e.target.value })}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editEntry.valor_recebido}
                            onChange={(e) => setEditEntry({ ...editEntry, valor_recebido: e.target.value })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editEntry.valor_enviado}
                            onChange={(e) => setEditEntry({ ...editEntry, valor_enviado: e.target.value })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editEntry.movimentacao}
                            onChange={(e) => setEditEntry({ ...editEntry, movimentacao: e.target.value })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editEntry.cliente}
                            onChange={(e) => setEditEntry({ ...editEntry, cliente: e.target.value })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editEntry.nf}
                            onChange={(e) => setEditEntry({ ...editEntry, nf: e.target.value })}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editEntry.plano_de_contas}
                            onValueChange={(v) => setEditEntry({ ...editEntry, plano_de_contas: v })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {planosDeContas.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editEntry.justificativa}
                            onChange={(e) => setEditEntry({ ...editEntry, justificativa: e.target.value })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editEntry.forma_de_pagamento}
                            onValueChange={(v) => setEditEntry({ ...editEntry, forma_de_pagamento: v })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {formasPagamento.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editEntry.banco}
                            onValueChange={(v) => setEditEntry({ ...editEntry, banco: v })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {bancos.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{formatDate(entry.data)}</TableCell>
                        <TableCell className="text-success">
                          {entry.valor_recebido > 0 ? formatCurrency(entry.valor_recebido) : "-"}
                        </TableCell>
                        <TableCell className="text-danger">
                          {entry.valor_enviado > 0 ? formatCurrency(entry.valor_enviado) : "-"}
                        </TableCell>
                        <TableCell>{entry.movimentacao || "-"}</TableCell>
                        <TableCell>{entry.cliente || "-"}</TableCell>
                        <TableCell>{entry.nf || "-"}</TableCell>
                        <TableCell>{entry.plano_de_contas || "-"}</TableCell>
                        <TableCell>{entry.justificativa || "-"}</TableCell>
                        <TableCell>{entry.forma_de_pagamento || "-"}</TableCell>
                        <TableCell>{entry.banco || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(entry)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="glass rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Arquivos e Documentos
        </h3>
        
        <div className="flex flex-wrap items-center gap-4">
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categoriesFiles.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Enviando..." : "Upload Arquivo"}
          </Button>
        </div>

        {/* Files List */}
        {filesLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando arquivos...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">Nenhum arquivo enviado</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">{file.category}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => downloadFile(file.file_path, file.file_name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteFile(file.id, file.file_path)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
