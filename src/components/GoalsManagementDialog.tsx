import { useState, useEffect } from 'react';
import { Target, Save, Sparkles, Loader2 } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseOrderDate } from '@/utils/dateUtils';

interface GoalsManagementDialogProps {
  userId: string;
  month: number;
  year: number;
  salesReps: SalesRep[];
  onGoalsSaved?: () => void;
}

interface SalespersonGoal {
  name: string;
  goal: number;
}

export function GoalsManagementDialog({ userId, month, year, salesReps, onGoalsSaved }: GoalsManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [totalGoal, setTotalGoal] = useState<number>(0);
  const [resultGoal, setResultGoal] = useState<number>(0);
  const [salespersonGoals, setSalespersonGoals] = useState<SalespersonGoal[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadGoals();
    }
  }, [open, userId, month, year, salesReps]);

  const loadGoals = async () => {
    try {
      // Load total goal
      const { data: totalData } = await supabase
        .from('sales_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle();

      if (totalData) {
        setTotalGoal(totalData.goal_vendas);
        setResultGoal((totalData as any).goal_resultado || 0);
      } else {
        setTotalGoal(0);
        setResultGoal(0);
      }

      // Load individual salesperson goals
      const { data: individualData } = await supabase
        .from('salesperson_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year);

      // Initialize goals for all salesReps
      const goalsMap = new Map<string, number>();
      (individualData || []).forEach((g: any) => {
        goalsMap.set(g.salesperson_name, g.goal_vendas);
      });

      const initialGoals = salesReps.map(rep => ({
        name: rep.name,
        goal: goalsMap.get(rep.name) || 0
      }));

      setSalespersonGoals(initialGoals);
    } catch (err) {
      console.error('Error loading goals:', err);
      setTotalGoal(0);
      setResultGoal(0);
      setSalespersonGoals(salesReps.map(rep => ({ name: rep.name, goal: 0 })));
    }
  };

  const handleSalespersonGoalChange = (name: string, value: number) => {
    setSalespersonGoals(prev => {
      const updated = prev.map(g => g.name === name ? { ...g, goal: value } : g);
      // Auto-update total goal based on sum of individual goals
      const newTotal = updated.reduce((sum, g) => sum + g.goal, 0);
      setTotalGoal(newTotal);
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save total goal
      const { error: totalError } = await supabase
        .from('sales_goals')
        .upsert({
          user_id: userId,
          period_month: month,
          period_year: year,
          goal_vendas: totalGoal,
          goal_comissao: 0,
          goal_negocios: 0,
          goal_resultado: resultGoal
        } as any, {
          onConflict: 'user_id,period_month,period_year'
        });

      if (totalError) throw totalError;

      // Save individual salesperson goals
      for (const spGoal of salespersonGoals) {
        const { error: spError } = await supabase
          .from('salesperson_goals')
          .upsert({
            user_id: userId,
            salesperson_name: spGoal.name,
            period_month: month,
            period_year: year,
            goal_vendas: spGoal.goal
          }, {
            onConflict: 'user_id,salesperson_name,period_month,period_year'
          });

        if (spError) throw spError;
      }

      toast({
        title: "Metas salvas!",
        description: "As metas foram atualizadas com sucesso.",
      });
      setOpen(false);
      onGoalsSaved?.();
    } catch (err) {
      console.error('Error saving goals:', err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as metas.",
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

  const sumOfIndividualGoals = salespersonGoals.reduce((sum, g) => sum + g.goal, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Gerenciar Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Metas de Vendas</DialogTitle>
          <DialogDescription>
            Configure as metas para {monthNames[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="result-goal">Meta de Resultado (Lucro)</Label>
                <Input
                  id="result-goal"
                  type="number"
                  value={resultGoal || ''}
                  onChange={(e) => setResultGoal(Number(e.target.value))}
                  placeholder="Ex: 50000"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Lucro esperado no mês (Receita - Custos)
                </p>
              </div>
            </div>

            {/* Individual Salesperson Goals */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Metas por Vendedor</h4>
                <span className="text-xs text-muted-foreground">
                  Soma: {formatCurrency(sumOfIndividualGoals)}
                </span>
              </div>
              
              <div className="space-y-3">
                {salespersonGoals.map(spGoal => (
                  <div key={spGoal.name} className="flex items-center gap-3">
                    <span className="text-sm min-w-[100px] truncate">
                      {spGoal.name.split(' ')[0]}
                    </span>
                    <Input
                      type="number"
                      value={spGoal.goal || ''}
                      onChange={(e) => handleSalespersonGoalChange(spGoal.name, Number(e.target.value))}
                      placeholder="Meta"
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>

              {salespersonGoals.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum vendedor ativo no período
                </p>
              )}
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Metas"}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
