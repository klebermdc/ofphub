import { useMemo } from 'react';
import { CRMLead } from './useCRMLeads';
import { differenceInDays, parseISO } from 'date-fns';

export interface LeadScore {
  total: number;
  valueScore: number;
  timeScore: number;
  stageScore: number;
  productScore: number;
  label: 'hot' | 'warm' | 'cold';
  color: string;
}

// Products with higher conversion potential
const HIGH_VALUE_PRODUCTS = ['disney', 'universal', 'combo'];
const MEDIUM_VALUE_PRODUCTS = ['hotel', 'seaworld', 'busch'];

export function calculateLeadScore(lead: CRMLead): LeadScore {
  let valueScore = 0;
  let timeScore = 0;
  let stageScore = 0;
  let productScore = 0;

  // 1. Value Score (0-30 points)
  const value = lead.estimated_value || 0;
  if (value >= 20000) valueScore = 30;
  else if (value >= 10000) valueScore = 25;
  else if (value >= 5000) valueScore = 20;
  else if (value >= 2000) valueScore = 15;
  else if (value > 0) valueScore = 10;
  else valueScore = 0;

  // 2. Time in funnel Score (0-25 points) - Newer leads score higher
  const createdDate = lead.notion_created_at || lead.created_at;
  if (createdDate) {
    try {
      const days = differenceInDays(new Date(), parseISO(createdDate));
      if (days <= 1) timeScore = 25;
      else if (days <= 3) timeScore = 20;
      else if (days <= 7) timeScore = 15;
      else if (days <= 14) timeScore = 10;
      else if (days <= 30) timeScore = 5;
      else timeScore = 0;
    } catch {
      timeScore = 10;
    }
  }

  // 3. Stage Score (0-25 points)
  switch (lead.stage) {
    case 'proposta_enviada':
      stageScore = 25; // Highest - closer to closing
      break;
    case 'coletando_informacao':
      stageScore = 20;
      break;
    case 'novo_lead':
      stageScore = 15;
      break;
    case 'venda_concluida':
      stageScore = 10; // Already converted
      break;
    case 'venda_perdida':
      stageScore = 0;
      break;
    default:
      stageScore = 10;
  }

  // 4. Product Score (0-20 points)
  const product = (lead.product || '').toLowerCase();
  if (HIGH_VALUE_PRODUCTS.some(p => product.includes(p))) {
    productScore = 20;
  } else if (MEDIUM_VALUE_PRODUCTS.some(p => product.includes(p))) {
    productScore = 15;
  } else if (product) {
    productScore = 10;
  } else {
    productScore = 5;
  }

  const total = valueScore + timeScore + stageScore + productScore;

  // Determine label
  let label: 'hot' | 'warm' | 'cold';
  let color: string;
  
  if (total >= 70) {
    label = 'hot';
    color = 'text-red-500 bg-red-500/10';
  } else if (total >= 40) {
    label = 'warm';
    color = 'text-orange-500 bg-orange-500/10';
  } else {
    label = 'cold';
    color = 'text-blue-500 bg-blue-500/10';
  }

  return {
    total,
    valueScore,
    timeScore,
    stageScore,
    productScore,
    label,
    color,
  };
}

export function useLeadScoring(leads: CRMLead[]) {
  const scoredLeads = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      score: calculateLeadScore(lead),
    }));
  }, [leads]);

  const hotLeads = useMemo(() => 
    scoredLeads.filter(l => l.score.label === 'hot'), 
    [scoredLeads]
  );

  const warmLeads = useMemo(() => 
    scoredLeads.filter(l => l.score.label === 'warm'), 
    [scoredLeads]
  );

  const coldLeads = useMemo(() => 
    scoredLeads.filter(l => l.score.label === 'cold'), 
    [scoredLeads]
  );

  return {
    scoredLeads,
    hotLeads,
    warmLeads,
    coldLeads,
  };
}
