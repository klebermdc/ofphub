import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Upload, FileSearch, AlertTriangle, CheckCircle2, XCircle, Loader2, ShieldCheck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";

type Severity = "critica" | "atencao";
interface Divergencia {
  tipo: "FALTANDO_NO_BANCO" | "FALTANDO_NO_RELATORIO" | "VALOR_DIVERGENTE" | "COMISSAO_DIVERGENTE" | "DADOS_DIVERGENTES";
  severidade: Severity;
  descricao: string;
  issues?: string[];
  relatorio: any;
  banco: any;
}

interface AuditResult {
  summary: {
    arquivo: string;
    periodo: { inicio: string | null; fim: string | null };
    pedidos_no_relatorio: number;
    pedidos_no_banco: number;
    pedidos_conferidos: number;
    faltando_no_banco: number;
    faltando_no_relatorio: number;
    valor_divergente: number;
    comissao_divergente: number;
    total_relatorio: number;
    total_banco: number;
    diferenca_total: number;
    comissao_total_relatorio: number;
    comissao_total_banco: number;
    total_divergencias: number;
  };
  divergencias: Divergencia[];
}

const TIPO_LABEL: Record<string, string> = {
  FALTANDO_NO_BANCO: "Faltando no Banco",
  FALTANDO_NO_RELATORIO: "Faltando no Relatório",
  VALOR_DIVERGENTE: "Valor Divergente",
  COMISSAO_DIVERGENTE: "Comissão Divergente",
  DADOS_DIVERGENTES: "Dados Divergentes",
};

