export interface SalesRep {
  id: string;
  name: string;
  sales: number;
  commission: number;
  deals: number;
  rate: number;
}

export interface SalesTotals {
  totalVendas: number;
  totalComissao: number;
  totalNegocios: number;
  taxaMedia: number;
  vendedoresAtivos: number;
}

export interface SheetParseResponse {
  success: boolean;
  data: Array<{
    vendedor: string;
    vendas: number;
    comissao: number;
    negocios: number;
    taxa: number;
  }>;
  totals: SalesTotals;
  message: string;
}
