interface CommissionLikeOrder {
  comissaoTotal: number;
  comissaoVendedor: number;
  comissaoGuia?: number;
}

export function getOFPCommission(order: CommissionLikeOrder): number {
  return order.comissaoTotal - order.comissaoVendedor - (order.comissaoGuia || 0);
}