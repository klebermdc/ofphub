import { useState, useEffect } from "react";
import { Plus, Edit2, Loader2, CalendarIcon, Trash2 } from "lucide-react";
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

function calcItem(item: ProductLineItem, vendedor: string): ProductLineItem {
  const comissaoTotal = item.venda * (item.comissao / 100);
  const isGuiamento = item.produto.toLowerCase().includes('guiamento');
  
  if (isGuiamento && item.guia) {
    const guiaIsVendedor = vendedor === item.guia;
    
    if (item.guia === 'Kleber') {
      // Kleber gets 100% of the value (minus commission if vendedor is different)
      if (guiaIsVendedor) {
        // Kleber is the vendedor: no commission deduction, he gets everything
        return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia: item.venda };
      } else {
        // Different vendedor: deduct vendedor commission, Kleber gets the rest
        const comissaoVendedor = comissaoTotal * (item.porcentagemVendedor / 100);
        const comissaoGuia = item.venda - comissaoVendedor;
        return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia };
      }
    } else if (item.guia === 'Rafael') {
      // Rafael gets 50% of the payment
      if (guiaIsVendedor) {
        // Rafael is the vendedor: no commission deduction, he gets 50%
        const comissaoGuia = item.venda * 0.5;
        return { ...item, comissaoTotal, comissaoVendedor: 0, comissaoGuia };
      } else {
        // Different vendedor: deduct commission first, then Rafael gets 50% of total
        const comissaoVendedor = comissaoTotal * (item.porcentagemVendedor / 100);
        const comissaoGuia = item.venda * 0.5;
        return { ...item, comissaoTotal, comissaoVendedor, comissaoGuia };
      }
    }
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

  useEffect(() => {
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
  }, [order, open]);

  const handleHeaderChange = (field: keyof Omit<OrderFormData, 'items'>, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Recalculate items when vendedor changes (affects guiamento logic)
      if (field === 'vendedor') {
        updated.items = prev.items.map(item => calcItem(item, value));
      }
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof ProductLineItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (['venda', 'comissao', 'porcentagemVendedor', 'guia', 'produto'].includes(field)) {
        newItems[index] = calcItem(newItems[index], prev.vendedor);
      }
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
  const totalComissao = formData.items.reduce((s, i) => s + i.comissaoTotal, 0);
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
        // Edit mode: single product update
        const item = formData.items[0];
        const orderData = {
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
        };

        if (order?.id) {
          // Update by ID directly
          const { error } = await supabase.from('orders').update(orderData).eq('id', order.id);
          if (error) throw error;
        } else {
          // Fallback: lookup by pedido + vendedor + produto
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('pedido', formData.pedido)
            .eq('vendedor', formData.vendedor)
            .eq('produto', item.produto)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase.from('orders').update(orderData).eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('orders').insert(orderData);
            if (error) throw error;
          }
        }
      }

      toast({
        title: mode === 'add' ? "Pedido adicionado!" : "Pedido salvo!",
        description: mode === 'add' && formData.items.length > 1
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
                  {availableVendedores.map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
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
              {mode === 'add' && (
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
                        {availableProdutos.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedor</Label>
                    <Select value={item.fornecedor} onValueChange={(v) => handleItemChange(idx, 'fornecedor', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {availableFornecedores.map(f => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input className="h-9" type="number" step="0.01" min="0" placeholder="0.00"
                      value={item.venda || ''} onChange={(e) => handleItemChange(idx, 'venda', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Comissão (%)</Label>
                    <Input className="h-9" type="number" step="0.1" min="0" max="100" placeholder="0"
                      value={item.comissao || ''} onChange={(e) => handleItemChange(idx, 'comissao', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">% Vendedor</Label>
                    <Input className="h-9" type="number" step="1" min="0" max="100" placeholder="0"
                      value={item.porcentagemVendedor || ''} onChange={(e) => handleItemChange(idx, 'porcentagemVendedor', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Item calculated values */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Comissão: </span>
                    <span className="font-semibold text-warning">{formatCurrency(item.comissaoTotal)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Vendedor: </span>
                    <span className="font-semibold text-success">{formatCurrency(item.comissaoVendedor)}</span>
                  </div>
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
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'add' ? 'Adicionar Pedido' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
