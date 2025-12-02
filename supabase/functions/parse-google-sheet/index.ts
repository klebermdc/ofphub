import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SalesData {
  vendedor: string;
  vendas: number;
  comissao: number;
  negocios: number;
  taxa: number;
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
    
    // Find column indices
    const vendedorIdx = headers.findIndex(h => 
      h.includes('vendedor') || h.includes('nome') || h.includes('representante') || h.includes('sales')
    );
    const vendasIdx = headers.findIndex(h => 
      h.includes('venda') || h.includes('total') || h.includes('valor') || h.includes('sales') || h.includes('revenue')
    );
    const comissaoIdx = headers.findIndex(h => 
      h.includes('comiss') || h.includes('commission')
    );
    const negociosIdx = headers.findIndex(h => 
      h.includes('negocio') || h.includes('deal') || h.includes('quantidade') || h.includes('qtd')
    );
    const taxaIdx = headers.findIndex(h => 
      h.includes('taxa') || h.includes('rate') || h.includes('%') || h.includes('percentual')
    );

    console.log('Column indices:', { vendedorIdx, vendasIdx, comissaoIdx, negociosIdx, taxaIdx });

    // Parse data rows
    const salesData: SalesData[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row[vendedorIdx] && vendedorIdx >= 0) continue;
      if (row.every(cell => !cell)) continue;
      
      const vendedor = vendedorIdx >= 0 ? row[vendedorIdx] || `Vendedor ${i}` : `Vendedor ${i}`;
      const vendas = vendasIdx >= 0 ? parseNumber(row[vendasIdx]) : 0;
      const comissao = comissaoIdx >= 0 ? parseNumber(row[comissaoIdx]) : 0;
      const negocios = negociosIdx >= 0 ? parseInt(row[negociosIdx]) || 0 : 0;
      
      let taxa = taxaIdx >= 0 ? parseNumber(row[taxaIdx]) : 0;
      
      // Calculate commission rate if not provided
      if (taxa === 0 && vendas > 0 && comissao > 0) {
        taxa = (comissao / vendas) * 100;
      }
      
      // Calculate commission if not provided but rate is
      const finalComissao = comissao > 0 ? comissao : (vendas * taxa / 100);
      
      if (vendedor) {
        salesData.push({
          vendedor,
          vendas,
          comissao: finalComissao,
          negocios,
          taxa: Math.round(taxa * 100) / 100
        });
      }
    }

    console.log('Parsed sales data:', salesData);

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
