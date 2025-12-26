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

interface LeadData {
  telefone: string;
  nome: string;
  sobrenome: string;
  email: string;
  medium: string;
  source: string;
  campaign: string;
  content: string;
  term: string;
  pageReferrer: string;
  date?: string;
}

interface LeadsBySource {
  source: string;
  count: number;
  leads: LeadData[];
}

interface LeadsByMonth {
  month: string;
  year: string;
  total: number;
  bySource: { [key: string]: number };
  leads: LeadData[];
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

// Sanitize string to prevent injection
function sanitizeString(value: string, maxLength: number = 500): string {
  if (!value || typeof value !== 'string') return '';
  return value.substring(0, maxLength).trim();
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

function normalizeSource(source: string): string {
  if (!source) return 'Direto';
  
  const s = source.toLowerCase().trim();
  
  if (s.includes('google') || s.includes('gclid')) return 'Google Ads';
  if (s.includes('facebook') || s.includes('fb') || s.includes('instagram') || s.includes('meta') || s === 'ig') return 'Meta Ads';
  if (s.includes('organic') || s.includes('organico')) return 'Orgânico';
  if (s.includes('direct') || s.includes('direto') || s === '(direct)') return 'Direto';
  if (s.includes('referral') || s.includes('referencia')) return 'Referência';
  if (s.includes('email') || s.includes('newsletter')) return 'Email';
  
  return source || 'Outros';
}

function extractDateFromData(row: string[], headers: string[]): { month: string; year: string } | null {
  // Try to find a date column
  const dateColumns = ['data', 'date', 'created_at', 'criado_em', 'data_criacao'];
  
  for (const col of dateColumns) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(col));
    if (idx >= 0 && row[idx]) {
      const dateStr = row[idx];
      // Try different date formats
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length >= 2) {
        // Assuming DD/MM/YYYY or MM/DD/YYYY format
        const month = parts[1].padStart(2, '0');
        let year = parts[2] || new Date().getFullYear().toString();
        if (year.length === 2) year = `20${year}`;
        return { month, year };
      }
    }
  }
  
  return null;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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
    
    // Authorization check: verify user has manager or marketing role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRole, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleError || !userRole) {
      console.error('User role not found:', roleError);
      return new Response(
        JSON.stringify({ error: 'Usuário não possui permissão para esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!['manager', 'marketing'].includes(userRole.role)) {
      console.error('Insufficient permissions. Role:', userRole.role);
      return new Response(
        JSON.stringify({ error: 'Apenas gerentes e marketing podem acessar esta função' }),
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
    
    console.log('Received leads sheet URL:', sheetUrl);

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
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let response;
    try {
      response = await fetch(csvUrl, { signal: controller.signal });
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
    const telefoneIdx = headers.findIndex(h => h === 'telefone' || h === 'phone' || h === 'tel');
    const nomeIdx = headers.findIndex(h => h === 'nome' || h === 'name' || h === 'first_name');
    const sobrenomeIdx = headers.findIndex(h => h === 'sobrenome' || h === 'last_name' || h === 'surname');
    const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail');
    const mediumIdx = headers.findIndex(h => h === 'medium' || h === 'utm_medium');
    const sourceIdx = headers.findIndex(h => h === 'source' || h === 'utm_source');
    const campaignIdx = headers.findIndex(h => h === 'campaign' || h === 'utm_campaign');
    const contentIdx = headers.findIndex(h => h === 'content' || h === 'utm_content');
    const termIdx = headers.findIndex(h => h === 'term' || h === 'utm_term');
    const referrerIdx = headers.findIndex(h => h.includes('referrer') || h.includes('page'));

    console.log('Column indices:', { 
      telefoneIdx, nomeIdx, sobrenomeIdx, emailIdx, 
      mediumIdx, sourceIdx, campaignIdx, contentIdx, termIdx, referrerIdx 
    });

    // Parse all leads
    const leads: LeadData[] = [];
    const leadsBySource: Map<string, LeadData[]> = new Map();
    const leadsByMonth: Map<string, { bySource: Map<string, number>; leads: LeadData[] }> = new Map();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      if (row.every(cell => !cell)) continue;
      
      const source = sourceIdx >= 0 ? sanitizeString(row[sourceIdx], 100) : '';
      const normalizedSource = normalizeSource(source);
      
      const lead: LeadData = {
        telefone: telefoneIdx >= 0 ? sanitizeString(row[telefoneIdx], 20) : '',
        nome: nomeIdx >= 0 ? sanitizeString(row[nomeIdx], 100) : '',
        sobrenome: sobrenomeIdx >= 0 ? sanitizeString(row[sobrenomeIdx], 100) : '',
        email: emailIdx >= 0 ? sanitizeString(row[emailIdx], 255) : '',
        medium: mediumIdx >= 0 ? sanitizeString(row[mediumIdx], 50) : '',
        source: normalizedSource,
        campaign: campaignIdx >= 0 ? sanitizeString(row[campaignIdx], 200) : '',
        content: contentIdx >= 0 ? sanitizeString(row[contentIdx], 200) : '',
        term: termIdx >= 0 ? sanitizeString(row[termIdx], 100) : '',
        pageReferrer: referrerIdx >= 0 ? sanitizeString(row[referrerIdx], 500) : '',
      };
      
      // Skip empty leads
      if (!lead.telefone && !lead.email && !lead.nome) continue;
      
      leads.push(lead);
      
      // Group by source
      if (!leadsBySource.has(normalizedSource)) {
        leadsBySource.set(normalizedSource, []);
      }
      leadsBySource.get(normalizedSource)!.push(lead);
      
      // Try to extract date and group by month
      const dateInfo = extractDateFromData(row, headers);
      if (dateInfo) {
        const monthKey = `${dateInfo.month}/${dateInfo.year}`;
        if (!leadsByMonth.has(monthKey)) {
          leadsByMonth.set(monthKey, { bySource: new Map(), leads: [] });
        }
        const monthData = leadsByMonth.get(monthKey)!;
        monthData.leads.push(lead);
        monthData.bySource.set(normalizedSource, (monthData.bySource.get(normalizedSource) || 0) + 1);
      }
    }

    console.log('Parsed leads:', leads.length);

    // Convert to response format
    const sourceBreakdown: LeadsBySource[] = Array.from(leadsBySource.entries())
      .map(([source, sourceLeads]) => ({
        source,
        count: sourceLeads.length,
        leads: sourceLeads,
      }))
      .sort((a, b) => b.count - a.count);

    const monthBreakdown: LeadsByMonth[] = Array.from(leadsByMonth.entries())
      .map(([monthKey, data]) => {
        const [month, year] = monthKey.split('/');
        return {
          month,
          year,
          total: data.leads.length,
          bySource: Object.fromEntries(data.bySource),
          leads: data.leads,
        };
      })
      .sort((a, b) => {
        const dateA = parseInt(a.year) * 100 + parseInt(a.month);
        const dateB = parseInt(b.year) * 100 + parseInt(b.month);
        return dateB - dateA;
      });

    // Summary totals
    const totals = {
      total: leads.length,
      googleAds: leadsBySource.get('Google Ads')?.length || 0,
      metaAds: leadsBySource.get('Meta Ads')?.length || 0,
      organic: leadsBySource.get('Orgânico')?.length || 0,
      direct: leadsBySource.get('Direto')?.length || 0,
      referral: leadsBySource.get('Referência')?.length || 0,
      email: leadsBySource.get('Email')?.length || 0,
      other: leads.length - 
        (leadsBySource.get('Google Ads')?.length || 0) - 
        (leadsBySource.get('Meta Ads')?.length || 0) - 
        (leadsBySource.get('Orgânico')?.length || 0) - 
        (leadsBySource.get('Direto')?.length || 0) -
        (leadsBySource.get('Referência')?.length || 0) -
        (leadsBySource.get('Email')?.length || 0),
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          leads,
          sourceBreakdown,
          monthBreakdown,
          totals,
        },
        message: `${leads.length} leads encontrados`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing leads sheet:', error);
    // Return generic error to avoid leaking internal details
    return new Response(
      JSON.stringify({ error: 'Erro ao processar planilha de leads. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
