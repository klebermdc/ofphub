import { useState, useEffect } from "react";
import { Plus, Edit2, Loader2, CalendarIcon, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getOFPCommission } from "@/utils/orderCommission";

interface ProductLineItem {
  produto: string;
  fornecedor: string;
  venda: number;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
  guia: string;
  comissaoGuia: number;
}

interface OrderFormData {
  cliente: string;
  emailCliente: string;
  data: string;
  pedido: string;
  vendedor: string;
  status: string;
  items: ProductLineItem[];
}

// Legacy single-product interface for edit mode
interface OrderFormDataLegacy {
  cliente: string;
  emailCliente: string;
  data: string;
  pedido: string;
  venda: number;
  fornecedor: string;
  produto: string;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
  vendedor: string;
  status: string;
  guia?: string;
  comissaoGuia?: number;
}

interface OrderFormDialogProps {
  mode: 'add' | 'edit';
  order?: OrderFormDataLegacy & { rowIndex?: number; id?: string };
  sheetUrl?: string;
  availableVendedores?: string[];
  availableProdutos?: string[];
  availableFornecedores?: string[];
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const emptyItem: ProductLineItem = {
  produto: '',
  fornecedor: '',
  venda: 0,
  comissao: 0,
  comissaoTotal: 0,
  porcentagemVendedor: 0,
  comissaoVendedor: 0,
  guia: '',
  comissaoGuia: 0,
};

const emptyOrder: OrderFormData = {
  cliente: '',
  emailCliente: '',
  data: new Date().toLocaleDateString('pt-BR'),
  pedido: '',
  vendedor: '',
  status: 'Pendente',
  items: [{ ...emptyItem }],
};

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00');
  }
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]), 12);
  }
  return undefined;
}

// Pre-fill rules by product category
const COMMISSION_PRESETS: Record<string, { comissao: number; porcentagemVendedor: number; porcentagemVendedorEspecial: number }> = {
  'ingresso': { comissao: 4.5, porcentagemVendedor: 20, porcentagemVendedorEspecial: 30 },
  'hotel': { comissao: 8, porcentagemVendedor: 30, porcentagemVendedorEspecial: 40 },
  'seguro': { comissao: 20, porcentagemVendedor: 30, porcentagemVendedorEspecial: 40 },
  'carro': { comissao: 10, porcentagemVendedor: 30, porcentagemVendedorEspecial: 40 },
};

const PRODUTOS_PERMITIDOS = [
  'Ingresso',
  'Carro',
  'Guiamento',
  'Chip',
  'Seguro',
  'Hotel',
  'Parcele JT',
  'Ingressos',
  'Up Grade',
  'Casa',
];

const VENDEDORES_ESPECIAIS = ['maria gabriela', 'gabriela'];

function getCommissionPreset(produto: string, vendedor: string): { comissao: number; porcentagemVendedor: number } | null {
  const produtoLower = produto.toLowerCase();
  const vendedorLower = vendedor.toLowerCase().trim();
  const isEspecial = VENDEDORES_ESPECIAIS.some(v => vendedorLower.includes(v));

  for (const [key, preset] of Object.entries(COMMISSION_PRESETS)) {
    if (produtoLower.includes(key)) {
      return {
        comissao: preset.comissao,
        porcentagemVendedor: isEspecial ? preset.porcentagemVendedorEspecial : preset.porcentagemVendedor,
      };
    }
  }
  return null;
}

