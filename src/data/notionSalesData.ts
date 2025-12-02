// Data fetched from Notion database "Vendas Total"
// This data is synchronized from Notion MCP integration
// Last sync: 2025-12-02

import { SalesRep, SalesTotals, OrderDetail } from '@/types/sales';

interface NotionSaleRecord {
  cliente: string;
  data: string;
  pedido: string;
  venda: number;
  fornecedor: string;
  produto: string;
  porcentagemVenda: number;
  porcentagemAtendente: number;
  comissaoTotal: number;
  atendenteComissao: number;
  atendente: string;
  email?: string;
}

// Raw Notion data parsed from search results
const notionRecords: NotionSaleRecord[] = [
  { cliente: "Danielle Suguino Pe", data: "2025-11-30", pedido: "Guia", venda: 1795.00, fornecedor: "OFP", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 50, comissaoTotal: 1795.00, atendenteComissao: 897.50, atendente: "Rafael" },
  { cliente: "Andressa Di Pardi", data: "2025-11-28", pedido: "27915", venda: 1521.69, fornecedor: "Just Travel", produto: "Seguro", porcentagemVenda: 20, porcentagemAtendente: 30, comissaoTotal: 304.34, atendenteComissao: 91.30, atendente: "Pedro" },
  { cliente: "Guilherme Jeronimo", data: "2025-11-25", pedido: "4956175", venda: 6341.05, fornecedor: "Trend Viagens", produto: "Ingresso", porcentagemVenda: 8.93, porcentagemAtendente: 20, comissaoTotal: 566.26, atendenteComissao: 113.25, atendente: "Carolina" },
  { cliente: "Rafael Correia", data: "2025-11-21", pedido: "26588", venda: 12894.88, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 3, porcentagemAtendente: 20, comissaoTotal: 386.85, atendenteComissao: 77.37, atendente: "Rafael" },
  { cliente: "Rodrigo Silveira Filho", data: "2025-11-25", pedido: "27139", venda: 1526.39, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 3, porcentagemAtendente: 20, comissaoTotal: 45.79, atendenteComissao: 9.16, atendente: "Marcella" },
  { cliente: "Camilla Netto", data: "2025-11-23", pedido: "26732", venda: 10083.92, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 3, porcentagemAtendente: 20, comissaoTotal: 302.52, atendenteComissao: 60.50, atendente: "Carolina" },
  { cliente: "Maycon Da Silva Barroco", data: "2025-11-28", pedido: "27983", venda: 6590.82, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 3, porcentagemAtendente: 20, comissaoTotal: 197.72, atendenteComissao: 39.54, atendente: "Marcella" },
  { cliente: "Carol Vasconcelos", data: "2025-11-08", pedido: "24341", venda: 5609.66, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4, porcentagemAtendente: 20, comissaoTotal: 224.39, atendenteComissao: 44.88, atendente: "Suelen" },
  { cliente: "Romulo Matos", data: "2025-11-04", pedido: "184289", venda: 3910.03, fornecedor: "Suncoast", produto: "Ingresso", porcentagemVenda: 5, porcentagemAtendente: 20, comissaoTotal: 195.50, atendenteComissao: 39.10, atendente: "Pedro" },
  { cliente: "Sabrina Mello Munhoz Braz de Oliveira", data: "2025-11-29", pedido: "28337", venda: 7549.74, fornecedor: "HotelDO", produto: "Ingresso", porcentagemVenda: 5, porcentagemAtendente: 30, comissaoTotal: 377.49, atendenteComissao: 113.25, atendente: "Carolina" },
  { cliente: "Fernanda Rolim", data: "2025-11-24", pedido: "26929", venda: 21127.15, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 3, porcentagemAtendente: 20, comissaoTotal: 633.81, atendenteComissao: 126.76, atendente: "Rafael" },
  { cliente: "Tatiane Carvalho", data: "2025-11-27", pedido: "797036329200", venda: 8004.23, fornecedor: "HotelDO", produto: "Ingresso", porcentagemVenda: 5, porcentagemAtendente: 20, comissaoTotal: 400.21, atendenteComissao: 80.04, atendente: "Suelen" },
  { cliente: "Tais Urizzi", data: "2025-07-29", pedido: "Guia", venda: 1745.00, fornecedor: "OFP", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 50, comissaoTotal: 1745.00, atendenteComissao: 872.50, atendente: "Rafael" },
  { cliente: "Thiego Davi", data: "2025-07-10", pedido: "Guia", venda: 350.00, fornecedor: "OFP", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 50, comissaoTotal: 350.00, atendenteComissao: 175.00, atendente: "Rafael" },
  { cliente: "Thiego Davi", data: "2025-07-10", pedido: "Guia2", venda: 395.00, fornecedor: "OFP", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 50, comissaoTotal: 395.00, atendenteComissao: 197.50, atendente: "Rafael" },
  { cliente: "Parcele JT", data: "2025-07-31", pedido: "ParceleJT", venda: 2985.00, fornecedor: "Just Travel", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 50, comissaoTotal: 2985.00, atendenteComissao: 1492.50, atendente: "Rafael" },
  { cliente: "Isabella", data: "2025-07-09", pedido: "20251501", venda: 4232.62, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4, porcentagemAtendente: 30, comissaoTotal: 169.30, atendenteComissao: 50.79, atendente: "Simone" },
  { cliente: "Vanessa Vendramini Mossi", data: "2025-11-04", pedido: "23656", venda: 11457.86, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4.08, porcentagemAtendente: 20, comissaoTotal: 467.48, atendenteComissao: 93.50, atendente: "Pedro" },
  { cliente: "Edmilson Lucena Neri", data: "2025-12-01", pedido: "Guia", venda: 1755.60, fornecedor: "OFP", produto: "Guiamento", porcentagemVenda: 100, porcentagemAtendente: 0, comissaoTotal: 1755.60, atendenteComissao: 0, atendente: "Kleber" },
  { cliente: "Almerio Botelho Neto", data: "2025-09-09", pedido: "15799", venda: 9375.15, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4, porcentagemAtendente: 20, comissaoTotal: 375.01, atendenteComissao: 75.00, atendente: "Suelen" },
  { cliente: "Vivi", data: "2025-07-10", pedido: "20251521", venda: 3423.95, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4, porcentagemAtendente: 20, comissaoTotal: 136.96, atendenteComissao: 27.39, atendente: "Suelen" },
  { cliente: "Vinicius Brandi", data: "2025-10-20", pedido: "21428", venda: 16670.71, fornecedor: "Just Travel", produto: "Ingresso", porcentagemVenda: 4, porcentagemAtendente: 20, comissaoTotal: 666.83, atendenteComissao: 133.37, atendente: "Rafael" },
];

