import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Zap, Wallet, UserPlus, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseOrderDate } from "@/utils/dateUtils";

interface DailySalesTrackerProps {
  salesReps: { orders?: { data?: string; venda: number; comissao?: number; comissaoVendedor?: number }[] }[];
  currentMonth: string;
  totalSalaries?: number;
  marketingCosts?: number;
  operationalCosts?: number;
}

function getBusinessDaysInMonth(month: number, year: number): number {
  let businessDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  return businessDays;
}

function getBusinessDaysElapsed(month: number, year: number): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const today = now.getDate();
  
  let businessDays = 0;
  
  if (month === currentMonth && year === currentYear) {
    for (let day = 1; day <= today; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    return businessDays;
  }
  
  return getBusinessDaysInMonth(month, year);
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DailySalesTracker({ 
  salesReps, 
  currentMonth,
  totalSalaries = 0,
  marketingCosts = 0,
  operationalCosts = 0,
}: DailySalesTrackerProps) {
  const [m, y] = currentMonth.split('/').map(Number);
  const now = new Date();
  const today = now.getDate();
  const todayFormatted = `${today.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
  
  // Fetch real daily ad spend (today) and full-month ad spend from marketing_daily_stats
  const [todayAdSpend, setTodayAdSpend] = useState(0);
  const [todayLeads, setTodayLeads] = useState(0);
  const [monthAdSpend, setMonthAdSpend] = useState(0);
  const [historicalDailyResults, setHistoricalDailyResults] = useState<number[]>([]);

  useEffect(() => {
    const todayDate = `${y}-${String(m).padStart(2, '0')}-${String(today).padStart(2, '0')}`;
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    supabase
      .from('marketing_daily_stats')
      .select('date, meta_spend, google_spend, leads_total')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .then(({ data }) => {
        if (data) {
          let monthSum = 0;
          let todaySum = 0;
          let todayLeadsSum = 0;
          data.forEach((d: any) => {
            const ads = Number(d.meta_spend || 0) + Number(d.google_spend || 0);
            monthSum += ads;
            if (d.date === todayDate) {
              todaySum = ads;
              todayLeadsSum = Number(d.leads_total || 0);
            }
          });
          setMonthAdSpend(monthSum);
          setTodayAdSpend(todaySum);
          setTodayLeads(todayLeadsSum);
        } else {
          setMonthAdSpend(0);
          setTodayAdSpend(0);
          setTodayLeads(0);
        }
      });
  }, [m, y, today]);


  const totalBusinessDays = getBusinessDaysInMonth(m, y);
  const businessDaysElapsed = getBusinessDaysElapsed(m, y);
  
  let todaySales = 0;
  let todayComissaoTotal = 0;
  let todayComissaoVendedor = 0;
  let todayComissaoGuia = 0;

  // Calculate today's metrics (timezone-safe via parseOrderDate, supports ISO and DD/MM/YYYY)
  salesReps.forEach(rep => {
    rep.orders?.forEach((order: any) => {
      const parsed = parseOrderDate(order.data);
      if (!parsed) return;

      if (parsed.day === today && parsed.month === m && parsed.year === y) {
        todaySales += Number(order.venda) || 0;
        // Comissão Total = comissão da empresa
        todayComissaoTotal += Number(order.comissaoTotal ?? order.comissao) || 0;
        // Comissão Vendedor = paga ao vendedor
        todayComissaoVendedor += Number(order.comissaoVendedor) || 0;
        // Comissão Guia: Kleber 100%, Rafael 50%, demais 100% por padrão
        const guiaName = (order.guia || '').trim().toLowerCase();
        const comissaoGuiaRaw = Number(order.comissaoGuia) || 0;
        const guiaFactor = guiaName.includes('rafael') ? 0.5 : 1;
        todayComissaoGuia += comissaoGuiaRaw * guiaFactor;
      }
    });
  });

  // Ganho do Dia = Comissão Total - Comissão Vendedores - Comissão Guia
  const ganhoDia = todayComissaoTotal - todayComissaoVendedor - todayComissaoGuia;
  
   // Custo diário: salários + operacional + marketing NÃO-ads (proporcionais) + gasto real de ads do dia + imposto 12%
   // Subtrai do marketingCosts o gasto real de Ads do mês para evitar duplicidade com todayAdSpend
   const daysInMonth = new Date(y, m, 0).getDate();
   const impostoEstimadoDia = todayComissaoTotal * 0.12;
   const marketingNonAds = Math.max(0, marketingCosts - monthAdSpend);
   const fixedMonthlyCosts = totalSalaries + operationalCosts + marketingNonAds;
   const dailyFixedCost = daysInMonth > 0 ? fixedMonthlyCosts / daysInMonth : 0;
   const dailyCostWithTax = dailyFixedCost + todayAdSpend + impostoEstimadoDia;

  
  // Resultado do Dia = Ganho do Dia - Custo diário proporcional
  const resultadoDia = ganhoDia - dailyCostWithTax;

  // Meta diária e projeção
  const META_DIARIA = 5500;
  const atingimentoPct = META_DIARIA > 0 ? Math.min((resultadoDia / META_DIARIA) * 100, 150) : 0;
  const atingimentoPctReal = META_DIARIA > 0 ? (resultadoDia / META_DIARIA) * 100 : 0;

  // Velocidade de venda: projeção baseada no ritmo atual do dia
  // Horário comercial: 8h às 18h (10h úteis)
  const horaAtual = now.getHours() + now.getMinutes() / 60;
  const inicioExpediente = 8;
  const fimExpediente = 18;
  const horasUteisDia = fimExpediente - inicioExpediente;
  const horasDecorridas = Math.max(0, Math.min(horaAtual - inicioExpediente, horasUteisDia));
  const pctDiaDecorrido = horasUteisDia > 0 ? horasDecorridas / horasUteisDia : 1;
  
  // Projeção: se vendeu X até agora com Y% do dia, projeta X / Y% para o dia inteiro
  const projectedResult = pctDiaDecorrido > 0.05 
    ? resultadoDia / pctDiaDecorrido 
    : resultadoDia;
  const projecaoPct = META_DIARIA > 0 ? Math.min((projectedResult / META_DIARIA) * 100, 150) : 0;
  const projecaoPctReal = META_DIARIA > 0 ? (projectedResult / META_DIARIA) * 100 : 0;
  
  // Velocidade por hora
  const velocidadePorHora = horasDecorridas > 0 ? todaySales / horasDecorridas : 0;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">Acompanhamento Diário</h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs sm:text-sm font-medium">
            Dia {today} • {monthNames[m - 1]} {y}
          </span>
          <p className="text-xs text-muted-foreground">
            {businessDaysElapsed} de {totalBusinessDays} dias úteis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {/* Venda Total do Dia */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Venda do Dia</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(todaySales)}</p>
        </div>

        <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Comissão do Dia</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(todayComissaoTotal)}</p>
        </div>

        {/* Comissão Vendedores do Dia */}
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Comissão Vend.</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-warning">{formatCurrency(todayComissaoVendedor)}</p>
        </div>

        {/* Ganho do Dia */}
        <div className={cn(
          "bg-gradient-to-br rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 border",
          ganhoDia >= 0 
            ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" 
            : "from-red-500/10 to-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Ganho do Dia</span>
          </div>
          <p className={cn("text-lg sm:text-2xl font-bold", ganhoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(ganhoDia)}
          </p>
        </div>

        {/* Resultado do Dia */}
        <Popover>
            <PopoverTrigger asChild>
              <div className={cn(
                "bg-gradient-to-br rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 border col-span-2 sm:col-span-1 cursor-help",
                resultadoDia >= 0
                  ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                  : "from-red-500/10 to-red-500/5 border-red-500/20"
              )}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")} />
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Resultado do Dia</span>
                  <Info className="h-3 w-3 text-muted-foreground/60 ml-auto" />
                </div>
                <p className={cn("text-lg sm:text-2xl font-bold", resultadoDia >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {formatCurrency(resultadoDia)}
                </p>
              </div>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={16} className="w-[min(28rem,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto p-4 space-y-2 text-xs">
              <p className="font-semibold text-sm mb-1">Como é calculado o Resultado do Dia</p>
              <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
                Hoje: {today.toString().padStart(2,'0')}/{m.toString().padStart(2,'0')}/{y} • {daysInMonth} dias no mês
              </p>

              {/* RECEITAS */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2 space-y-1">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] uppercase tracking-wide">1. Receita do dia</p>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Vendas brutas (faturamento)</span>
                  <span className="font-medium">{formatCurrency(todaySales)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Comissão total da empresa (margem bruta)</span>
                  <span className="font-medium">{formatCurrency(todayComissaoTotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">(-) Comissão paga aos vendedores</span>
                  <span className="font-medium text-warning">-{formatCurrency(todayComissaoVendedor)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">(-) Comissão paga aos guias</span>
                  <span className="font-medium text-warning">-{formatCurrency(todayComissaoGuia)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-emerald-500/20 pt-1 font-semibold">
                  <span>= Ganho do Dia (margem líquida)</span>
                  <span className={ganhoDia >= 0 ? "text-emerald-500" : "text-red-500"}>{formatCurrency(ganhoDia)}</span>
                </div>
              </div>

              {/* CUSTOS FIXOS RATEADOS */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2 space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wide">
                  2. Custos fixos do mês (rateio diário ÷ {daysInMonth})
                </p>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Salários da equipe (mês)</span>
                  <span className="font-medium">{formatCurrency(totalSalaries)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Custos operacionais (mês)</span>
                  <span className="font-medium">{formatCurrency(operationalCosts)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Marketing s/ ads (ferramentas, agência)</span>
                  <span className="font-medium">{formatCurrency(marketingNonAds)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-amber-500/20 pt-1">
                  <span className="text-muted-foreground">Total fixo do mês</span>
                  <span className="font-medium">{formatCurrency(fixedMonthlyCosts)}</span>
                </div>
                <div className="flex justify-between gap-4 font-semibold">
                  <span>÷ {daysInMonth} dias = custo fixo/dia</span>
                  <span className="text-red-500">-{formatCurrency(dailyFixedCost)}</span>
                </div>
              </div>

              {/* CUSTOS VARIÁVEIS DO DIA */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-md p-2 space-y-1">
                <p className="font-semibold text-red-600 dark:text-red-400 text-[11px] uppercase tracking-wide">3. Custos variáveis (reais do dia)</p>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Meta + Google Ads de hoje</span>
                  <span className="font-medium text-red-500">-{formatCurrency(todayAdSpend)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Imposto estimado (12% s/ comissão total)</span>
                  <span className="font-medium text-red-500">-{formatCurrency(impostoEstimadoDia)}</span>
                </div>
              </div>

              {/* RESULTADO FINAL */}
              <div className="border-t-2 pt-2 space-y-1">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">Ganho do Dia</span>
                  <span>{formatCurrency(ganhoDia)}</span>
                </div>
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">(-) Custo fixo/dia + Ads + Imposto</span>
                  <span className="text-red-500">-{formatCurrency(dailyCostWithTax)}</span>
                </div>
                <div className="flex justify-between gap-4 font-bold text-sm border-t pt-1.5">
                  <span>= Resultado do Dia</span>
                  <span className={resultadoDia >= 0 ? "text-emerald-500" : "text-red-500"}>{formatCurrency(resultadoDia)}</span>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2 leading-relaxed">
                💡 Ads (Meta+Google) vêm em tempo real de <code>marketing_daily_stats</code>. Os custos fixos do mês ({formatCurrency(fixedMonthlyCosts)}) excluem ads para evitar duplicidade — total já gasto em ads no mês: {formatCurrency(monthAdSpend)}.
              </p>
            </PopoverContent>
        </Popover>

        {/* Leads do Dia */}
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-xl p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Leads do Dia</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{todayLeads}</p>
        </div>
      </div>

      {/* Meta Diária */}
      <div className="bg-card border rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="text-sm sm:text-base font-semibold text-foreground">Meta Diária de Resultado</span>
          </div>
          <span className="text-sm font-bold text-primary">{formatCurrency(META_DIARIA)}</span>
        </div>

        {/* Atingimento Real */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Atingimento Atual</span>
            <span className={cn("font-semibold", atingimentoPctReal >= 100 ? "text-emerald-500" : atingimentoPctReal >= 50 ? "text-amber-500" : "text-red-500")}>
              {formatCurrency(resultadoDia)} ({atingimentoPctReal.toFixed(1)}%)
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                atingimentoPctReal >= 100 ? "bg-emerald-500" : atingimentoPctReal >= 50 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.max(0, Math.min(atingimentoPct, 100))}%` }}
            />
            {/* Marker at 100% */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/30" style={{ left: `${Math.min(100 / 1.5, 100)}%` }} />
          </div>
        </div>

        {/* Projeção por Velocidade */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Projeção ({Math.round(pctDiaDecorrido * 100)}% do expediente • {formatCurrency(velocidadePorHora)}/h)
            </span>
            <span className={cn("font-semibold", projecaoPctReal >= 100 ? "text-emerald-500" : projecaoPctReal >= 50 ? "text-amber-500" : "text-red-500")}>
              {formatCurrency(projectedResult)} ({projecaoPctReal.toFixed(1)}%)
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 opacity-70",
                projecaoPctReal >= 100 ? "bg-emerald-500" : projecaoPctReal >= 50 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.max(0, Math.min(projecaoPct, 100))}%` }}
            />
            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/30" style={{ left: `${Math.min(100 / 1.5, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
