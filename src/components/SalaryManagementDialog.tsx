import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SalaryEntry {
  id?: string;
  salesperson_name: string;
  salary: number;
}

interface SalaryManagementDialogProps {
  salaries: SalaryEntry[];
  onSave: (entries: SalaryEntry[]) => Promise<boolean>;
}

export function SalaryManagementDialog({ salaries, onSave }: SalaryManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEntries([...salaries]);
    }
  }, [open, salaries]);

  const handleAddEntry = () => {
    setEntries([...entries, { salesperson_name: '', salary: 0 }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntry = (index: number, field: 'salesperson_name' | 'salary', value: string | number) => {
    const updated = [...entries];
    if (field === 'salary') {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setEntries(updated);
  };

  const handleSave = async () => {
    const validEntries = entries.filter(e => e.salesperson_name.trim() !== '');
    
    if (validEntries.length === 0) {
      toast.error('Adicione pelo menos um vendedor');
      return;
    }

    setIsSaving(true);
    const success = await onSave(validEntries);
    setIsSaving(false);

    if (success) {
      toast.success('Salários salvos com sucesso');
      setOpen(false);
    } else {
      toast.error('Erro ao salvar salários');
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
          <Settings className="h-4 w-4" />
          Gerenciar Salários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salários Fixos dos Vendedores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`name-${index}`} className="text-xs">Nome</Label>
                <Input
                  id={`name-${index}`}
                  value={entry.salesperson_name}
                  onChange={(e) => handleUpdateEntry(index, 'salesperson_name', e.target.value)}
                  placeholder="Nome do vendedor"
                />
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor={`salary-${index}`} className="text-xs">Salário (R$)</Label>
                <Input
                  id={`salary-${index}`}
                  type="number"
                  value={entry.salary}
                  onChange={(e) => handleUpdateEntry(index, 'salary', e.target.value)}
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
          ))}

          <Button
            variant="outline"
            onClick={handleAddEntry}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Vendedor
          </Button>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Total: {formatCurrency(entries.reduce((sum, e) => sum + e.salary, 0))}
            </p>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
