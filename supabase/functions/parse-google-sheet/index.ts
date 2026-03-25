import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_SHEET_URL_LENGTH = 500;
const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 10000;
const ALLOWED_GOOGLE_SHEETS_DOMAIN = 'docs.google.com';

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
  rowIndex: number;
}

interface SalesData {
  vendedor: string;
  vendas: number;
  comissao: number;
  negocios: number;
  taxa: number;
  pedidos: OrderDetail[];
}

function extractSheetInfo(url: string): { sheetId: string | null; gid: string | null } {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = idMatch ? idMatch[1] : null;

  // Support links to a specific tab/worksheet (gid can appear in querystring or hash)
  const gidMatch = url.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { sheetId, gid };
}

function parseCSV(csv: string): string[][] {
  const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedCsv.split('\n');

  console.log('Total lines in CSV:', lines.length);

  // IMPORTANT: keep empty lines to preserve the original sheet row index
  // (we skip empty rows later, but we must not shift indices here)
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
  });
}

function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parsePercentage(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

// Validate Google Sheets URL
function validateSheetUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL da planilha é obrigatória' };
  }
  
  if (url.length > MAX_SHEET_URL_LENGTH) {
    return { valid: false, error: 'URL da planilha muito longa' };
  }
  
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== ALLOWED_GOOGLE_SHEETS_DOMAIN) {
      return { valid: false, error: 'URL deve ser do Google Sheets' };
    }
  } catch {
    return { valid: false, error: 'URL inválida' };
  }
  
  return { valid: true };
}

// Email-to-name mapping for salespeople
const SALESPERSON_EMAIL_MAP: Record<string, string> = {
  "vendas@orlandofastpass.com.br": "Carolina",
  "gabriela@orlandofastpass.com.br": "Gabriela",
  "atendimento@orlandofastpass.com.br": "Kleber Augusto",
  "marcella@orlandofastpass.com.br": "Marcella",
  "pedro@orlandofastpass.com.br": "Pedro",
  "marketing@orlandofastpass.com.br": "Rafael",
  "contato@orlandofastpass.com.br": "Renata Santos",
  "comercial@orlandofastpass.com.br": "Suelen",
  "thayna@orlandofastpass.com.br": "Thayna",
  "simone@orlandofastpass.com.br": "Simone",
  "site@orlandofastpass.com.br": "Site",
  "maria gabriela@orlandofastpass.com.br": "Maria Gabriela",
};

function resolveSalespersonName(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  const lower = trimmed.toLowerCase();
  for (const [email, name] of Object.entries(SALESPERSON_EMAIL_MAP)) {
    if (lower === email.toLowerCase()) {
      return name;
    }
  }
  return trimmed;
}

