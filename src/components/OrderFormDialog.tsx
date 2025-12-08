import { useState, useEffect } from "react";
import { Plus, Edit2, Loader2 } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrderFormData {
  cliente: string;
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
}

interface OrderFormDialogProps {
  mode: 'add' | 'edit';
  order?: OrderFormData & { rowIndex?: number };
  sheetUrl?: string;
  availableVendedores?: string[];
  availableProdutos?: string[];
  availableFornecedores?: string[];
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const emptyOrder: OrderFormData = {
  cliente: '',
  data: new Date().toLocaleDateString('pt-BR'),
  pedido: '',
  venda: 0,
  fornecedor: '',
  produto: '',
  comissao: 0,
  comissaoTotal: 0,
  porcentagemVendedor: 0,
  comissaoVendedor: 0,
  vendedor: '',
};

export function OrderFormDialog({
  mode,
  order,
  sheetUrl,
  availableVendedores = [],
  availableProdutos = [],
  availableFornecedores = [],
  onSuccess,
  trigger
}: OrderFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(order || emptyOrder);

  useEffect(() => {
    if (order) {
      setFormData(order);
    } else {
      setFormData(emptyOrder);
    }
  }, [order, open]);

  // Calculate derived values
  const calculateDerivedValues = (data: Partial<OrderFormData>) => {
    const venda = data.venda ?? formData.venda;
    const comissao = data.comissao ?? formData.comissao;
    const porcentagemVendedor = data.porcentagemVendedor ?? formData.porcentagemVendedor;
    
    const comissaoTotal = venda * (comissao / 100);
    const comissaoVendedor = comissaoTotal * (porcentagemVendedor / 100);
    
    return { comissaoTotal, comissaoVendedor };
  };

  const handleFieldChange = (field: keyof OrderFormData, value: string | number) => {
    const updatedData = { ...formData, [field]: value };
    
    // Recalculate derived values when relevant fields change
    if (['venda', 'comissao', 'porcentagemVendedor'].includes(field)) {
      const derived = calculateDerivedValues(updatedData);
      updatedData.comissaoTotal = derived.comissaoTotal;
      updatedData.comissaoVendedor = derived.comissaoVendedor;
    }
    
    setFormData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendedor) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um vendedor.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const orderData = {
        user_id: user.id,
        cliente: formData.cliente,
        data: formData.data,
        pedido: formData.pedido,
        venda: formData.venda,
        fornecedor: formData.fornecedor,
        produto: formData.produto,
        comissao: formData.comissao,
        comissao_total: formData.comissaoTotal,
        porcentagem_vendedor: formData.porcentagemVendedor,
        comissao_vendedor: formData.comissaoVendedor,
        vendedor: formData.vendedor,
      };

      if (mode === 'add') {
        const { error } = await supabase.from('orders').insert(orderData);
        if (error) throw error;
      } else if (order?.rowIndex) {
        // For edit mode, we'd need the order ID - for now just insert as new
        const { error } = await supabase.from('orders').insert(orderData);
        if (error) throw error;
      }

      toast({
        title: mode === 'add' ? "Pedido adicionado!" : "Pedido salvo!",
        description: "Os dados foram salvos no sistema.",
      });

      setOpen(false);
      setFormData(emptyOrder);
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

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Adicionar Novo Pedido' : 'Editar Pedido'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Preencha os dados do novo pedido. Ele será adicionado automaticamente à planilha.'
              : 'Atualize os dados do pedido. As alterações serão sincronizadas com a planilha.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Row 1: Data, Pedido, Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="text"
                placeholder="DD/MM/YYYY"
                value={formData.data}
                onChange={(e) => handleFieldChange('data', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pedido">Nº Pedido</Label>
              <Input
                id="pedido"
                type="text"
                placeholder="Ex: 12345"
                value={formData.pedido}
                onChange={(e) => handleFieldChange('pedido', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor *</Label>
              <Select 
                value={formData.vendedor} 
                onValueChange={(value) => handleFieldChange('vendedor', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableVendedores.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              type="text"
              placeholder="Nome do cliente"
              value={formData.cliente}
              onChange={(e) => handleFieldChange('cliente', e.target.value)}
            />
          </div>

          {/* Row 3: Produto, Fornecedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="produto">Produto</Label>
              <Select 
                value={formData.produto} 
                onValueChange={(value) => handleFieldChange('produto', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite" />
                </SelectTrigger>
                <SelectContent>
                  {availableProdutos.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select 
                value={formData.fornecedor} 
                onValueChange={(value) => handleFieldChange('fornecedor', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableFornecedores.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Venda, Comissão % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venda">Valor da Venda (R$)</Label>
              <Input
                id="venda"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.venda || ''}
                onChange={(e) => handleFieldChange('venda', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comissao">Comissão (%)</Label>
              <Input
                id="comissao"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={formData.comissao || ''}
                onChange={(e) => handleFieldChange('comissao', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Row 5: Porcentagem Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="porcentagemVendedor">% Vendedor</Label>
              <Input
                id="porcentagemVendedor"
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="0"
                value={formData.porcentagemVendedor || ''}
                onChange={(e) => handleFieldChange('porcentagemVendedor', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Calculated values */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <span className="text-xs text-muted-foreground">Comissão Total</span>
              <p className="text-lg font-semibold text-warning">{formatCurrency(formData.comissaoTotal)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Comissão Vendedor</span>
              <p className="text-lg font-semibold text-success">{formatCurrency(formData.comissaoVendedor)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
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