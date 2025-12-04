import { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GoalsKPICardProps {
  userId: string;
  month: number;
  year: number;
  totalSales: number;
}

export function GoalsKPICard({ userId, month, year, totalSales }: GoalsKPICardProps) {
  const [goalValue, setGoalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoal();
  }, [userId, month, year]);

  const loadGoal = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('sales_goals')
        .select('goal_vendas')
        .eq('user_id', userId)
        .eq('period_month', month)
        .eq('period_year', year)
        .single();

      if (data) {
        setGoalValue(data.goal_vendas);
      } else {
        setGoalValue(0);
      }
    } catch (err) {
      setGoalValue(0);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const progressPercent = goalValue > 0 ? (totalSales / goalValue) * 100 : 0;
  const isGoalMet = progressPercent >= 100;
  const difference = totalSales - goalValue;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-24 bg-muted/50 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Meta vs Realizado</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Meta */}
        <div className="p-4 bg-background/50 rounded-lg border border-border/50">
          <span className="text-xs text-muted-foreground block mb-1">Meta</span>
          <span className="text-xl font-bold">
            {goalValue > 0 ? formatCurrency(goalValue) : 'Não definida'}
          </span>
        </div>

        {/* Realizado */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-xs text-muted-foreground block mb-1">Realizado</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(totalSales)}
          </span>
        </div>
      </div>

      {goalValue > 0 && (
        <>
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-700 ${
                  isGoalMet 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                    : 'bg-gradient-to-r from-primary to-primary/70'
                }`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isGoalMet ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-medium">Meta atingida!</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Faltam {formatCurrency(Math.abs(difference))}
                  </span>
                </>
              )}
            </div>
            <span className={`text-lg font-bold ${isGoalMet ? 'text-green-500' : 'text-foreground'}`}>
              {progressPercent.toFixed(1)}%
            </span>
          </div>
        </>
      )}

      {goalValue === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Configure uma meta na aba Vendedores
        </p>
      )}
    </div>
  );
}