export function processNotionData(): { salesReps: SalesRep[]; totals: SalesTotals } {
  const salesByRep: Record<string, {
    name: string;
    sales: number;
    commission: number;
    deals: number;
    orders: OrderDetail[];
  }> = {};

  for (const record of notionRecords) {
    const vendedor = record.atendente;
    if (!vendedor) continue;

    if (!salesByRep[vendedor]) {
      salesByRep[vendedor] = {
        name: vendedor,
        sales: 0,
        commission: 0,
        deals: 0,
        orders: [],
      };
    }

    salesByRep[vendedor].sales += record.venda;
    salesByRep[vendedor].commission += record.atendenteComissao;
    salesByRep[vendedor].deals += 1;
    salesByRep[vendedor].orders.push({
      cliente: record.cliente,
      data: record.data,
      pedido: record.pedido,
      venda: record.venda,
      fornecedor: record.fornecedor,
      produto: record.produto,
      comissao: record.comissaoTotal,
      comissaoTotal: record.comissaoTotal,
      porcentagemVendedor: record.porcentagemAtendente,
      comissaoVendedor: record.atendenteComissao,
    });
  }

  const salesReps: SalesRep[] = Object.values(salesByRep)
    .map((rep, index) => ({
      id: `rep-${index}`,
      name: rep.name,
      sales: rep.sales,
      commission: rep.commission,
      deals: rep.deals,
      rate: rep.sales > 0 ? (rep.commission / rep.sales) * 100 : 0,
      orders: rep.orders,
    }))
    .sort((a, b) => b.sales - a.sales);

  const totalVendas = salesReps.reduce((sum, rep) => sum + rep.sales, 0);
  const totalComissao = salesReps.reduce((sum, rep) => sum + rep.commission, 0);
  const totalNegocios = salesReps.reduce((sum, rep) => sum + rep.deals, 0);

  const totals: SalesTotals = {
    totalVendas,
    totalComissao,
    totalNegocios,
    taxaMedia: totalVendas > 0 ? (totalComissao / totalVendas) * 100 : 0,
    vendedoresAtivos: salesReps.length,
  };

  return { salesReps, totals };
}

// Get unique suppliers
export function getSuppliers(): string[] {
  return [...new Set(notionRecords.map(r => r.fornecedor))];
}

// Get unique products
export function getProducts(): string[] {
  return [...new Set(notionRecords.map(r => r.produto))];
}

// Get sales by supplier
export function getSalesBySupplier(): { name: string; value: number }[] {
  const supplierTotals: Record<string, number> = {};
  for (const record of notionRecords) {
    supplierTotals[record.fornecedor] = (supplierTotals[record.fornecedor] || 0) + record.venda;
  }
  return Object.entries(supplierTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Get sales by product
export function getSalesByProduct(): { name: string; value: number }[] {
  const productTotals: Record<string, number> = {};
  for (const record of notionRecords) {
    productTotals[record.produto] = (productTotals[record.produto] || 0) + record.venda;
  }
  return Object.entries(productTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
