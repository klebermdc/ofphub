interface CommissionLikeOrder {
  comissaoTotal: number;
  comissaoVendedor: number;
  comissaoGuia?: number;
  vendedor?: string;
  salesperson_name?: string;
}

export function getOFPCommission(order: CommissionLikeOrder): number {
  const seller = (order.vendedor || order.salesperson_name || '').trim().toLowerCase();
  if (seller === 'site') {
    return order.comissaoTotal;
  }

  return order.comissaoTotal - order.comissaoVendedor - (order.comissaoGuia || 0);
}