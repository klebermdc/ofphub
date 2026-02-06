import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Discount } from '@/hooks/useDiscounts';

interface DiscountManagementDialogProps {
  discounts: Discount[];
  onSave: (entries: Discount[]) => Promise<boolean>;
  salespeople: string[];
  month: number;
  year: number;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function DiscountManagementDialog({ 
  discounts, 
  onSave, 
  salespeople,
  month,
  year 
}: DiscountManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Discount[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEntries([...discounts]);
    }
  }, [open, discounts]);

  const handleAddEntry = () => {
    const firstAvailable = availableSalespeople[0] || '';
    setEntries([...entries, { salesperson_name: firstAvailable, amount: 0, description: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntry = (index: number, field: keyof Discount, value: string | number) => {
    const updated = [...entries];
    if (field === 'amount') {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setEntries(updated);
  };

  const handleSave = async () => {
    const validEntries = entries.filter(e => e.salesperson_name.trim() !== '' && e.amount > 0);
    
    setIsSaving(true);
    const success = await onSave(validEntries);
    setIsSaving(false);

    if (success) {
      toast.success('Descontos salvos com sucesso');
      setOpen(false);
    } else {
      toast.error('Erro ao salvar descontos');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Get salespeople that are not yet added
  const availableSalespeople = salespeople.filter(
    sp => !entries.some(e => e.salesperson_name === sp)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Percent className="h-4 w-4" />
          Gerenciar Descontos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Descontos dos Vendedores</DialogTitle>
          <DialogDescription>
            Lançar descontos para {monthNames[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum desconto lançado para este mês.
            </p>
          ) : (
            entries.map((entry, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`name-${index}`} className="text-xs">Vendedor</Label>
                    <Select
                      value={entry.salesperson_name}
                      onValueChange={(value) => handleUpdateEntry(index, 'salesperson_name', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entry.salesperson_name && (
                          <SelectItem value={entry.salesperson_name}>
                            {entry.salesperson_name}
                          </SelectItem>
                        )}
                        {availableSalespeople.map(sp => (
                          <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label htmlFor={`amount-${index}`} className="text-xs">Valor (R$)</Label>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      value={entry.amount}
                      onChange={(e) => handleUpdateEntry(index, 'amount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEntry(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`desc-${index}`} className="text-xs">Descrição (opcional)</Label>
                  <Input
                    id={`desc-${index}`}
                    value={entry.description || ''}
                    onChange={(e) => handleUpdateEntry(index, 'description', e.target.value)}
                    placeholder="Ex: Adiantamento, Vale, etc."
                  />
                </div>
              </div>
            ))
          )}

          <Button
            variant="outline"
            onClick={handleAddEntry}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Desconto
          </Button>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Total de descontos: <span className="font-mono text-destructive">{formatCurrency(entries.reduce((sum, e) => sum + e.amount, 0))}</span>
            </p>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Descontos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
