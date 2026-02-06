import { useMemo } from 'react';
import { isExcludedName } from '@/config/salaries';
import { getMonthProportionalRatio, parseMonthKey } from '@/utils/dateUtils';
import { SalesRep } from '@/types/sales';

interface CostCalculationResult {
  totalSalaries: number;
  custoEquipeComercial: number;
  impostoEstimado: number;
  totalCost: number;
  resultado: number;
  custoProporcional: number;
  resultadoParcial: number;
}

interface CostCalculationParams {
  filteredSalesReps: SalesRep[];
  totalComissao: number;
  totalComissaoTotal: number;
  ganhoBruto: number;
  marketingCost: number;
  operationalCost: number;
  getSalary: (name: string) => number;
  selectedMonth: string;
  totalDiscounts?: number;
}

/**
 * Hook to calculate all costs and financial results
 */
export function useCostCalculation({
  filteredSalesReps,
  totalComissao,
  totalComissaoTotal,
  ganhoBruto,
  marketingCost,
  operationalCost,
  getSalary,
  selectedMonth,
  totalDiscounts = 0,
}: CostCalculationParams): CostCalculationResult {
  return useMemo(() => {
    // Total salaries
    const totalSalaries = filteredSalesReps.reduce(
      (sum, rep) => sum + getSalary(rep.name), 
      0
    );

    // Custo Equipe Comercial (Salários + Comissões - Descontos) - excluding partners
    const nonPartnerReps = filteredSalesReps.filter(rep => !isExcludedName(rep.name));
    const nonPartnerCommissions = nonPartnerReps.reduce((sum, rep) => sum + rep.commission, 0);
    const nonPartnerSalaries = nonPartnerReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
    const custoEquipeComercial = nonPartnerSalaries + nonPartnerCommissions - totalDiscounts;

    // Imposto estimado (12% of Comissão Total)
    const impostoEstimado = totalComissaoTotal * 0.12;

    // Total cost
    const totalCost = totalComissao + totalSalaries + marketingCost + operationalCost + impostoEstimado;

    // Resultado final
    const resultado = totalComissaoTotal - totalCost;

    // Proportional costs based on elapsed days
    const proporcao = getMonthProportionalRatio(selectedMonth);
    const custosProporcional = (totalSalaries + marketingCost + operationalCost) * proporcao;
    const impostoProporcional = impostoEstimado * proporcao;
    const custoProporcional = custosProporcional + impostoProporcional;
    
    // Resultado parcial
    const resultadoParcial = ganhoBruto - custoProporcional;

    return {
      totalSalaries,
      custoEquipeComercial,
      impostoEstimado,
      totalCost,
      resultado,
      custoProporcional,
      resultadoParcial,
    };
  }, [
    filteredSalesReps,
    totalComissao,
    totalComissaoTotal,
    ganhoBruto,
    marketingCost,
    operationalCost,
    getSalary,
    selectedMonth,
    totalDiscounts,
  ]);
}
