import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface SalespersonGoalKPIProps {
  salespersonName: string;
  month: number;
  year: number;
  currentSales: number;
}

export function SalespersonGoalKPI({ salespersonName, month, year, currentSales }: SalespersonGoalKPIProps) {
  const [goal, setGoal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoal();
  }, [salespersonName, month, year]);

  const loadGoal = async () => {
    try {
      // We need to find goals that match the salesperson name
      // Since salesperson_goals has user_id, we need to query differently
      const { data } = await supabase
        .from('salesperson_goals')
        .select('*')
        .eq('salesperson_name', salespersonName)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle();

      if (data) {
        setGoal(data.goal_vendas);
      } else {
        setGoal(0);
      }
    } catch (err) {
      console.error('Error loading goal:', err);
      setGoal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const progress = goal > 0 ? Math.min((currentSales / goal) * 100, 100) : 0;
  const remaining = goal - currentSales;
  const isComplete = currentSales >= goal && goal > 0;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-20 bg-muted/20 rounded" />
      </div>
    );
  }

  if (goal === 0) {
    return null; // Don't show if no goal is set
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${isComplete ? 'bg-success/20' : 'bg-warning/20'}`}>
          <Target className={`h-5 w-5 ${isComplete ? 'text-success' : 'text-warning'}`} />
        </div>
        <div>
          <h3 className="font-semibold">Meta do Mês</h3>
          <p className="text-xs text-muted-foreground">
            {isComplete ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(remaining, 0))}`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Realizado</span>
          <span className="font-medium">{formatCurrency(currentSales)}</span>
        </div>
        
        <Progress 
          value={progress} 
          className={`h-3 ${isComplete ? '[&>div]:bg-success' : '[&>div]:bg-warning'}`}
        />
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Meta</span>
          <span className="font-medium">{formatCurrency(goal)}</span>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progresso</span>
            <span className={`text-lg font-bold ${isComplete ? 'text-success' : 'text-warning'}`}>
              {progress.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
