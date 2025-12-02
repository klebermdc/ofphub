import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderDetail {
  cliente: string;
  data: string;
  pedido: string;
  venda: number;
  produto: string;
  comissao: number;
  porcentagem: number;
}

interface SalesData {
  vendedor: string;
  vendas: number;
  comissao: number;
  negocios: number;
  taxa: number;
  pedidos: OrderDetail[];
}

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.some(cell => cell.length > 0));
}

function parseNumber(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, spaces, and handle Brazilian number format
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  return parseFloat(cleaned) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl } = await req.json();
    
    console.log('Received sheet URL:', sheetUrl);
    
    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ error: 'URL da planilha é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetId = extractSheetId(sheetUrl);
    
    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: 'URL do Google Sheets inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted sheet ID:', sheetId);

    // Try to fetch the sheet as CSV (works for public sheets)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    console.log('Fetching CSV from:', csvUrl);
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch sheet:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível acessar a planilha. Certifique-se de que ela está compartilhada como "Qualquer pessoa com o link pode visualizar".' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await response.text();
    console.log('CSV content preview:', csvText.substring(0, 500));
    
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      return new Response(
        JSON.stringify({ error: 'A planilha parece estar vazia ou não tem dados suficientes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to identify columns by header names
    const headers = rows[0].map(h => h.toLowerCase().trim());
    console.log('Headers found:', headers);
    
    // Find column indices - matching exact user's spreadsheet headers
    const vendedorIdx = headers.findIndex(h => h === 'vendedor');
    const vendasIdx = headers.findIndex(h => h === 'venda');
    const comissaoVendedorIdx = headers.findIndex(h => 
      h === 'comissão vendedor' || h === 'comissao vendedor'
    );
    const comissaoTotalIdx = headers.findIndex(h => 
      h === 'comissão total' || h === 'comissao total'
    );
    const comissaoIdx = headers.findIndex(h => 
      h === 'comissão' || h === 'comissao'
    );
    const porcentagemIdx = headers.findIndex(h => 
      h === 'porcentagem vendedor' || h === 'porcentagem'
    );
    const pedidoIdx = headers.findIndex(h => h === 'pedido');
    const clienteIdx = headers.findIndex(h => h === 'cliente');
    const dataIdx = headers.findIndex(h => h === 'data');
    const produtoIdx = headers.findIndex(h => h === 'produto');

    console.log('Column indices:', { 
      vendedorIdx, vendasIdx, comissaoVendedorIdx, comissaoTotalIdx, 
      comissaoIdx, porcentagemIdx, pedidoIdx, clienteIdx, dataIdx, produtoIdx 
    });

    // Parse data rows and aggregate by salesperson with order details
    const salesByVendedor: Map<string, {
      vendas: number;
      comissao: number;
      negocios: number;
      taxa: number;
      taxaCount: number;
      pedidos: OrderDetail[];
    }> = new Map();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (row.every(cell => !cell)) continue;
      
      const vendedor = vendedorIdx >= 0 ? row[vendedorIdx]?.trim() : null;
      if (!vendedor) continue;
      
      const vendas = vendasIdx >= 0 ? parseNumber(row[vendasIdx]) : 0;
      
      // Prefer "Comissão Vendedor" over generic "Comissão"
      let comissao = 0;
      if (comissaoVendedorIdx >= 0) {
        comissao = parseNumber(row[comissaoVendedorIdx]);
      } else if (comissaoIdx >= 0) {
        comissao = parseNumber(row[comissaoIdx]);
      }
      
      // Get percentage
      let taxa = porcentagemIdx >= 0 ? parseNumber(row[porcentagemIdx]) : 0;
      
      // Calculate commission rate if not provided
      if (taxa === 0 && vendas > 0 && comissao > 0) {
        taxa = (comissao / vendas) * 100;
      }

      // Create order detail
      const orderDetail: OrderDetail = {
        cliente: clienteIdx >= 0 ? row[clienteIdx]?.trim() || '' : '',
        data: dataIdx >= 0 ? row[dataIdx]?.trim() || '' : '',
        pedido: pedidoIdx >= 0 ? row[pedidoIdx]?.trim() || '' : '',
        venda: vendas,
        produto: produtoIdx >= 0 ? row[produtoIdx]?.trim() || '' : '',
        comissao: comissao,
        porcentagem: taxa
      };
      
      // Aggregate by salesperson
      const existing = salesByVendedor.get(vendedor);
      if (existing) {
        existing.vendas += vendas;
        existing.comissao += comissao;
        existing.negocios += 1;
        if (taxa > 0) {
          existing.taxa += taxa;
          existing.taxaCount += 1;
        }
        existing.pedidos.push(orderDetail);
      } else {
        salesByVendedor.set(vendedor, {
          vendas,
          comissao,
          negocios: 1,
          taxa,
          taxaCount: taxa > 0 ? 1 : 0,
          pedidos: [orderDetail]
        });
      }
    }

    // Convert map to array
    const salesData: SalesData[] = Array.from(salesByVendedor.entries()).map(([vendedor, data]) => ({
      vendedor,
      vendas: data.vendas,
      comissao: data.comissao,
      negocios: data.negocios,
      taxa: data.taxaCount > 0 ? Math.round((data.taxa / data.taxaCount) * 100) / 100 : 
            (data.vendas > 0 ? Math.round((data.comissao / data.vendas) * 10000) / 100 : 0),
      pedidos: data.pedidos
    }));

    console.log('Parsed sales data:', salesData.length, 'vendedores');

    if (salesData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum dado de vendedor encontrado. Verifique se a planilha contém colunas como "Vendedor", "Vendas", "Comissão".' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate totals
    const totals = {
      totalVendas: salesData.reduce((sum, d) => sum + d.vendas, 0),
      totalComissao: salesData.reduce((sum, d) => sum + d.comissao, 0),
      totalNegocios: salesData.reduce((sum, d) => sum + d.negocios, 0),
      taxaMedia: salesData.reduce((sum, d) => sum + d.taxa, 0) / salesData.length,
      vendedoresAtivos: salesData.length
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        data: salesData,
        totals,
        message: `${salesData.length} vendedores encontrados`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing sheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: `Erro ao processar planilha: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