function calcItem(item: ProductLineItem, vendedor: string): ProductLineItem {
  const isGuiamento = item.produto.toLowerCase().includes('guiamento');
  const isSite = vendedor.trim().toLowerCase() === 'site';
  // Guiamento is always 100% commission (OFP product)
  const effectiveComissao = isGuiamento ? 100 : item.comissao;
  const comissaoTotal = item.venda * (effectiveComissao / 100);

  // Vendedor "Site" não recebe comissão — tudo fica para a OFP (ou guia, em guiamento)
  if (isSite) {
    if (isGuiamento && item.guia) {
      const isKleber = item.guia.trim().toLowerCase() === 'kleber';
      const comissaoGuia = isKleber ? item.venda : item.venda * 0.5;
      return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia };
    }
    return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia: 0 };
  }

  if (isGuiamento && item.guia) {
    const guiaLower = item.guia.trim().toLowerCase();
    const vendLower = vendedor.trim().toLowerCase();
    const guiaIsVendedor = vendLower === guiaLower;
    const VENDEDOR_GUIAMENTO_PCT = 0.05;
    const isKleber = guiaLower === 'kleber';
    const isRafael = guiaLower === 'rafael';

    // REGRA 3 — Guia = Kleber (qualquer vendedor): vendedor 5%, OFP fica com o restante, Kleber 0
    if (isKleber) {
      if (guiaIsVendedor) {
        // Kleber também é o vendedor: sem comissão de vendedor, OFP fica com tudo
        return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia: 0 };
      }
      const comissaoVendedor = item.venda * VENDEDOR_GUIAMENTO_PCT;
      return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia: 0 };
    }

    // REGRA 2 — Guia = Rafael E vendedor = Rafael: sem comissão de vendedor, 50/50 sobre o BRUTO
    if (isRafael && guiaIsVendedor) {
      const comissaoGuia = item.venda * 0.5;
      return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia };
    }

    // REGRA 1 — Guia = Rafael (vendedor ≠ Rafael): vendedor 5%, líquido 50/50
    if (isRafael) {
      const comissaoVendedor = item.venda * VENDEDOR_GUIAMENTO_PCT;
      const comissaoGuia = (item.venda - comissaoVendedor) * 0.5;
      return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia };
    }

    // Fallback (outros guias): mesmo padrão Rafael (50/50)
    if (guiaIsVendedor) {
      const comissaoGuia = item.venda * 0.5;
      return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia };
    }
    const comissaoVendedor = item.venda * VENDEDOR_GUIAMENTO_PCT;
    const comissaoGuia = (item.venda - comissaoVendedor) * 0.5;
    return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia };
  }
  
  const comissaoVendedor = comissaoTotal * (item.porcentagemVendedor / 100);
  return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia: 0 };
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OrderFormDialog({
  mode,
  order,
  availableVendedores = [],
  availableProdutos = [],
  availableFornecedores = [],
  onSuccess,
  trigger
}: OrderFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(emptyOrder);

  const availableGuias = ['Rafael', 'Kleber'];

  useEffect(() => {
    // Only sync from props when the dialog OPENS — avoids overwriting user input
    // when the parent re-renders and passes a new `order` object reference.
    if (!open) return;
    if (order) {
      setFormData({
        cliente: order.cliente,
        emailCliente: order.emailCliente,
        data: order.data,
        pedido: order.pedido,
        vendedor: order.vendedor,
        status: order.status,
        items: [{
          produto: order.produto,
          fornecedor: order.fornecedor,
          venda: order.venda,
          comissao: order.comissao,
          comissaoTotal: order.comissaoTotal,
          porcentagemVendedor: order.porcentagemVendedor,
          comissaoVendedor: order.comissaoVendedor,
          guia: (order as any).guia || '',
          comissaoGuia: (order as any).comissaoGuia || 0,
        }],
      });
    } else {
      setFormData({ ...emptyOrder, items: [{ ...emptyItem }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleHeaderChange = (field: keyof Omit<OrderFormData, 'items'>, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'vendedor') {
        updated.items = prev.items.map(item => {
          const preset = getCommissionPreset(item.produto, value);
          const updatedItem = preset
            ? { ...item, comissao: preset.comissao, porcentagemVendedor: preset.porcentagemVendedor }
            : item;
          const previousVendedor = item.comissaoVendedor;
          const recalculated = calcItem(updatedItem, value);
          // Preservar comissão do vendedor manual
          return { ...recalculated, comissaoVendedor: previousVendedor };
        });
      }
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof ProductLineItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      // Auto-fill commission presets when product changes
      if (field === 'produto') {
        const preset = getCommissionPreset(String(value), prev.vendedor);
        if (preset) {
          newItems[index].comissao = preset.comissao;
          newItems[index].porcentagemVendedor = preset.porcentagemVendedor;
        }
      }
      // Recalculate when relevant fields change
      if (['venda', 'comissao', 'porcentagemVendedor', 'guia', 'produto'].includes(field)) {
        const previousGuia = newItems[index].comissaoGuia;
        const previousVendedor = newItems[index].comissaoVendedor;
        newItems[index] = calcItem(newItems[index], prev.vendedor);
        // Preservar comissaoVendedor manual EXCETO quando o usuário alterar a % do vendedor
        if (field !== 'porcentagemVendedor') {
          newItems[index].comissaoVendedor = previousVendedor;
        }
        // comissaoGuia: só auto-preencher quando guia/produto mudar
        if (!['guia', 'produto'].includes(field)) {
          newItems[index].comissaoGuia = previousGuia;
        }
      }
      // If user manually edits comissaoGuia or comissaoVendedor, don't recalculate
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Totals across all items
  const totalVenda = formData.items.reduce((s, i) => s + i.venda, 0);
  // Total Comissão = parte que fica para a OFP (líquido após vendedor e guia)
  const totalComissao = formData.items.reduce((s, i) => s + getOFPCommission(i), 0);
  const totalComissaoVendedor = formData.items.reduce((s, i) => s + i.comissaoVendedor, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendedor) {
      toast({ title: "Campo obrigatório", description: "Selecione um vendedor.", variant: "destructive" });
      return;
    }
    if (formData.items.some(i => !i.venda)) {
      toast({ title: "Campo obrigatório", description: "Preencha o valor da venda de todos os produtos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (mode === 'add') {
        // Insert one row per product
        const rows = formData.items.map(item => ({
          user_id: user.id,
          cliente: formData.cliente,
          email_cliente: formData.emailCliente,
          data: formData.data,
          pedido: formData.pedido,
          vendedor: formData.vendedor,
          status: formData.status,
          produto: item.produto,
          fornecedor: item.fornecedor,
          venda: item.venda,
          comissao: item.comissao,
          comissao_total: item.comissaoTotal,
          porcentagem_vendedor: item.porcentagemVendedor,
          comissao_vendedor: item.comissaoVendedor,
          guia: item.guia || null,
          comissao_guia: item.comissaoGuia,
        }));
        const { error } = await supabase.from('orders').insert(rows);
        if (error) throw error;
      } else {
        // Edit mode: update original item + insert any new items
        const firstItem = formData.items[0];
        const additionalItems = formData.items.slice(1);

        const buildRow = (item: ProductLineItem) => ({
          user_id: user.id,
          cliente: formData.cliente,
          email_cliente: formData.emailCliente,
          data: formData.data,
          pedido: formData.pedido,
          vendedor: formData.vendedor,
          status: formData.status,
          produto: item.produto,
          fornecedor: item.fornecedor,
          venda: item.venda,
          comissao: item.comissao,
          comissao_total: item.comissaoTotal,
          porcentagem_vendedor: item.porcentagemVendedor,
          comissao_vendedor: item.comissaoVendedor,
          guia: item.guia || null,
          comissao_guia: item.comissaoGuia,
        });

        const orderData = buildRow(firstItem);
        if (order?.id) {
          const { error } = await supabase.from('orders').update(orderData).eq('id', order.id);
          if (error) throw error;
        } else {
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('pedido', formData.pedido)
            .eq('vendedor', formData.vendedor)
            .eq('produto', firstItem.produto)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase.from('orders').update(orderData).eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('orders').insert(orderData);
            if (error) throw error;
          }
        }

        // Insert additional new products in the same order
        if (additionalItems.length > 0) {
          const newRows = additionalItems.map(item => buildRow(item));
          const { error } = await supabase.from('orders').insert(newRows);
          if (error) throw error;
        }
      }

      toast({
        title: mode === 'add' ? "Pedido adicionado!" : "Pedido salvo!",
        description: formData.items.length > 1
          ? `${formData.items.length} produtos foram salvos no sistema.`
          : "Os dados foram salvos no sistema.",
      });

      setOpen(false);
      setFormData({ ...emptyOrder, items: [{ ...emptyItem }] });
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar pedido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            {mode === 'add' ? <Plus className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            {mode === 'add' ? 'Novo Pedido' : 'Editar'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Adicionar Novo Pedido' : 'Editar Pedido'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Preencha os dados do pedido. Adicione múltiplos produtos se necessário.'
              : 'Atualize os dados do pedido.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Header: Data, Pedido, Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data do Pedido</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.data && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data || "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDate(formData.data)}
                    onSelect={(date) => {
                      if (date) handleHeaderChange('data', format(date, 'dd/MM/yyyy'));
                    }}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pedido">Nº Pedido</Label>
              <Input id="pedido" placeholder="Ex: 12345" value={formData.pedido} onChange={(e) => handleHeaderChange('pedido', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vendedor *</Label>
              <Select value={formData.vendedor} onValueChange={(v) => handleHeaderChange('vendedor', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {availableVendedores.filter(v => v && v.trim()).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input placeholder="Nome do cliente" value={formData.cliente} onChange={(e) => handleHeaderChange('cliente', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email do Cliente</Label>
              <Input type="email" placeholder="email@exemplo.com" value={formData.emailCliente} onChange={(e) => handleHeaderChange('emailCliente', e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleHeaderChange('status', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Produtos</Label>
              {(mode === 'add' || mode === 'edit') && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Adicionar Produto
                </Button>
              )}
            </div>

            {formData.items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative bg-card">
                {formData.items.length > 1 && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Produto {idx + 1}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Produto</Label>
                    <Select value={item.produto} onValueChange={(v) => handleItemChange(idx, 'produto', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PRODUTOS_PERMITIDOS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedor</Label>
                    <Select value={item.fornecedor} onValueChange={(v) => handleItemChange(idx, 'fornecedor', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {availableFornecedores.filter(f => f && f.trim()).map(f => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Guia selection - only for guiamento products */}
                {item.produto.toLowerCase().includes('guiamento') && (
                  <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
                    <Label className="text-xs font-semibold text-primary">🧭 Guiamento</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Guia</Label>
                        <Select value={item.guia || undefined} onValueChange={(v) => handleItemChange(idx, 'guia', v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o guia" /></SelectTrigger>
                          <SelectContent>
                            {availableGuias.map((guia) => {
                              const name = guia.trim().toLowerCase();
                              const isKleber = name === 'kleber';
                              const isRafael = name === 'rafael';
                              const label = isKleber ? ' (100%)' : isRafael ? ' (50%)' : '';
                              return (
                                <SelectItem key={guia} value={guia}>
                                  {guia}{label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      {item.guia && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Comissão Vendedor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9"
                              value={item.comissaoVendedor || ''}
                              onChange={(e) => handleItemChange(idx, 'comissaoVendedor', Number(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Pagamento Guia (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9"
                              value={item.comissaoGuia || ''}
                              onChange={(e) => handleItemChange(idx, 'comissaoGuia', Number(e.target.value) || 0)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    {item.guia && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                         {item.guia.trim().toLowerCase() === 'kleber'
                           ? (formData.vendedor.trim().toLowerCase() === 'kleber'
                               ? 'Kleber é o vendedor — recebe 100% sem desconto de comissão.'
                               : `Comissão do vendedor: ${formatCurrency(item.comissaoVendedor)} | Kleber recebe: ${formatCurrency(item.comissaoGuia)}`)
                           : (formData.vendedor.trim().toLowerCase() === item.guia.trim().toLowerCase()
                               ? `${item.guia} é o vendedor — recebe 50%: ${formatCurrency(item.comissaoGuia)}`
                               : `Comissão vendedor: ${formatCurrency(item.comissaoVendedor)} | ${item.guia} (50%): ${formatCurrency(item.comissaoGuia)}`)}
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                  const isGuia = item.produto.toLowerCase().includes('guiamento');
                  return (
                    <div className={`grid ${isGuia ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input className="h-9" type="number" step="0.01" min="0" placeholder="0.00"
                          value={item.venda || ''} onChange={(e) => handleItemChange(idx, 'venda', parseFloat(e.target.value) || 0)} />
                      </div>
                      {!isGuia && (
                        <div className="space-y-1">
                          <Label className="text-xs">Comissão (%)</Label>
                          <Input className="h-9" type="number" step="0.1" min="0" max="100" placeholder="0"
                            value={item.comissao || ''} onChange={(e) => handleItemChange(idx, 'comissao', parseFloat(e.target.value) || 0)} />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">% Vendedor</Label>
                        <Input className="h-9" type="number" step="1" min="0" max="100" placeholder="0"
                          value={item.porcentagemVendedor || ''} onChange={(e) => handleItemChange(idx, 'porcentagemVendedor', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  );
                })()}

                {/* Item calculated values */}
                <div className={`grid gap-3 pt-1 ${item.guia && item.produto.toLowerCase().includes('guiamento') ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Comissão: </span>
                    <span className="font-semibold text-warning">{formatCurrency(item.comissaoTotal)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Vendedor: </span>
                    <span className="font-semibold text-success">{formatCurrency(item.comissaoVendedor)}</span>
                  </div>
                  {item.guia && item.produto.toLowerCase().includes('guiamento') && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Guia: </span>
                      <span className="font-semibold text-primary">{formatCurrency(item.comissaoGuia)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Grand totals */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <span className="text-xs text-muted-foreground">Total Venda</span>
              <p className="text-lg font-semibold">{formatCurrency(totalVenda)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Comissão</span>
              <p className="text-lg font-semibold text-warning">{formatCurrency(totalComissao)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Vendedor</span>
              <p className="text-lg font-semibold text-success">{formatCurrency(totalComissaoVendedor)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {mode === 'edit' && order?.id && (
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                disabled={loading}
                onClick={async () => {
                  if (!confirm('Tem certeza que deseja registrar a devolução deste pedido?\n\nIsso criará um lançamento negativo para descontar a comissão do vendedor.')) return;
                  setLoading(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Usuário não autenticado");
                    const item = formData.items[0];
                    const refundRow = {
                      user_id: user.id,
                      cliente: formData.cliente,
                      email_cliente: formData.emailCliente,
                      data: format(new Date(), 'dd/MM/yyyy'),
                      pedido: formData.pedido ? `${formData.pedido} (DEV)` : '(DEV)',
                      vendedor: formData.vendedor,
                      status: 'Devolução',
                      produto: `↩ DEVOLUÇÃO - ${item.produto || 'Pedido'}`,
                      fornecedor: item.fornecedor,
                      venda: -Math.abs(item.venda),
                      comissao: item.comissao,
                      comissao_total: -Math.abs(item.comissaoTotal),
                      porcentagem_vendedor: item.porcentagemVendedor,
                      comissao_vendedor: -Math.abs(item.comissaoVendedor),
                      guia: (item.guia || null),
                      comissao_guia: item.comissaoGuia ? -Math.abs(item.comissaoGuia) : 0,
                    };
                    const { error } = await supabase.from('orders').insert(refundRow);
                    if (error) throw error;
                    // Also update original order status
                    await supabase.from('orders').update({ status: 'Devolvido' }).eq('id', order.id);
                    toast({ title: "Devolução registrada!", description: "O lançamento negativo foi criado e aparecerá no relatório do vendedor." });
                    setOpen(false);
                    onSuccess?.();
                  } catch (error) {
                    console.error(error);
                    toast({ title: "Erro", description: "Não foi possível registrar a devolução.", variant: "destructive" });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Devolução
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'add' ? 'Adicionar Pedido' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
