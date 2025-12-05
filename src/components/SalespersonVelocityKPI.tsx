import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalespersonVelocityKPIProps {
  salespersonName: string;
  month: number;
  year: number;
  currentSales: number;
}

export function SalespersonVelocityKPI({ salespersonName, month, year, currentSales }: SalespersonVelocityKPIProps) {
  const [goalValue, setGoalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoal();
  }, [salespersonName, month, year]);

  const loadGoal = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('salesperson_goals')
        .select('goal_vendas')
        .eq('salesperson_name', salespersonName)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle();

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
    elapsedDays = currentDay;
    remainingDays = daysInMonth - currentDay;
  } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
    elapsedDays = daysInMonth;
    remainingDays = 0;
  } else {
    elapsedDays = 0;
    remainingDays = daysInMonth;
  }

  // Calculate velocities
  const currentDailyRate = elapsedDays > 0 ? currentSales / elapsedDays : 0;
  const requiredDailyRate = remainingDays > 0 && goalValue > currentSales 
    ? (goalValue - currentSales) / remainingDays 
    : 0;

  // Project end-of-month result based on current pace
  const projectedTotal = elapsedDays > 0 
    ? currentDailyRate * daysInMonth 
    : 0;

  // Calculate if on track
  const isOnTrack = projectedTotal >= goalValue;
  const projectedDifference = projectedTotal - goalValue;

  // Velocity ratio
  const velocityRatio = requiredDailyRate > 0 ? currentDailyRate / requiredDailyRate : 
    (goalValue > 0 && currentSales >= goalValue ? 999 : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="glass rounded-xl p-6 h-40 bg-muted/20"></div>
        <div className="glass rounded-xl p-6 h-40 bg-muted/20"></div>
      </div>
    );
  }

  if (goalValue === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Velocidade de Vendas */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Velocidade de Vendas</h3>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Vendas/Dia Atual</span>
              <span className="text-base font-bold text-primary">
                {formatCurrency(currentDailyRate)}
              </span>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Necessário/Dia</span>
              <span className={`text-base font-bold ${requiredDailyRate === 0 ? 'text-green-500' : 'text-foreground'}`}>
                {requiredDailyRate > 0 ? formatCurrency(requiredDailyRate) : '✓'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {elapsedDays}d passados • {remainingDays}d restantes
              </span>
            </div>
            {velocityRatio > 0 && velocityRatio < 999 && (
              <span className={`font-medium ${velocityRatio >= 1 ? 'text-green-500' : 'text-orange-500'}`}>
                {(velocityRatio * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Projeção */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Projeção do Mês</h3>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Meta</span>
              <span className="text-base font-bold">
                {formatCurrency(goalValue)}
              </span>
            </div>
            <div className={`p-3 rounded-lg border ${
              isOnTrack 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-orange-500/10 border-orange-500/30'
            }`}>
              <span className="text-xs text-muted-foreground block mb-1">Projeção</span>
              <span className={`text-base font-bold ${isOnTrack ? 'text-green-500' : 'text-orange-500'}`}>
                {elapsedDays > 0 ? formatCurrency(projectedTotal) : '---'}
              </span>
            </div>
          </div>

          {elapsedDays > 0 && (
            <div className={`p-2 rounded-lg text-xs ${
              isOnTrack ? 'bg-green-500/10' : 'bg-orange-500/10'
            }`}>
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {isOnTrack ? (
                  <span className="text-green-500">
                    +{formatCurrency(projectedDifference)} acima da meta
                  </span>
                ) : (
                  <span className="text-orange-500">
                    {formatCurrency(Math.abs(projectedDifference))} abaixo da meta
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
