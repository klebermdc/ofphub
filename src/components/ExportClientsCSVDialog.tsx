import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseOrderDate, getMonthName } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

interface OrderRow {
  id: string;
  data: string | null;
  cliente: string | null;
  email_cliente: string | null;
  telefone_cliente: string | null;
  pedido: string | null;
  vendedor: string | null;
  produto: string | null;
  fornecedor: string | null;
  venda: number | null;
  comissao_total: number | null;
}

const PAGE = 1000;

async function fetchAllOrders(): Promise<OrderRow[]> {
  const rows: OrderRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,data,cliente,email_cliente,telefone_cliente,pedido,vendedor,produto,fornecedor,venda,comissao_total")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as OrderRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getMonthKey(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const p = parseOrderDate(dateStr);
  if (!p) return null;
  return `${String(p.month).padStart(2, "0")}/${p.year}`;
}

export function ExportClientsCSVDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("all");
  const [selectedProduto, setSelectedProduto] = useState<string>("all");
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [onlyWithEmail, setOnlyWithEmail] = useState<"all" | "email" | "phone" | "either">("all");
  const [dedupe, setDedupe] = useState<"none" | "email" | "client">("email");

  useEffect(() => {
    if (!open || orders.length > 0) return;
    setLoading(true);
    fetchAllOrders()
      .then(setOrders)
      .catch((e) => toast({ title: "Erro ao carregar pedidos", description: String(e.message ?? e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, orders.length]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const k = getMonthKey(o.data);
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      return yB - yA || mB - mA;
    });
  }, [orders]);

  const availableVendedores = useMemo(
    () => Array.from(new Set(orders.map((o) => o.vendedor).filter(Boolean) as string[])).sort(),
    [orders],
  );
  const availableProdutos = useMemo(
    () => Array.from(new Set(orders.map((o) => o.produto).filter(Boolean) as string[])).sort(),
    [orders],
  );
  const availableFornecedores = useMemo(
    () => Array.from(new Set(orders.map((o) => o.fornecedor).filter(Boolean) as string[])).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const hasRange = !!(dateRange.from || dateRange.to);
    const fromT = dateRange.from ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()).getTime() : -Infinity;
    const toT = dateRange.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59).getTime() : Infinity;
    const term = search.trim().toLowerCase();

    return orders.filter((o) => {
      if (term) {
        const match =
          (o.cliente?.toLowerCase().includes(term) ?? false) ||
          (o.email_cliente?.toLowerCase().includes(term) ?? false) ||
          (o.pedido?.toLowerCase().includes(term) ?? false);
        if (!match) return false;
      }
      if (hasRange) {
        const p = parseOrderDate(o.data ?? "");
        if (!p) return false;
        const t = new Date(p.year, p.month - 1, p.day).getTime();
        if (t < fromT || t > toT) return false;
      } else if (selectedMonth !== "all") {
        if (getMonthKey(o.data) !== selectedMonth) return false;
      }
      if (selectedVendedor !== "all" && o.vendedor !== selectedVendedor) return false;
      if (selectedProduto !== "all" && o.produto !== selectedProduto) return false;
      if (selectedFornecedor !== "all" && o.fornecedor !== selectedFornecedor) return false;

      const hasEmail = !!o.email_cliente?.trim();
      const hasPhone = !!o.telefone_cliente?.trim();
      if (onlyWithEmail === "email" && !hasEmail) return false;
      if (onlyWithEmail === "phone" && !hasPhone) return false;
      if (onlyWithEmail === "either" && !hasEmail && !hasPhone) return false;

      return true;
    });
  }, [orders, search, dateRange, selectedMonth, selectedVendedor, selectedProduto, selectedFornecedor, onlyWithEmail]);

  const exportRows = useMemo(() => {
    if (dedupe === "none") return filtered;
    const seen = new Set<string>();
    const out: OrderRow[] = [];
    for (const o of filtered) {
      const key =
        dedupe === "email"
          ? (o.email_cliente?.trim().toLowerCase() || `__no_email__${o.id}`)
          : (o.cliente?.trim().toLowerCase() || `__no_name__${o.id}`);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(o);
    }
    return out;
  }, [filtered, dedupe]);

  const handleDownload = () => {
    if (exportRows.length === 0) {
      toast({ title: "Nenhum cliente encontrado", description: "Ajuste os filtros e tente novamente.", variant: "destructive" });
      return;
    }
    const headers = [
      "Nome",
      "Email",
      "Telefone",
      "Data",
      "Pedido",
      "Vendedor",
      "Produto",
      "Fornecedor",
      "Venda (R$)",
      "Comissão Total (R$)",
    ];
    const lines = [headers.join(",")];
    for (const o of exportRows) {
      lines.push(
        [
          csvEscape(o.cliente),
          csvEscape(o.email_cliente),
          csvEscape(o.telefone_cliente),
          csvEscape(o.data),
          csvEscape(o.pedido),
          csvEscape(o.vendedor),
          csvEscape(o.produto),
          csvEscape(o.fornecedor),
          csvEscape((o.venda ?? 0).toFixed(2).replace(".", ",")),
          csvEscape((o.comissao_total ?? 0).toFixed(2).replace(".", ",")),
        ].join(","),
      );
    }
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV gerado", description: `${exportRows.length} cliente(s) exportado(s).` });
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedVendedor("all");
    setSelectedProduto("all");
    setSelectedFornecedor("all");
    setSearch("");
    setDateRange({});
    setOnlyWithEmail("all");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Clientes (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar relatório de clientes</DialogTitle>
          <DialogDescription>
            Use os filtros abaixo para selecionar os pedidos. O CSV inclui nome, email, telefone e dados do pedido.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando pedidos...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Buscar (nome, email ou pedido)</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite para filtrar..." />
              </div>

              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {availableMonths.map((m) => {
                      const [mm, yy] = m.split("/");
                      return <SelectItem key={m} value={m}>{getMonthName(parseInt(mm))} {yy}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Intervalo de datas</Label>
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-10 flex-1 justify-start text-xs gap-1", !dateRange.from && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {dateRange.from ? format(dateRange.from, "dd/MM/yy", { locale: ptBR }) : "Inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange({ ...dateRange, from: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-10 flex-1 justify-start text-xs gap-1", !dateRange.to && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {dateRange.to ? format(dateRange.to, "dd/MM/yy", { locale: ptBR }) : "Final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange({ ...dateRange, to: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  {(dateRange.from || dateRange.to) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateRange({})}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vendedores</SelectItem>
                    {availableVendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Produto</Label>
                <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {availableProdutos.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fornecedores</SelectItem>
                    {availableFornecedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Filtrar contatos</Label>
                <Select value={onlyWithEmail} onValueChange={(v) => setOnlyWithEmail(v as typeof onlyWithEmail)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="email">Apenas com email</SelectItem>
                    <SelectItem value="phone">Apenas com telefone</SelectItem>
                    <SelectItem value="either">Com email ou telefone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Remover duplicados</Label>
                <Select value={dedupe} onValueChange={(v) => setDedupe(v as typeof dedupe)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Por email</SelectItem>
                    <SelectItem value="client">Por nome do cliente</SelectItem>
                    <SelectItem value="none">Manter todos os pedidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{filtered.length} pedido(s)</Badge>
                <Badge>{exportRows.length} linha(s) no CSV</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" /> Limpar filtros
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          <Button onClick={handleDownload} disabled={loading || exportRows.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> Baixar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
