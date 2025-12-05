import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, Calendar, Target, CircleDollarSign, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalesVelocityKPIProps {
  userId: string;
  month: number;
  year: number;
  totalSales: number;
  // For resultado projection
  currentComissaoTotal?: number;
  currentComissaoVendedor?: number;
  fixedCosts?: number; // salaries + marketing + operational
}

export function SalesVelocityKPI({ 
  userId, 
  month, 
  year, 
  totalSales,
  currentComissaoTotal = 0,
  currentComissaoVendedor = 0,
  fixedCosts = 0
}: SalesVelocityKPIProps) {
  const [goalValue, setGoalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dollarRate, setDollarRate] = useState<number | null>(null);

  useEffect(() => {
    loadGoal();
    fetchDollarRate();
  }, [userId, month, year]);

  const fetchDollarRate = async () => {
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      const data = await response.json();
      setDollarRate(parseFloat(data.USDBRL.bid));
    } catch (error) {
      console.error('Erro ao buscar cotação do dólar:', error);
    }
  };

  const loadGoal = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('sales_goals')
        .select('goal_vendas')
        .eq('user_id', userId)
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

  // Calculate velocities for sales
  const currentDailyRate = elapsedDays > 0 ? totalSales / elapsedDays : 0;
  const requiredDailyRate = remainingDays > 0 && goalValue > totalSales 
    ? (goalValue - totalSales) / remainingDays 
    : 0;

  // Project end-of-month sales based on current pace
  const projectedTotal = elapsedDays > 0 
    ? currentDailyRate * daysInMonth 
    : 0;

  // Calculate if on track for sales goal
  const isOnTrack = projectedTotal >= goalValue;
  const projectedDifference = projectedTotal - goalValue;

  // Velocity ratio
  const velocityRatio = requiredDailyRate > 0 ? currentDailyRate / requiredDailyRate : 
    (goalValue > 0 && totalSales >= goalValue ? 999 : 0);

  // === RESULTADO PROJECTION ===
  // Daily rates for comissões
  const dailyComissaoTotal = elapsedDays > 0 ? currentComissaoTotal / elapsedDays : 0;
  const dailyComissaoVendedor = elapsedDays > 0 ? currentComissaoVendedor / elapsedDays : 0;

  // Projected values
  const projectedComissaoTotal = dailyComissaoTotal * daysInMonth;
  const projectedComissaoVendedor = dailyComissaoVendedor * daysInMonth;
  const projectedImposto = projectedComissaoTotal * 0.12;

  // Custo Total projetado = Comissão Vendedor projetada + Custos Fixos + Imposto projetado
  const projectedCustoTotal = projectedComissaoVendedor + fixedCosts + projectedImposto;

  // Resultado projetado = Comissão Total projetada - Custo Total projetado
  const projectedResultado = projectedComissaoTotal - projectedCustoTotal;

  // Current resultado for comparison
  const currentImposto = currentComissaoTotal * 0.12;
  const currentResultado = currentComissaoTotal - (currentComissaoVendedor + fixedCosts + currentImposto);

  const isResultadoPositive = projectedResultado >= 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        <div className="glass rounded-xl p-6 h-48 bg-muted/20"></div>
        <div className="glass rounded-xl p-6 h-48 bg-muted/20"></div>
        <div className="glass rounded-xl p-6 h-48 bg-muted/20"></div>
      </div>
    );
  }

  if (goalValue === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
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
                {(velocityRatio * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Projeção de Faturamento */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Projeção Faturamento</h3>
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
              <span className="text-xs text-muted-foreground block mb-1">Projeção</span>
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
                    +{formatCurrency(projectedDifference)} acima da meta
                  </span>
                ) : (
                  <span className="text-sm text-orange-500">
                    {formatCurrency(Math.abs(projectedDifference))} abaixo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projeção de Resultado */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Projeção Resultado</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground block mb-1">Resultado Atual</span>
              <span className={`text-lg font-bold ${currentResultado >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(currentResultado)}
              </span>
            </div>
            <div className={`p-3 rounded-lg border ${
              isResultadoPositive 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <span className="text-xs text-muted-foreground block mb-1">Projeção</span>
              <span className={`text-lg font-bold ${isResultadoPositive ? 'text-green-500' : 'text-red-500'}`}>
                {elapsedDays > 0 ? formatCurrency(projectedResultado) : '---'}
              </span>
            </div>
          </div>

          {elapsedDays > 0 && (
            <div className={`p-3 rounded-lg ${
              isResultadoPositive ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4" />
                <span className={`text-sm ${isResultadoPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isResultadoPositive 
                    ? `Lucro projetado de ${formatCurrency(projectedResultado)}`
                    : `Prejuízo projetado de ${formatCurrency(Math.abs(projectedResultado))}`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Projeção em USD */}
          {elapsedDays > 0 && dollarRate && (
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className={`h-4 w-4 ${isResultadoPositive ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs text-muted-foreground">Projeção em USD</span>
                </div>
                <span className={`text-lg font-bold ${isResultadoPositive ? 'text-green-500' : 'text-red-500'}`}>
                  $ {(projectedResultado / dollarRate).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Cotação comercial</span>
                <span className="text-muted-foreground">R$ {dollarRate.toFixed(2)}</span>
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
