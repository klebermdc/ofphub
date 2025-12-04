import { useState, useEffect } from 'react';
import { Target, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SalesRep } from '@/types/sales';

interface GoalsManagementDialogProps {
  userId: string;
  month: number;
  year: number;
  salesReps: SalesRep[];
}

export function GoalsManagementDialog({ userId, month, year, salesReps }: GoalsManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [totalGoal, setTotalGoal] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadGoals();
    }
  }, [open, userId, month, year]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year)
        .single();

      if (data) {
        setTotalGoal(data.goal_vendas);
      } else {
        setTotalGoal(0);
      }
    } catch (err) {
      setTotalGoal(0);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('sales_goals')
        .upsert({
          user_id: userId,
          period_month: month,
          period_year: year,
          goal_vendas: totalGoal,
          goal_comissao: 0,
          goal_negocios: 0
        }, {
          onConflict: 'user_id,period_month,period_year'
        });

      if (error) throw error;

      toast({
        title: "Meta salva!",
        description: "A meta de vendas foi atualizada com sucesso.",
      });
      setOpen(false);
    } catch (err) {
      console.error('Error saving goals:', err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a meta.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Gerenciar Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Metas de Vendas</DialogTitle>
          <DialogDescription>
            Configure a meta de faturamento para {monthNames[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Meta Total */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="total-goal">Meta Total de Faturamento</Label>
              <Input
                id="total-goal"
                type="number"
                value={totalGoal || ''}
                onChange={(e) => setTotalGoal(Number(e.target.value))}
                placeholder="Ex: 500000"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Valor total que a equipe deve faturar no mês
              </p>
            </div>
          </div>

          {/* Vendedores Ativos */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Vendedores Ativos no Período</h4>
            <div className="flex flex-wrap gap-2">
              {salesReps.map(rep => (
                <span 
                  key={rep.id} 
                  className="text-xs bg-background px-2 py-1 rounded"
                >
                  {rep.name.split(' ')[0]}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {salesReps.length} vendedor(es) com vendas no período
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Meta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}