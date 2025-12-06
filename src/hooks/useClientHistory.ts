import { useMemo } from 'react';
import { CRMLead } from './useCRMLeads';
import { SalesRep } from '@/types/sales';

export interface ClientHistory {
  hasHistory: boolean;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate: string | null;
  products: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extractFirstName(fullName: string): string {
  return normalizeText(fullName).split(' ')[0];
}

export function findClientHistory(
  lead: CRMLead,
  salesReps: SalesRep[]
): ClientHistory {
  const leadName = normalizeText(lead.name);
  const leadFirstName = extractFirstName(lead.name);
  const leadEmail = lead.email ? normalizeText(lead.email) : null;

  let matchingOrders: Array<{
    cliente: string;
    data: string;
    venda: number;
    produto: string;
  }> = [];

  // Search through all salesReps' orders
  for (const rep of salesReps) {
    if (!rep.orders) continue;

    for (const order of rep.orders) {
      if (!order.cliente) continue;

      const orderClientName = normalizeText(order.cliente);
      const orderFirstName = extractFirstName(order.cliente);

      // Match by full name, first name, or email
      const nameMatch = 
        orderClientName.includes(leadName) ||
        leadName.includes(orderClientName) ||
        (leadFirstName.length >= 3 && orderFirstName === leadFirstName);

      if (nameMatch) {
        matchingOrders.push({
          cliente: order.cliente,
          data: order.data || '',
          venda: order.venda || 0,
          produto: order.produto || '',
        });
      }
    }
  }

  if (matchingOrders.length === 0) {
    return {
      hasHistory: false,
      totalPurchases: 0,
      totalSpent: 0,
      lastPurchaseDate: null,
      products: [],
    };
  }

  // Calculate totals
  const totalSpent = matchingOrders.reduce((sum, o) => sum + o.venda, 0);
  const products = [...new Set(matchingOrders.map(o => o.produto).filter(Boolean))];

  // Find last purchase date
  const sortedByDate = matchingOrders
    .filter(o => o.data)
    .sort((a, b) => {
      // Parse DD/MM/YYYY format
      const parseDate = (dateStr: string) => {
        const parts = dateStr.split('/');
        if (parts.length >= 3) {
          let year = parts[2];
          if (year.length === 2) year = `20${year}`;
          return new Date(parseInt(year), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(0);
      };
      return parseDate(b.data).getTime() - parseDate(a.data).getTime();
    });

  return {
    hasHistory: true,
    totalPurchases: matchingOrders.length,
    totalSpent,
    lastPurchaseDate: sortedByDate[0]?.data || null,
    products,
  };
}

export function useClientHistory(leads: CRMLead[], salesReps: SalesRep[]) {
  const leadsWithHistory = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      clientHistory: findClientHistory(lead, salesReps),
    }));
  }, [leads, salesReps]);

  const returningClients = useMemo(() =>
    leadsWithHistory.filter(l => l.clientHistory.hasHistory),
    [leadsWithHistory]
  );

  return {
    leadsWithHistory,
    returningClients,
    returningCount: returningClients.length,
  };
}
