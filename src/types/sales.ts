export interface OrderDetail {
  id?: string;
  cliente: string;
  emailCliente?: string;
  data: string;
  pedido: string;
  venda: number;
  fornecedor: string;
  produto: string;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
  status?: string;
  rowIndex?: number;
  created_at?: string;
  guia?: string;
  comissaoGuia?: number;
  isGuideEntry?: boolean;
}

export interface SalesRep {
  id: string;
  name: string;
  sales: number;
  commission: number;
  deals: number;
  rate: number;
  orders: OrderDetail[];
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
    pedidos: OrderDetail[];
  }>;
  totals: SalesTotals;
  message: string;
}
