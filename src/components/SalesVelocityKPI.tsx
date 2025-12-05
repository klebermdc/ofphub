import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalesVelocityKPIProps {
  userId: string;
  month: number;
  year: number;
  totalSales: number;
}

export function SalesVelocityKPI({ userId, month, year, totalSales }: SalesVelocityKPIProps) {
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
    } catch {
      setGoalValue(0);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Get days in the selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Get current date info
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  // Determine elapsed days based on if viewing current month or past/future
  let elapsedDays: number;
  let remainingDays: number;
  
  if (year === currentYear && month === currentMonth) {
    // Current month - use actual current day
    elapsedDays = currentDay;
    remainingDays = daysInMonth - currentDay;
  } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
    // Past month - all days elapsed
    elapsedDays = daysInMonth;
    remainingDays = 0;
  } else {
    // Future month - no days elapsed
    elapsedDays = 0;
    remainingDays = daysInMonth;
  }

  // Calculate velocities
  const currentDailyRate = elapsedDays > 0 ? totalSales / elapsedDays : 0;
  const requiredDailyRate = remainingDays > 0 && goalValue > totalSales 
    ? (goalValue - totalSales) / remainingDays 
    : 0;

  // Project end-of-month result based on current pace
  const projectedTotal = elapsedDays > 0 
    ? currentDailyRate * daysInMonth 
    : 0;

  // Calculate if on track
  const isOnTrack = projectedTotal >= goalValue;
  const projectedDifference = projectedTotal - goalValue;

  // Velocity ratio (how fast compared to needed)
  const velocityRatio = requiredDailyRate > 0 ? currentDailyRate / requiredDailyRate : 
    (goalValue > 0 && totalSales >= goalValue ? 999 : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="glass rounded-xl p-6 h-48 bg-muted/20"></div>
        <div className="glass rounded-xl p-6 h-48 bg-muted/20"></div>
      </div>
    );
  }

  if (goalValue === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
      {/* Velocidade de Vendas */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Velocidade de Vendas</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Vendas/Dia Atual</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(currentDailyRate)}
              </span>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Vendas/Dia Necessário</span>
              <span className={`text-lg font-bold ${requiredDailyRate === 0 ? 'text-green-500' : 'text-foreground'}`}>
                {requiredDailyRate > 0 ? formatCurrency(requiredDailyRate) : 'Meta atingida'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {elapsedDays} dias passados • {remainingDays} restantes
              </span>
            </div>
            {velocityRatio > 0 && velocityRatio < 999 && (
              <span className={`text-sm font-medium ${velocityRatio >= 1 ? 'text-green-500' : 'text-orange-500'}`}>
                {(velocityRatio * 100).toFixed(0)}% da velocidade
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Projeção de Resultado */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Projeção do Mês</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Meta</span>
              <span className="text-lg font-bold">
                {formatCurrency(goalValue)}
              </span>
            </div>
            <div className={`p-3 rounded-lg border ${
              isOnTrack 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-orange-500/10 border-orange-500/30'
            }`}>
              <span className="text-xs text-muted-foreground block mb-1">Projeção Final</span>
              <span className={`text-lg font-bold ${isOnTrack ? 'text-green-500' : 'text-orange-500'}`}>
                {elapsedDays > 0 ? formatCurrency(projectedTotal) : '---'}
              </span>
            </div>
          </div>

          {elapsedDays > 0 && (
            <div className={`p-3 rounded-lg ${
              isOnTrack ? 'bg-green-500/10' : 'bg-orange-500/10'
            }`}>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {isOnTrack ? (
                  <span className="text-sm text-green-500">
                    No ritmo atual, você superará a meta em {formatCurrency(projectedDifference)}
                  </span>
                ) : (
                  <span className="text-sm text-orange-500">
                    No ritmo atual, faltarão {formatCurrency(Math.abs(projectedDifference))} para a meta
                  </span>
                )}
              </div>
            </div>
          )}

          {elapsedDays === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Projeção disponível após início do mês
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
