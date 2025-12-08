import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderDetail {
  cliente: string;
  data: string;
  pedido: string;
  venda: number;
  fornecedor: string;
  produto: string;
  comissao: number;
  comissaoTotal: number;
  porcentagemVendedor: number;
  comissaoVendedor: number;
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
  // Normalize line endings to handle both \r\n and \n
  const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedCsv.split('\n');
  
  console.log('Total lines in CSV:', lines.length);
  
  // Log last 3 lines for debugging
  const lastLines = lines.slice(-3);
  console.log('Last 3 lines of CSV:', lastLines);
  
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

function parsePercentage(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token de autenticação ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

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

    const headers = rows[0].map(h => h.toLowerCase().trim());
    console.log('Headers found:', headers);
    
    // Find column indices
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
    const fornecedorIdx = headers.findIndex(h => h === 'fornecedor');

    console.log('Column indices:', { 
      vendedorIdx, vendasIdx, comissaoVendedorIdx, comissaoTotalIdx, 
      comissaoIdx, porcentagemIdx, pedidoIdx, clienteIdx, dataIdx, produtoIdx, fornecedorIdx 
    });

    // Parse data rows and aggregate by salesperson
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
      
      if (row.every(cell => !cell)) continue;
      
      const vendedor = vendedorIdx >= 0 ? row[vendedorIdx]?.trim() : null;
      if (!vendedor) continue;
      
      const venda = vendasIdx >= 0 ? parseNumber(row[vendasIdx]) : 0;
      const comissaoVendedor = comissaoVendedorIdx >= 0 ? parseNumber(row[comissaoVendedorIdx]) : 0;
      const comissaoTotal = comissaoTotalIdx >= 0 ? parseNumber(row[comissaoTotalIdx]) : 0;
      const comissao = comissaoIdx >= 0 ? parsePercentage(row[comissaoIdx]) : 0;
      const porcentagemVendedor = porcentagemIdx >= 0 ? parsePercentage(row[porcentagemIdx]) : 0;

      // Create order detail with all columns
      const orderDetail: OrderDetail = {
        cliente: clienteIdx >= 0 ? row[clienteIdx]?.trim() || '' : '',
        data: dataIdx >= 0 ? row[dataIdx]?.trim() || '' : '',
        pedido: pedidoIdx >= 0 ? row[pedidoIdx]?.trim() || '' : '',
        venda: venda,
        fornecedor: fornecedorIdx >= 0 ? row[fornecedorIdx]?.trim() || '' : '',
        produto: produtoIdx >= 0 ? row[produtoIdx]?.trim() || '' : '',
        comissao: comissao,
        comissaoTotal: comissaoTotal,
        porcentagemVendedor: porcentagemVendedor,
        comissaoVendedor: comissaoVendedor
      };
      
      // Aggregate by salesperson
      const existing = salesByVendedor.get(vendedor);
      if (existing) {
        existing.vendas += venda;
        existing.comissao += comissaoVendedor;
        existing.negocios += 1;
        if (porcentagemVendedor > 0) {
          existing.taxa += porcentagemVendedor;
          existing.taxaCount += 1;
        }
        existing.pedidos.push(orderDetail);
      } else {
        salesByVendedor.set(vendedor, {
          vendas: venda,
          comissao: comissaoVendedor,
          negocios: 1,
          taxa: porcentagemVendedor,
          taxaCount: porcentagemVendedor > 0 ? 1 : 0,
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
      taxa: data.taxaCount > 0 ? Math.round((data.taxa / data.taxaCount) * 100) / 100 : 0,
      pedidos: data.pedidos
    }));

    // Calculate total orders
    const totalPedidos = salesData.reduce((sum, d) => sum + d.pedidos.length, 0);
    console.log('Parsed sales data:', salesData.length, 'vendedores,', totalPedidos, 'pedidos total');
    
    // Log pedidos per salesperson for debug
    salesData.forEach(s => {
      console.log(`  ${s.vendedor}: ${s.pedidos.length} pedidos`);
    });

    if (salesData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum dado de vendedor encontrado. Verifique se a planilha contém colunas como "Vendedor", "Vendas", "Comissão".' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
