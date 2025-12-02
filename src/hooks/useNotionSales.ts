import { useState, useCallback } from 'react';
import { SalesRep, SalesTotals, OrderDetail } from '@/types/sales';

const NOTION_DATA_SOURCE_URL = 'collection://2142d56c-151b-812d-95a7-000b159a5640';

interface NotionSalesData {
  salesReps: SalesRep[];
  totals: SalesTotals;
  topFornecedores: { name: string; value: number }[];
  topProdutos: { name: string; value: number }[];
}

export const useNotionSales = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<NotionSalesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // This will be called by the MCP integration
      // For now, we'll process data from a search query
      const response = await (window as any).__notionMCP?.search?.({
        query: '',
        data_source_url: NOTION_DATA_SOURCE_URL,
      });

      if (!response?.data) {
        throw new Error('Não foi possível buscar dados do Notion');
      }

      const processedData = processNotionData(response.data);
      setData(processedData);
      return processedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    data,
    error,
    fetchNotionData,
    setData,
  };
};

export const processNotionData = (rawData: any[]): NotionSalesData => {
  const salesByRep: Record<string, {
    name: string;
    sales: number;
    commission: number;
    deals: number;
    orders: OrderDetail[];
  }> = {};

  const fornecedorTotals: Record<string, number> = {};
  const produtoTotals: Record<string, number> = {};

  rawData.forEach((item: any) => {
    const vendedor = item.Atendende || item['Atendente$'] || 'Sem Atendente';
    const venda = parseFloat(item.Venda) || 0;
    const comissaoTotal = parseFloat(item['Comissão Total']) || 0;
    const porcentagemAtendente = parseFloat(item['Porcentagem Atendente']) || 0;
    const comissaoVendedor = venda * porcentagemAtendente;
    const fornecedor = item.Fornecedor || 'Sem Fornecedor';
    const produto = item.Produto || 'Sem Produto';

    // Aggregate by salesperson
    if (!salesByRep[vendedor]) {
      salesByRep[vendedor] = {
        name: vendedor,
        sales: 0,
        commission: 0,
        deals: 0,
        orders: [],
      };
    }

    salesByRep[vendedor].sales += venda;
    salesByRep[vendedor].commission += comissaoVendedor;
    salesByRep[vendedor].deals += 1;
    salesByRep[vendedor].orders.push({
      cliente: item.Cliente || '',
      data: item.DATA || item['date:DATA:start'] || '',
      pedido: item.PEDIDO || '',
      venda,
      fornecedor,
      produto,
      comissao: comissaoTotal,
      comissaoTotal,
      porcentagemVendedor: porcentagemAtendente * 100,
      comissaoVendedor,
    });

    // Aggregate by supplier
    fornecedorTotals[fornecedor] = (fornecedorTotals[fornecedor] || 0) + venda;

    // Aggregate by product
    produtoTotals[produto] = (produtoTotals[produto] || 0) + venda;
  });

  const salesReps: SalesRep[] = Object.values(salesByRep).map((rep, index) => ({
    id: `rep-${index}`,
    name: rep.name,
    sales: rep.sales,
    commission: rep.commission,
    deals: rep.deals,
    rate: rep.sales > 0 ? (rep.commission / rep.sales) * 100 : 0,
    orders: rep.orders,
  }));

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

  const topFornecedores = Object.entries(fornecedorTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topProdutos = Object.entries(produtoTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    salesReps,
    totals,
    topFornecedores,
    topProdutos,
  };
};

// Process data directly from Notion MCP fetch results
export const processNotionFetchResult = (pages: any[]): NotionSalesData => {
  const salesByRep: Record<string, {
    name: string;
    sales: number;
    commission: number;
    deals: number;
    orders: OrderDetail[];
  }> = {};

  const fornecedorTotals: Record<string, number> = {};
  const produtoTotals: Record<string, number> = {};

  pages.forEach((page: any) => {
    // Extract properties from Notion page
    const props = page.properties || page;
    
    const vendedor = extractTextValue(props.Atendende) || 
                     extractTextValue(props['Atendente$']) || 
                     'Sem Atendente';
    const venda = extractNumberValue(props.Venda) || 0;
    const comissaoTotal = extractNumberValue(props['Comissão Total']) || 0;
    const porcentagemAtendente = extractNumberValue(props['Porcentagem Atendente']) || 0;
    const porcentagemVenda = extractNumberValue(props['Porcentagem Venda ']) || 0;
    const comissaoVendedor = venda * porcentagemAtendente;
    const fornecedor = extractTextValue(props.Fornecedor) || 'Sem Fornecedor';
    const produto = extractTextValue(props.Produto) || 'Sem Produto';
    const cliente = extractTitleValue(props.Cliente) || '';
    const pedido = extractTextValue(props.PEDIDO) || '';
    const data = extractDateValue(props.DATA) || extractDateValue(props['date:DATA:start']) || '';

    if (!salesByRep[vendedor]) {
      salesByRep[vendedor] = {
        name: vendedor,
        sales: 0,
        commission: 0,
        deals: 0,
        orders: [],
      };
    }

    salesByRep[vendedor].sales += venda;
    salesByRep[vendedor].commission += comissaoVendedor;
    salesByRep[vendedor].deals += 1;
    salesByRep[vendedor].orders.push({
      cliente,
      data,
      pedido,
      venda,
      fornecedor,
      produto,
      comissao: comissaoTotal,
      comissaoTotal,
      porcentagemVendedor: porcentagemAtendente * 100,
      comissaoVendedor,
    });

    fornecedorTotals[fornecedor] = (fornecedorTotals[fornecedor] || 0) + venda;
    produtoTotals[produto] = (produtoTotals[produto] || 0) + venda;
  });

  const salesReps: SalesRep[] = Object.values(salesByRep).map((rep, index) => ({
    id: `rep-${index}`,
    name: rep.name,
    sales: rep.sales,
    commission: rep.commission,
    deals: rep.deals,
    rate: rep.sales > 0 ? (rep.commission / rep.sales) * 100 : 0,
    orders: rep.orders,
  }));

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

  const topFornecedores = Object.entries(fornecedorTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topProdutos = Object.entries(produtoTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    salesReps,
    totals,
    topFornecedores,
    topProdutos,
  };
};

// Helper functions to extract values from Notion properties
function extractTextValue(prop: any): string | null {
  if (!prop) return null;
  if (typeof prop === 'string') return prop;
  if (prop.select?.name) return prop.select.name;
  if (prop.rich_text?.[0]?.plain_text) return prop.rich_text[0].plain_text;
  if (prop.formula?.string) return prop.formula.string;
  return null;
}

function extractNumberValue(prop: any): number | null {
  if (!prop) return null;
  if (typeof prop === 'number') return prop;
  if (prop.number !== undefined) return prop.number;
  if (prop.formula?.number !== undefined) return prop.formula.number;
  return null;
}

function extractTitleValue(prop: any): string | null {
  if (!prop) return null;
  if (typeof prop === 'string') return prop;
  if (prop.title?.[0]?.plain_text) return prop.title[0].plain_text;
  return null;
}

function extractDateValue(prop: any): string | null {
  if (!prop) return null;
  if (typeof prop === 'string') return prop;
  if (prop.date?.start) return prop.date.start;
  return null;
}
