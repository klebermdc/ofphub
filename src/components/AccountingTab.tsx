import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
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

export function AccountingTab({ userId }: AccountingTabProps) {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useAccountingEntries(userId);
  const [newEntry, setNewEntry] = useState<NewEntry>(emptyEntry);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<NewEntry>(emptyEntry);
  const [isAdding, setIsAdding] = useState(false);

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

  // Calculate totals
  const totalRecebido = entries.reduce((sum, e) => sum + e.valor_recebido, 0);
  const totalEnviado = entries.reduce((sum, e) => sum + e.valor_enviado, 0);
  const saldo = totalRecebido - totalEnviado;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Add Button */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>
      )}

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
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
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
    </div>
  );
}
