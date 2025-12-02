import { useState, useEffect } from 'react';
import { Target, Save, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SalesRep } from '@/types/sales';

interface SalesGoalsPanelProps {
  userId: string;
  month: number;
  year: number;
  salesReps: SalesRep[];
  totalSales: number;
}

interface SalespersonGoal {
  name: string;
  goal: number;
  current: number;
}

export function SalesGoalsPanel({ userId, month, year, salesReps, totalSales }: SalesGoalsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [totalGoal, setTotalGoal] = useState<number>(0);
  const [salespersonGoals, setSalespersonGoals] = useState<SalespersonGoal[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [userId, month, year, salesReps]);

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
      }
    } catch (err) {
      // No existing goals, that's fine
    }

    // Initialize salesperson goals from salesReps
    const goals = salesReps.map(rep => ({
      name: rep.name,
      goal: 0,
      current: rep.sales
    }));
    setSalespersonGoals(goals);
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
        title: "Metas salvas!",
        description: "As metas foram atualizadas com sucesso.",
      });
      setIsEditing(false);
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

  const progressPercent = totalGoal > 0 ? Math.min((totalSales / totalGoal) * 100, 100) : 0;

  const updateSalespersonGoal = (index: number, value: number) => {
    const updated = [...salespersonGoals];
    updated[index].goal = value;
    setSalespersonGoals(updated);
  };

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Metas de Vendas</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </>
          ) : (
            <>
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </>
          )}
        </Button>
      </div>

      {/* Meta Total */}
      <div className="mb-6 p-4 bg-background/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Meta Total</span>
          {isEditing ? (
            <Input
              type="number"
              value={totalGoal}
              onChange={(e) => setTotalGoal(Number(e.target.value))}
              className="w-32 h-8 text-right"
            />
          ) : (
            <span className="font-semibold">{formatCurrency(totalGoal)}</span>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Realizado</span>
          <span className="font-semibold text-primary">{formatCurrency(totalSales)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-3">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right mt-1">
          {progressPercent.toFixed(1)}% da meta
        </div>
      </div>

      {/* Metas por Vendedor */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-muted-foreground">Metas por Vendedor</span>
        <div className="max-h-[200px] overflow-y-auto space-y-2">
          {salespersonGoals.map((sp, index) => {
            const spProgress = sp.goal > 0 ? Math.min((sp.current / sp.goal) * 100, 100) : 0;
            return (
              <div key={sp.name} className="p-3 bg-background/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{sp.name.split(' ')[0]}</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={sp.goal || ''}
                      onChange={(e) => updateSalespersonGoal(index, Number(e.target.value))}
                      placeholder="Meta"
                      className="w-28 h-7 text-xs text-right"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {sp.goal > 0 ? formatCurrency(sp.goal) : 'Sem meta'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Atual: {formatCurrency(sp.current)}
                  </span>
                  {sp.goal > 0 && (
                    <span className={spProgress >= 100 ? 'text-green-500' : 'text-muted-foreground'}>
                      {spProgress.toFixed(0)}%
                    </span>
                  )}
                </div>
                {sp.goal > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${spProgress >= 100 ? 'bg-green-500' : 'bg-primary/70'}`}
                      style={{ width: `${spProgress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}