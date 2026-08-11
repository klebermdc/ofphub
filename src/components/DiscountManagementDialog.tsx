import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useDiscounts, Discount } from '@/hooks/useDiscounts';

interface DiscountManagementDialogProps {
  salespeople: string[];
  month: number;
  year: number;
  onSaved?: () => void;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function DiscountManagementDialog({ 
  salespeople,
  month,
  year,
  onSaved
}: DiscountManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [entries, setEntries] = useState<Discount[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [amountInputs, setAmountInputs] = useState<Record<number, string>>({});

  const { discounts, saveDiscounts } = useDiscounts(selectedMonth, selectedYear);

  const sanitizedSalespeople = useMemo(
    () => Array.from(new Set(salespeople.map((sp) => sp?.trim()).filter((sp): sp is string => Boolean(sp))))
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [salespeople]
  );

  const commissionImpact = (entry: Discount) =>
    (Number(entry.amount) || 0) * ((Number(entry.commission_percentage) || 0) / 100);

  const discountTotalsBySalesperson = useMemo(() => {
    return entries.reduce<Record<string, number>>((acc, entry) => {
      const name = entry.salesperson_name?.trim();
      if (!name || entry.amount <= 0) return acc;
      acc[name] = (acc[name] || 0) + commissionImpact(entry);
      return acc;
    }, {});
  }, [entries]);

  useEffect(() => {
    if (open) {
      setSelectedMonth(month);
      setSelectedYear(year);
    }
  }, [open, month, year]);

  // Sync entries when discounts change (period change or initial load)
  useEffect(() => {
    if (open) {
      setEntries([...discounts]);
      setAmountInputs({});
    }
  }, [open, discounts]);

  // Allow multiple discount entries per salesperson (no filtering)

  const handleAddEntry = () => {
    const first = sanitizedSalespeople[0] || '';
    if (!first) {
      toast.error('Nenhum vendedor disponível');
      return;
    }
    setEntries([...entries, {
      salesperson_name: first,
      amount: 0,
      description: '',
      order_date: '',
      order_number: '',
      commission_amount: 0,
      commission_percentage: 0,
    }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntry = (index: number, field: keyof Discount, value: string | number) => {
    const updated = [...entries];
    if (field === 'amount' || field === 'commission_amount' || field === 'commission_percentage') {
      const strVal = String(value);
      if (field === 'amount') {
        setAmountInputs(prev => ({ ...prev, [index]: strVal }));
      }
      (updated[index] as any)[field] = strVal === '' ? 0 : Number(strVal) || 0;
    } else {
      (updated[index] as any)[field] = value as string;
    }
    setEntries(updated);
  };

  const getAmountInputValue = (index: number, amount: number) => {
    if (amountInputs[index] !== undefined) return amountInputs[index];
    return amount === 0 ? '' : String(amount);
  };

  const handleSave = async () => {
    const incompleteEntry = entries.find(e => e.salesperson_name.trim() !== '' && e.amount > 0 && !e.description?.trim());
    if (incompleteEntry) {
      toast.error('Informe a descrição de cada desconto lançado');
      return;
    }

    const validEntries = entries
      .filter(e => e.salesperson_name.trim() !== '' && e.amount > 0)
      .map(e => ({ ...e, salesperson_name: e.salesperson_name.trim(), description: e.description?.trim() || '' }));
    
    setIsSaving(true);
    const success = await saveDiscounts(validEntries, selectedMonth, selectedYear);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Percent className="h-4 w-4" />
          Gerenciar Descontos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Descontos dos Vendedores</DialogTitle>
          <DialogDescription>
            Selecione o período e lance os descontos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Mês</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs">Ano</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t" />

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum desconto lançado para {monthNames[selectedMonth - 1]} {selectedYear}.
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
                        {sanitizedSalespeople.map(sp => (
                          <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36 space-y-1">
                    <Label htmlFor={`amount-${index}`} className="text-xs">Desconto (R$)</Label>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      inputMode="numeric"
                      value={getAmountInputValue(index, entry.amount)}
                      onChange={(e) => handleUpdateEntry(index, 'amount', e.target.value)}
                      onFocus={(e) => {
                        if (entry.amount === 0) {
                          setAmountInputs(prev => ({ ...prev, [index]: '' }));
                        }
                        e.target.select();
                      }}
                      onBlur={() => {
                        setAmountInputs(prev => {
                          const next = { ...prev };
                          delete next[index];
                          return next;
                        });
                      }}
                      placeholder="500"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`order-date-${index}`} className="text-xs">Data do pedido</Label>
                    <Input
                      id={`order-date-${index}`}
                      type="date"
                      value={entry.order_date || ''}
                      onChange={(e) => handleUpdateEntry(index, 'order_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`order-num-${index}`} className="text-xs">Pedido</Label>
                    <Input
                      id={`order-num-${index}`}
                      value={entry.order_number || ''}
                      onChange={(e) => handleUpdateEntry(index, 'order_number', e.target.value)}
                      placeholder="Ex: 12345"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`comm-pct-${index}`} className="text-xs">Porcentagem (%)</Label>
                    <Input
                      id={`comm-pct-${index}`}
                      type="number"
                      inputMode="decimal"
                      value={entry.commission_percentage ? String(entry.commission_percentage) : ''}
                      onChange={(e) => handleUpdateEntry(index, 'commission_percentage', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`desc-${index}`} className="text-xs">Descrição do desconto</Label>
                  <Input
                    id={`desc-${index}`}
                    value={entry.description || ''}
                    onChange={(e) => handleUpdateEntry(index, 'description', e.target.value)}
                    placeholder="Ex: Adiantamento referente ao pedido 123"
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
              Total de descontos (comissão): <span className="font-mono text-destructive">{formatCurrency(entries.reduce((sum, e) => sum + commissionImpact(e), 0))}</span>
            </p>
            {Object.keys(discountTotalsBySalesperson).length > 0 && (
              <div className="mb-3 space-y-1 rounded-md border p-3 text-sm">
                {Object.entries(discountTotalsBySalesperson).map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between gap-3">
                    <span className="break-words text-muted-foreground">{name}</span>
                    <span className="shrink-0 font-mono text-destructive">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : `Salvar Descontos - ${monthNames[selectedMonth - 1]} ${selectedYear}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}