// Sanitize string to prevent injection
function sanitizeString(value: string, maxLength: number = 500): string {
  if (!value || typeof value !== 'string') return '';
  return value.substring(0, maxLength).trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT is already validated by Supabase gateway (verify_jwt = true in config.toml)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with user's token to verify authorization
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    console.log('Authenticated user:', userId);
    
    // Authorization check: verify user has manager or salesperson role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRole, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (roleError || !userRole) {
      console.error('User role not found:', roleError);
      return new Response(
        JSON.stringify({ error: 'Usuário não possui permissão para esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!['manager', 'salesperson'].includes(userRole.role)) {
      console.error('Insufficient permissions. Role:', userRole.role);
      return new Response(
        JSON.stringify({ error: 'Apenas gerentes e vendedores podem acessar esta função' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authorized with role:', userRole.role);

    const body = await req.json();
    const sheetUrl = body?.sheetUrl;
    
    // Validate input
    const urlValidation = validateSheetUrl(sheetUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Received sheet URL:', sheetUrl);

    const { sheetId, gid } = extractSheetInfo(sheetUrl);
    
    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: 'URL do Google Sheets inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted sheet ID:', sheetId, gid ? `(gid=${gid})` : '');

    // Cache-bust to avoid stale CSV responses and respect specific worksheet tabs (gid)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}&cachebust=${Date.now()}`;
    
    console.log('Fetching CSV from:', csvUrl);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let response;
    try {
      response = await fetch(csvUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
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
    
    // Validate CSV size
    if (csvText.length > MAX_CSV_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Planilha muito grande. Limite de 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('CSV content preview:', csvText.substring(0, 500));
    
    const rows = parseCSV(csvText);
    
    // Validate row count
    if (rows.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `Planilha muito grande. Máximo de ${MAX_ROWS} linhas.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    // Cliente column: try "cliente" first, fallback to first column (index 0)
    // since many sheets use an arbitrary name for the client column
    let clienteIdx = headers.findIndex(h => h === 'cliente' || h === 'nome' || h === 'nome do cliente');
    if (clienteIdx === -1) {
      // First column is typically the client name even if header differs
      clienteIdx = 0;
      console.log('Cliente column not found by name, using first column (index 0) as fallback');
    }
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
      
      const rawVendedor = vendedorIdx >= 0 ? sanitizeString(row[vendedorIdx], 100) : null;
      if (!rawVendedor) continue;
      
      // Resolve email to friendly name
      const vendedor = resolveSalespersonName(rawVendedor);
      
      const venda = vendasIdx >= 0 ? parseNumber(row[vendasIdx]) : 0;
      const comissaoTotal = comissaoTotalIdx >= 0 ? parseNumber(row[comissaoTotalIdx]) : 0;
      const comissao = comissaoIdx >= 0 ? parsePercentage(row[comissaoIdx]) : 0;
      const porcentagemVendedor = porcentagemIdx >= 0 ? parsePercentage(row[porcentagemIdx]) : 0;
      let comissaoVendedor = comissaoVendedorIdx >= 0 ? parseNumber(row[comissaoVendedorIdx]) : 0;
      
      // Debug: log raw values for first 3 data rows
      if (i <= 3) {
        console.log(`Row ${i} raw values:`, {
          rawVendedor,
          vendedor,
          rawVenda: row[vendasIdx],
          rawComissaoTotal: row[comissaoTotalIdx],
          rawComissao: row[comissaoIdx],
          rawPorcentagem: row[porcentagemIdx],
          rawComissaoVendedor: row[comissaoVendedorIdx],
          parsedVenda: venda,
          parsedComissaoTotal: comissaoTotal,
          parsedComissao: comissao,
          parsedPorcentagem: porcentagemVendedor,
          parsedComissaoVendedor: comissaoVendedor,
          rowLength: row.length,
        });
      }
      
      // Fallback: if comissaoVendedor is 0 but we have porcentagemVendedor and comissaoTotal, calculate it
      if (comissaoVendedor === 0 && porcentagemVendedor > 0 && comissaoTotal > 0) {
        comissaoVendedor = Math.round((comissaoTotal * porcentagemVendedor / 100) * 100) / 100;
      }

      // Create order detail with all columns (i + 1 because row index in sheet is 1-based and header is row 1)
      const orderDetail: OrderDetail = {
        cliente: clienteIdx >= 0 ? sanitizeString(row[clienteIdx], 200) : '',
        data: dataIdx >= 0 ? sanitizeString(row[dataIdx], 20) : '',
        pedido: pedidoIdx >= 0 ? sanitizeString(row[pedidoIdx], 50) : '',
        venda: venda,
        fornecedor: fornecedorIdx >= 0 ? sanitizeString(row[fornecedorIdx], 100) : '',
        produto: produtoIdx >= 0 ? sanitizeString(row[produtoIdx], 200) : '',
        comissao: comissao,
        comissaoTotal: comissaoTotal,
        porcentagemVendedor: porcentagemVendedor,
        comissaoVendedor: comissaoVendedor,
        rowIndex: i + 1 // Sheet row index (1-based, accounting for header)
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

    // Log Maria Gabriela's orders specifically for debugging
    const mariaGabrielaData = salesData.find(s => s.vendedor === 'Maria Gabriela');
    if (mariaGabrielaData) {
      console.log('Maria Gabriela orders:', mariaGabrielaData.pedidos.map(p => ({
        cliente: p.cliente,
        pedido: p.pedido,
        data: p.data
      })));
    }

    const totals = {
      totalVendas: salesData.reduce((sum, d) => sum + d.vendas, 0),
      totalComissao: salesData.reduce((sum, d) => sum + d.comissao, 0),
      totalNegocios: salesData.reduce((sum, d) => sum + d.negocios, 0),
      taxaMedia: salesData.reduce((sum, d) => sum + d.taxa, 0) / salesData.length,
      vendedoresAtivos: salesData.length
    };

    // --------------- SYNC ORDERS TO DATABASE ---------------
    const supabase = serviceSupabase;

    // Build array of all orders to upsert using sheet_row_index as unique key
    const allOrders: {
      user_id: string;
      sheet_row_index: number;
      cliente: string;
      data: string;
      pedido: string;
      venda: number;
      fornecedor: string;
      produto: string;
      comissao: number;
      comissao_total: number;
      porcentagem_vendedor: number;
      comissao_vendedor: number;
      vendedor: string;
    }[] = [];

    for (const rep of salesData) {
      for (const order of rep.pedidos) {
        allOrders.push({
          user_id: userId,
          sheet_row_index: order.rowIndex,
          cliente: order.cliente || '',
          data: order.data || '',
          pedido: order.pedido || '',
          venda: order.venda,
          fornecedor: order.fornecedor || '',
          produto: order.produto || '',
          comissao: order.comissao,
          comissao_total: order.comissaoTotal,
          porcentagem_vendedor: order.porcentagemVendedor,
          comissao_vendedor: order.comissaoVendedor,
          vendedor: rep.vendedor,
        });
      }
    }

    // Normalize date to ISO for dedup comparison (handles "10/3/26" vs "10/03/2026")
    function normalizeDateForDedup(dateStr: string): string {
      if (!dateStr) return dateStr;
      // Already ISO
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) return dateStr;
      // D/M/YY or DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return dateStr;
    }

    // Deduplicate: keep only the row with the lowest sheet_row_index per composite key
    // (pedido, cliente, vendedor, venda, normalized_data)
    const dedupByKey = new Map<string, typeof allOrders[number]>();
    for (const order of allOrders) {
      const normalizedDate = normalizeDateForDedup(order.data);
      const key = `${order.pedido}|${order.cliente}|${order.vendedor}|${order.venda}|${normalizedDate}`;
      const existing = dedupByKey.get(key);
      if (!existing || order.sheet_row_index < existing.sheet_row_index) {
        dedupByKey.set(key, order);
      }
    }
    const dedupedOrders = Array.from(dedupByKey.values());

    const removedDuplicates = allOrders.length - dedupedOrders.length;
    if (removedDuplicates > 0) {
      console.log(`Removed ${removedDuplicates} duplicate rows from sheet data`);
    }

    // Upsert orders in batches (Supabase limit ~1000 per call)
    const BATCH_SIZE = 500;
    let syncedCount = 0;
    let syncError: string | null = null;

    for (let i = 0; i < dedupedOrders.length; i += BATCH_SIZE) {
      const batch = dedupedOrders.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from('orders')
        .upsert(batch, { onConflict: 'user_id,sheet_row_index', ignoreDuplicates: false });

      if (upsertErr) {
        console.error('Upsert batch error:', upsertErr);
        syncError = 'Erro ao sincronizar pedidos';
        break;
      }
      syncedCount += batch.length;
    }

    // Remove stale sheet rows that no longer exist in the current sheet snapshot.
    // Keep manual rows untouched (sheet_row_index IS NULL).
    // IMPORTANT: paginate to avoid Supabase 1000-row default limit.
    let removedStaleRows = 0;
    if (!syncError) {
      const keepRowIndexes = new Set(dedupedOrders.map((order) => order.sheet_row_index));
      
      // Paginate fetching existing sheet rows (Supabase default limit = 1000)
      const PAGE_SIZE = 1000;
      const allExistingRows: { id: string; sheet_row_index: number }[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data: page, error: pageError } = await supabase
          .from('orders')
          .select('id, sheet_row_index')
          .eq('user_id', userId)
          .not('sheet_row_index', 'is', null)
          .range(offset, offset + PAGE_SIZE - 1);

        if (pageError) {
          console.error('Failed to load existing sheet rows page:', pageError);
          break;
        }
        if (!page || page.length === 0) break;
        allExistingRows.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      if (allExistingRows.length > 0) {
        const staleIds = allExistingRows
          .filter((row) => row.sheet_row_index !== null && !keepRowIndexes.has(row.sheet_row_index))
          .map((row) => row.id);

        console.log(`Found ${allExistingRows.length} existing sheet rows, ${staleIds.length} are stale`);

        for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
          const idBatch = staleIds.slice(i, i + BATCH_SIZE);
          const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .in('id', idBatch);

          if (deleteError) {
            console.error('Failed deleting stale sheet rows batch:', deleteError);
            break;
          }
          removedStaleRows += idBatch.length;
        }
      }
    }

    console.log(`Synced ${syncedCount}/${allOrders.length} orders to DB (removed ${removedStaleRows} stale rows)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: salesData,
        totals,
        syncedOrders: syncedCount,
        removedStaleRows,
        syncError,
        message: `${salesData.length} vendedores encontrados, ${syncedCount} pedidos sincronizados`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing sheet:', error);
    // Return generic error to avoid leaking internal details
    return new Response(
      JSON.stringify({ error: 'Erro ao processar planilha. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
