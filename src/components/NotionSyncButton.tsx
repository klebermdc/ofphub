import { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SalesRep, SalesTotals, OrderDetail } from '@/types/sales';

interface NotionSyncButtonProps {
  onDataLoaded: (salesReps: SalesRep[], totals: SalesTotals) => void;
  isLoading?: boolean;
}

// Notion data source ID for Vendas Total
const NOTION_DATABASE_ID = '2142d56c151b810f8fd3fe4ac176e541';

interface NotionPage {
  title: string;
  url: string;
  id: string;
  highlight?: string;
}

export const NotionSyncButton = ({ onDataLoaded, isLoading: externalLoading }: NotionSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const parseNotionHighlight = (highlight: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!highlight) return result;

    const lines = highlight.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        // Clean up email links
        value = value.replace(/\s*\(mailto:[^)]+\)/g, '');
        // Clean up currency formatting
        value = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        result[key] = value;
      }
    }
    return result;
  };

  const processNotionResults = (results: NotionPage[]): { salesReps: SalesRep[]; totals: SalesTotals } => {
    const salesByRep: Record<string, {
      name: string;
      sales: number;
      commission: number;
      deals: number;
      orders: OrderDetail[];
    }> = {};

    for (const page of results) {
      const data = parseNotionHighlight(page.highlight || '');
      
      const vendedor = data.Atendende || data['Atendente$'] || 'Sem Atendente';
      const venda = parseFloat(data.Venda) || 0;
      const comissaoTotal = parseFloat(data['Comissão Total']) || 0;
      const porcentagemAtendente = parseFloat(data['Porcentagem Atendente']?.replace('%', '')) / 100 || 0;
      const comissaoVendedor = venda * porcentagemAtendente;
      const fornecedor = data.Fornecedor || 'Sem Fornecedor';
      const produto = data.Produto || 'Sem Produto';

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
        cliente: page.title || '',
        data: data.DATA || '',
        pedido: data.PEDIDO || '',
        venda,
        fornecedor,
        produto,
        comissao: comissaoTotal,
        comissaoTotal,
        porcentagemVendedor: porcentagemAtendente * 100,
        comissaoVendedor,
      });
    }

    const salesReps: SalesRep[] = Object.values(salesByRep)
      .filter(rep => rep.name !== 'Sem Atendente')
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
  };

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      // The MCP integration will be handled by the parent component
      // This button triggers the sync process
      const event = new CustomEvent('notion-sync-request', {
        detail: { databaseId: NOTION_DATABASE_ID }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error syncing with Notion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading || externalLoading}
      className="gap-2"
      variant="outline"
    >
      {isLoading || externalLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {isLoading || externalLoading ? 'Sincronizando...' : 'Sincronizar Notion'}
    </Button>
  );
};

export type { NotionPage };