export function JustTravelAuditCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Envie um PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setResult(null);
    setFilterTipo(null);

    try {
      const pdfBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("audit-just-travel", {
        body: {
          pdfBase64,
          fileName: file.name,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na auditoria");
      setResult(data as AuditResult);
      toast({
        title: "Auditoria concluída",
        description: `${data.summary.total_divergencias} divergência(s) encontrada(s).`,
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na auditoria", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const rows: string[] = [
      ["Tipo", "Severidade", "Pedido (Relatório)", "Cliente (Relatório)", "Valor (Relatório)", "Pedido (Banco)", "Cliente (Banco)", "Valor (Banco)", "Diferença", "Descrição"]
        .map((s) => `"${s}"`).join(","),
    ];
    for (const d of result.divergencias) {
      const r = d.relatorio || {};
      const b = d.banco || {};
      const valR = Number(r.valor || 0);
      const valB = Number(b.venda || 0);
      rows.push([
        TIPO_LABEL[d.tipo] || d.tipo,
        d.severidade,
        r.pedido || "",
        (r.cliente || "").replace(/"/g, "'"),
        valR.toFixed(2),
        b.pedido || "",
        (b.cliente || "").replace(/"/g, "'"),
        valB.toFixed(2),
        (valR - valB).toFixed(2),
        (d.descricao || "").replace(/"/g, "'"),
      ].map((s) => `"${s}"`).join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-just-travel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = result
    ? (filterTipo ? result.divergencias.filter((d) => d.tipo === filterTipo) : result.divergencias)
    : [];

  const reset = () => {
    setResult(null);
    setFileName(null);
    setPeriodStart("");
    setPeriodEnd("");
    setFilterTipo(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="glass border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Auditoria IA — Just Travel
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Powered by AI
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Confere o relatório do fornecedor Just Travel contra nosso banco de dados e aponta divergências críticas (valor, comissão, pedidos faltantes).
              </CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <FileSearch className="h-4 w-4" />
                Conferir Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Auditoria do Relatório Just Travel
                </DialogTitle>
                <DialogDescription>
                  Envie o PDF do relatório. A IA extrai cada pedido e compara com o banco para detectar divergências.
                </DialogDescription>
              </DialogHeader>

              {!result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ps">Período início (opcional)</Label>
                      <Input id="ps" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="pe">Período fim (opcional)</Label>
                      <Input id="pe" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se vazio, a IA tenta detectar o período do próprio relatório. Recomendamos preencher para máxima precisão.
                  </p>

                  <div
                    className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 transition-colors cursor-pointer"
                    onClick={() => !loading && fileRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (loading) return;
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFile(f);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <div>
                          <p className="font-medium">Analisando {fileName}...</p>
                          <p className="text-sm text-muted-foreground">A IA está extraindo cada pedido e cruzando com o banco. Isso pode levar até 60s.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-10 w-10 text-primary" />
                        <div>
                          <p className="font-medium">Clique ou arraste o PDF do relatório Just Travel</p>
                          <p className="text-sm text-muted-foreground">PDF até 20MB. Análise por Gemini 2.5 Pro com tolerância de R$ 0,01.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result && (
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SummaryTile label="No Relatório" value={result.summary.pedidos_no_relatorio.toString()} />
                    <SummaryTile label="No Banco" value={result.summary.pedidos_no_banco.toString()} />
                    <SummaryTile label="Conferidos" value={result.summary.pedidos_conferidos.toString()} tone="ok" />
                    <SummaryTile label="Divergências" value={result.summary.total_divergencias.toString()} tone={result.summary.total_divergencias > 0 ? "danger" : "ok"} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SummaryTile label="Total Relatório" value={formatCurrency(result.summary.total_relatorio)} />
                    <SummaryTile label="Total Banco" value={formatCurrency(result.summary.total_banco)} />
                    <SummaryTile
                      label="Diferença"
                      value={formatCurrency(result.summary.diferenca_total)}
                      tone={Math.abs(result.summary.diferenca_total) > 0.01 ? "danger" : "ok"}
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <FilterChip active={filterTipo === null} onClick={() => setFilterTipo(null)}>
                      Todas ({result.divergencias.length})
                    </FilterChip>
                    {result.summary.faltando_no_banco > 0 && (
                      <FilterChip active={filterTipo === "FALTANDO_NO_BANCO"} onClick={() => setFilterTipo("FALTANDO_NO_BANCO")} tone="danger">
                        Faltando no Banco ({result.summary.faltando_no_banco})
                      </FilterChip>
                    )}
                    {result.summary.faltando_no_relatorio > 0 && (
                      <FilterChip active={filterTipo === "FALTANDO_NO_RELATORIO"} onClick={() => setFilterTipo("FALTANDO_NO_RELATORIO")} tone="danger">
                        Faltando no Relatório ({result.summary.faltando_no_relatorio})
                      </FilterChip>
                    )}
                    {result.summary.valor_divergente > 0 && (
                      <FilterChip active={filterTipo === "VALOR_DIVERGENTE"} onClick={() => setFilterTipo("VALOR_DIVERGENTE")} tone="danger">
                        Valor ({result.summary.valor_divergente})
                      </FilterChip>
                    )}
                    {result.summary.comissao_divergente > 0 && (
                      <FilterChip active={filterTipo === "COMISSAO_DIVERGENTE"} onClick={() => setFilterTipo("COMISSAO_DIVERGENTE")} tone="danger">
                        Comissão ({result.summary.comissao_divergente})
                      </FilterChip>
                    )}
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
                        <Download className="h-4 w-4" /> CSV
                      </Button>
                      <Button size="sm" variant="ghost" onClick={reset}>Nova auditoria</Button>
                    </div>
                  </div>

                  {/* List */}
                  <ScrollArea className="flex-1 -mx-2 px-2">
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle2 className="h-12 w-12 text-success mb-3" />
                        <p className="font-medium">Nenhuma divergência nesta categoria.</p>
                        <p className="text-sm text-muted-foreground">O relatório bate com o banco.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map((d, i) => (
                          <DivergenciaItem key={i} d={d} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>Use sempre que receber o fechamento da Just Travel para validar valores antes de pagar/receber.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-lg bg-card/50 border border-border/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

function FilterChip({ children, active, onClick, tone }: { children: React.ReactNode; active: boolean; onClick: () => void; tone?: "danger" }) {
  const base = "px-3 py-1 rounded-full text-xs font-medium transition-colors border";
  const activeCls = tone === "danger"
    ? "bg-destructive/15 border-destructive/40 text-destructive"
    : "bg-primary/15 border-primary/40 text-primary";
  const idle = "bg-card/40 border-border/50 text-muted-foreground hover:bg-card/70";
  return (
    <button onClick={onClick} className={`${base} ${active ? activeCls : idle}`}>
      {children}
    </button>
  );
}

function DivergenciaItem({ d }: { d: Divergencia }) {
  const isCritical = d.severidade === "critica";
  const Icon = isCritical ? XCircle : AlertTriangle;
  const colorCls = isCritical ? "text-destructive" : "text-warning";
  const borderCls = isCritical ? "border-destructive/30" : "border-warning/30";

  return (
    <div className={`rounded-lg border ${borderCls} bg-card/40 p-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colorCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={isCritical ? "destructive" : "secondary"}>{TIPO_LABEL[d.tipo] || d.tipo}</Badge>
          </div>
          <p className="text-sm break-words">{d.descricao}</p>
          {d.issues && d.issues.length > 1 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
              {d.issues.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
            {d.relatorio && (
              <div className="rounded bg-background/50 p-2">
                <div className="font-semibold text-muted-foreground mb-1">📄 No Relatório</div>
                <div><span className="text-muted-foreground">Pedido:</span> {d.relatorio.pedido || "-"}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {d.relatorio.cliente || "-"}</div>
                <div><span className="text-muted-foreground">Produto:</span> {d.relatorio.produto || "-"}</div>
                <div><span className="text-muted-foreground">Data:</span> {d.relatorio.data || "-"}</div>
                <div><span className="text-muted-foreground">Valor:</span> {formatCurrency(Number(d.relatorio.valor || 0))}</div>
                {d.relatorio.comissao ? <div><span className="text-muted-foreground">Comissão:</span> {formatCurrency(Number(d.relatorio.comissao))}</div> : null}
              </div>
            )}
            {d.banco && (
              <div className="rounded bg-background/50 p-2">
                <div className="font-semibold text-muted-foreground mb-1">🗄️ No Banco</div>
                <div><span className="text-muted-foreground">Pedido:</span> {d.banco.pedido || "-"}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {d.banco.cliente || "-"}</div>
                <div><span className="text-muted-foreground">Produto:</span> {d.banco.produto || "-"}</div>
                <div><span className="text-muted-foreground">Data:</span> {d.banco.data || "-"}</div>
                <div><span className="text-muted-foreground">Vendedor:</span> {d.banco.vendedor || "-"}</div>
                <div><span className="text-muted-foreground">Valor:</span> {formatCurrency(Number(d.banco.venda || 0))}</div>
                <div><span className="text-muted-foreground">Comissão:</span> {formatCurrency(Number(d.banco.comissao || 0))}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
